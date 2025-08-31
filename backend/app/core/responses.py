"""
Common response patterns and formatters
Reduces duplicate response creation patterns across API endpoints
"""
from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel
from datetime import datetime

from app.core.datetime_utils import get_current_utc


class SuccessResponse(BaseModel):
    """Standard success response format"""
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = None
    
    def __init__(self, **kwargs):
        if 'timestamp' not in kwargs:
            kwargs['timestamp'] = get_current_utc()
        super().__init__(**kwargs)


class PaginatedResponse(BaseModel):
    """Standard paginated response format"""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_previous: bool
    
    @classmethod
    def create(cls, items: List[Any], total: int, page: int, size: int):
        """Create paginated response with calculated fields"""
        pages = (total + size - 1) // size if total > 0 else 0
        
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages,
            has_next=page < pages,
            has_previous=page > 1
        )


class ResponseFormatter:
    """Utility class for formatting common API responses"""
    
    @staticmethod
    def success(message: str, data: Optional[Dict[str, Any]] = None) -> SuccessResponse:
        """Create success response"""
        return SuccessResponse(message=message, data=data)
    
    @staticmethod
    def created(resource_name: str, resource_id: str, data: Optional[Dict[str, Any]] = None) -> SuccessResponse:
        """Create success response for resource creation"""
        message = f"{resource_name} created successfully"
        response_data = {"id": resource_id}
        if data:
            response_data.update(data)
        
        return SuccessResponse(message=message, data=response_data)
    
    @staticmethod
    def updated(resource_name: str, resource_id: str) -> SuccessResponse:
        """Create success response for resource update"""
        return SuccessResponse(
            message=f"{resource_name} updated successfully",
            data={"id": resource_id}
        )
    
    @staticmethod
    def deleted(resource_name: str, resource_id: str) -> SuccessResponse:
        """Create success response for resource deletion"""
        return SuccessResponse(
            message=f"{resource_name} deleted successfully",
            data={"id": resource_id}
        )
    
    @staticmethod
    def operation_completed(operation: str, details: Optional[Dict[str, Any]] = None) -> SuccessResponse:
        """Create success response for completed operations"""
        return SuccessResponse(
            message=f"{operation} completed successfully",
            data=details
        )
    
    @staticmethod
    def paginated_list(
        items: List[Any], 
        total: int, 
        page: int, 
        size: int,
        resource_name: str = "items"
    ) -> PaginatedResponse:
        """Create paginated list response"""
        return PaginatedResponse.create(items, total, page, size)


class MessageTemplates:
    """Common message templates to ensure consistency"""
    
    # Resource operations
    CREATED = "{resource} created successfully"
    UPDATED = "{resource} updated successfully"  
    DELETED = "{resource} deleted successfully"
    NOT_FOUND = "{resource} not found"
    
    # Authentication/Authorization
    UNAUTHORIZED = "Authentication required"
    FORBIDDEN = "Access denied: insufficient permissions"
    INVALID_CREDENTIALS = "Invalid email or password"
    ACCOUNT_INACTIVE = "Account is inactive"
    
    # Business operations
    OPERATION_COMPLETED = "{operation} completed successfully"
    OPERATION_FAILED = "{operation} failed: {reason}"
    
    # Validation
    INVALID_INPUT = "Invalid input provided"
    MISSING_REQUIRED_FIELD = "{field} is required"
    INVALID_FORMAT = "Invalid {field} format"
    
    # Company access
    COMPANY_ACCESS_REQUIRED = "User must be associated with a company"
    COMPANY_ACCESS_DENIED = "Access denied: insufficient permissions for company resource"
    
    # Contract operations
    CONTRACT_GENERATED = "Contract content generated successfully"
    CONTRACT_ANALYZED = "Contract compliance analyzed successfully"
    CONTRACT_ACTIVATED = "Contract activated successfully"
    CONTRACT_TERMINATED = "Contract terminated successfully"
    
    @classmethod
    def format(cls, template: str, **kwargs) -> str:
        """Format message template with parameters"""
        return template.format(**kwargs)


class APIResponse:
    """Wrapper for creating consistent API responses"""
    
    def __init__(self, data: Any = None, message: str = None, status_code: int = 200):
        self.data = data
        self.message = message
        self.status_code = status_code
        self.timestamp = get_current_utc()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format"""
        response = {
            "timestamp": self.timestamp,
            "status_code": self.status_code
        }
        
        if self.message:
            response["message"] = self.message
        
        if self.data is not None:
            response["data"] = self.data
        
        return response
    
    @classmethod
    def success(cls, data: Any = None, message: str = "Operation completed successfully") -> "APIResponse":
        """Create success response"""
        return cls(data=data, message=message, status_code=200)
    
    @classmethod
    def created(cls, data: Any = None, message: str = "Resource created successfully") -> "APIResponse":
        """Create created response"""
        return cls(data=data, message=message, status_code=201)
    
    @classmethod
    def no_content(cls, message: str = "Operation completed successfully") -> "APIResponse":
        """Create no content response"""
        return cls(data=None, message=message, status_code=204)