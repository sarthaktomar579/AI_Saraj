from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt
import bcrypt

# Fix passlib compatibility with bcrypt >= 4.0.0
if not hasattr(bcrypt, "__about__"):
    class _About:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = _About()

_orig_hashpw = bcrypt.hashpw
def _safe_hashpw(password, salt):
    if isinstance(password, str):
        password = password.encode("utf-8")
    if isinstance(password, bytes) and len(password) > 72:
        password = password[:72]
    return _orig_hashpw(password, salt)

bcrypt.hashpw = _safe_hashpw

from passlib.context import CryptContext
from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt", "django_pbkdf2_sha256"], deprecated="auto")

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
