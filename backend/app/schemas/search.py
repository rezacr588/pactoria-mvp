"""
Pydantic schemas for advanced search functionality
Defines request/response models for search operations
"""
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

from app.schemas.contracts import ContractResponse
# from app.schemas.auth import UserResponse  # Not used in search results


class SearchOperator(str, Enum):
    """Search query operators"""
    AND = "AND"
    OR = "OR"
    NOT = "NOT"


class SortDirection(str, Enum):
    """Sort directions"""
    ASC = "ASC"
    DESC = "DESC"


class DateRangeFilter(BaseModel):
    """Date range filter"""
    gte: Optional[datetime] = Field(None, description="Greater than or equal to date")
    lte: Optional[datetime] = Field(None, description="Less than or equal to date")
    eq: Optional[datetime] = Field(None, description="Exact date match")
    
    @validator('lte')
    def validate_date_range(cls, v, values):
        """Ensure end date is after start date"""
        if v is not None and 'gte' in values and values['gte'] is not None:
            if v < values['gte']:
                raise ValueError('End date must be after start date')
        return v
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NumericRangeFilter(BaseModel):
    """Numeric range filter"""
    gte: Optional[float] = Field(None, description="Greater than or equal to value")
    lte: Optional[float] = Field(None, description="Less than or equal to value")
    eq: Optional[float] = Field(None, description="Exact value match")
    
    @validator('lte')
    def validate_numeric_range(cls, v, values):
        """Ensure max value is greater than min value"""
        if v is not None and 'gte' in values and values['gte'] is not None:
            if v < values['gte']:
                raise ValueError('Maximum value must be greater than minimum value')
        return v


class SortCriteria(BaseModel):
    """Sort criteria for search results"""
    field: str = Field(..., description="Field to sort by")
    direction: SortDirection = Field(SortDirection.ASC, description="Sort direction")
    
    @validator('field')
    def validate_sort_field(cls, v):
        """Validate sort field is allowed"""
        allowed_fields = {
            'id', 'title', 'status', 'contract_type', 'client_name', 'supplier_name',
            'contract_value', 'start_date', 'end_date', 'created_at', 'updated_at',
            'version', 'compliance_score', 'risk_score'
        }
        if v not in allowed_fields:
            raise ValueError(f'Invalid sort field. Allowed: {allowed_fields}')
        return v


class ContractSearchFilters(BaseModel):
    """Advanced filters for contract search"""
    status: Optional[List[str]] = Field(None, description="Contract statuses to filter by")
    contract_type: Optional[List[str]] = Field(None, description="Contract types to filter by")
    client_name: Optional[str] = Field(None, description="Client name to filter by")
    supplier_name: Optional[str] = Field(None, description="Supplier name to filter by")
    contract_value: Optional[NumericRangeFilter] = Field(None, description="Contract value range")
    start_date: Optional[DateRangeFilter] = Field(None, description="Start date range")
    end_date: Optional[DateRangeFilter] = Field(None, description="End date range")
    created_at: Optional[DateRangeFilter] = Field(None, description="Creation date range")
    updated_at: Optional[DateRangeFilter] = Field(None, description="Last updated date range")
    has_compliance_score: Optional[bool] = Field(None, description="Filter by compliance score presence")
    compliance_score: Optional[NumericRangeFilter] = Field(None, description="Compliance score range")
    risk_score: Optional[NumericRangeFilter] = Field(None, description="Risk score range")
    template_id: Optional[List[str]] = Field(None, description="Template IDs to filter by")
    created_by: Optional[List[str]] = Field(None, description="Created by user IDs")
    
    @validator('status')
    def validate_status_values(cls, v):
        """Validate status values"""
        if v is not None:
            valid_statuses = {'DRAFT', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'TERMINATED'}
            invalid_statuses = set(v) - valid_statuses
            if invalid_statuses:
                raise ValueError(f'Invalid status values: {invalid_statuses}')
        return v
    
    @validator('contract_type')
    def validate_contract_type_values(cls, v):
        """Validate contract type values"""
        if v is not None:
            valid_types = {
                'SERVICE_AGREEMENT', 'EMPLOYMENT_CONTRACT', 'SUPPLIER_AGREEMENT',
                'NDA', 'TERMS_CONDITIONS', 'CONSULTANCY', 'PARTNERSHIP', 'LEASE'
            }
            invalid_types = set(v) - valid_types
            if invalid_types:
                raise ValueError(f'Invalid contract type values: {invalid_types}')
        return v


class UserSearchFilters(BaseModel):
    """Advanced filters for user search"""
    role: Optional[List[str]] = Field(None, description="User roles to filter by")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    department: Optional[List[str]] = Field(None, description="Departments to filter by")
    created_at: Optional[DateRangeFilter] = Field(None, description="User creation date range")
    last_login_at: Optional[DateRangeFilter] = Field(None, description="Last login date range")
    
    @validator('role')
    def validate_role_values(cls, v):
        """Validate role values"""
        if v is not None:
            valid_roles = {'ADMIN', 'CONTRACT_MANAGER', 'LEGAL_REVIEWER', 'VIEWER'}
            invalid_roles = set(v) - valid_roles
            if invalid_roles:
                raise ValueError(f'Invalid role values: {invalid_roles}')
        return v


class TemplateSearchFilters(BaseModel):
    """Advanced filters for template search"""
    contract_type: Optional[List[str]] = Field(None, description="Contract types to filter by")
    category: Optional[List[str]] = Field(None, description="Template categories to filter by")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    suitable_for: Optional[List[str]] = Field(None, description="Industries or use cases")
    version: Optional[str] = Field(None, description="Template version")
    
    @validator('contract_type')
    def validate_contract_type_values(cls, v):
        """Validate contract type values"""
        if v is not None:
            valid_types = {
                'SERVICE_AGREEMENT', 'EMPLOYMENT_CONTRACT', 'SUPPLIER_AGREEMENT',
                'NDA', 'TERMS_CONDITIONS', 'CONSULTANCY', 'PARTNERSHIP', 'LEASE'
            }
            invalid_types = set(v) - valid_types
            if invalid_types:
                raise ValueError(f'Invalid contract type values: {invalid_types}')
        return v


class AdvancedSearchRequest(BaseModel):
    """Advanced search request model"""
    query: str = Field("", description="Search query text", max_length=500)
    operator: SearchOperator = Field(SearchOperator.AND, description="Query operator for multiple terms")
    fields: Optional[List[str]] = Field(None, description="Fields to search in")
    filters: Union[ContractSearchFilters, UserSearchFilters, TemplateSearchFilters] = Field(
        ..., description="Advanced filters"
    )
    sort: Optional[List[SortCriteria]] = Field(None, description="Sort criteria")
    page: int = Field(1, ge=1, le=1000, description="Page number")
    size: int = Field(20, ge=1, le=1000, description="Results per page")
    select_fields: Optional[List[str]] = Field(None, description="Specific fields to return")
    include_total: bool = Field(True, description="Include total count in results")
    highlight: bool = Field(False, description="Highlight matching terms in results")
    
    @validator('query')
    def validate_query(cls, v):
        """Validate search query"""
        if v and len(v.strip()) < 2:
            raise ValueError('Search query must be at least 2 characters long')
        return v.strip()
    
    @validator('fields')
    def validate_search_fields(cls, v):
        """Validate searchable fields"""
        if v is not None:
            contract_fields = {
                'title', 'client_name', 'supplier_name', 'plain_english_input',
                'generated_content', 'final_content'
            }
            user_fields = {'email', 'full_name', 'department'}
            template_fields = {'name', 'description', 'category', 'legal_notes'}
            
            all_valid_fields = contract_fields | user_fields | template_fields
            invalid_fields = set(v) - all_valid_fields
            if invalid_fields:
                raise ValueError(f'Invalid search fields: {invalid_fields}')
        return v


class ContractSearchRequest(BaseModel):
    """Specific contract search request"""
    query: str = Field("", description="Search query text", max_length=500)
    operator: SearchOperator = Field(SearchOperator.AND, description="Query operator")
    fields: Optional[List[str]] = Field(None, description="Fields to search in")
    filters: ContractSearchFilters = Field(ContractSearchFilters(), description="Contract filters")
    sort: Optional[List[SortCriteria]] = Field(None, description="Sort criteria")
    page: int = Field(1, ge=1, le=1000, description="Page number")
    size: int = Field(20, ge=1, le=1000, description="Results per page")
    select_fields: Optional[List[str]] = Field(None, description="Specific fields to return")
    include_total: bool = Field(True, description="Include total count")
    highlight: bool = Field(False, description="Highlight matching terms")


class UserSearchRequest(BaseModel):
    """Specific user search request"""
    query: str = Field("", description="Search query text", max_length=500)
    operator: SearchOperator = Field(SearchOperator.AND, description="Query operator")
    fields: Optional[List[str]] = Field(None, description="Fields to search in")
    filters: UserSearchFilters = Field(UserSearchFilters(), description="User filters")
    sort: Optional[List[SortCriteria]] = Field(None, description="Sort criteria")
    page: int = Field(1, ge=1, le=1000, description="Page number")
    size: int = Field(20, ge=1, le=1000, description="Results per page")
    select_fields: Optional[List[str]] = Field(None, description="Specific fields to return")
    include_total: bool = Field(True, description="Include total count")


class TemplateSearchRequest(BaseModel):
    """Specific template search request"""
    query: str = Field("", description="Search query text", max_length=500)
    operator: SearchOperator = Field(SearchOperator.AND, description="Query operator")
    fields: Optional[List[str]] = Field(None, description="Fields to search in")
    filters: TemplateSearchFilters = Field(TemplateSearchFilters(), description="Template filters")
    sort: Optional[List[SortCriteria]] = Field(None, description="Sort criteria")
    page: int = Field(1, ge=1, le=1000, description="Page number")
    size: int = Field(20, ge=1, le=1000, description="Results per page")
    select_fields: Optional[List[str]] = Field(None, description="Specific fields to return")
    include_total: bool = Field(True, description="Include total count")


class SearchHighlight(BaseModel):
    """Search result highlighting"""
    field: str = Field(..., description="Field name that was highlighted")
    fragments: List[str] = Field(..., description="Highlighted text fragments")


class ContractSearchResult(BaseModel):
    """Contract search result item"""
    id: str
    title: str
    contract_type: str
    status: str
    client_name: Optional[str] = None
    supplier_name: Optional[str] = None
    contract_value: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    version: int
    compliance_score: Optional[float] = None
    risk_score: Optional[float] = None
    highlights: Optional[List[SearchHighlight]] = Field(None, description="Search term highlights")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserSearchResult(BaseModel):
    """User search result item"""
    id: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    highlights: Optional[List[SearchHighlight]] = Field(None, description="Search term highlights")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TemplateSearchResult(BaseModel):
    """Template search result item"""
    id: str
    name: str
    category: str
    contract_type: str
    description: str
    version: str
    is_active: bool
    suitable_for: List[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    highlights: Optional[List[SearchHighlight]] = Field(None, description="Search term highlights")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SearchResults(BaseModel):
    """Generic search results container"""
    items: List[Union[ContractSearchResult, UserSearchResult, TemplateSearchResult]]
    total: Optional[int] = Field(None, description="Total number of results")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Results per page")
    pages: Optional[int] = Field(None, description="Total number of pages")
    took_ms: float = Field(..., description="Search execution time in milliseconds")
    query: str = Field(..., description="Original search query")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ContractSearchResults(BaseModel):
    """Contract search results"""
    items: List[ContractSearchResult]
    total: Optional[int] = Field(None, description="Total number of results")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Results per page")
    pages: Optional[int] = Field(None, description="Total number of pages")
    took_ms: float = Field(..., description="Search execution time in milliseconds")
    query: str = Field(..., description="Original search query")
    filters_applied: Dict[str, Any] = Field({}, description="Applied filters summary")


class UserSearchResults(BaseModel):
    """User search results"""
    items: List[UserSearchResult]
    total: Optional[int] = Field(None, description="Total number of results")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Results per page")
    pages: Optional[int] = Field(None, description="Total number of pages")
    took_ms: float = Field(..., description="Search execution time in milliseconds")
    query: str = Field(..., description="Original search query")
    filters_applied: Dict[str, Any] = Field({}, description="Applied filters summary")


class TemplateSearchResults(BaseModel):
    """Template search results"""
    items: List[TemplateSearchResult]
    total: Optional[int] = Field(None, description="Total number of results")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Results per page")
    pages: Optional[int] = Field(None, description="Total number of pages")
    took_ms: float = Field(..., description="Search execution time in milliseconds")
    query: str = Field(..., description="Original search query")
    filters_applied: Dict[str, Any] = Field({}, description="Applied filters summary")