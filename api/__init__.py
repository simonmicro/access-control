import asyncio
import json
import time
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from enum import Enum
import api.config
import api.utils
import api.provision
from api.models import *
import datetime, random, redis, os, hashlib, string, threading

class Tags(Enum):
    tokens = 'Tokens'
    ips = 'IPs'
tagsMetadata = [
    {'name': 'Tokens', 'description': 'Controls the access to the API'},
    {'name': 'IPs', 'description': 'Control the list of your authenticated IPs'}
]
app = FastAPI(
    title='Access Control API',
    #description='_ToDo_...',
    version='0.0.1',
    redoc_url=None,
    openapi_tags=tagsMetadata
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

thisIsAVeryRealBoolRunThisThingy = False

def authorize(token: str):
    try:
        api.utils.validateToken(token)
    except:
        raise HTTPException(status_code=403, detail='Invalid token')
    if app.state.redisClient.get('keys/' + token) is None:
        raise HTTPException(status_code=403, detail='Invalid token')

@app.on_event("startup")
def bootupWorker():
    global thisIsAVeryRealBoolRunThisThingy
    app.state.redisClient = redis.Redis(host=os.environ.get('REDIS_HOST', 'localhost'), port=os.environ.get('REDIS_PORT', 6379), db=0, decode_responses=True)
    app.state.requestShutdown = False
    thisIsAVeryRealBoolRunThisThingy = True

@app.on_event("shutdown")
def shutdownWorker():
    global thisIsAVeryRealBoolRunThisThingy
    app.state.requestShutdown = True
    thisIsAVeryRealBoolRunThisThingy = False
    print('SHITDPOWN')

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token/create/oauth2")
@app.post("/token/create/oauth2", tags=[Tags.tokens], summary='Create a new token using OAuth2')
async def tokenCreateOAuth2(formData: OAuth2PasswordRequestForm = Depends()):
    try:
        api.utils.validateUsername(formData.username)
    except:
        raise HTTPException(status_code=400, detail='Invalid username or password')
    userInfoStr = app.state.redisClient.hget('users', formData.username)
    if userInfoStr is None:
        raise HTTPException(status_code=400, detail='Invalid username or password')
    userInfo = json.loads(userInfoStr)
    pwdHash = hashlib.sha256(formData.password.encode()).hexdigest()
    if pwdHash != userInfo['password']:
        raise HTTPException(status_code=400, detail='Invalid username or password')
    key = ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(32))
    app.state.redisClient.set('keys/' + key, json.dumps({
        'username': formData.username,
        'expire': str(datetime.datetime.now() + datetime.timedelta(hours=24))
    }), ex=datetime.timedelta(hours=24))
    return OAuth2Login(access_token=key)

@app.post("/token/create/credentials", tags=[Tags.tokens], summary='Create a new token using REST fields for username / password', deprecated=True)
async def tokenCreateCredentials(username: str, password: str):
    raise HTTPException(status_code=501, detail='You know this is deprecated, right?')

@app.get("/token/info", tags=[Tags.tokens], summary='Retreive information about the used token', response_model=TokenInfo)
async def tokenInfo(token: str = Depends(oauth2_scheme)):
    authorize(token)
    tokenInfo = json.loads(app.state.redisClient.get('keys/' + token))
    userInfo = json.loads(app.state.redisClient.hget('users', tokenInfo['username']))
    return TokenInfo(expire=tokenInfo['expire'], user=UserInfo(
        name=userInfo['name'],
        limit=userInfo['ip_limit']
    ))

@app.delete("/token/delete", tags=[Tags.tokens], summary='Revoke the used token')
async def tokenDelete(token: str = Depends(oauth2_scheme)):
    authorize(token)
    assert app.state.redisClient.delete('keys/' + token) == 1, 'The just used token should also be there for deletion.'

@app.post("/ip/add", tags=[Tags.ips], summary='Add a new IPv4', response_model=IP)
async def ipAdd(ip: str, name: str, token: str = Depends(oauth2_scheme)):
    authorize(token)
    try:
        parsedIP = api.utils.validateIPv4(ip)
    except RuntimeError:
        raise HTTPException(status_code=400, detail='Invalid IPv4')
    rejectReasons = list()
    if parsedIP.is_private: rejectReasons.append('private')
    if parsedIP.is_reserved: rejectReasons.append('reserved')
    if parsedIP.is_loopback: rejectReasons.append('loopback')
    if parsedIP.is_link_local: rejectReasons.append('link_local')
    if parsedIP.is_multicast: rejectReasons.append('multicast')
    if len(rejectReasons):
        raise HTTPException(status_code=400, detail='IP prohibited: ' + ', '.join(rejectReasons))
    tokenInfo = json.loads(app.state.redisClient.get('keys/' + token))
    userInfo = json.loads(app.state.redisClient.hget('users', tokenInfo['username']))
    if app.state.redisClient.hlen('ips/' + tokenInfo['username']) >= userInfo['ip_limit']:
        raise HTTPException(status_code=400, detail='IP would violate users IP limit')
    if app.state.redisClient.hget('ips/' + tokenInfo['username'], str(parsedIP)) is not None:
        raise HTTPException(status_code=400, detail='Duplicate IP')
    added = datetime.datetime.now()
    timeout = datetime.timedelta(seconds=userInfo['expire_max'])
    expires = added + timeout
    app.state.redisClient.hset('ips/' + tokenInfo['username'], str(parsedIP), json.dumps({
        'name': name,
        'added': str(added),
        'expire': str(expires)
    }))
    api.provision.requestProvision(app.state.redisClient)
    # TODO set proper expire on set and remove ip elements automatically
    return IP(
        name=name,
        ip=parsedIP,
        added=added,
        expires=expires
    )

@app.get("/ip/list", tags=[Tags.ips], summary='Get the global or personal IPv4 list', response_model=IPList)
async def ipList(globals: bool = False, token: str = Depends(oauth2_scheme)):
    authorize(token)
    tokenInfo = None
    if not globals:
        tokenInfo = json.loads(app.state.redisClient.get('keys/' + token))
    ips = list()
    for ip, ipStr in app.state.redisClient.hgetall('ips/' + (tokenInfo['username'] if tokenInfo else 'global')).items():
        ipData = json.loads(ipStr)
        ips.append(IP(
            name=ipData['name'],
            ip=ip,
            added=ipData['added'],
            expires=ipData['expire']
        ))
    return IPList(globals=globals, ips=ips)

@app.delete("/ip/delete", tags=[Tags.ips], summary='Delete an IPv4')
async def ipDelete(ip: ipaddress.IPv4Address, token: str = Depends(oauth2_scheme)):
    authorize(token)
    tokenInfo = json.loads(app.state.redisClient.get('keys/' + token))
    if app.state.redisClient.hdel('ips/' + tokenInfo['username'], str(ip)) == 0:
        raise HTTPException(status_code=404, detail='IP not found')
    api.provision.requestProvision(app.state.redisClient)

@app.get("/ip/public", tags=[Tags.ips], summary='Retreive your IPv4 visible to the server', response_model=ipaddress.IPv4Address)
async def ipPublic(request: Request, token: str = Depends(oauth2_scheme)):
    authorize(token)
    return request.client.host

@app.get("/provision/state", tags=['Provisioning'], summary='How far are the changes propagated right now?', response_model=ProvisionInfo)
async def provisionState(token: str = Depends(oauth2_scheme)):
    authorize(token)
    return api.provision.getProvisionState(app.state.redisClient)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    global thisIsAVeryRealBoolRunThisThingy
    await websocket.accept()
    try:
        authorize(token)
    except:
        await websocket.send_text('Invalid token')
        await websocket.close()
        return
    # Send initial state
    s = api.provision.getProvisionState(app.state.redisClient)
    await websocket.send_json({
        'state': s.state,
        'since': str(s.since)
    })
    # Send updates
    sub = app.state.redisClient.pubsub(ignore_subscribe_messages=True)
    sub.subscribe('provision/state')
    checkToken = 0
    wsId = random.randint(1000, 9999)
    while not app.state.requestShutdown:
        # TODO use await/async pattern
        msg = sub.get_message()
        if msg is not None:
            try:
                await websocket.send_json(msg['data'])
            except:
                # ANY error will trigger us to give up the websocket!
                break
        await asyncio.sleep(1)
        checkToken -= 1
        if checkToken <= 0:
            if app.state.redisClient.get('keys/' + token) is None:
                # Check if the token is still valid, if not close the connection
                break
            checkToken = 10
        print(wsId, thisIsAVeryRealBoolRunThisThingy, app.state.requestShutdown, checkToken)