"""
Pactoria MVP - Main FastAPI Application
AI-Powered Contract Management Platform for UK SMEs
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import create_tables
from app.api.v1.api import api_router
from fastapi.security import HTTPBearer

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Pactoria MVP Backend...")
    
    # Create database tables
    await create_tables()
    
    logger.info("✅ Database tables created")
    logger.info("✅ Pactoria MVP Backend started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Pactoria MVP Backend...")


# Create FastAPI application with comprehensive OpenAPI configuration
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
# Pactoria Contract Management API

**AI-Powered Contract Management Platform for UK SMEs**

## Features

- **AI-Driven Contract Generation**: Leverage advanced AI to create legally compliant UK contracts
- **Compliance Analysis**: Real-time UK legal compliance scoring and validation
- **Template Management**: 20+ pre-built UK legal templates for SMEs
- **Security & Audit**: Enterprise-grade security with comprehensive audit trails
- **Analytics Dashboard**: Contract performance and compliance analytics

## Authentication

This API uses **JWT Bearer token authentication**. To authenticate:

1. Register or login to get an access token
2. Include the token in the Authorization header: `Authorization: Bearer {token}`
3. Tokens expire in 24 hours and need to be refreshed

## Support

For technical support or business inquiries, contact us at support@pactoria.com

## Legal

This API is proprietary software. Unauthorized access or use is prohibited.
    """,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
    # OpenAPI metadata
    terms_of_service="https://pactoria.com/terms",
    contact={
        "name": "Pactoria Support",
        "email": "support@pactoria.com",
        "url": "https://pactoria.com/support"
    },
    license_info={
        "name": "Proprietary",
        "identifier": "Proprietary"
    },
    # API tags for organization
    tags_metadata=[
        {
            "name": "Health",
            "description": "Health check and system status endpoints"
        },
        {
            "name": "Root",
            "description": "Root endpoint with API information"
        },
        {
            "name": "Authentication",
            "description": "User authentication, registration, and profile management"
        },
        {
            "name": "Contracts", 
            "description": "Contract CRUD operations, AI generation, and compliance analysis"
        },
        {
            "name": "AI Services",
            "description": "AI-powered contract generation and legal analysis"
        },
        {
            "name": "Security",
            "description": "Security scanning and vulnerability assessment"
        },
        {
            "name": "Analytics",
            "description": "Contract analytics, compliance metrics, and reporting"
        }
    ],
    # Servers for different environments
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://api.pactoria.com", 
            "description": "Production server"
        }
    ]
)

# Configure JWT Authentication in OpenAPI
security = HTTPBearer()

# Add security scheme to OpenAPI
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = app.openapi()
    
    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT token obtained from login endpoint"
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add process time header and logging"""
    start_time = time.time()
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log API requests
        logger.info(
            f"{request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.4f}s"
        )
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"{request.method} {request.url.path} - "
            f"Error: {str(e)} - "
            f"Time: {process_time:.4f}s"
        )
        raise


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(f"Global exception handler caught: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "path": str(request.url.path),
            "method": request.method
        }
    )


# Basic root-level health check for load balancers
@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint for load balancers"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": settings.APP_VERSION
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "message": "Pactoria Contract Management API - Empowering UK SMEs with AI-driven legal solutions"
    }


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )