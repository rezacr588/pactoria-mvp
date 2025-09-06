"""
AI service schemas for Pactoria MVP
Pydantic models for AI-powered contract analysis and generation
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional
from enum import Enum


class ContractTypeEnum(str, Enum):
    """Supported contract types"""

    SERVICE_AGREEMENT = "service_agreement"
    EMPLOYMENT_CONTRACT = "employment_contract"
    SUPPLIER_AGREEMENT = "supplier_agreement"
    NDA = "nda"
    TERMS_CONDITIONS = "terms_conditions"
    CONSULTANCY = "consultancy"
    PARTNERSHIP = "partnership"
    LEASE = "lease"


class ContractAnalysisRequest(BaseModel):
    """Request model for contract analysis"""

    contract_content: str = Field(
        ..., min_length=50, description="Contract content to analyze"
    )
    contract_type: ContractTypeEnum = Field(..., description="Type of contract")
    focus_areas: Optional[List[str]] = Field(
        default_factory=list, description="Specific areas to focus analysis on"
    )

    @field_validator("contract_content")
    @classmethod
    def validate_contract_content(cls, v):
        if len(v.strip()) < 50:
            raise ValueError("Contract content must be at least 50 characters long")
        return v  # Don't strip, preserve original format


class ContractAnalysisResponse(BaseModel):
    """Response model for contract analysis"""

    contract_type: str
    compliance_score: float = Field(
        ..., ge=0.0, le=1.0, description="Overall compliance score (0-1)"
    )
    gdpr_compliance: float = Field(
        ..., ge=0.0, le=1.0, description="GDPR compliance score"
    )
    employment_law_compliance: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Employment law compliance"
    )
    consumer_rights_compliance: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Consumer rights compliance"
    )
    commercial_terms_compliance: float = Field(
        ..., ge=0.0, le=1.0, description="Commercial terms compliance"
    )
    risk_score: int = Field(..., ge=1, le=10, description="Risk score (1=low, 10=high)")
    risk_factors: List[str] = Field(
        default_factory=list, description="Identified risk factors"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Improvement recommendations"
    )
    analysis_summary: str = Field(..., description="Summary of analysis results")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


class TemplateRecommendationRequest(BaseModel):
    """Request model for template recommendation"""

    business_description: str = Field(
        ..., min_length=20, description="Business context and requirements"
    )
    industry: Optional[str] = Field(None, description="Industry sector")
    contract_value_range: Optional[str] = Field(
        None, description="Expected contract value range"
    )
    duration: Optional[str] = Field(None, description="Expected contract duration")

    @field_validator("business_description")
    @classmethod
    def validate_business_description(cls, v):
        if len(v.strip()) < 20:
            raise ValueError("Business description must be at least 20 characters long")
        return v  # Don't strip, preserve original format


class TemplateRecommendation(BaseModel):
    """Individual template recommendation"""

    template_id: str
    name: str
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Recommendation confidence"
    )
    description: str
    suitable_for: List[str]
    includes_clauses: List[str]


class TemplateRecommendationResponse(BaseModel):
    """Response model for template recommendation"""

    business_description: str
    recommended_templates: List[TemplateRecommendation]
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Overall confidence in recommendations"
    )
    reasoning: str = Field(..., description="Explanation for recommendations")


class RiskFactor(BaseModel):
    """Individual risk factor assessment"""

    score: int = Field(..., ge=1, le=10, description="Risk score for this factor")
    description: str = Field(..., description="Description of the risk")
    impact: str = Field(..., description="Impact level (low/medium/high)")
    recommendations: List[str] = Field(
        default_factory=list, description="Risk mitigation recommendations"
    )


class RiskAssessmentResponse(BaseModel):
    """Response model for risk assessment"""

    contract_type: str
    overall_risk_score: int = Field(..., ge=1, le=10, description="Overall risk score")
    risk_level: str = Field(..., description="Risk level (low/medium/high/critical)")
    risk_factors: Dict[str, RiskFactor]
    critical_issues: List[str] = Field(
        default_factory=list,
        description="Critical issues requiring immediate attention",
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Overall recommendations"
    )
    compliance_summary: str = Field(..., description="Summary of compliance status")


class GeneratedClause(BaseModel):
    """Individual generated clause"""

    title: str
    content: str
    justification: str


class ClauseGenerationResponse(BaseModel):
    """Response model for clause generation"""

    contract_type: str
    requirements: List[str]
    generated_clauses: Dict[str, GeneratedClause]
    total_clauses: int


class TemplateInfo(BaseModel):
    """Template information model"""

    id: str
    name: str
    category: str
    description: str
    compliance_features: List[str]
    is_active: bool


class TemplateListResponse(BaseModel):
    """Response model for template listing"""

    templates: List[TemplateInfo]
    total: int
    categories: List[str]


class AIHealthCheck(BaseModel):
    """AI service health check response"""

    status: str = Field(..., description="Service status (healthy/unhealthy)")
    model: str = Field(..., description="AI model being used")
    features: List[str] = Field(..., description="Available AI features")
    response_time_ms: int = Field(..., description="Health check response time")


class AIUsageStats(BaseModel):
    """AI service usage statistics"""

    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time_ms: float
    model_accuracy: float = Field(
        ..., ge=0.0, le=1.0, description="Model accuracy score"
    )
    uptime_percentage: float = Field(
        ..., ge=0.0, le=100.0, description="Service uptime percentage"
    )
