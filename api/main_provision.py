import os
import json
import time
import redis
import logging
import argparse
import datetime
import ipaddress

# Parse args
parser = argparse.ArgumentParser()
parser.add_argument('--debug', action='store_true', help='Enable debug logging')
parser.add_argument('--redis_host', type=str, required=True, help='Redis server hostname')
parser.add_argument('--redis_port', type=int, default=6379, help='Redis server port')
args = parser.parse_args()
logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO)

redisClient = redis.Redis(host=args.redis_host, port=args.redis_port, db=0, decode_responses=True)
def setProvisionState(state: bool):
    global redisClient
    s = {
        'state': state,
        'since': str(datetime.datetime.now())
    }
    j = json.dumps(s)
    redisClient.set('provision/state', j)
    redisClient.publish('provision/state', j)
    print(f'{"Started" if state else "Finished"} provision at {datetime.datetime.now()}.')

def runProvision():
    global redisClient
    # NOTE: This is also used to remove any expired IPs from the users ips set
    setProvisionState(True)
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
    for username, userStr in redisClient.hgetall('users').items():
        userData = json.loads(userStr)
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
    # Create ip lists
    #   TODO
    # Apply new ConfigMaps
    #   TODO
    # Annotate all nginx pods to force instant rollout
    #   TODO
    time.sleep(10)
    setProvisionState(False)
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