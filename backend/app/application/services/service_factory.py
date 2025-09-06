"""
Factory for Application Services with proper dependency injection
Follows DDD patterns and ensures proper service composition
"""

from sqlalchemy.orm import Session
from typing import Any

from app.application.services.contract_application_service import (
    ContractApplicationService,
)
from app.infrastructure.repositories.sqlalchemy_contract_repository import (
    SQLAlchemyContractRepository,
)
from app.domain.event_publishing.domain_event_publisher import DomainEventPublisher


class ApplicationServiceFactory:
    """Factory for creating application services with proper dependencies"""

    @staticmethod
    def create_contract_service(
        db_session: Session, event_publisher: DomainEventPublisher, ai_service: Any
    ) -> ContractApplicationService:
        """Create a fully configured ContractApplicationService"""

        # Create repository with event publisher
        contract_repository = SQLAlchemyContractRepository(
            db_session=db_session, event_publisher=event_publisher
        )

        # Create application service
        return ContractApplicationService(
            contract_repository=contract_repository,
            ai_service=ai_service,
            event_publisher=event_publisher,
        )
