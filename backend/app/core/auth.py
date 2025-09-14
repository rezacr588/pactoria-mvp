"""
Authentication dependencies for Pactoria MVP
JWT token validation and user retrieval
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import time

from app.core.database import get_db
from app.core.security import verify_token
from app.infrastructure.database.models import User, Company, UserRole

security = HTTPBearer(auto_error=False)

# Simple in-memory cache for user data (expires after 30 seconds)
# Stores user data as dict to avoid SQLAlchemy session detachment issues
_user_cache = {}
CACHE_EXPIRY_SECONDS = 30

def _cleanup_expired_cache():
    """Clean up expired cache entries"""
    current_time = time.time()
    expired_keys = [
        key for key, data in _user_cache.items()
        if current_time - data['timestamp'] >= CACHE_EXPIRY_SECONDS
    ]
    for key in expired_keys:
        _user_cache.pop(key, None)


def clear_user_cache():
    """Clear all user cache entries - useful for testing"""
    _user_cache.clear()


class AuthenticationError(HTTPException):
    """Custom authentication error"""

    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user with caching"""
    if not credentials:
        raise AuthenticationError("No authorization header provided")

    token = credentials.credentials

    # Verify token
    user_id = verify_token(token)
    if not user_id:
        raise AuthenticationError("Invalid authentication token")

    # Clean up expired cache entries periodically
    if len(_user_cache) > 100:  # Only cleanup when cache gets large
        _cleanup_expired_cache()
    
    # Check cache first
    current_time = time.time()
    cache_key = f"user_{user_id}"
    
    if cache_key in _user_cache:
        cached_data = _user_cache[cache_key]
        if current_time - cached_data['timestamp'] < CACHE_EXPIRY_SECONDS:
            # Reconstruct User object from cached data to avoid detached session issues
            user_data = cached_data['user_data']
            
            # Create a fresh User object with the cached data
            # This avoids the DetachedInstanceError by not using the original SQLAlchemy object
            user = User()
            user.id = user_data['id']
            user.email = user_data['email']
            user.full_name = user_data['full_name']
            user.is_active = user_data['is_active']
            user.is_admin = user_data['is_admin']
            user.role = user_data['role']
            user.timezone = user_data['timezone']
            user.company_id = user_data['company_id']
            user.created_at = user_data['created_at']
            user.updated_at = user_data.get('updated_at')
            user.last_login_at = user_data['last_login_at']
            user.hashed_password = user_data.get('hashed_password', '')
            user.department = user_data.get('department')
            user.notification_preferences = user_data.get('notification_preferences', {})
            
            return user

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthenticationError("User not found")

    # Check if user is active
    if not user.is_active:
        raise AuthenticationError("Inactive user")

    # Cache user data (not the SQLAlchemy object) to avoid detached session issues
    user_data = {
        'id': user.id,
        'email': user.email,
        'full_name': user.full_name,
        'is_active': user.is_active,
        'is_admin': user.is_admin,
        'role': user.role,
        'timezone': user.timezone,
        'company_id': user.company_id,
        'created_at': user.created_at,
        'updated_at': user.updated_at,
        'last_login_at': user.last_login_at,
        'hashed_password': user.hashed_password,
        'department': user.department,
        'notification_preferences': user.notification_preferences,
    }
    
    _user_cache[cache_key] = {
        'user_data': user_data,
        'timestamp': current_time
    }

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active user (redundant check for clarity)"""
    return current_user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user if they are admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return current_user


async def get_user_company(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Company:
    """Get current user's company"""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company",
        )

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Company not found"
        )

    return company


def verify_company_access(user: User, resource_company_id: str) -> bool:
    """Verify user has access to company resources"""
    return user.company_id == resource_company_id or user.is_admin


def require_company_access(user: User, resource_company_id: str):
    """Raise exception if user doesn't have company access"""
    if not verify_company_access(user, resource_company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: insufficient permissions for this company resource",
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None

    try:
        # We need to create a mock credentials object to pass to get_current_user
        # or reimplement the logic here
        token = credentials.credentials
        user_id = verify_token(token)
        if not user_id:
            return None

        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            return None

        return user
    except Exception:
        return None


# Role-based access control functions
def has_permission(user: User, required_role: UserRole) -> bool:
    """Check if user has the required role or higher"""
    if user.is_admin:
        return True

    role_hierarchy = {
        UserRole.VIEWER: 1,
        UserRole.CONTRACT_MANAGER: 2,
        UserRole.LEGAL_REVIEWER: 3,
        UserRole.ADMIN: 4,
    }

    user_level = role_hierarchy.get(user.role, 0)
    required_level = role_hierarchy.get(required_role, 0)

    return user_level >= required_level


def require_role(required_role: UserRole):
    """Decorator factory for role-based access control"""

    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. {required_role.value.title()} role or higher required.",
            )
        return current_user

    return role_dependency


# Specific role dependencies
async def get_editor_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user if they have contract manager role or higher"""
    if not has_permission(current_user, UserRole.CONTRACT_MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contract manager privileges required",
        )
    return current_user


async def get_admin_role_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user if they have admin role or are system admin"""
    if not has_permission(current_user, UserRole.ADMIN) and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return current_user


def can_modify_resource(user: User, resource_owner_id: str) -> bool:
    """Check if user can modify a resource based on ownership and role"""
    # Admins can modify anything
    if user.is_admin or user.role == UserRole.ADMIN:
        return True

    # Contract managers can modify their own resources
    if user.role == UserRole.CONTRACT_MANAGER and user.id == resource_owner_id:
        return True

    # Viewers cannot modify anything
    return False


def require_modify_permission(user: User, resource_owner_id: str):
    """Require permission to modify a resource"""
    if not can_modify_resource(user, resource_owner_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to modify this resource",
        )


# WebSocket authentication functions


def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode JWT token and return payload"""
    try:
        from app.core.security import decode_token

        return decode_token(token)
    except Exception:
        return None


def authenticate_websocket_user(token: str, db: Session) -> Optional[User]:
    """Authenticate WebSocket user from JWT token"""
    try:
        # Verify token and get user ID
        user_id = verify_token(token)
        if not user_id:
            return None

        # Get user from database
        user = db.query(User).filter(User.id == user_id, User.is_active).first()
        return user

    except Exception:
        return None
