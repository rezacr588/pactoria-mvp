"""
Main API router for Pactoria MVP v1
Combines all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.contracts import router as contracts_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.security import router as security_router
from app.api.v1.status import router as status_router
from app.api.v1.ai import router as ai_router

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(status_router)
api_router.include_router(auth_router)
api_router.include_router(contracts_router)
api_router.include_router(analytics_router)
api_router.include_router(security_router)
api_router.include_router(ai_router)

# TODO: Add other routers as they are implemented:
# api_router.include_router(templates_router) 
# api_router.include_router(integrations_router)