import asyncio
import json
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from enum import Enum
from uvicorn.main import Server # Used for shutdown hooks
import api.config
import api.utils
import api.provision
import api.version
from api.models import *
import datetime, random, redis, os, hashlib, string
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Install dumb shutdown catcher to prevent websockets staying open
originalShutdown = Server.handle_exit
workerShutdownRequested = False
def handleHookedShutdown(*args, **kwargs):
    global workerShutdownRequested
    workerShutdownRequested = True
    originalShutdown(*args, **kwargs)
Server.handle_exit = handleHookedShutdown

# The root path is need also for Swagger authentication, so it is not set using uvicorn parameters
rootPath = os.environ.get('ROOT_PATH', '/')
if not rootPath.endswith('/'):
    rootPath += '/'
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
    openapi_tags=tagsMetadata,
    root_path=rootPath
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=rootPath + 'token/create/oauth2')

def authorize(token: str):
    try:
        api.utils.validateToken(token)
    except:
        raise HTTPException(status_code=403, detail='Invalid token')
    if app.state.redisClient.get('keys/' + token) is None:
        raise HTTPException(status_code=403, detail='Invalid token')

@app.on_event("startup")
def bootupWorker():
    app.state.redisClient = redis.Redis(host=os.environ.get('REDIS_HOST', 'localhost'), port=os.environ.get('REDIS_PORT', 6379), db=0, decode_responses=True)

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
        'expire': str(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24))
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
        api.utils.validateIPName(name)
    except RuntimeError:
        raise HTTPException(status_code=400, detail='Invalid name')
    try:
        parsedIP = api.utils.validateIPv4(ip)
    except RuntimeError:
        raise HTTPException(status_code=400, detail='Invalid IPv4')
    tokenInfo = json.loads(app.state.redisClient.get('keys/' + token))
    userInfo = json.loads(app.state.redisClient.hget('users', tokenInfo['username']))
    rejectReasons = api.utils.rejectIPv4(parsedIP, userInfo['allow_private'])
    if len(rejectReasons):
        raise HTTPException(status_code=400, detail='IP prohibited: ' + ', '.join(rejectReasons))
    if app.state.redisClient.hlen('ips/' + tokenInfo['username']) >= userInfo['ip_limit']:
        raise HTTPException(status_code=400, detail='IP would violate users IP limit')
    if app.state.redisClient.hget('ips/' + tokenInfo['username'], str(parsedIP)) is not None:
        raise HTTPException(status_code=400, detail='Duplicate IP')
    added = datetime.datetime.now(datetime.timezone.utc)
    timeout = datetime.timedelta(seconds=userInfo['expire_max'])
    expires = added + timeout
    app.state.redisClient.hset('ips/' + tokenInfo['username'], str(parsedIP), json.dumps({
        'name': name,
        'added': str(added),
        'expire': str(expires)
    }))
    app.state.redisClient.expire('ips/' + tokenInfo['username'], timeout) # We know our new key will be the newest (with latest expire)
    api.provision.requestProvision(app.state.redisClient)
    return IP(
        name=name,
        ip=parsedIP,
        added=added,
        expires=expires
    )

@app.post("/ip/edit", tags=[Tags.ips], summary='Edit an IPv4', response_model=IP)
async def ipEdit(ip: ipaddress.IPv4Address, newName: str = None, newIP: str = None, token: str = Depends(oauth2_scheme)):
    authorize(token)
    # Validate new values
    if newName is not None:
        try:
            api.utils.validateIPName(newName)
        except RuntimeError:
            raise HTTPException(status_code=400, detail='Invalid name')
    tokenInfo = json.loads(app.state.redisClient.get('keys/' + token))
    userInfo = json.loads(app.state.redisClient.hget('users', tokenInfo['username']))
    if newIP is not None:
        try:
            parsedIP = api.utils.validateIPv4(newIP)
        except RuntimeError:
            raise HTTPException(status_code=400, detail='Invalid IPv4')
        rejectReasons = api.utils.rejectIPv4(parsedIP, userInfo['allow_private'])
        if len(rejectReasons):
            raise HTTPException(status_code=400, detail='IP prohibited: ' + ', '.join(rejectReasons))
        if app.state.redisClient.hget('ips/' + tokenInfo['username'], str(parsedIP)) is not None:
            raise HTTPException(status_code=400, detail='Duplicate IP')
    # Fetch current IP
    currentIPStr = app.state.redisClient.hget('ips/' + tokenInfo['username'], str(ip))
    if currentIPStr is None:
        raise HTTPException(status_code=400, detail='IP not found')
    currentIPData = json.loads(currentIPStr)
    # Check if any modification was made
    if newName is not None and newName == currentIPData['name']:
        newName = None
    if newIP is not None and parsedIP == ip:
        newIP = None
    timeout = datetime.timedelta(seconds=userInfo['expire_max'])
    currentIP = IP(
        name=newName if newName is not None else currentIPData['name'],
        ip=parsedIP if newIP is not None else ip,
        added=datetime.datetime.fromisoformat(currentIPData['added']),
        expires=datetime.datetime.now(datetime.timezone.utc) + timeout
    )
    if newName is None and newIP is None:
        raise HTTPException(status_code=304, detail='No change')
    # Save back and update it accordingly
    if newIP is not None:
        app.state.redisClient.hdel('ips/' + tokenInfo['username'], str(ip))
    app.state.redisClient.hset('ips/' + tokenInfo['username'], str(parsedIP if newIP is not None else ip), json.dumps({
        'name': currentIP.name,
        'added': str(currentIP.added),
        'expire': str(currentIP.expires)
    }))
    app.state.redisClient.expire('ips/' + tokenInfo['username'], timeout) # We know our updated key will be the newest (with latest expire)
    api.provision.requestProvision(app.state.redisClient)
    return currentIP

@app.delete("/ip/delete", tags=[Tags.ips], summary='Delete an IPv4')
async def ipDelete(ip: ipaddress.IPv4Address, token: str = Depends(oauth2_scheme)):
    authorize(token)
    tokenInfo = json.loads(app.state.redisClient.get('keys/' + token))
    if app.state.redisClient.hdel('ips/' + tokenInfo['username'], str(ip)) == 0:
        raise HTTPException(status_code=404, detail='IP not found')
    api.provision.requestProvision(app.state.redisClient)

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
    global workerShutdownRequested
    await websocket.accept()
    try:
        authorize(token)
    except:
        await websocket.send_text('Invalid token')
        await websocket.close()
        return
    websocketId = random.randint(100000, 999999)
    logger.info(f'Websocket {websocketId} connected.')
    # Send updates
    sub = app.state.redisClient.pubsub(ignore_subscribe_messages=True)
    sub.subscribe('provision/state')
    loopEvery = 0.1
    reauthEvery = 30 # ...seconds
    reauthNext = datetime.datetime.now(datetime.timezone.utc)
    pingEvery = 10 # ...seconds
    pingNext = datetime.datetime.now(datetime.timezone.utc)
    while not workerShutdownRequested:
        # Send out new provision state
        msg = sub.get_message()
        if msg is not None:
            try:
                await websocket.send_text(msg['data'])
            except:
                logger.info(f'Websocket {websocketId} disconnected by failed communication.')
                break # ANY error will trigger us to give up the websocket!
        # Reauth?
        await asyncio.sleep(loopEvery)
        if datetime.datetime.now(datetime.timezone.utc) > reauthNext:
            if app.state.redisClient.get('keys/' + token) is None:
                # Check if the token is still valid, if not close the connection
                logger.info(f'Websocket {websocketId} disconnected by deleted token.')
                break
            reauthNext = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=reauthEvery)
        if datetime.datetime.now(datetime.timezone.utc) > pingNext:
            # Ping if needed
            try:
                await websocket.send_text('ping')
            except:
                logger.info(f'Websocket {websocketId} disconnected by missed ping.')
                break # ANY error will trigger us to give up the websocket!
            pingNext = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=pingEvery)
    try:
        await websocket.close()
    except:
        # Maybe the websocket is already closed / broken
        pass

@app.get("/version/{service}", summary='Get the version number of a service', response_model=VersionInfo)
async def versionScope(service: str, token: str = Depends(oauth2_scheme)):
    authorize(token)
    if service not in ['api', 'config', 'provision']:
        raise HTTPException(status_code=404, detail='Service not found')
    if service == 'api':
        return VersionInfo(healthy=True, version=api.version.getOwnVersion())
    else:
        version = api.version.getOtherVersion(app.state.redisClient, service)
        return VersionInfo(healthy=version is not None, version=version)

@app.get("/scopes", summary='Retreive a list of scopes of the user', response_model=ScopeList)
async def scopes(token: str = Depends(oauth2_scheme)):
    authorize(token)
    scopes = list()
    for scopeId, scopeStr in app.state.redisClient.hgetall('scopes').items():
        scopeData = json.loads(scopeStr)
        if json.loads(app.state.redisClient.get('keys/' + token))['username'] not in scopeData['users']:
            continue
        scopes.append(Scope(
            id=scopeId,
            name=scopeData['name'],
            url=scopeData['url']
        ))
    return ScopeList(scopes=scopes)