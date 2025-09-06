"""
Main API router for Pactoria MVP v1
Combines all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.contracts import router as contracts_router
from app.api.v1.templates import router as templates_router
from app.api.v1.files import router as files_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.security import router as security_router
from app.api.v1.status import router as status_router
from app.api.v1.ai import router as ai_router
from app.api.v1.health import router as health_router
from app.api.v1.search import router as search_router
from app.api.v1.websocket import router as websocket_router
from app.api.v1.audit import router as audit_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.team import router as team_router

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health_router)
api_router.include_router(status_router)
api_router.include_router(auth_router)
api_router.include_router(contracts_router)
api_router.include_router(templates_router)
api_router.include_router(files_router)
api_router.include_router(analytics_router)
api_router.include_router(security_router)
api_router.include_router(ai_router)
api_router.include_router(search_router)
api_router.include_router(websocket_router)
api_router.include_router(audit_router)
api_router.include_router(notifications_router)
api_router.include_router(team_router)
