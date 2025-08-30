"""
Authentication endpoints for Pactoria MVP
User registration, login, profile management
"""
from datetime import datetime, timedelta
from app.core.datetime_utils import get_current_utc
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import (
    create_access_token, 
    get_password_hash, 
    verify_password,
    create_password_reset_token,
    verify_password_reset_token
)
from app.core.auth import get_current_user, get_user_company
from app.core.config import settings
from app.infrastructure.database.models import User, Company, SubscriptionTier
from app.schemas.auth import (
    UserLogin, UserRegister, Token, PasswordReset, PasswordResetConfirm,
    PasswordChange, UserProfile, UserUpdate, CompanyCreate, CompanyResponse,
    AuthResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """Register new user and optionally create company"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create company if provided
    company = None
    if user_data.company_name:
        company = Company(
            name=user_data.company_name,
            subscription_tier=SubscriptionTier.STARTER,
            max_users=settings.MAX_USERS_PER_ACCOUNT
        )
        db.add(company)
        db.flush()  # Get company ID without committing
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        timezone=user_data.timezone or "Europe/London",
        company_id=company.id if company else None,
        is_active=True
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token
    access_token = create_access_token(subject=user.id)
    token = Token(
        access_token=access_token,
        expires_in=settings.JWT_EXPIRATION_HOURS * 3600
    )
    
    # Update last login
    user.last_login_at = get_current_utc()
    db.commit()
    
    return AuthResponse(
        token=token,
        user=UserProfile.model_validate(user),
        company=CompanyResponse.model_validate(company) if company else None
    )


@router.post("/login", response_model=AuthResponse)
async def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user and return access token"""
    
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive"
        )
    
    # Get user's company
    company = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
    
    # Create access token
    access_token = create_access_token(subject=user.id)
    token = Token(
        access_token=access_token,
        expires_in=settings.JWT_EXPIRATION_HOURS * 3600
    )
    
    # Update last login
    user.last_login_at = get_current_utc()
    db.commit()
    
    return AuthResponse(
        token=token,
        user=UserProfile.model_validate(user),
        company=CompanyResponse.model_validate(company) if company else None
    )


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return UserProfile.model_validate(current_user)


@router.put("/me", response_model=UserProfile)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    
    # Update user fields if provided
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.timezone is not None:
        current_user.timezone = user_update.timezone
    if user_update.notification_preferences is not None:
        current_user.notification_preferences = user_update.notification_preferences
    
    current_user.updated_at = get_current_utc()
    db.commit()
    db.refresh(current_user)
    
    return UserProfile.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.updated_at = get_current_utc()
    db.commit()
    
    return {"message": "Password updated successfully"}


@router.post("/forgot-password")
async def forgot_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """Send password reset token"""
    
    # Find user by email
    user = db.query(User).filter(User.email == reset_data.email).first()
    if not user:
        # Don't reveal if email exists - security best practice
        return {"message": "If an account with this email exists, a reset link has been sent"}
    
    # Create reset token
    reset_token = create_password_reset_token(user.email)
    
    # TODO: Send email with reset token
    # For now, return token in response (development only)
    if settings.DEBUG:
        return {
            "message": "Password reset token generated",
            "reset_token": reset_token  # Remove in production
        }
    
    return {"message": "If an account with this email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password with token"""
    
    # Verify reset token
    email = verify_password_reset_token(reset_data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.updated_at = get_current_utc()
    db.commit()
    
    return {"message": "Password reset successfully"}


@router.get("/company", response_model=CompanyResponse)
async def get_user_company(
    company: Company = Depends(get_user_company)
):
    """Get current user's company"""
    return CompanyResponse.model_validate(company)


@router.post("/company", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create company for current user"""
    
    # Check if user already has a company
    if current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already associated with a company"
        )
    
    # Create company
    company = Company(
        name=company_data.name,
        registration_number=company_data.registration_number,
        address=company_data.address,
        subscription_tier=SubscriptionTier.STARTER,
        max_users=settings.MAX_USERS_PER_ACCOUNT
    )
    
    db.add(company)
    db.flush()
    
    # Associate user with company
    current_user.company_id = company.id
    current_user.updated_at = get_current_utc()
    
    db.commit()
    db.refresh(company)
    
    return CompanyResponse.model_validate(company)