import datetime
import yaml, redis, json
import api.utils
import api.provision
import logging
logger = logging.getLogger(__name__)

def apply(redisHost: str, redisPort: int, yamlPath: str):
    # Load YAML
    configFile = open(yamlPath, 'r')
    config = yaml.safe_load(configFile)
    configFile.close()
    # Connect to Redis
    r = redis.Redis(host=redisHost, port=redisPort, db=0, decode_responses=True)

    general = config['general']
    # Scopes
    r.delete('scopes')
    for scopeId, scopeData in config['scopes'].items():
        scopeUsers = ['global']
        for userIPs, userData in config['users'].items():
            if scopeId in userData['scopes']:
                scopeUsers.append(userIPs)
        r.hset('scopes', scopeId, json.dumps({
            'name': scopeData['name'],
            'url': scopeData['url'],
            'users': scopeUsers
        }))
    # Keys
    persistentKeysCount = 0
    for username, userData in config['users'].items():
        for key in userData['keys']:
            api.utils.validateToken(key)
            r.set('keys/' + key, json.dumps({
                'username': username,
                'expire': None
            }))
            persistentKeysCount += 1
    # Users
    r.delete('users')
    allUsernames = set()
    for username, userData in config['users'].items():
        if username == 'global':
            logger.error('The username "global" is reserved. Config apply aborted.')
            return
        api.utils.validateUsername(username)
        allUsernames.add(username)
        r.hset('users', username, json.dumps({
            'name': userData['name'],
            'password': userData['password'],
            'ip_limit': general['ip_limit'],
            'expire_max': general['expire_max']
        }))
    # Clean ips/* for deleted users
    for userIPs in r.keys('ips/*'):
        if userIPs[4:] not in allUsernames:
            r.delete(userIPs)
    # Clean keys/* for deleted users / non persistent keys
    for keyPath in r.keys('keys/*'):
        key = keyPath[5:]
        keyData = json.loads(r.get(keyPath))
        if keyData['username'] not in allUsernames:
            r.delete(keyPath)
        elif keyData['expire'] is None:
            if key not in config['users'][keyData['username']]['keys']:
                r.delete(keyPath)
    # Global IPs
    r.delete('ips/global')
    if isinstance(general['ips'], dict) and len(general['ips'].items()):
        for globalIP, globalIPName in general['ips'].items():
            api.utils.validateIPv4(globalIP)
            r.hset('ips/global', globalIP, json.dumps({
                'name': globalIPName,
                'added': str(datetime.datetime.now(datetime.timezone.utc)),
                'expire': None
            }))
    # Trigger instant provision
    api.provision.requestProvision(r)
    logger.info(f'Applied {len(general["ips"].items()) if isinstance(general["ips"], dict) else 0} global IPs, {len(config["scopes"])} scopes, {persistentKeysCount} persistent keys and {len(config["users"])} users.')