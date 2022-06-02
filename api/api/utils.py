from typing import List
import re
import ipaddress

def validateToken(key: str):
    if re.match(r'^[A-z0-9]{32}$', key) is None:
        raise RuntimeError('Invalid api key!')
    return key

def validateUsername(username: str):
    if re.match(r'^[a-z0-9\.]{4,32}$', username) is None:
        raise RuntimeError('Invalid username!')
    return username

def validateIPName(name: str):
    if len(name) < 4 or len(name) > 32:
        raise RuntimeError('Invalid name!')
    return name

def validateIPv4(ipv4: str) -> ipaddress.IPv4Address:
    try:
        return ipaddress.IPv4Address(ipv4)
    except ipaddress.AddressValueError:
        raise RuntimeError('Invalid IPv4!')

def rejectIPv4(parsedIP: ipaddress.IPv4Address, allowPrivate: bool) -> List[str]:
    rejectReasons = list()
    if parsedIP.is_reserved: rejectReasons.append('reserved')
    if parsedIP.is_loopback: rejectReasons.append('loopback')
    if parsedIP.is_link_local: rejectReasons.append('link_local')
    if parsedIP.is_multicast: rejectReasons.append('multicast')
    if not allowPrivate and parsedIP.is_private:
        rejectReasons.append('private')
    return rejectReasons