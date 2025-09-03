"""
Database configuration and session management for Pactoria MVP
"""
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create SQLite engine - using environment variable for production
# This allows Azure Files persistence mount
import os
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pactoria_mvp.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite specific
    poolclass=StaticPool,
    echo=settings.DEBUG  # Log SQL queries in debug mode
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Naming convention for constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

# Create declarative base for models with naming convention
Base = declarative_base(metadata=MetaData(naming_convention=convention))


async def create_tables():
    """Create all database tables"""
    logger.info("Creating database tables...")
    
    # Import all models to register them with Base
    from app.infrastructure.database.models import (
        User, Company, Contract, Template, AIGeneration, 
        ComplianceScore, AuditLog, ContractVersion, SystemMetrics
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created successfully")


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception as e:
            logger.error(f"Error closing database session: {e}")


async def check_database_health():
    """Check database connection health"""
    try:
        db = SessionLocal()
        # Simple query to check connection
        db.execute("SELECT 1")
        db.close()
        return {"status": "healthy", "message": "Database connection successful"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "unhealthy", "message": f"Database connection failed: {str(e)}"}


class DatabaseManager:
    """Database management utilities"""
    
    @staticmethod
    def get_session():
        """Get a database session"""
        return SessionLocal()
    
    @staticmethod
    def close_session(db):
        """Close a database session"""
        if db:
            try:
                db.close()
            except Exception as e:
                logger.error(f"Error closing database session: {e}")
    
    @staticmethod
    async def init_database():
        """Initialize database with required data"""
        logger.info("Initializing database...")
        
        # Create tables
        await create_tables()
        
        # TODO: Load initial UK legal templates
        # TODO: Create default system user
        
        logger.info("✅ Database initialization complete")
    
    @staticmethod
    async def reset_database():
        """Reset database (for development only)"""
        if settings.ENVIRONMENT == "development":
            logger.warning("Resetting database...")
            Base.metadata.drop_all(bind=engine)
            await create_tables()
            logger.info("✅ Database reset complete")
        else:
            raise Exception("Database reset only allowed in development environment")