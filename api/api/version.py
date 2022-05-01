import time
import redis
import datetime
import threading
import logging
logger = logging.getLogger(__name__)

def getOwnVersion() -> str:
    try:
        with open('/VERSION', 'r') as versionFile:
            return versionFile.read().strip()
    except:
        return 'development'

def getOtherVersion(redisClient: redis.Redis, scope: str) -> str:
    return redisClient.get('version/' + scope)

def heartbeatMyVersion(redisHost: str, redisPort: int, scope: str):
    def task():
        version = getOwnVersion()
        while True:
            logger.debug(f'Sending heartbeat for scope "{scope}" with version "{version}"...')
            redisClient = redis.Redis(host=redisHost, port=redisPort, db=0, decode_responses=True)
            redisClient.set('version/' + scope, version, ex=datetime.timedelta(minutes=2))
            del redisClient
            time.sleep(100) # Update shortly before expire
    t = threading.Thread(target=task)
    t.daemon = True # If main thread dies, this will also terminate
    t.start()