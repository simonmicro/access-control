import json
import time
import yaml
import uuid
import redis
import logging
import argparse
import datetime
import tempfile
import ipaddress
import subprocess

# Parse args
parser = argparse.ArgumentParser()
parser.add_argument('--debug', action='store_true', help='Enable debug logging')
parser.add_argument('--redis_host', type=str, required=True, help='Redis server hostname')
parser.add_argument('--redis_port', type=int, default=6379, help='Redis server port')
parser.add_argument('--configmap', type=str, required=True, help='Target configmap name')
parser.add_argument('--pod-selector', type=str, help='Which pods should be annotated on configmap updates? Use e.g. "app=nginx"')
args = parser.parse_args()
logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO)

redisClient = redis.Redis(host=args.redis_host, port=args.redis_port, db=0, decode_responses=True)
def setProvisionState(state: bool, id: str):
    global redisClient
    s = {
        'id': id,
        'state': state,
        'since': str(datetime.datetime.now())
    }
    j = json.dumps(s)
    redisClient.set('provision/state', j, ex=datetime.timedelta(minutes=5)) # Expire after 5 minutes provision, as this indicates a crashed daemon
    redisClient.publish('provision/state', j)
    print(f'[{id}] {"Started" if state else "Finished"} provision at {datetime.datetime.now()}.')

def runProvision():
    global redisClient
    # NOTE: This is also used to remove any expired IPs from the users ips set
    provisionId = uuid.uuid4().hex
    setProvisionState(True, provisionId)
    # Fetch current set of scopes
    userToScope = {}
    scopeToIPs = {}
    for scopeId, scopeStr in redisClient.hgetall('scopes').items():
        scopeData = json.loads(scopeStr)
        for username in scopeData['users']:
            if username not in userToScope.keys():
                userToScope[username] = set()
            userToScope[username].add(scopeId)
        scopeToIPs[scopeId] = set()
    # Run over every users ip
    nextExpire = None
    for username, _ in redisClient.hgetall('users').items():
        if username not in userToScope.keys():
            # Only remember ips if they are referenced in at least one scope
            continue
        for ip, ipStr in redisClient.hgetall('ips/' + username).items():
            ipData = json.loads(ipStr)
            if ipData['expire'] is not None:
                expireOn = datetime.datetime.fromisoformat(ipData['expire'])
                if expireOn < datetime.datetime.now():
                    redisClient.hdel(keyPath, ip)
                    continue
                if nextExpire is None or expireOn < nextExpire:
                    nextExpire = expireOn
            for scopeId in userToScope[username]:
                scopeToIPs[scopeId].add(ipaddress.IPv4Address(ip))
    # Fetch the global ips and add them to all scopes
    for ip, ipStr in redisClient.hgetall('ips/global').items():
        ipData = json.loads(ipStr)
        for scopeId in scopeToIPs.keys():
            scopeToIPs[scopeId].add(ipaddress.IPv4Address(ip))
    with tempfile.NamedTemporaryFile('w', suffix='.yaml') as tempYaml:
        # Create ip lists
        configDict = {}
        for scope, ips in scopeToIPs.items():
            scopeFilename = scope + '.list'
            configDict[scopeFilename] = 'default 0;\n'
            for ip in ips:
                configDict[scopeFilename] += str(ip) + ' 1;\n'
        outStr = yaml.dump({
            'apiVersion': 'v1',
            'kind': 'ConfigMap',
            'metadata': { 'name': args.configmap },
            'data': configDict
        })
        logging.debug(outStr)
        tempYaml.write(outStr)
        tempYaml.flush()
        # Apply new ConfigMaps
        subprocess.check_output(['kubectl', 'replace', '-f', tempYaml.name])
        logging.debug('Replaced configmap ' + args.configmap)
        time.sleep(1) # Give the configmap some time to propagate
        if args.pod_selector is not None:
            # Annotate all nginx pods to force instant rollout
            podYaml = yaml.safe_load(subprocess.check_output(['kubectl', 'get', 'pods', '--selector=' + args.pod_selector, '--output', 'yaml']))
            for item in podYaml['items']:
                podName = item['metadata']['name']
                subprocess.check_output(['kubectl', 'annotate', '--overwrite', 'pods/' + podName, 'access.control.version=' + provisionId])
                time.sleep(1) # Give the pod some time to propagate
                logging.debug('Annotated pod ' + podName)
    setProvisionState(False, provisionId)
    return nextExpire

nextRun = runProvision() # Initial provision

sub = redisClient.pubsub(ignore_subscribe_messages=True)
sub.subscribe('provision/start')
while True:
    # Check for new messages
    message = sub.get_message()
    if message is not None:
        nextRun = runProvision()
    # Or on next scheduled run
    if nextRun is not None and nextRun < datetime.datetime.now():
        nextRun = runProvision()
    time.sleep(1)