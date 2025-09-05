"""
Contract schemas for Pactoria MVP
Pydantic models for contract requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Import domain enums as the single source of truth
from app.domain.value_objects import ContractType, ContractStatus

# Create aliases for backwards compatibility with API contracts
ContractTypeEnum = ContractType
ContractStatusEnum = ContractStatus


class ContractCreate(BaseModel):
    """Contract creation request"""
    title: str = Field(
        ..., 
        min_length=1, 
        max_length=200,
        description="Contract title or name",
        example="Professional Software Development Services Agreement"
    )
    contract_type: ContractTypeEnum = Field(
        ...,
        description="Type of contract being created",
        example=ContractTypeEnum.SERVICE_AGREEMENT
    )
    plain_english_input: str = Field(
        ..., 
        min_length=10,
        description="Plain English description of the contract requirements",
        example="I need a service agreement for software development services. The project involves building a web application with React and Node.js. Payment should be monthly, with 30-day payment terms. The contract should include IP ownership clauses and confidentiality agreements. Work will be performed remotely with regular progress meetings."
    )
    client_name: Optional[str] = Field(
        None, 
        max_length=100,
        description="Name of the client or customer",
        example="TechStart Ltd"
    )
    client_email: Optional[str] = Field(
        None,
        description="Client's email address for communication",
        example="legal@techstart.co.uk"
    )
    supplier_name: Optional[str] = Field(
        None, 
        max_length=100,
        description="Name of the supplier or service provider",
        example="DevCorp Solutions Ltd"
    )
    contract_value: Optional[float] = Field(
        None, 
        gt=0,
        description="Total contract value in specified currency",
        example=75000.00
    )
    currency: str = Field(
        default="GBP",
        description="Currency code for contract value",
        example="GBP"
    )
    start_date: Optional[datetime] = Field(
        None,
        description="Contract start date",
        example="2024-02-01T00:00:00Z"
    )
    end_date: Optional[datetime] = Field(
        None,
        description="Contract end date",
        example="2024-12-31T23:59:59Z"
    )
    template_id: Optional[str] = Field(
        None,
        description="ID of the template to use as a base for this contract",
        example="template-service-agreement-uk"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Software Development Services Agreement",
                "contract_type": "service_agreement",
                "plain_english_input": "I need a comprehensive service agreement for ongoing software development work. The engagement involves full-stack web development using modern technologies. Payment terms should be monthly with 30-day payment periods. Include intellectual property clauses, confidentiality terms, and project milestone definitions.",
                "client_name": "Innovation Tech Ltd",
                "client_email": "contracts@innovationtech.co.uk",
                "supplier_name": "Elite Development Ltd", 
                "contract_value": 125000.00,
                "currency": "GBP",
                "start_date": "2024-03-01T00:00:00Z",
                "end_date": "2024-08-31T23:59:59Z",
                "template_id": "service-agreement-tech-v2"
            }
        }


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


class TemplateCreate(BaseModel):
    """Template creation request"""
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=100)
    contract_type: ContractTypeEnum
    description: str = Field(..., min_length=10)
    template_content: str = Field(..., min_length=50)
    compliance_features: Optional[List[str]] = None
    legal_notes: Optional[str] = None
    version: Optional[str] = "1.0"
    suitable_for: Optional[List[str]] = None


class TemplateUpdate(BaseModel):
    """Template update request"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=10)
    template_content: Optional[str] = Field(None, min_length=50)
    compliance_features: Optional[List[str]] = None
    legal_notes: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None
    suitable_for: Optional[List[str]] = None


class TemplateListResponse(BaseModel):
    """Template list response"""
    templates: List[TemplateResponse]
    total: int
    page: int
    size: int
    pages: int


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