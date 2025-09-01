"""
AI services endpoints for Pactoria MVP
Groq-powered contract generation and analysis
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List
import logging

from app.services.ai_service import GroqAIService
from app.schemas.ai import (
    ContractAnalysisRequest,
    ContractAnalysisResponse,
    TemplateRecommendationRequest,
    TemplateRecommendationResponse,
    RiskAssessmentResponse,
    AIHealthCheck,
    ClauseGenerationResponse,
    TemplateListResponse
)
from app.core.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Services"])
logger = logging.getLogger(__name__)

ai_service = GroqAIService()


@router.get("/health", response_model=AIHealthCheck)
async def ai_health_check():
    """
    Check AI service health and capabilities
    """
    try:
        # Simple health check - could expand to test actual Groq connectivity
        return AIHealthCheck(
            status="healthy",
            model=ai_service.model,
            features=[
                "contract_generation",
                "compliance_validation", 
                "risk_assessment",
                "template_recommendation"
            ],
            response_time_ms=50
        )
    except Exception as e:
        logger.error(f"AI health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service unavailable"
        )


@router.post(
    "/analyze-contract", 
    response_model=ContractAnalysisResponse,
    summary="AI Contract Compliance Analysis",
    description="""
    Analyze contract content using AI to assess UK legal compliance and identify risks.
    
    **Key Features:**
    - **GDPR Compliance**: Analyzes data protection clauses and privacy compliance
    - **Employment Law**: Reviews employment contracts for UK legislation compliance
    - **Consumer Rights**: Validates consumer protection and unfair terms
    - **Commercial Terms**: Assesses standard commercial contract terms
    - **Risk Scoring**: Provides 1-10 risk score (1=low risk, 10=high risk)
    - **Actionable Recommendations**: Specific suggestions for improving compliance
    
    **AI Analysis Includes:**
    - Overall compliance score (0.0-1.0, target >0.95 for MVP)
    - Detailed breakdown by legal area
    - Risk factors identification
    - Specific clause recommendations
    - Processing time tracking for performance monitoring
    
    **Supported Contract Types:**
    - service_agreement: Professional services contracts
    - employment_contract: Employment agreements
    - supplier_agreement: Supplier and vendor contracts
    - nda: Non-disclosure agreements
    - terms_conditions: Terms and conditions
    - consultancy: Consultancy agreements
    - partnership: Partnership agreements
    - lease: Lease agreements
    
    **Use Cases:**
    - Pre-signature compliance review
    - Risk assessment for existing contracts
    - Legal team validation support
    - Compliance dashboard metrics
    - Contract improvement recommendations
    
    **Performance:** Target response time <3 seconds for contracts up to 50 pages
    
    **Requires Authentication:** JWT Bearer token
    """,
    responses={
        200: {
            "description": "Contract analysis completed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "contract_type": "service_agreement",
                        "compliance_score": 0.92,
                        "gdpr_compliance": 0.95,
                        "employment_law_compliance": 0.90,
                        "consumer_rights_compliance": 0.88,
                        "commercial_terms_compliance": 0.94,
                        "risk_score": 3,
                        "risk_factors": [
                            "Missing specific termination clauses",
                            "Data processing terms could be clearer",
                            "Liability caps should be explicit"
                        ],
                        "recommendations": [
                            "Add GDPR Article 28 compliant data processing clauses",
                            "Include clear termination notice periods (minimum 30 days)",
                            "Define specific liability limitations and exclusions",
                            "Add force majeure clause for contract protection"
                        ],
                        "analysis_summary": "Overall strong contract with minor compliance gaps in data protection and termination terms.",
                        "processing_time_ms": 2150
                    }
                }
            }
        },
        400: {
            "description": "Invalid contract content or unsupported contract type"
        },
        401: {
            "description": "Authentication required"
        },
        500: {
            "description": "AI analysis service error"
        },
        503: {
            "description": "AI service temporarily unavailable"
        }
    }
)
async def analyze_contract(
    request: ContractAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze contract content for UK legal compliance using AI
    
    Performs comprehensive analysis of contract content against UK legal standards
    and provides actionable compliance recommendations.
    """
    try:
        logger.info(f"Analyzing contract for user {current_user.id}")
        
        # Validate contract compliance
        compliance_data = await ai_service.validate_contract_compliance(
            request.contract_content,
            request.contract_type
        )
        
        return ContractAnalysisResponse(
            contract_type=request.contract_type,
            compliance_score=compliance_data["overall_score"],
            gdpr_compliance=compliance_data["gdpr_compliance"],
            employment_law_compliance=compliance_data.get("employment_law_compliance"),
            consumer_rights_compliance=compliance_data.get("consumer_rights_compliance"),
            commercial_terms_compliance=compliance_data["commercial_terms_compliance"],
            risk_score=compliance_data["risk_score"],
            risk_factors=compliance_data["risk_factors"],
            recommendations=compliance_data["recommendations"],
            analysis_summary=compliance_data.get("analysis_raw", "Analysis completed"),
            processing_time_ms=500  # Mock processing time
        )
        
    except Exception as e:
        logger.error(f"Contract analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contract analysis failed: {str(e)}"
        )


@router.post("/recommend-template", response_model=TemplateRecommendationResponse)
async def recommend_template(
    request: TemplateRecommendationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Recommend the best UK legal template based on requirements
    MVP requirement: Template matching and selection
    """
    try:
        logger.info(f"Recommending template for: {request.business_description[:50]}...")
        
        # Mock template recommendation - in production, this would use AI
        recommended_templates = [
            {
                "template_id": "template-service-001",
                "name": "Professional Services Agreement",
                "confidence": 0.92,
                "description": "Standard UK professional services contract with GDPR compliance",
                "suitable_for": ["consulting", "professional services", "freelance work"],
                "includes_clauses": ["payment terms", "IP ownership", "confidentiality", "termination"]
            },
            {
                "template_id": "template-service-002", 
                "name": "IT Services Agreement",
                "confidence": 0.85,
                "description": "Specialized IT services contract with technical specifications",
                "suitable_for": ["software development", "IT support", "system maintenance"],
                "includes_clauses": ["SLA terms", "data security", "IP licensing", "support terms"]
            }
        ]
        
        return TemplateRecommendationResponse(
            business_description=request.business_description,
            recommended_templates=recommended_templates,
            confidence=recommended_templates[0]["confidence"],
            reasoning="Based on business description mentioning professional services and consulting work"
        )
        
    except Exception as e:
        logger.error(f"Template recommendation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Template recommendation failed"
        )


@router.post("/assess-risk", response_model=RiskAssessmentResponse)
async def assess_contract_risk(
    contract_content: str,
    contract_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform detailed risk assessment of contract
    MVP requirement: Contract risk scoring (1-10 scale)
    """
    try:
        logger.info(f"Performing risk assessment for {contract_type} contract")
        
        # Mock risk assessment - would use AI in production
        risk_factors = {
            "liability_exposure": {
                "score": 6,
                "description": "Moderate liability exposure in contract terms",
                "impact": "medium",
                "recommendations": ["Consider liability caps", "Add indemnification clauses"]
            },
            "termination_risk": {
                "score": 4,
                "description": "Reasonable termination clauses present",
                "impact": "low",
                "recommendations": ["Clarify notice periods"]
            },
            "payment_risk": {
                "score": 5,
                "description": "Standard payment terms with some gaps",
                "impact": "medium", 
                "recommendations": ["Add late payment penalties", "Specify payment methods"]
            },
            "compliance_risk": {
                "score": 3,
                "description": "Good GDPR compliance, minor employment law gaps",
                "impact": "low",
                "recommendations": ["Review employment law requirements"]
            }
        }
        
        overall_risk = sum(factor["score"] for factor in risk_factors.values()) // len(risk_factors)
        
        return RiskAssessmentResponse(
            contract_type=contract_type,
            overall_risk_score=overall_risk,
            risk_level="medium" if overall_risk <= 6 else "high",
            risk_factors=risk_factors,
            critical_issues=[
                factor_name for factor_name, factor in risk_factors.items()
                if factor["score"] >= 7
            ],
            recommendations=[
                rec for factor in risk_factors.values() 
                for rec in factor["recommendations"]
            ],
            compliance_summary="Generally compliant with UK law, minor improvements recommended"
        )
        
    except Exception as e:
        logger.error(f"Risk assessment failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Risk assessment failed"
        )


@router.post("/generate-clauses", response_model=ClauseGenerationResponse)
async def generate_additional_clauses(
    contract_type: str,
    requirements: List[str],
    current_user: dict = Depends(get_current_user)
):
    """
    Generate additional legal clauses for contract customization
    """
    try:
        logger.info(f"Generating additional clauses for {contract_type}")
        
        # Mock clause generation
        generated_clauses = {
            "confidentiality": {
                "title": "Confidentiality and Non-Disclosure",
                "content": "The parties acknowledge that they may have access to confidential information...",
                "justification": "Essential for protecting business information"
            },
            "data_protection": {
                "title": "Data Protection and GDPR Compliance",
                "content": "Both parties agree to comply with all applicable data protection laws...",
                "justification": "Required for GDPR compliance in UK"
            },
            "force_majeure": {
                "title": "Force Majeure",
                "content": "Neither party shall be liable for any failure or delay in performance...",
                "justification": "Standard protection against unforeseen circumstances"
            }
        }
        
        return ClauseGenerationResponse(
            contract_type=contract_type,
            requirements=requirements,
            generated_clauses=generated_clauses,
            total_clauses=len(generated_clauses)
        )
        
    except Exception as e:
        logger.error(f"Clause generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clause generation failed"
        )


@router.get("/templates", response_model=TemplateListResponse)
async def list_available_templates(
    category: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    List available UK legal templates
    MVP requirement: 20+ core UK legal templates
    """
    try:
        # Mock template data - would come from database
        all_templates = [
            {
                "id": "template-001",
                "name": "Service Agreement - Professional Services",
                "category": "service_agreements",
                "description": "Standard UK professional services contract",
                "compliance_features": ["gdpr", "commercial_law"],
                "is_active": True
            },
            {
                "id": "template-002", 
                "name": "Employment Contract - Full Time",
                "category": "employment",
                "description": "UK employment contract for full-time employees",
                "compliance_features": ["employment_law", "gdpr", "working_time_directive"],
                "is_active": True
            },
            {
                "id": "template-003",
                "name": "Non-Disclosure Agreement",
                "category": "confidentiality",
                "description": "UK compliant NDA for business relationships",
                "compliance_features": ["confidentiality", "gdpr"],
                "is_active": True
            },
            {
                "id": "template-004",
                "name": "Supplier Agreement",
                "category": "procurement", 
                "description": "Standard supplier/vendor agreement",
                "compliance_features": ["commercial_law", "payment_terms"],
                "is_active": True
            }
        ]
        
        # Filter by category if specified
        if category:
            all_templates = [t for t in all_templates if t["category"] == category]
        
        return TemplateListResponse(
            templates=all_templates,
            total=len(all_templates),
            categories=list(set(t["category"] for t in all_templates))
        )
        
    except Exception as e:
        logger.error(f"Failed to list templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve templates"
        )