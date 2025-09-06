"""
Common schemas for Pactoria MVP
Error responses, pagination, and shared models
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ErrorDetail(BaseModel):
    """Individual error detail"""

    loc: List[str] = Field(
        ..., description="Error location path", example=["body", "email"]
    )
    msg: str = Field(..., description="Error message", example="field required")
    type: str = Field(..., description="Error type", example="value_error.missing")


class ValidationError(BaseModel):
    """Validation error response"""

    detail: List[ErrorDetail] = Field(..., description="List of validation errors")

    class Config:
        json_schema_extra = {
            "example": {
                "detail": [
                    {
                        "loc": ["body", "email"],
                        "msg": "field required",
                        "type": "value_error.missing",
                    },
                    {
                        "loc": ["body", "password"],
                        "msg": "ensure this value has at least 8 characters",
                        "type": "value_error.any_str.min_length",
                    },
                ]
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response"""

    detail: str = Field(..., description="Error message", example="Resource not found")
    error_code: Optional[str] = Field(
        None,
        description="Application-specific error code",
        example="RESOURCE_NOT_FOUND",
    )
    path: Optional[str] = Field(
        None, description="Request path", example="/api/v1/contracts/invalid-id"
    )
    method: Optional[str] = Field(None, description="HTTP method", example="GET")
    timestamp: Optional[datetime] = Field(
        None, description="Error timestamp", example="2024-08-31T14:20:30Z"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "detail": "Resource not found",
                "error_code": "RESOURCE_NOT_FOUND",
                "path": "/api/v1/contracts/invalid-id",
                "method": "GET",
                "timestamp": "2024-08-31T14:20:30Z",
            }
        }


class UnauthorizedError(BaseModel):
    """401 Unauthorized error response"""

    detail: str = Field("Not authenticated", description="Error message")

    class Config:
        json_schema_extra = {"example": {"detail": "Not authenticated"}}


class ForbiddenError(BaseModel):
    """403 Forbidden error response"""

    detail: str = Field("Insufficient permissions", description="Error message")

    class Config:
        json_schema_extra = {"example": {"detail": "Insufficient permissions"}}


class NotFoundError(BaseModel):
    """404 Not Found error response"""

    detail: str = Field("Resource not found", description="Error message")

    class Config:
        json_schema_extra = {"example": {"detail": "Resource not found"}}


class ConflictError(BaseModel):
    """409 Conflict error response"""

    detail: str = Field("Resource conflict", description="Error message")

    class Config:
        json_schema_extra = {"example": {"detail": "Email already registered"}}


class ServerError(BaseModel):
    """500 Internal Server Error response"""

    detail: str = Field("Internal server error", description="Error message")

    class Config:
        json_schema_extra = {"example": {"detail": "Internal server error"}}


class PaginationParams(BaseModel):
    """Pagination parameters"""

    page: int = Field(1, ge=1, description="Page number (1-based)", example=1)
    size: int = Field(
        20, ge=1, le=100, description="Items per page (max 100)", example=20
    )


class PaginationInfo(BaseModel):
    """Pagination metadata"""

    page: int = Field(..., description="Current page number", example=1)
    size: int = Field(..., description="Items per page", example=20)
    total: int = Field(..., description="Total number of items", example=150)
    pages: int = Field(..., description="Total number of pages", example=8)
    has_next: bool = Field(
        ..., description="Whether there is a next page", example=True
    )
    has_prev: bool = Field(
        ..., description="Whether there is a previous page", example=False
    )

    class Config:
        json_schema_extra = {
            "example": {
                "page": 1,
                "size": 20,
                "total": 150,
                "pages": 8,
                "has_next": True,
                "has_prev": False,
            }
        }


class SuccessResponse(BaseModel):
    """Generic success response"""

    message: str = Field(
        ..., description="Success message", example="Operation completed successfully"
    )

    class Config:
        json_schema_extra = {"example": {"message": "Operation completed successfully"}}


class HealthResponse(BaseModel):
    """Health check response"""

    status: str = Field(..., description="Health status", example="healthy")
    timestamp: float = Field(
        ..., description="Response timestamp", example=1693564830.123
    )
    version: str = Field(..., description="API version", example="0.1.0-mvp")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": 1693564830.123,
                "version": "0.1.0-mvp",
            }
        }
