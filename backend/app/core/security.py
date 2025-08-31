"""
Security utilities for Pactoria MVP
JWT token management and password hashing
"""
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.core.config import settings
from app.core.datetime_utils import get_current_utc

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token configuration
ALGORITHM = settings.JWT_ALGORITHM
SECRET_KEY = settings.SECRET_KEY


def create_access_token(subject: Union[str, int], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    if expires_delta:
        expire = get_current_utc() + expires_delta
    else:
        expire = get_current_utc() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    to_encode = {"exp": expire.timestamp(), "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return subject"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = payload.get("sub")
        if token_data is None:
            return None
        return str(token_data)
    except (JWTError, ValidationError):
        return None


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    if not hashed_password or not plain_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_password_reset_token(email: str) -> str:
    """Create password reset token"""
    delta = timedelta(hours=1)  # Reset token expires in 1 hour
    now = get_current_utc()
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "sub": email, "type": "password_reset"}, 
        SECRET_KEY, 
        algorithm=ALGORITHM
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify password reset token"""
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded_token.get("type") != "password_reset":
            return None
        return decoded_token["sub"]
    except JWTError:
        return None


def generate_secure_token(length: int = 32) -> str:
    """Generate secure random token for API keys, etc."""
    import secrets
    import string
    
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))