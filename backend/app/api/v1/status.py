"""
Status endpoints for Pactoria MVP
API status, health checks, and system information
"""

from app.core.datetime_utils import get_current_utc
from typing import Dict, Any
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/status", tags=["Status"])


@router.get("/", response_model=Dict[str, Any])
async def get_api_status():
    """Get API status and available features"""
    return {
        "status": "operational",
        "version": settings.APP_VERSION,
        "timestamp": get_current_utc().isoformat(),
        "features": {
            "contract_generation": True,
            "uk_legal_compliance": True,
            "document_management": True,
            "user_authentication": True,
            "ai_integration": True,
            "analytics": True,
            "security": True,
            "compliance": True,
        },
        "core_capabilities": {
            "plain_english_to_contract": True,
            "uk_legal_templates": True,
            "compliance_analysis": True,
            "risk_scoring": True,
            "version_control": True,
            "audit_trail": True,
            "pdf_export": True,
            "user_limits": settings.MAX_USERS_PER_ACCOUNT,
        },
        "ai_service": {
            "model": settings.GROQ_MODEL,
            "provider": "groq",
            "capabilities": [
                "contract_generation",
                "compliance_analysis",
                "risk_assessment",
                "legal_review",
            ],
        },
        "compliance": {
            "gdpr": True,
            "uk_employment_law": True,
            "consumer_rights": True,
            "min_compliance_score": settings.MIN_COMPLIANCE_SCORE,
        },
    }


@router.get("/features")
async def list_features():
    """List all available API features"""
    return {
        "authentication": [
            "user_registration",
            "user_login",
            "jwt_tokens",
            "password_reset",
        ],
        "contracts": [
            "create_contract",
            "list_contracts",
            "update_contract",
            "delete_contract",
            "generate_content",
            "analyze_compliance",
            "version_history",
        ],
        "analytics": [
            "business_metrics",
            "user_metrics",
            "contract_type_metrics",
            "time_series_data",
            "compliance_metrics",
            "system_health",
            "performance_metrics",
        ],
        "security": [
            "security_events",
            "audit_logs",
            "gdpr_requests",
            "compliance_checks",
            "threat_intelligence",
        ],
        "ai_services": [
            "contract_generation",
            "compliance_analysis",
            "risk_assessment",
            "template_recommendations",
        ],
    }
