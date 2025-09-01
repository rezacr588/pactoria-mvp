"""
Core configuration for Pactoria MVP
Following the MVP Plan specifications
"""
import os
from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings following MVP requirements"""
    
    # Application
    APP_NAME: str = "Pactoria Contract Management"
    APP_VERSION: str = "0.1.0-mvp"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Database - Supports SQLite (default), PostgreSQL, and Azure SQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pactoria_mvp.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-in-production-immediately")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-this-in-production-immediately")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Groq API for AI features (Ultra-fast inference as per MVP plan)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    # CORS - Dynamic for Azure Static Web Apps
    CORS_ORIGINS: List[str] = []
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._setup_cors_origins()
        self._setup_azure_config()
    
    def _setup_cors_origins(self):
        """Setup CORS origins dynamically based on environment"""
        if self.ENVIRONMENT == "development":
            self.CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]
        else:
            # Production CORS origins from environment or Azure defaults
            cors_env = os.getenv("CORS_ORIGINS", "")
            if cors_env:
                self.CORS_ORIGINS = [origin.strip() for origin in cors_env.split(",")]
            else:
                # Default Azure Static Web Apps patterns
                self.CORS_ORIGINS = [
                    "https://*.azurestaticapps.net",
                    "https://*.azure.com",
                    "https://*.azurewebsites.net"
                ]
    
    def _setup_azure_config(self):
        """Setup Azure-specific configuration"""
        # Azure App Service detection
        if os.getenv("WEBSITE_HOSTNAME"):
            website_hostname = os.getenv("WEBSITE_HOSTNAME")
            self.CORS_ORIGINS.append(f"https://{website_hostname}")
        
        # Azure Database configuration
        if os.getenv("AZURE_POSTGRESQL_CONNECTION_STRING"):
            self.DATABASE_URL = os.getenv("AZURE_POSTGRESQL_CONNECTION_STRING")
        elif all([os.getenv("AZURE_POSTGRESQL_HOST"), os.getenv("AZURE_POSTGRESQL_DATABASE"), 
                 os.getenv("AZURE_POSTGRESQL_USER"), os.getenv("AZURE_POSTGRESQL_PASSWORD")]):
            host = os.getenv("AZURE_POSTGRESQL_HOST")
            database = os.getenv("AZURE_POSTGRESQL_DATABASE")
            user = os.getenv("AZURE_POSTGRESQL_USER")
            password = os.getenv("AZURE_POSTGRESQL_PASSWORD")
            self.DATABASE_URL = f"postgresql://{user}:{password}@{host}:5432/{database}?sslmode=require"
    
    # File Upload - Azure optimized
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
    ALLOWED_FILE_TYPES: List[str] = os.getenv("ALLOWED_FILE_TYPES", ".pdf,.docx,.txt").split(",")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/uploads")
    
    # Azure Storage (optional for persistent file storage)
    AZURE_STORAGE_ACCOUNT_NAME: Optional[str] = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
    AZURE_STORAGE_ACCOUNT_KEY: Optional[str] = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
    AZURE_STORAGE_CONTAINER_NAME: str = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "pactoria-uploads")
    
    # Contract Settings (MVP Requirements)
    MAX_USERS_PER_ACCOUNT: int = 5  # As per MVP plan
    CONTRACT_HISTORY_MONTHS: int = 3  # Basic storage for 3 months
    
    # UK Legal Templates (20+ as per MVP)
    TEMPLATE_CATEGORIES: List[str] = [
        "service_agreements",
        "employment_contracts", 
        "supplier_agreements",
        "ndas",
        "terms_conditions"
    ]
    
    # Compliance Thresholds
    MIN_COMPLIANCE_SCORE: float = float(os.getenv("MIN_COMPLIANCE_SCORE", "0.95"))  # 95%+ UK legal compliance accuracy
    
    # Azure-specific settings
    PORT: int = int(os.getenv("PORT", "8000"))
    BIND_HOST: str = os.getenv("BIND_HOST", "0.0.0.0")
    
    # Performance and monitoring
    ENABLE_HEALTH_CHECKS: bool = os.getenv("ENABLE_HEALTH_CHECKS", "true").lower() == "true"
    HEALTH_CHECK_INTERVAL: int = int(os.getenv("HEALTH_CHECK_INTERVAL", "60"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    ENABLE_REQUEST_LOGGING: bool = os.getenv("ENABLE_REQUEST_LOGGING", "true").lower() == "true"
    
    # Rate limiting
    ENABLE_RATE_LIMITING: bool = os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    # Feature flags for optimization
    ENABLE_DETAILED_LOGGING: bool = os.getenv("ENABLE_DETAILED_LOGGING", "false").lower() == "true"
    ENABLE_METRICS_COLLECTION: bool = os.getenv("ENABLE_METRICS_COLLECTION", "false").lower() == "true"
    ENABLE_REDIS_CACHING: bool = os.getenv("ENABLE_REDIS_CACHING", "false").lower() == "true"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()