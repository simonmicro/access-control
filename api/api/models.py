import datetime
import ipaddress
from pydantic import BaseModel
from typing import List, Optional

class IP(BaseModel):
    name: str
    ip: ipaddress.IPv4Address
    added: datetime.datetime
    expires: Optional[datetime.datetime]

class IPList(BaseModel):
    globals: bool
    ips: List[IP]

class UserInfo(BaseModel):
    name: str
    limit: int

class TokenInfo(BaseModel):
    user: UserInfo
    expire: datetime.datetime

class ProvisionInfo(BaseModel):
    id: str
    state: bool
    since: Optional[datetime.datetime]

class OAuth2Login(BaseModel):
    access_token: str
    token_type: datetime.datetime = 'bearer'

class VersionInfo(BaseModel):
    healthy: bool
    version: Optional[str]

class Scope(BaseModel):
    id: str
    name: str
    url: str

class ScopeList(BaseModel):
    scopes: List[Scope]