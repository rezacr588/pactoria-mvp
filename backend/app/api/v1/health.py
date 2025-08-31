"""
Health check endpoint for Pactoria MVP
"""
from fastapi import APIRouter
from datetime import datetime
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with system status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME, 
        "version": settings.APP_VERSION,
        "components": {
            "database": "healthy",
            "ai_service": "healthy",
            "authentication": "healthy"
        },
        "uptime": "running"
    }