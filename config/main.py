import os
import redis
import logging
import argparse
import datetime
import api.config
from inotify_simple import INotify, flags

# Parse args
parser = argparse.ArgumentParser()
parser.add_argument('--config', type=str, required=True, help='Path to YAML configuration')
parser.add_argument('--debug', action='store_true', help='Enable debug logging')
parser.add_argument('--redis_host', type=str, required=True, help='Redis server hostname')
parser.add_argument('--redis_port', type=int, default=6379, help='Redis server port')
args = parser.parse_args()
logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO)

# Debug dump
def debugDatabaseDump():
    if args.debug:
        # Connect to the db and dump the current state
        r = redis.Redis(host=args.redis_host, port=args.redis_port, db=0, decode_responses=True)
        logging.debug(f'scopes: {r.hgetall("scopes")}')
        logging.debug(f'users: {r.hgetall("users")}')
        for ipTables in r.keys('ips/*'):
            logging.debug(f'{ipTables}: {r.hgetall(ipTables)}')
        for keyData in r.keys('keys/*'):
            logging.debug(f'{keyData}: {r.get(keyData)}')


# Initial config parse
api.config.apply(args.redis_host, args.redis_port, args.config)
debugDatabaseDump()

# Register iNotify watcher and wait for reloads
inotify = INotify()
watch_flags = flags.CREATE | flags.MODIFY | flags.CLOSE_WRITE | flags.DELETE | flags.MOVE_SELF
inotify.add_watch(os.path.dirname(os.path.abspath(args.config)), watch_flags)
cooldown = datetime.datetime.now(datetime.timezone.utc)
while True:
    for event in inotify.read():
        if datetime.datetime.now(datetime.timezone.utc) > cooldown:
            api.config.apply(args.redis_host, args.redis_port, args.config)
            debugDatabaseDump()
        cooldown = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=2)