"""
Authentication schemas for Pactoria MVP
Pydantic models for auth requests and responses
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserRegister(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    company_name: Optional[str] = Field(None, max_length=100)
    timezone: Optional[str] = "Europe/London"


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenData(BaseModel):
    """Token payload data"""
    sub: Optional[str] = None


class PasswordReset(BaseModel):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8)


class PasswordChange(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserProfile(BaseModel):
    """User profile response"""
    id: str
    email: str
    full_name: str
    is_active: bool
    timezone: str
    company_id: Optional[str]
    created_at: datetime
    last_login_at: Optional[datetime]

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """User profile update request"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    timezone: Optional[str] = None
    notification_preferences: Optional[dict] = None


class CompanyCreate(BaseModel):
    """Company creation request"""
    name: str = Field(..., min_length=2, max_length=100)
    registration_number: Optional[str] = None
    address: Optional[str] = None


class CompanyResponse(BaseModel):
    """Company response"""
    id: str
    name: str
    registration_number: Optional[str]
    address: Optional[str]
    subscription_tier: str
    max_users: int
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response with user and token"""
    token: Token
    user: UserProfile
    company: Optional[CompanyResponse]