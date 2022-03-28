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
    state: bool
    since: Optional[datetime.datetime]

class OAuth2Login(BaseModel):
    access_token: str
    token_type: datetime.datetime = 'bearer'