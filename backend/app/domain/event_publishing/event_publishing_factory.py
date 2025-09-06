"""
Factory for setting up domain event publishing infrastructure
Centralizes configuration and registration of event handlers
"""

from typing import Any, Optional
import logging

from app.domain.event_publishing.domain_event_publisher import (
    DomainEventPublisher,
    InMemoryDomainEventPublisher,
)
from app.domain.event_publishing.domain_event_handler import LoggingEventHandler
from app.domain.event_publishing.contract_event_handlers import (
    ContractCreatedEventHandler,
    ContractActivatedEventHandler,
    ContractCompletedEventHandler,
    ContractTerminatedEventHandler,
    ContractContentGeneratedEventHandler,
)

logger = logging.getLogger(__name__)


class EventPublishingFactory:
    """Factory for creating and configuring domain event publishing infrastructure"""

    @staticmethod
    def create_publisher(
        publisher_type: str = "memory",
        notification_service: Optional[Any] = None,
        audit_service: Optional[Any] = None,
        enable_logging: bool = True,
    ) -> DomainEventPublisher:
        """
        Create a configured domain event publisher

        Args:
            publisher_type: Type of publisher ("memory" for in-memory implementation)
            notification_service: Service for sending notifications (optional)
            audit_service: Service for creating audit entries (optional)
            enable_logging: Whether to enable logging handler for all events

        Returns:
            Configured DomainEventPublisher instance
        """

        # Create publisher based on type
        if publisher_type == "memory":
            publisher = InMemoryDomainEventPublisher()
        else:
            publisher = DomainEventPublisher()

        # Register logging handler if enabled
        if enable_logging:
            logging_handler = LoggingEventHandler()
            publisher.register_global_handler(logging_handler)
            logger.info("Registered global logging event handler")

        # Register contract-specific handlers
        EventPublishingFactory._register_contract_handlers(
            publisher, notification_service, audit_service
        )

        logger.info(
            f"Created {publisher_type} domain event publisher with {publisher.get_handler_count()} handlers"
        )
        return publisher

    @staticmethod
    def _register_contract_handlers(
        publisher: DomainEventPublisher,
        notification_service: Optional[Any] = None,
        audit_service: Optional[Any] = None,
    ) -> None:
        """Register all contract-related event handlers"""

        # Contract Created Handler
        created_handler = ContractCreatedEventHandler(audit_service)
        publisher.register_handler("ContractCreated", created_handler)

        # Contract Activated Handler
        activated_handler = ContractActivatedEventHandler(
            notification_service, audit_service
        )
        publisher.register_handler("ContractActivated", activated_handler)

        # Contract Completed Handler
        completed_handler = ContractCompletedEventHandler(
            notification_service, audit_service
        )
        publisher.register_handler("ContractCompleted", completed_handler)

        # Contract Terminated Handler
        terminated_handler = ContractTerminatedEventHandler(
            notification_service, audit_service
        )
        publisher.register_handler("ContractTerminated", terminated_handler)

        # Contract Content Generated Handler
        content_handler = ContractContentGeneratedEventHandler(audit_service)
        publisher.register_handler("ContractContentGenerated", content_handler)

        logger.info("Registered all contract event handlers")

    @staticmethod
    def create_test_publisher() -> InMemoryDomainEventPublisher:
        """Create a publisher configured for testing"""
        publisher = InMemoryDomainEventPublisher()

        # Register minimal handlers for testing
        logging_handler = LoggingEventHandler()
        publisher.register_global_handler(logging_handler)

        return publisher


# Convenience function for common usage
def create_default_event_publisher(
    notification_service: Optional[Any] = None, audit_service: Optional[Any] = None
) -> DomainEventPublisher:
    """Create a publisher with default configuration"""
    return EventPublishingFactory.create_publisher(
        publisher_type="memory",
        notification_service=notification_service,
        audit_service=audit_service,
        enable_logging=True,
    )
