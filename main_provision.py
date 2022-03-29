import os
import json
import redis
import logging
import argparse
import datetime

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
    setProvisionState(True)
    import time
    time.sleep(10)
    setProvisionState(False)

runProvision() # Initial provision

sub = redisClient.pubsub(ignore_subscribe_messages=True)
sub.subscribe('provision/start')
for message in sub.listen():
    runProvision()