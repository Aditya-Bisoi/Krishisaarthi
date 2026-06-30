from datetime import datetime, timedelta
from typing import Any, Union
import hashlib
import os
from jose import jwt
from backend.app.core.config import settings

def get_password_hash(password: str) -> str:
    """
    Hashes a password using PBKDF2-SHA256 with a random salt.
    Format: salt_hex$hash_hex
    """
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}${pw_hash.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a password against the stored PBKDF2-SHA256 hash.
    """
    try:
        parts = hashed_password.split("$")
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        original_hash = bytes.fromhex(parts[1])
        
        new_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return original_hash == new_hash
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Union[dict, None]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except Exception:
        return None
