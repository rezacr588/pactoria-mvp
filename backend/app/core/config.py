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
    ENABLE_DOCS: bool = os.getenv("ENABLE_DOCS", "true").lower() == "true"  # Allow docs even in production

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Database - Supports SQLite (default), PostgreSQL, and Azure SQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pactoria_mvp.db")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Groq API for AI features (Ultra-fast inference as per MVP plan)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # CORS - Dynamic for Azure Static Web Apps
    CORS_ORIGINS: List[str] = []
    # Allow-all CORS (development only). Set via env CORS_ALLOW_ALL=true
    CORS_ALLOW_ALL: bool = os.getenv("CORS_ALLOW_ALL", "false").lower() == "true"

    # Production connection safety flag
    PRODUCTION_CONNECTION_WARNING: bool = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._validate_required_settings()
        self._setup_cors_origins()
        self._setup_azure_config()
        self._check_production_connection_safety()

    def _validate_required_settings(self):
        """Validate required settings in production"""
        if self.ENVIRONMENT == "production":
            if not self.SECRET_KEY or self.SECRET_KEY == "":
                raise ValueError("SECRET_KEY must be set in production environment")
            if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY == "":
                raise ValueError("JWT_SECRET_KEY must be set in production environment")
        elif self.ENVIRONMENT == "development":
            # Use secure random defaults for development only
            import secrets

            if not self.SECRET_KEY:
                self.SECRET_KEY = secrets.token_urlsafe(32)
            if not self.JWT_SECRET_KEY:
                self.JWT_SECRET_KEY = secrets.token_urlsafe(32)

    def _setup_cors_origins(self):
        """Setup CORS origins dynamically based on environment"""
        if self.ENVIRONMENT == "development":
            self.CORS_ORIGINS = [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173"
            ]
        else:
            # Production CORS origins from environment or Azure defaults
            cors_env = os.getenv("CORS_ORIGINS", "")
            if cors_env:
                self.CORS_ORIGINS = [origin.strip() for origin in cors_env.split(",")]
            else:
                # Azure Static Web Apps specific origins
                # These patterns need to be specific domains in production
                default_origins = []

                # Add known Azure Static Web App domain if available
                if os.getenv("AZURE_STATIC_WEB_APP_URL"):
                    default_origins.append(os.getenv("AZURE_STATIC_WEB_APP_URL"))

                # Common Azure patterns - these need to be replaced with actual domains
                # Note: Wildcard domains don't work with credentials=True in CORS
                default_origins.extend([
                    "https://pactoria-frontend.azurestaticapps.net",
                    "https://gentle-field-0123456789.eastus.azurestaticapps.net",
                    "https://pactoria.com",
                    "https://app.pactoria.com"
                ])

                self.CORS_ORIGINS = default_origins

    def _setup_azure_config(self):
        """Setup Azure-specific configuration"""
        # Azure App Service detection
        if os.getenv("WEBSITE_HOSTNAME"):
            website_hostname = os.getenv("WEBSITE_HOSTNAME")
            self.CORS_ORIGINS.append(f"https://{website_hostname}")

        # Azure Database configuration
        if os.getenv("AZURE_POSTGRESQL_CONNECTION_STRING"):
            self.DATABASE_URL = os.getenv("AZURE_POSTGRESQL_CONNECTION_STRING")
        elif all(
            [
                os.getenv("AZURE_POSTGRESQL_HOST"),
                os.getenv("AZURE_POSTGRESQL_DATABASE"),
                os.getenv("AZURE_POSTGRESQL_USER"),
                os.getenv("AZURE_POSTGRESQL_PASSWORD"),
            ]
        ):
            host = os.getenv("AZURE_POSTGRESQL_HOST")
            database = os.getenv("AZURE_POSTGRESQL_DATABASE")
            user = os.getenv("AZURE_POSTGRESQL_USER")
            password = os.getenv("AZURE_POSTGRESQL_PASSWORD")
            self.DATABASE_URL = (
                f"postgresql://{user}:{password}@{host}:5432/{database}?sslmode=require"
            )

    def _check_production_connection_safety(self):
        """Check and warn about production connections from local environment"""
        import logging

        logger = logging.getLogger(__name__)

        # Detect local-to-production mode
        local_to_prod = os.getenv("LOCAL_TO_PROD_MODE", "false").lower() == "true"
        is_postgres_connection = "postgresql://" in self.DATABASE_URL
        is_development_host = any(
            origin in ["http://localhost:3000", "http://localhost:5173"]
            for origin in self.CORS_ORIGINS
        )

        if local_to_prod or (is_postgres_connection and is_development_host):
            # This is a local-to-production connection
            logger.warning("=" * 80)
            logger.warning("⚠️  PRODUCTION CONNECTION DETECTED")
            logger.warning("=" * 80)
            logger.warning("🔴 Local environment is connecting to PRODUCTION resources")
            logger.warning(f"🔴 Database: {self.DATABASE_URL.split(
                '@')[1].split('/')[0] if '@' in self.DATABASE_URL else 'Unknown'}")
            logger.warning("🔴 All data changes will be PERMANENT")
            logger.warning("🔴 Use with extreme caution")
            logger.warning("=" * 80)

            # Add safety headers for API responses
            self.PRODUCTION_CONNECTION_WARNING = True

            # Enable additional logging for production connections
            if not self.DEBUG:
                self.DEBUG = True  # Force debug mode for better visibility
                logger.info(
                    "🔧 Debug mode enabled for production connection monitoring"
                )
        else:
            self.PRODUCTION_CONNECTION_WARNING = False

    # File Upload - Azure optimized
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
    ALLOWED_FILE_TYPES: List[str] = os.getenv(
        "ALLOWED_FILE_TYPES", ".pdf,.docx,.txt"
    ).split(",")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(os.getcwd(), "uploads"))

    # Azure Storage (optional for persistent file storage)
    AZURE_STORAGE_ACCOUNT_NAME: Optional[str] = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
    AZURE_STORAGE_ACCOUNT_KEY: Optional[str] = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
    AZURE_STORAGE_CONTAINER_NAME: str = os.getenv(
        "AZURE_STORAGE_CONTAINER_NAME", "pactoria-uploads"
    )

    # Contract Settings (MVP Requirements)
    MAX_USERS_PER_ACCOUNT: int = 5  # As per MVP plan
    CONTRACT_HISTORY_MONTHS: int = 3  # Basic storage for 3 months

    # UK Legal Templates (20+ as per MVP)
    TEMPLATE_CATEGORIES: List[str] = [
        "service_agreements",
        "employment_contracts",
        "supplier_agreements",
        "ndas",
        "terms_conditions",
    ]

    # Compliance Thresholds
    MIN_COMPLIANCE_SCORE: float = float(
        os.getenv("MIN_COMPLIANCE_SCORE", "0.95")
    )  # 95%+ UK legal compliance accuracy

    # Azure-specific settings
    PORT: int = int(os.getenv("PORT", "8000"))
    BIND_HOST: str = os.getenv("BIND_HOST", "127.0.0.1")

    # Performance and monitoring
    ENABLE_HEALTH_CHECKS: bool = (
        os.getenv("ENABLE_HEALTH_CHECKS", "true").lower() == "true"
    )
    HEALTH_CHECK_INTERVAL: int = int(os.getenv("HEALTH_CHECK_INTERVAL", "60"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    ENABLE_REQUEST_LOGGING: bool = (
        os.getenv("ENABLE_REQUEST_LOGGING", "true").lower() == "true"
    )

    # Rate limiting
    ENABLE_RATE_LIMITING: bool = (
        os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    )
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # Feature flags for optimization
    ENABLE_DETAILED_LOGGING: bool = (
        os.getenv("ENABLE_DETAILED_LOGGING", "false").lower() == "true"
    )
    ENABLE_METRICS_COLLECTION: bool = (
        os.getenv("ENABLE_METRICS_COLLECTION", "false").lower() == "true"
    )
    ENABLE_REDIS_CACHING: bool = (
        os.getenv("ENABLE_REDIS_CACHING", "false").lower() == "true"
    )

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
