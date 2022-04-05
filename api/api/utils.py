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

def validateIPv4(ipv4: str):
    try:
        return ipaddress.IPv4Address(ipv4)
    except ipaddress.AddressValueError:
        raise RuntimeError('Invalid IPv4!')