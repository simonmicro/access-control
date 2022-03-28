import datetime
import json
from api.models import ProvisionInfo

def requestProvision(redisClient):
    redisClient.publish('provision/start', str(datetime.datetime.now()))
    # Simulate takeup for now, TODO
    p = getProvisionState(redisClient)
    s = {
        'state': p.state,
        'since': str(p.since)
    }
    j = json.dumps(s)
    redisClient.set('provision/state', j)
    redisClient.publish('provision/state', j)

def getProvisionState(redisClient) -> ProvisionInfo:
    s = redisClient.get('provision/state')
    if s is None:
        #return ProvisionInfo(state=False, since=None)
        return ProvisionInfo(state=bool(datetime.datetime.now().minute % 2), since=datetime.datetime.now())
    s = json.loads(s)
    return ProvisionInfo(state=s['state'], since=s['since'])