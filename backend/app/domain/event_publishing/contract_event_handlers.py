"""
Contract-specific Domain Event Handlers
Implements business logic for contract domain events
"""
from typing import Any, Optional
import logging

from app.domain.entities.base import DomainEvent
from app.domain.entities.contract import (
    ContractCreated, ContractActivated, ContractCompleted, 
    ContractTerminated, ContractContentGenerated
)
from app.domain.event_publishing.domain_event_handler import (
    BaseDomainEventHandler, NotificationEventHandler, AuditEventHandler
)

logger = logging.getLogger(__name__)


class ContractCreatedEventHandler(AuditEventHandler):
    """Handler for ContractCreated events"""
    
    @property
    def event_type(self) -> str:
        return "ContractCreated"
    
    async def _handle_event(self, event: DomainEvent) -> None:
        """Handle contract creation event"""
        if not isinstance(event, ContractCreated):
            self._logger.warning(f"Expected ContractCreated event, got {type(event)}")
            return
        
        # Create audit entry
        await self._create_audit_entry(
            event=event,
            action="CONTRACT_CREATED",
            details={
                "contract_title": event.contract_title,
                "contract_type": event.contract_type,
                "client_name": event.client_name,
                "created_by_user_id": event.created_by_user_id,
                "company_id": event.company_id
            }
        )
        
        self._logger.info(f"Processed ContractCreated event for contract {event.aggregate_id}")


class ContractActivatedEventHandler(NotificationEventHandler, AuditEventHandler):
    """Handler for ContractActivated events"""
    
    def __init__(self, notification_service: Any = None, audit_service: Any = None):
        super().__init__(notification_service)
        self._audit_service = audit_service
    
    @property
    def event_type(self) -> str:
        return "ContractActivated"
    
    async def _handle_event(self, event: DomainEvent) -> None:
        """Handle contract activation event"""
        if not isinstance(event, ContractActivated):
            self._logger.warning(f"Expected ContractActivated event, got {type(event)}")
            return
        
        # Create audit entry
        await self._create_audit_entry(
            event=event,
            action="CONTRACT_ACTIVATED",
            details={
                "activated_by_user_id": event.activated_by_user_id,
                "contract_value": event.contract_value,
                "start_date": event.start_date.isoformat() if event.start_date else None
            }
        )
        
        # Send notification if service is available
        message = f"Contract {event.aggregate_id} has been activated"
        recipients = [event.activated_by_user_id]  # Could expand to include other stakeholders
        await self._send_notification(message, recipients, "contract_activation")
        
        self._logger.info(f"Processed ContractActivated event for contract {event.aggregate_id}")


class ContractCompletedEventHandler(NotificationEventHandler, AuditEventHandler):
    """Handler for ContractCompleted events"""
    
    def __init__(self, notification_service: Any = None, audit_service: Any = None):
        super().__init__(notification_service)
        self._audit_service = audit_service
    
    @property
    def event_type(self) -> str:
        return "ContractCompleted"
    
    async def _handle_event(self, event: DomainEvent) -> None:
        """Handle contract completion event"""
        if not isinstance(event, ContractCompleted):
            self._logger.warning(f"Expected ContractCompleted event, got {type(event)}")
            return
        
        # Create audit entry
        await self._create_audit_entry(
            event=event,
            action="CONTRACT_COMPLETED",
            details={
                "completed_by_user_id": event.completed_by_user_id,
                "completion_reason": event.completion_reason
            }
        )
        
        # Send notification
        message = f"Contract {event.aggregate_id} has been completed"
        if event.completion_reason:
            message += f" - Reason: {event.completion_reason}"
        
        recipients = [event.completed_by_user_id]
        await self._send_notification(message, recipients, "contract_completion")
        
        self._logger.info(f"Processed ContractCompleted event for contract {event.aggregate_id}")


class ContractTerminatedEventHandler(NotificationEventHandler, AuditEventHandler):
    """Handler for ContractTerminated events"""
    
    def __init__(self, notification_service: Any = None, audit_service: Any = None):
        super().__init__(notification_service)
        self._audit_service = audit_service
    
    @property
    def event_type(self) -> str:
        return "ContractTerminated"
    
    async def _handle_event(self, event: DomainEvent) -> None:
        """Handle contract termination event"""
        if not isinstance(event, ContractTerminated):
            self._logger.warning(f"Expected ContractTerminated event, got {type(event)}")
            return
        
        # Create audit entry
        await self._create_audit_entry(
            event=event,
            action="CONTRACT_TERMINATED",
            details={
                "terminated_by_user_id": event.terminated_by_user_id,
                "termination_reason": event.termination_reason
            }
        )
        
        # Send high-priority notification for termination
        message = f"Contract {event.aggregate_id} has been TERMINATED - Reason: {event.termination_reason}"
        recipients = [event.terminated_by_user_id]
        await self._send_notification(message, recipients, "contract_termination")
        
        self._logger.warning(f"Contract {event.aggregate_id} terminated: {event.termination_reason}")


class ContractContentGeneratedEventHandler(AuditEventHandler):
    """Handler for ContractContentGenerated events"""
    
    @property
    def event_type(self) -> str:
        return "ContractContentGenerated"
    
    async def _handle_event(self, event: DomainEvent) -> None:
        """Handle contract content generation event"""
        if not isinstance(event, ContractContentGenerated):
            self._logger.warning(f"Expected ContractContentGenerated event, got {type(event)}")
            return
        
        # Create audit entry for AI content generation
        await self._create_audit_entry(
            event=event,
            action="CONTENT_GENERATED",
            details={
                "ai_model": event.ai_model,
                "processing_time_ms": event.processing_time_ms,
                "confidence_score": event.confidence_score
            }
        )
        
        # Log AI usage metrics for monitoring
        self._logger.info(
            f"AI content generated for contract {event.aggregate_id}: "
            f"model={event.ai_model}, "
            f"processing_time={event.processing_time_ms}ms, "
            f"confidence={event.confidence_score}"
        )


class ContractReminderEventHandler(NotificationEventHandler):
    """Handler for contract reminders and scheduled events"""
    
    def __init__(self, notification_service: Any = None):
        super().__init__(notification_service)
    
    @property
    def event_type(self) -> str:
        return "ContractReminder"
    
    async def _handle_event(self, event: DomainEvent) -> None:
        """Handle contract reminder events"""
        # This could handle expiration reminders, renewal notifications, etc.
        # Implementation would depend on specific reminder event types
        pass


class ContractComplianceEventHandler(NotificationEventHandler, AuditEventHandler):
    """Handler for contract compliance-related events"""
    
    def __init__(self, notification_service: Any = None, audit_service: Any = None):
        super().__init__(notification_service)
        self._audit_service = audit_service
    
    @property
    def event_type(self) -> str:
        return "ContractComplianceAnalyzed"
    
    async def _handle_event(self, event: DomainEvent) -> None:
        """Handle compliance analysis events"""
        # This would handle events related to compliance analysis completion
        # Could trigger notifications for compliance issues, etc.
        pass