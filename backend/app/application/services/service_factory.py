"""
Factory for Application Services with proper dependency injection
Follows DDD patterns and ensures proper service composition
"""
from sqlalchemy.orm import Session
from typing import Any

from app.application.services.contract_application_service import ContractApplicationService
from app.application.services.company_application_service import CompanyApplicationService
from app.infrastructure.repositories.sqlalchemy_contract_repository import SQLAlchemyContractRepository
from app.infrastructure.repositories.sqlalchemy_company_repository import SQLAlchemyCompanyRepository
from app.domain.event_publishing.domain_event_publisher import DomainEventPublisher


class ApplicationServiceFactory:
    """Factory for creating application services with proper dependencies"""
    
    @staticmethod
    def create_contract_service(
        db_session: Session,
        event_publisher: DomainEventPublisher,
        ai_service: Any
    ) -> ContractApplicationService:
        """Create a fully configured ContractApplicationService"""
        
        # Create repository with event publisher
        contract_repository = SQLAlchemyContractRepository(
            db_session=db_session,
            event_publisher=event_publisher
        )
        
        # Create application service
        return ContractApplicationService(
            contract_repository=contract_repository,
            ai_service=ai_service,
            event_publisher=event_publisher
        )
    
    @staticmethod
    def create_company_service(
        db_session: Session,
        event_publisher: DomainEventPublisher = None,
        companies_house_service: Any = None
    ) -> CompanyApplicationService:
        """Create a fully configured CompanyApplicationService"""
        
        # Create repository with event publisher
        company_repository = SQLAlchemyCompanyRepository(
            db_session=db_session,
            event_publisher=event_publisher
        )
        
        # Create application service
        return CompanyApplicationService(
            company_repository=company_repository,
            companies_house_service=companies_house_service
        )


# Convenience functions for dependency injection
async def create_company_service() -> CompanyApplicationService:
    """Create company service with default dependencies"""
    from app.core.database import get_db
    
    # Get database session
    db = next(get_db())
    
    # Create event publisher (would be injected in production)
    event_publisher = None  # TODO: Implement event publisher
    
    # Create Companies House service (would be injected in production)
    companies_house_service = None  # TODO: Implement Companies House integration
    
    return ApplicationServiceFactory.create_company_service(
        db_session=db,
        event_publisher=event_publisher,
        companies_house_service=companies_house_service
    )