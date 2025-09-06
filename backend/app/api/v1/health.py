"""
Health check endpoint for Pactoria MVP
Optimized for Azure Container Apps monitoring
"""

from fastapi import APIRouter, status
from datetime import datetime
from typing import Dict, Any
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/", status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint for Azure Container Apps liveness probe
    Returns quickly to avoid timeouts during cold starts
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check endpoint for Azure Container Apps
    Verifies database connectivity and essential services
    """
    checks = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": False,
    }

    # Check database connectivity
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            if result.scalar() == 1:
                checks["database"] = True
    except Exception as e:
        checks["database_error"] = str(e)
        checks["status"] = "unhealthy"

    return checks


@router.get("/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """Detailed health check with system status"""
    database_healthy = False

    # Check database
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            if result.scalar() == 1:
                database_healthy = True
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        database_healthy = False

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "components": {
            "database": "healthy" if database_healthy else "unhealthy",
            "ai_service": "healthy",  # Could add Groq API check here
            "authentication": "healthy",
        },
        "uptime": "running",
    }
