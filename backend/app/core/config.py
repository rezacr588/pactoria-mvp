"""
Core configuration for Pactoria MVP
Following the MVP Plan specifications
"""
from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings following MVP requirements"""
    
    # Application
    APP_NAME: str = "Pactoria Contract Management"
    APP_VERSION: str = "0.1.0-mvp"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Database - Using PostgreSQL for local dev, Oracle for production
    DATABASE_URL: str = "postgresql://localhost/pactoria_dev"
    
    # Security
    SECRET_KEY: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Groq API for AI features (Ultra-fast inference as per MVP plan)
    GROQ_API_KEY: str = "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"
    GROQ_MODEL: str = "openai/gpt-oss-120b"  # OpenAI's flagship open-weight MoE model with 120B parameters
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_FILE_TYPES: List[str] = [".pdf", ".docx", ".txt"]
    
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
    MIN_COMPLIANCE_SCORE: float = 0.95  # 95%+ UK legal compliance accuracy
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()