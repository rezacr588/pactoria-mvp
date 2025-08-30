"""
Contract schemas for Pactoria MVP
Pydantic models for contract requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ContractTypeEnum(str, Enum):
    """Contract type enumeration"""
    SERVICE_AGREEMENT = "service_agreement"
    EMPLOYMENT_CONTRACT = "employment_contract"
    SUPPLIER_AGREEMENT = "supplier_agreement"
    NDA = "nda"
    TERMS_CONDITIONS = "terms_conditions"
    CONSULTANCY = "consultancy"
    PARTNERSHIP = "partnership"
    LEASE = "lease"


class ContractStatusEnum(str, Enum):
    """Contract status enumeration"""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class ContractCreate(BaseModel):
    """Contract creation request"""
    title: str = Field(..., min_length=1, max_length=200)
    contract_type: ContractTypeEnum
    plain_english_input: str = Field(..., min_length=10)
    client_name: Optional[str] = Field(None, max_length=100)
    client_email: Optional[str] = None
    supplier_name: Optional[str] = Field(None, max_length=100)
    contract_value: Optional[float] = Field(None, gt=0)
    currency: str = "GBP"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    template_id: Optional[str] = None


class ContractUpdate(BaseModel):
    """Contract update request"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    status: Optional[ContractStatusEnum] = None
    client_name: Optional[str] = Field(None, max_length=100)
    client_email: Optional[str] = None
    supplier_name: Optional[str] = Field(None, max_length=100)
    contract_value: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    final_content: Optional[str] = None


class ContractGenerate(BaseModel):
    """Contract AI generation request"""
    contract_id: str
    regenerate: bool = False


class ContractResponse(BaseModel):
    """Contract response model"""
    id: str
    title: str
    contract_type: str
    status: str
    plain_english_input: Optional[str]
    generated_content: Optional[str]
    final_content: Optional[str]
    client_name: Optional[str]
    client_email: Optional[str]
    supplier_name: Optional[str]
    contract_value: Optional[float]
    currency: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    version: int
    is_current_version: bool
    company_id: str
    template_id: Optional[str]
    created_by: str
    ai_generation_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ContractListResponse(BaseModel):
    """Contract list response"""
    contracts: List[ContractResponse]
    total: int
    page: int
    size: int
    pages: int


class AIGenerationResponse(BaseModel):
    """AI generation response"""
    id: str
    model_name: str
    model_version: Optional[str]
    input_prompt: str
    generated_content: str
    processing_time_ms: Optional[float]
    token_usage: Optional[Dict[str, int]]
    confidence_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class ComplianceScoreResponse(BaseModel):
    """Compliance score response"""
    id: str
    contract_id: str
    overall_score: float
    gdpr_compliance: Optional[float]
    employment_law_compliance: Optional[float]
    consumer_rights_compliance: Optional[float]
    commercial_terms_compliance: Optional[float]
    risk_score: Optional[int]
    risk_factors: List[str]
    recommendations: List[str]
    analysis_date: datetime
    analysis_version: Optional[str]

    class Config:
        from_attributes = True


class ContractVersionResponse(BaseModel):
    """Contract version response"""
    id: str
    contract_id: str
    version_number: int
    content: str
    change_summary: Optional[str]
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class ContractAnalysisRequest(BaseModel):
    """Contract compliance analysis request"""
    contract_id: str
    force_reanalysis: bool = False


class TemplateResponse(BaseModel):
    """Template response"""
    id: str
    name: str
    category: str
    contract_type: str
    description: str
    template_content: str
    compliance_features: List[str]
    legal_notes: Optional[str]
    version: str
    is_active: bool
    suitable_for: List[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ContractSearchParams(BaseModel):
    """Contract search parameters"""
    query: Optional[str] = None
    contract_type: Optional[ContractTypeEnum] = None
    status: Optional[ContractStatusEnum] = None
    client_name: Optional[str] = None
    supplier_name: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None