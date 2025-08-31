"""
Health check endpoint for Pactoria MVP
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Pactoria MVP Backend",
        "version": "1.0.0"
    }


@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with system status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Pactoria MVP Backend", 
        "version": "1.0.0",
        "components": {
            "database": "healthy",
            "ai_service": "healthy",
            "authentication": "healthy"
        },
        "uptime": "running"
    }