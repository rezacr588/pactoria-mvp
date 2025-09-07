"""
Authentication schemas for Pactoria MVP
Pydantic models for auth requests and responses
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserLogin(BaseModel):
    """User login request"""

    email: EmailStr = Field(
        ...,
        description="User email address",
        json_schema_extra={"example": "john.doe@smecompany.co.uk"},
    )
    password: str = Field(
        ...,
        min_length=8,
        description="User password (minimum 8 characters)",
        json_schema_extra={"example": "SecurePass123!"},
    )

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@smecompany.co.uk",
                "password": "SecurePass123!",
            }
        }


class UserRegister(BaseModel):
    """User registration request"""

    email: EmailStr = Field(
        ..., description="User email address", example="jane.smith@techstartup.co.uk"
    )
    password: str = Field(
        ...,
        min_length=8,
        description="User password (minimum 8 characters)",
        example="MyStrongPass456!",
    )
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="User's full name",
        example="Jane Smith",
    )
    company_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Company name (optional)",
        example="Tech Startup Ltd",
    )
    timezone: Optional[str] = Field(
        "Europe/London", description="User timezone", example="Europe/London"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "email": "jane.smith@techstartup.co.uk",
                "password": "MyStrongPass456!",
                "full_name": "Jane Smith",
                "company_name": "Tech Startup Ltd",
                "timezone": "Europe/London",
            }
        }


class Token(BaseModel):
    """JWT token response"""

    access_token: str = Field(
        ...,
        description="JWT access token",
        example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    )
    token_type: str = Field("bearer", description="Token type", example="bearer")
    expires_in: int = Field(
        ..., description="Token expiration time in seconds", example=86400
    )

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNjg1NzE2ODAwfQ...",
                "token_type": "bearer",
                "expires_in": 86400,
            }
        }


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

    id: str = Field(
        ...,
        description="Unique user identifier",
        example="user_123e4567-e89b-12d3-a456-426614174000",
    )
    email: str = Field(
        ..., description="User email address", example="john.doe@smecompany.co.uk"
    )
    full_name: str = Field(..., description="User's full name", example="John Doe")
    is_active: bool = Field(..., description="User account status", example=True)
    timezone: str = Field(..., description="User timezone", example="Europe/London")
    company_id: Optional[str] = Field(
        None,
        description="Associated company ID",
        example="comp_987fcdeb-51a2-43d7-8f19-123456789abc",
    )
    created_at: datetime = Field(
        ..., description="Account creation timestamp", example="2024-01-15T09:30:00Z"
    )
    last_login_at: Optional[datetime] = Field(
        None, description="Last login timestamp", example="2024-08-31T14:20:30Z"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "user_123e4567-e89b-12d3-a456-426614174000",
                "email": "john.doe@smecompany.co.uk",
                "full_name": "John Doe",
                "is_active": True,
                "timezone": "Europe/London",
                "company_id": "comp_987fcdeb-51a2-43d7-8f19-123456789abc",
                "created_at": "2024-01-15T09:30:00Z",
                "last_login_at": "2024-08-31T14:20:30Z",
            }
        }


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
    company_number: Optional[str] = None  # Maps to registration_number in some contexts
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None
    subscription_tier: str
    max_users: int
    created_at: datetime
    
    # Add computed fields for backward compatibility
    @property
    def registration_number(self) -> Optional[str]:
        """Alias for company_number for backward compatibility"""
        return self.company_number
    
    @property
    def address(self) -> Optional[str]:
        """Combine address fields into a single string"""
        parts = []
        if self.address_line1:
            parts.append(self.address_line1)
        if self.address_line2:
            parts.append(self.address_line2)
        if self.city:
            parts.append(self.city)
        if self.county:
            parts.append(self.county)
        if self.postcode:
            parts.append(self.postcode)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts) if parts else None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response with user and token"""

    token: Token
    user: UserProfile
    company: Optional[CompanyResponse]
