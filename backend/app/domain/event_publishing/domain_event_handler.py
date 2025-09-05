"""
Domain Event Handler Interface and Base Classes
Defines contracts for handling domain events following DDD patterns
"""
from abc import ABC, abstractmethod
from typing import Any
import logging

from app.domain.entities.base import DomainEvent

logger = logging.getLogger(__name__)


class DomainEventHandler(ABC):
    """Base interface for domain event handlers"""
    
    @abstractmethod
    async def handle(self, event: DomainEvent) -> None:
        """Handle a domain event"""
        pass
    
    @property
    @abstractmethod
    def event_type(self) -> str:
        """The type of event this handler processes"""
        pass


class BaseDomainEventHandler(DomainEventHandler):
    """Base implementation with common functionality"""
    
    def __init__(self):
        self._logger = logging.getLogger(self.__class__.__name__)
    
    async def handle(self, event: DomainEvent) -> None:
        """Handle the domain event with error handling and logging"""
        try:
            self._logger.info(f"Handling event {event.event_type} for aggregate {event.aggregate_id}")
            await self._handle_event(event)
            self._logger.info(f"Successfully handled event {event.event_type}")
        except Exception as e:
            self._logger.error(f"Failed to handle event {event.event_type}: {str(e)}", exc_info=True)
            # Re-raise to allow publisher to handle the error appropriately
            raise
    
    @abstractmethod
    async def _handle_event(self, event: DomainEvent) -> None:
        """Implement the actual event handling logic"""
        pass


class LoggingEventHandler(BaseDomainEventHandler):
    """Handler that logs all events - useful for debugging and auditing"""
    
    @property
    def event_type(self) -> str:
        return "*"  # Handle all events
    
    async def _handle_event(self, event: DomainEvent) -> None:
        """Log the event details"""
        self._logger.info(
            f"Domain Event: {event.event_type} | "
            f"Aggregate: {event.aggregate_id} | "
            f"Timestamp: {event.occurred_at} | "
            f"Event ID: {event.event_id}"
        )


class NotificationEventHandler(BaseDomainEventHandler):
    """Base handler for notification-related events"""
    
    def __init__(self, notification_service: Any = None):
        super().__init__()
        self._notification_service = notification_service
    
    async def _send_notification(self, message: str, recipients: list, notification_type: str = "info"):
        """Send notification if service is available"""
        if self._notification_service:
            try:
                await self._notification_service.send_notification(
                    message=message,
                    recipients=recipients,
                    notification_type=notification_type
                )
            except Exception as e:
                self._logger.warning(f"Failed to send notification: {str(e)}")


class AuditEventHandler(BaseDomainEventHandler):
    """Handler for creating audit trail entries"""
    
    def __init__(self, audit_service: Any = None):
        super().__init__()
        self._audit_service = audit_service
    
    async def _create_audit_entry(self, event: DomainEvent, action: str, details: dict = None):
        """Create an audit trail entry"""
        if self._audit_service:
            try:
                await self._audit_service.create_audit_entry(
                    entity_type="Contract",
                    entity_id=event.aggregate_id,
                    action=action,
                    timestamp=event.occurred_at,
                    event_id=event.event_id,
                    details=details or {}
                )
            except Exception as e:
                self._logger.warning(f"Failed to create audit entry: {str(e)}")