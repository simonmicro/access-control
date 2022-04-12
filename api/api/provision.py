import datetime
import json
from api.models import ProvisionInfo

def requestProvision(redisClient):
    redisClient.publish('provision/start', str(datetime.datetime.now()))

def getProvisionState(redisClient) -> ProvisionInfo:
    s = redisClient.get('provision/state')
    if s is None:
        return ProvisionInfo(id=-1, state=False, since=None)
    s = json.loads(s)
    return ProvisionInfo(id=s['id'], state=s['state'], since=s['since'])