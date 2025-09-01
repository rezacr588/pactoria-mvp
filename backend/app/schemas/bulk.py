"""
Pydantic schemas for bulk operations
Defines request/response models for bulk contract and user operations
"""
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

# from app.schemas.common import BaseResponse  # Not needed


class BulkOperationFormat(str, Enum):
    """Export formats for bulk operations"""
    CSV = "CSV"
    EXCEL = "EXCEL" 
    PDF = "PDF"
    JSON = "JSON"


class ContractBulkUpdateFields(BaseModel):
    """Fields that can be bulk updated for contracts"""
    status: Optional[str] = None
    client_name: Optional[str] = None
    supplier_name: Optional[str] = None
    contract_value: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    final_content: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BulkContractUpdateRequest(BaseModel):
    """Request model for bulk contract updates"""
    contract_ids: List[str] = Field(..., min_items=1, max_items=1000, description="List of contract IDs to update")
    updates: ContractBulkUpdateFields = Field(..., description="Fields to update")
    
    @validator('contract_ids')
    def validate_contract_ids(cls, v):
        """Validate contract IDs are not empty"""
        if not all(id.strip() for id in v):
            raise ValueError("Contract IDs cannot be empty")
        return v


class BulkContractDeleteRequest(BaseModel):
    """Request model for bulk contract deletion (soft delete)"""
    contract_ids: List[str] = Field(..., min_items=1, max_items=1000, description="List of contract IDs to delete")
    deletion_reason: Optional[str] = Field(None, max_length=500, description="Reason for deletion")
    hard_delete: bool = Field(False, description="Whether to perform hard delete (admin only)")
    
    @validator('contract_ids')
    def validate_contract_ids(cls, v):
        """Validate contract IDs are not empty"""
        if not all(id.strip() for id in v):
            raise ValueError("Contract IDs cannot be empty")
        return v


class BulkContractExportRequest(BaseModel):
    """Request model for bulk contract export"""
    contract_ids: List[str] = Field(..., min_items=1, max_items=10000, description="List of contract IDs to export")
    format: BulkOperationFormat = Field(BulkOperationFormat.CSV, description="Export format")
    fields: Optional[List[str]] = Field(None, description="Specific fields to export (default: all)")
    include_content: bool = Field(False, description="Include full contract content in export")
    include_versions: bool = Field(False, description="Include version history")
    
    @validator('contract_ids')
    def validate_contract_ids(cls, v):
        """Validate contract IDs are not empty"""
        if not all(id.strip() for id in v):
            raise ValueError("Contract IDs cannot be empty")
        return v
    
    @validator('fields')
    def validate_fields(cls, v):
        """Validate export fields are valid"""
        if v is not None:
            valid_fields = {
                'title', 'status', 'contract_type', 'client_name', 'supplier_name',
                'contract_value', 'currency', 'start_date', 'end_date', 'created_at',
                'updated_at', 'version', 'compliance_score', 'risk_score'
            }
            invalid_fields = set(v) - valid_fields
            if invalid_fields:
                raise ValueError(f"Invalid export fields: {invalid_fields}")
        return v


class UserInvitation(BaseModel):
    """Individual user invitation"""
    email: str = Field(..., description="User email address")
    full_name: str = Field(..., min_length=1, max_length=100, description="User full name")
    role: str = Field(..., description="User role in the system")
    department: Optional[str] = Field(None, max_length=100, description="User department")
    send_email: bool = Field(True, description="Whether to send invitation email")
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        if '@' not in v or '.' not in v.split('@')[1]:
            raise ValueError("Invalid email format")
        return v.lower().strip()
    
    @validator('role')
    def validate_role(cls, v):
        """Validate role is valid"""
        valid_roles = {'ADMIN', 'CONTRACT_MANAGER', 'LEGAL_REVIEWER', 'VIEWER'}
        if v.upper() not in valid_roles:
            raise ValueError(f"Invalid role. Must be one of: {valid_roles}")
        return v.upper()


class BulkUserInviteRequest(BaseModel):
    """Request model for bulk user invitations"""
    invitations: List[UserInvitation] = Field(..., min_items=1, max_items=100, description="List of user invitations")
    
    @validator('invitations')
    def validate_unique_emails(cls, v):
        """Ensure email addresses are unique within the batch"""
        emails = [inv.email for inv in v]
        if len(emails) != len(set(emails)):
            raise ValueError("Duplicate email addresses in invitation list")
        return v


class BulkUserRoleChangeRequest(BaseModel):
    """Request model for bulk user role changes"""
    user_ids: List[str] = Field(..., min_items=1, max_items=1000, description="List of user IDs")
    new_role: str = Field(..., description="New role to assign")
    
    @validator('user_ids')
    def validate_user_ids(cls, v):
        """Validate user IDs are not empty"""
        if not all(id.strip() for id in v):
            raise ValueError("User IDs cannot be empty")
        return v
    
    @validator('new_role')
    def validate_role(cls, v):
        """Validate role is valid"""
        valid_roles = {'ADMIN', 'CONTRACT_MANAGER', 'LEGAL_REVIEWER', 'VIEWER'}
        if v.upper() not in valid_roles:
            raise ValueError(f"Invalid role. Must be one of: {valid_roles}")
        return v.upper()


class BulkOperationError(BaseModel):
    """Individual operation error"""
    resource_id: str = Field(..., description="ID of the resource that failed")
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="Human readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class BulkOperationResponse(BaseModel):
    """Response model for bulk operations"""
    operation_type: str = Field(..., description="Type of bulk operation performed")
    total_requested: int = Field(..., description="Total number of items requested for processing")
    success_count: int = Field(..., description="Number of items processed successfully")
    failed_count: int = Field(..., description="Number of items that failed processing")
    processing_time_ms: float = Field(..., description="Total processing time in milliseconds")
    updated_ids: Optional[List[str]] = Field(None, description="IDs of successfully updated resources")
    deleted_ids: Optional[List[str]] = Field(None, description="IDs of successfully deleted resources")
    invited_emails: Optional[List[str]] = Field(None, description="Email addresses successfully invited")
    errors: Optional[List[BulkOperationError]] = Field(None, description="Details of any errors that occurred")
    warnings: Optional[List[str]] = Field(None, description="Non-fatal warnings")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BulkExportResponse(BaseModel):
    """Response model for bulk export operations"""
    export_id: str = Field(..., description="Unique identifier for the export")
    format: BulkOperationFormat = Field(..., description="Export format used")
    total_records: int = Field(..., description="Total number of records exported")
    file_size_bytes: Optional[int] = Field(None, description="Size of generated file in bytes")
    download_url: Optional[str] = Field(None, description="URL to download the exported file")
    expires_at: Optional[datetime] = Field(None, description="When the download URL expires")
    processing_time_ms: float = Field(..., description="Time taken to generate export")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BulkOperationStatus(BaseModel):
    """Status check for long-running bulk operations"""
    operation_id: str = Field(..., description="Bulk operation identifier")
    status: str = Field(..., description="Current status (PENDING, PROCESSING, COMPLETED, FAILED)")
    progress_percentage: float = Field(..., ge=0, le=100, description="Progress percentage")
    message: Optional[str] = Field(None, description="Current status message")
    started_at: datetime = Field(..., description="When the operation started")
    completed_at: Optional[datetime] = Field(None, description="When the operation completed")
    result: Optional[BulkOperationResponse] = Field(None, description="Final result if completed")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }