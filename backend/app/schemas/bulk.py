"""
Bulk operations schema definitions for Pactoria MVP
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from uuid import UUID

from app.schemas.common import SuccessResponse


class BulkOperationType(str, Enum):
    """Types of bulk operations"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    ARCHIVE = "archive"
    RESTORE = "restore"


class BulkOperationStatus(str, Enum):
    """Status of bulk operation"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL_SUCCESS = "partial_success"


class BulkContractOperation(BaseModel):
    """Bulk operation request for contracts"""
    operation_type: BulkOperationType
    contract_ids: List[str] = Field(..., min_length=1, max_length=100)
    update_data: Optional[Dict[str, Any]] = None

    @field_validator('update_data')
    @classmethod
    def validate_update_data(cls, v, info):
        values = info.data if hasattr(info, 'data') else {}
        if values.get('operation_type') == BulkOperationType.UPDATE and not v:
            raise ValueError("update_data required for UPDATE operations")
        return v


class BulkOperationItem(BaseModel):
    """Individual item in bulk operation result"""
    item_id: str
    success: bool
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None


class BulkOperationResponse(BaseModel):
    """Response for bulk operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    operation_id: str
    operation_type: BulkOperationType
    status: BulkOperationStatus
    total_items: int
    successful_items: int
    failed_items: int
    items: List[BulkOperationItem]
    started_at: str
    completed_at: Optional[str] = None
    processing_time_seconds: Optional[float] = None


class BulkExportRequest(BaseModel):
    """Request for bulk export operations"""
    export_format: str = Field(default="csv", pattern="^(csv|xlsx|json)$")
    filters: Optional[Dict[str, Any]] = None
    include_fields: Optional[List[str]] = None
    exclude_fields: Optional[List[str]] = None


class BulkExportResponse(BaseModel):
    """Response for bulk export"""
    success: bool = Field(..., description="Whether the export was successful")
    message: str = Field(..., description="Response message")
    export_id: str
    download_url: str
    expires_at: str
    file_size_bytes: Optional[int] = None
    record_count: int


class BulkImportRequest(BaseModel):
    """Request for bulk import operations"""
    file_format: str = Field(..., pattern="^(csv|xlsx|json)$")
    mapping: Dict[str, str] = Field(..., description="Field mapping from file to system")
    validation_rules: Optional[Dict[str, Any]] = None
    skip_validation: bool = Field(default=False)


class BulkImportResponse(BaseModel):
    """Response for bulk import"""
    success: bool = Field(..., description="Whether the import was successful")
    message: str = Field(..., description="Response message")
    import_id: str
    status: BulkOperationStatus
    total_records: int
    imported_records: int
    failed_records: int
    validation_errors: List[Dict[str, Any]]
    processing_time_seconds: Optional[float] = None


# Legacy schema classes for backward compatibility
class BulkContractUpdateRequest(BulkContractOperation):
    """Legacy request for bulk contract updates"""
    pass


class BulkContractDeleteRequest(BulkContractOperation):
    """Legacy request for bulk contract deletions"""
    pass


class BulkContractExportRequest(BulkExportRequest):
    """Legacy request for bulk contract exports"""
    pass


class BulkUserInviteRequest(BaseModel):
    """Request for bulk user invitations"""
    email_addresses: List[str] = Field(..., min_length=1, max_length=50)
    role: str = Field(..., description="Role to assign to invited users")
    message: Optional[str] = None


class BulkUserRoleChangeRequest(BaseModel):
    """Request for bulk user role changes"""
    user_ids: List[str] = Field(..., min_length=1, max_length=100)
    new_role: str = Field(..., description="New role to assign")
