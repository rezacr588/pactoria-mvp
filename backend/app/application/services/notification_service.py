"""
Notification Application Service
Orchestrates notification-related business operations and integrations
Coordinates between domain entities and external communication services
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import logging

from app.domain.entities.notification import (
    Notification, NotificationId, NotificationRecipient, NotificationType,
    NotificationCategory, NotificationPriority, NotificationTemplate,
    NotificationChannel, NotificationDeliveryAttempt, DeliveryChannel,
    NotificationStatus
)
from app.domain.entities.company import Company
from app.domain.value_objects import Email
from app.domain.exceptions import (
    DomainValidationError, BusinessRuleViolationError
)


class NotificationRequest:
    """Data transfer object for notification requests"""
    
    def __init__(self,
                 notification_type: str,
                 category: str,
                 priority: str,
                 subject: str,
                 content: str,
                 recipient_user_ids: List[str],
                 variables: Optional[Dict[str, Any]] = None,
                 scheduled_for: Optional[datetime] = None,
                 expires_at: Optional[datetime] = None,
                 related_entity_id: Optional[str] = None,
                 related_entity_type: Optional[str] = None,
                 tags: Optional[List[str]] = None):
        self.notification_type = notification_type
        self.category = category
        self.priority = priority
        self.subject = subject
        self.content = content
        self.recipient_user_ids = recipient_user_ids
        self.variables = variables or {}
        self.scheduled_for = scheduled_for
        self.expires_at = expires_at
        self.related_entity_id = related_entity_id
        self.related_entity_type = related_entity_type
        self.tags = tags or []


class BulkNotificationRequest:
    """Data transfer object for bulk notification requests"""
    
    def __init__(self,
                 template_id: str,
                 recipient_user_ids: List[str],
                 variables: Optional[Dict[str, Any]] = None,
                 scheduled_for: Optional[datetime] = None,
                 priority: str = "medium"):
        self.template_id = template_id
        self.recipient_user_ids = recipient_user_ids
        self.variables = variables or {}
        self.scheduled_for = scheduled_for
        self.priority = priority


class NotificationApplicationService:
    """
    Application Service for notification-related operations
    Orchestrates notification workflows and coordinates with external services
    """
    
    def __init__(self,
                 notification_repository,
                 user_repository,
                 email_service=None,
                 sms_service=None,
                 webhook_service=None):
        self._notification_repository = notification_repository
        self._user_repository = user_repository
        self._email_service = email_service
        self._sms_service = sms_service
        self._webhook_service = webhook_service
        self.logger = logging.getLogger(__name__)
        
        # Built-in templates for common notifications
        self._templates = self._initialize_default_templates()
    
    async def send_notification(self, request: NotificationRequest, created_by_user_id: str) -> str:
        """
        Send a notification to specified recipients
        
        Args:
            request: Notification request data
            created_by_user_id: User creating the notification
            
        Returns:
            Notification ID
        """
        try:
            # Convert string enums
            notification_type = NotificationType(request.notification_type)
            category = NotificationCategory(request.category)
            priority = NotificationPriority(request.priority)
            
            # Get recipient information
            recipients = await self._get_notification_recipients(request.recipient_user_ids)
            
            # Create notification
            notification_id = NotificationId(str(uuid4()))
            notification = Notification.create(
                notification_id=notification_id,
                notification_type=notification_type,
                category=category,
                priority=priority,
                subject=request.subject,
                content=request.content,
                recipients=recipients,
                created_by_user_id=created_by_user_id,
                expires_at=request.expires_at
            )
            
            # Set additional properties
            if request.variables:
                notification.set_variables(request.variables)
            
            if request.related_entity_id:
                notification.set_related_entity(request.related_entity_id, request.related_entity_type or "unknown")
            
            if request.tags:
                notification.add_tags(request.tags)
            
            if request.scheduled_for:
                notification.schedule_for(request.scheduled_for)
            
            # Save notification
            await self._notification_repository.save(notification)
            
            # Send immediately if not scheduled
            if not request.scheduled_for:
                await self._process_notification_delivery(notification)
            
            return notification_id.value
            
        except ValueError as e:
            raise DomainValidationError(f"Invalid notification parameters: {str(e)}")
    
    async def send_bulk_notification(self, request: BulkNotificationRequest, created_by_user_id: str) -> List[str]:
        """
        Send bulk notifications using a template
        
        Args:
            request: Bulk notification request
            created_by_user_id: User creating the notifications
            
        Returns:
            List of notification IDs
        """
        template = self._templates.get(request.template_id)
        if not template:
            raise BusinessRuleViolationError(f"Template not found: {request.template_id}")
        
        notification_ids = []
        
        # Create individual notifications for each recipient
        for user_id in request.recipient_user_ids:
            try:
                individual_request = NotificationRequest(
                    notification_type=template.notification_type.value,
                    category=template.category.value,
                    priority=request.priority,
                    subject=template.subject_template,
                    content=template.body_template,
                    recipient_user_ids=[user_id],
                    variables=request.variables,
                    scheduled_for=request.scheduled_for
                )
                
                notification_id = await self.send_notification(individual_request, created_by_user_id)
                notification_ids.append(notification_id)
                
            except Exception as e:
                self.logger.error(f"Failed to send notification to user {user_id}: {e}")
                continue
        
        return notification_ids
    
    async def get_notification(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """Get notification by ID"""
        notification = await self._notification_repository.get_by_id(NotificationId(notification_id))
        
        if not notification:
            return None
        
        return self._notification_to_dict(notification)
    
    async def get_user_notifications(self, 
                                   user_id: str,
                                   status: Optional[str] = None,
                                   category: Optional[str] = None,
                                   limit: int = 20,
                                   offset: int = 0) -> List[Dict[str, Any]]:
        """Get notifications for a specific user"""
        filters = {}
        if status:
            filters["status"] = NotificationStatus(status)
        if category:
            filters["category"] = NotificationCategory(category)
        
        notifications = await self._notification_repository.get_by_recipient(
            user_id, filters, limit, offset
        )
        
        return [self._notification_to_dict(notification) for notification in notifications]
    
    async def mark_notification_as_read(self, notification_id: str, user_id: str) -> None:
        """Mark notification as read by user"""
        notification = await self._notification_repository.get_by_id(NotificationId(notification_id))
        
        if not notification:
            raise BusinessRuleViolationError(f"Notification not found: {notification_id}")
        
        # Verify user is a recipient
        recipient_user_ids = [r.user_id for r in notification.recipients]
        if user_id not in recipient_user_ids:
            raise BusinessRuleViolationError("User is not a recipient of this notification")
        
        notification.mark_as_read(user_id)
        await self._notification_repository.save(notification)
    
    async def track_notification_interaction(self, 
                                           notification_id: str, 
                                           user_id: str,
                                           interaction_type: str,
                                           interaction_data: Dict[str, Any]) -> None:
        """Track user interaction with notification"""
        notification = await self._notification_repository.get_by_id(NotificationId(notification_id))
        
        if not notification:
            return  # Silently ignore missing notifications for tracking
        
        if interaction_type == "link_click":
            url = interaction_data.get("url")
            if url:
                notification.track_link_click(url, user_id)
                await self._notification_repository.save(notification)
    
    async def process_scheduled_notifications(self) -> int:
        """Process notifications scheduled for delivery (background task)"""
        notifications = await self._notification_repository.get_scheduled_for_delivery()
        processed = 0
        
        for notification in notifications:
            try:
                await self._process_notification_delivery(notification)
                processed += 1
            except Exception as e:
                self.logger.error(f"Failed to process notification {notification.id.value}: {e}")
        
        return processed
    
    async def process_notification_retries(self) -> int:
        """Process failed notifications for retry (background task)"""
        notifications = await self._notification_repository.get_pending_retries()
        processed = 0
        
        for notification in notifications:
            try:
                if notification.should_retry():
                    next_retry = notification.get_next_retry_time()
                    if next_retry and next_retry <= datetime.now(timezone.utc):
                        await self._process_notification_delivery(notification)
                        processed += 1
            except Exception as e:
                self.logger.error(f"Failed to retry notification {notification.id.value}: {e}")
        
        return processed
    
    async def expire_old_notifications(self) -> int:
        """Mark old notifications as expired (background task)"""
        notifications = await self._notification_repository.get_expired_notifications()
        expired = 0
        
        for notification in notifications:
            try:
                notification.expire()
                await self._notification_repository.save(notification)
                expired += 1
            except Exception as e:
                self.logger.error(f"Failed to expire notification {notification.id.value}: {e}")
        
        return expired
    
    async def get_notification_statistics(self, 
                                        date_from: datetime,
                                        date_to: datetime) -> Dict[str, Any]:
        """Get notification statistics for a date range"""
        stats = await self._notification_repository.get_statistics(date_from, date_to)
        
        # Add calculated metrics
        if stats.get("total_notifications", 0) > 0:
            stats["delivery_rate"] = (stats.get("delivered_notifications", 0) / 
                                    stats["total_notifications"]) * 100
            stats["read_rate"] = (stats.get("read_notifications", 0) / 
                                stats["total_notifications"]) * 100
        else:
            stats["delivery_rate"] = 0
            stats["read_rate"] = 0
        
        return stats
    
    # Convenience methods for common notification types
    async def notify_contract_status_change(self, 
                                          contract_id: str,
                                          old_status: str,
                                          new_status: str,
                                          user_ids: List[str],
                                          company: Company) -> str:
        """Send contract status change notification"""
        request = NotificationRequest(
            notification_type=NotificationType.EMAIL.value,
            category=NotificationCategory.CONTRACT_STATUS.value,
            priority=NotificationPriority.MEDIUM.value,
            subject=f"Contract Status Updated - {company.name}",
            content=f"Contract status has changed from {old_status} to {new_status}.",
            recipient_user_ids=user_ids,
            variables={
                "contract_id": contract_id,
                "old_status": old_status,
                "new_status": new_status,
                "company_name": company.name
            },
            related_entity_id=contract_id,
            related_entity_type="contract",
            tags=["contract", "status_change"]
        )
        
        return await self.send_notification(request, "system")
    
    async def notify_compliance_alert(self,
                                    compliance_issue: str,
                                    severity: str,
                                    user_ids: List[str],
                                    company: Company) -> str:
        """Send compliance alert notification"""
        priority = NotificationPriority.URGENT if severity == "critical" else NotificationPriority.HIGH
        
        request = NotificationRequest(
            notification_type=NotificationType.EMAIL.value,
            category=NotificationCategory.COMPLIANCE_ALERT.value,
            priority=priority.value,
            subject=f"Compliance Alert - {company.name}",
            content=f"Compliance issue detected: {compliance_issue}",
            recipient_user_ids=user_ids,
            variables={
                "compliance_issue": compliance_issue,
                "severity": severity,
                "company_name": company.name
            },
            related_entity_id=company.id.value,
            related_entity_type="company",
            tags=["compliance", "alert", severity]
        )
        
        return await self.send_notification(request, "system")
    
    async def notify_deadline_reminder(self,
                                     deadline_type: str,
                                     deadline_date: datetime,
                                     user_ids: List[str],
                                     entity_id: str,
                                     entity_name: str) -> str:
        """Send deadline reminder notification"""
        days_until = (deadline_date - datetime.now(timezone.utc)).days
        
        request = NotificationRequest(
            notification_type=NotificationType.EMAIL.value,
            category=NotificationCategory.DEADLINE_REMINDER.value,
            priority=NotificationPriority.HIGH.value if days_until <= 3 else NotificationPriority.MEDIUM.value,
            subject=f"Deadline Reminder - {deadline_type}",
            content=f"Reminder: {deadline_type} deadline is {days_until} days away ({deadline_date.date()}).",
            recipient_user_ids=user_ids,
            variables={
                "deadline_type": deadline_type,
                "deadline_date": deadline_date.isoformat(),
                "days_until": days_until,
                "entity_name": entity_name
            },
            related_entity_id=entity_id,
            related_entity_type="deadline",
            tags=["deadline", "reminder"]
        )
        
        return await self.send_notification(request, "system")
    
    # Private helper methods
    async def _get_notification_recipients(self, user_ids: List[str]) -> List[NotificationRecipient]:
        """Get notification recipient information from user IDs"""
        recipients = []
        
        for user_id in user_ids:
            user = await self._user_repository.get_by_id(user_id)
            if user:
                email = Email(user.email) if user.email else None
                recipient = NotificationRecipient(
                    user_id=user_id,
                    name=user.full_name,
                    email=email,
                    phone=getattr(user, "phone", None),
                    preferred_channels=[NotificationType.EMAIL, NotificationType.IN_APP],
                    timezone=getattr(user, "timezone", "Europe/London")
                )
                recipients.append(recipient)
        
        return recipients
    
    async def _process_notification_delivery(self, notification: Notification):
        """Process notification delivery through appropriate channels"""
        notification.mark_as_sent()
        
        for recipient in notification.recipients:
            # Determine delivery channels based on notification type and recipient preferences
            channels = self._get_delivery_channels(notification.notification_type, recipient)
            
            for channel in channels:
                try:
                    await self._deliver_via_channel(notification, recipient, channel)
                except Exception as e:
                    self.logger.error(f"Failed to deliver via {channel}: {e}")
                    
                    # Record failed attempt
                    attempt = NotificationDeliveryAttempt(
                        channel=channel,
                        attempted_at=datetime.now(timezone.utc),
                        status=NotificationStatus.FAILED,
                        error_message=str(e)
                    )
                    notification.record_delivery_attempt(attempt)
        
        # Save updated notification
        await self._notification_repository.save(notification)
    
    def _get_delivery_channels(self, 
                              notification_type: NotificationType,
                              recipient: NotificationRecipient) -> List[DeliveryChannel]:
        """Determine appropriate delivery channels"""
        channels = []
        
        if notification_type == NotificationType.EMAIL:
            if self._email_service and recipient.email:
                channels.append(DeliveryChannel.EMAIL_SMTP)
        
        elif notification_type == NotificationType.SMS:
            if self._sms_service and recipient.phone:
                channels.append(DeliveryChannel.SMS_TWILIO)
        
        elif notification_type == NotificationType.IN_APP:
            # In-app notifications don't need external delivery
            pass
        
        return channels
    
    async def _deliver_via_channel(self,
                                 notification: Notification,
                                 recipient: NotificationRecipient,
                                 channel: DeliveryChannel):
        """Deliver notification via specific channel"""
        
        if channel == DeliveryChannel.EMAIL_SMTP and self._email_service:
            await self._deliver_email(notification, recipient)
        
        elif channel == DeliveryChannel.SMS_TWILIO and self._sms_service:
            await self._deliver_sms(notification, recipient)
        
        elif channel == DeliveryChannel.WEBHOOK_HTTP and self._webhook_service:
            await self._deliver_webhook(notification, recipient)
    
    async def _deliver_email(self, notification: Notification, recipient: NotificationRecipient):
        """Deliver notification via email"""
        if not recipient.email or not self._email_service:
            return
        
        subject = notification.get_personalized_subject(recipient)
        content = notification.get_personalized_content(recipient)
        
        # Send email
        result = await self._email_service.send_email(
            to_email=recipient.email.value,
            subject=subject,
            content=content,
            notification_id=notification.id.value
        )
        
        # Record delivery attempt
        attempt = NotificationDeliveryAttempt(
            channel=DeliveryChannel.EMAIL_SMTP,
            attempted_at=datetime.now(timezone.utc),
            status=NotificationStatus.DELIVERED if result.get("success") else NotificationStatus.FAILED,
            external_id=result.get("message_id"),
            response_data=result
        )
        
        notification.record_delivery_attempt(attempt)
    
    async def _deliver_sms(self, notification: Notification, recipient: NotificationRecipient):
        """Deliver notification via SMS"""
        if not recipient.phone or not self._sms_service:
            return
        
        content = notification.get_personalized_content(recipient)
        
        # Send SMS
        result = await self._sms_service.send_sms(
            to_phone=recipient.phone,
            message=content,
            notification_id=notification.id.value
        )
        
        # Record delivery attempt
        attempt = NotificationDeliveryAttempt(
            channel=DeliveryChannel.SMS_TWILIO,
            attempted_at=datetime.now(timezone.utc),
            status=NotificationStatus.DELIVERED if result.get("success") else NotificationStatus.FAILED,
            external_id=result.get("message_id"),
            response_data=result
        )
        
        notification.record_delivery_attempt(attempt)
    
    async def _deliver_webhook(self, notification: Notification, recipient: NotificationRecipient):
        """Deliver notification via webhook"""
        if not self._webhook_service:
            return
        
        payload = {
            "notification_id": notification.id.value,
            "type": notification.notification_type.value,
            "category": notification.category.value,
            "priority": notification.priority.value,
            "recipient": {
                "user_id": recipient.user_id,
                "name": recipient.name
            },
            "subject": notification.get_personalized_subject(recipient),
            "content": notification.get_personalized_content(recipient),
            "variables": notification.variables,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Send webhook
        result = await self._webhook_service.send_webhook(payload)
        
        # Record delivery attempt
        attempt = NotificationDeliveryAttempt(
            channel=DeliveryChannel.WEBHOOK_HTTP,
            attempted_at=datetime.now(timezone.utc),
            status=NotificationStatus.DELIVERED if result.get("success") else NotificationStatus.FAILED,
            response_data=result
        )
        
        notification.record_delivery_attempt(attempt)
    
    def _notification_to_dict(self, notification: Notification) -> Dict[str, Any]:
        """Convert notification domain entity to dictionary"""
        return {
            "id": notification.id.value,
            "type": notification.notification_type.value,
            "category": notification.category.value,
            "priority": notification.priority.value,
            "subject": notification.subject,
            "content": notification.content,
            "status": notification.status.value,
            "recipients": [
                {
                    "user_id": r.user_id,
                    "name": r.name,
                    "email": r.email.value if r.email else None
                }
                for r in notification.recipients
            ],
            "scheduled_for": notification.scheduled_for.isoformat() if notification.scheduled_for else None,
            "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
            "delivered_at": notification.delivered_at.isoformat() if notification.delivered_at else None,
            "expires_at": notification.expires_at.isoformat(),
            "successful_deliveries": notification.successful_deliveries,
            "failed_deliveries": notification.failed_deliveries,
            "delivery_rate": notification.get_delivery_rate(),
            "engagement_score": notification.get_engagement_score(),
            "variables": notification.variables,
            "related_entity_id": notification.related_entity_id,
            "tags": notification.tags,
            "created_at": notification.created_at.isoformat(),
            "updated_at": notification.updated_at.isoformat() if notification.updated_at else None,
            "version": notification.version
        }
    
    def _initialize_default_templates(self) -> Dict[str, NotificationTemplate]:
        """Initialize default notification templates"""
        templates = {}
        
        # Contract status change template
        templates["contract_status_change"] = NotificationTemplate(
            template_id="contract_status_change",
            name="Contract Status Change",
            subject_template="Contract Status Updated - {{COMPANY_NAME}}",
            body_template="""
            Hi {{RECIPIENT_NAME}},
            
            The status of contract {{CONTRACT_ID}} has been updated from {{OLD_STATUS}} to {{NEW_STATUS}}.
            
            You can view the contract details in your dashboard.
            
            Best regards,
            Pactoria Team
            """,
            notification_type=NotificationType.EMAIL,
            category=NotificationCategory.CONTRACT_STATUS,
            variables=["RECIPIENT_NAME", "CONTRACT_ID", "OLD_STATUS", "NEW_STATUS", "COMPANY_NAME"]
        )
        
        # Compliance alert template
        templates["compliance_alert"] = NotificationTemplate(
            template_id="compliance_alert",
            name="Compliance Alert",
            subject_template="Compliance Alert - {{SEVERITY}} - {{COMPANY_NAME}}",
            body_template="""
            Hi {{RECIPIENT_NAME}},
            
            A {{SEVERITY}} compliance issue has been detected:
            
            {{COMPLIANCE_ISSUE}}
            
            Please review and take appropriate action immediately.
            
            Best regards,
            Pactoria Compliance Team
            """,
            notification_type=NotificationType.EMAIL,
            category=NotificationCategory.COMPLIANCE_ALERT,
            variables=["RECIPIENT_NAME", "SEVERITY", "COMPLIANCE_ISSUE", "COMPANY_NAME"]
        )
        
        return templates