"""
Notification Domain Entity - Core business logic for communication management
Following DDD patterns with rich domain model for notification requirements
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum

from app.domain.entities.base import AggregateRoot, DomainEvent
from app.domain.value_objects import Email
from app.domain.exceptions import DomainValidationError, BusinessRuleViolationError


class NotificationType(str, Enum):
    """Types of notifications"""

    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    WEBHOOK = "webhook"
    SYSTEM = "system"


class NotificationPriority(str, Enum):
    """Notification priority levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class NotificationStatus(str, Enum):
    """Notification delivery status"""

    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"
    EXPIRED = "expired"


class NotificationCategory(str, Enum):
    """Categories of notifications"""

    CONTRACT_STATUS = "contract_status"
    COMPLIANCE_ALERT = "compliance_alert"
    DEADLINE_REMINDER = "deadline_reminder"
    TEAM_ACTIVITY = "team_activity"
    SYSTEM_UPDATE = "system_update"
    BILLING = "billing"
    SECURITY = "security"
    LEGAL_REVIEW = "legal_review"
    APPROVAL_REQUEST = "approval_request"
    INTEGRATION = "integration"


class DeliveryChannel(str, Enum):
    """Available delivery channels"""

    EMAIL_SMTP = "email_smtp"
    EMAIL_SENDGRID = "email_sendgrid"
    SMS_TWILIO = "sms_twilio"
    SLACK = "slack"
    MICROSOFT_TEAMS = "microsoft_teams"
    WEBHOOK_HTTP = "webhook_http"


@dataclass(frozen=True)
class NotificationId:
    """Notification identifier value object"""

    value: str

    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise DomainValidationError("Notification ID cannot be empty")

    def __str__(self) -> str:
        return self.value

    @classmethod
    def generate(cls) -> "NotificationId":
        """Generate a new unique notification ID"""
        import uuid
        return cls(str(uuid.uuid4()))


@dataclass(frozen=True)
class NotificationChannel:
    """Notification delivery channel configuration"""

    channel_type: DeliveryChannel
    configuration: Dict[str, Any]
    is_active: bool = True
    rate_limit_per_hour: Optional[int] = None


@dataclass(frozen=True)
class NotificationTemplate:
    """Notification message template"""

    template_id: str
    name: str
    subject_template: str
    body_template: str
    notification_type: NotificationType
    category: NotificationCategory
    variables: List[str] = field(default_factory=list)
    is_active: bool = True


@dataclass(frozen=True)
class NotificationRecipient:
    """Notification recipient information"""

    user_id: str
    name: str
    email: Optional[Email] = None
    phone: Optional[str] = None
    preferred_channels: List[NotificationType] = field(default_factory=list)
    timezone: str = "Europe/London"


@dataclass(frozen=True)
class NotificationDeliveryAttempt:
    """Record of notification delivery attempt"""

    channel: DeliveryChannel
    attempted_at: datetime
    status: NotificationStatus
    response_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    external_id: Optional[str] = None  # ID from external service


@dataclass(frozen=True)
class NotificationCreated(DomainEvent):
    """Domain event for notification creation"""

    notification_type: str
    category: str
    priority: str
    recipient_count: int


@dataclass(frozen=True)
class NotificationDelivered(DomainEvent):
    """Domain event for successful notification delivery"""

    notification_type: str
    channel: str
    recipient_user_id: str


@dataclass(frozen=True)
class NotificationFailed(DomainEvent):
    """Domain event for failed notification delivery"""

    notification_type: str
    channel: str
    recipient_user_id: str
    error_message: str


class Notification(AggregateRoot[NotificationId]):
    """
    Notification Aggregate Root - manages notification lifecycle and delivery
    Encapsulates notification business rules and delivery tracking
    """

    def __init__(
        self,
        notification_id: NotificationId,
        notification_type: NotificationType,
        category: NotificationCategory,
        priority: NotificationPriority,
        subject: str,
        content: str,
        recipients: List[NotificationRecipient],
        created_by_user_id: str,
        expires_at: Optional[datetime] = None,
    ):
        super().__init__(notification_id)

        # Validate required fields
        self._validate_subject(subject)
        self._validate_content(content)
        self._validate_recipients(recipients)
        self._validate_user_id(created_by_user_id)

        # Initialize notification state
        self._notification_type = notification_type
        self._category = category
        self._priority = priority
        self._subject = subject
        self._content = content
        self._recipients = recipients
        self._created_by_user_id = created_by_user_id

        # Delivery configuration
        self._expires_at = expires_at or (
            datetime.now(timezone.utc) + timedelta(days=30)
        )
        self._max_retry_attempts = 3
        self._retry_delay_minutes = [5, 30, 120]  # Progressive delays

        # State tracking
        self._status = NotificationStatus.PENDING
        self._scheduled_for: Optional[datetime] = None
        self._sent_at: Optional[datetime] = None
        self._delivered_at: Optional[datetime] = None
        self._read_at: Optional[datetime] = None

        # Delivery tracking
        self._delivery_attempts: List[NotificationDeliveryAttempt] = []
        self._successful_deliveries = 0
        self._failed_deliveries = 0

        # Metadata and context
        self._variables: Dict[str, Any] = {}
        self._related_entity_id: Optional[str] = None
        self._related_entity_type: Optional[str] = None
        self._tags: List[str] = []

        # Analytics
        self._clicked_links: List[str] = []
        self._interaction_data: Dict[str, Any] = {}

    @classmethod
    def create(
        cls,
        notification_id: NotificationId,
        notification_type: NotificationType,
        category: NotificationCategory,
        priority: NotificationPriority,
        subject: str,
        content: str,
        recipients: List[NotificationRecipient],
        created_by_user_id: str,
        expires_at: Optional[datetime] = None,
    ) -> "Notification":
        """Factory method to create a new notification"""

        notification = cls(
            notification_id=notification_id,
            notification_type=notification_type,
            category=category,
            priority=priority,
            subject=subject,
            content=content,
            recipients=recipients,
            created_by_user_id=created_by_user_id,
            expires_at=expires_at,
        )

        # Raise domain event
        event = NotificationCreated.create(
            aggregate_id=notification_id.value,
            event_type="NotificationCreated",
            notification_type=notification_type.value,
            category=category.value,
            priority=priority.value,
            recipient_count=len(recipients),
        )
        notification.add_domain_event(event)

        return notification

    # Properties
    @property
    def notification_type(self) -> NotificationType:
        return self._notification_type

    @property
    def category(self) -> NotificationCategory:
        return self._category

    @property
    def priority(self) -> NotificationPriority:
        return self._priority

    @property
    def subject(self) -> str:
        return self._subject

    @property
    def content(self) -> str:
        return self._content

    @property
    def recipients(self) -> List[NotificationRecipient]:
        return self._recipients.copy()

    @property
    def status(self) -> NotificationStatus:
        return self._status

    @property
    def expires_at(self) -> datetime:
        return self._expires_at

    @property
    def scheduled_for(self) -> Optional[datetime]:
        return self._scheduled_for

    @property
    def sent_at(self) -> Optional[datetime]:
        return self._sent_at

    @property
    def delivered_at(self) -> Optional[datetime]:
        return self._delivered_at

    @property
    def delivery_attempts(self) -> List[NotificationDeliveryAttempt]:
        return self._delivery_attempts.copy()

    @property
    def successful_deliveries(self) -> int:
        return self._successful_deliveries

    @property
    def failed_deliveries(self) -> int:
        return self._failed_deliveries

    @property
    def variables(self) -> Dict[str, Any]:
        return self._variables.copy()

    @property
    def related_entity_id(self) -> Optional[str]:
        return self._related_entity_id

    @property
    def tags(self) -> List[str]:
        return self._tags.copy()

    # Business operations
    def set_variables(self, variables: Dict[str, Any]):
        """Set template variables for personalization"""
        self._variables.update(variables)
        self._increment_version()

    def set_related_entity(self, entity_id: str, entity_type: str):
        """Set related business entity for context"""
        self._related_entity_id = entity_id
        self._related_entity_type = entity_type
        self._increment_version()

    def add_tags(self, tags: List[str]):
        """Add tags for categorization and filtering"""
        for tag in tags:
            if tag not in self._tags:
                self._tags.append(tag)
        self._increment_version()

    def schedule_for(self, scheduled_time: datetime):
        """Schedule notification for future delivery"""
        if scheduled_time <= datetime.now(timezone.utc):
            raise BusinessRuleViolationError(
                "Cannot schedule notification for past time"
            )

        if scheduled_time > self._expires_at:
            raise BusinessRuleViolationError(
                "Cannot schedule notification after expiry time"
            )

        self._scheduled_for = scheduled_time
        self._increment_version()

    def cancel_scheduled(self):
        """Cancel scheduled notification"""
        if self._status == NotificationStatus.SENT:
            raise BusinessRuleViolationError(
                "Cannot cancel notification that has already been sent"
            )

        self._scheduled_for = None
        self._status = NotificationStatus.EXPIRED
        self._increment_version()

    def mark_as_sent(self):
        """Mark notification as sent"""
        if self._status != NotificationStatus.PENDING:
            raise BusinessRuleViolationError(
                "Can only mark pending notifications as sent"
            )

        self._status = NotificationStatus.SENT
        self._sent_at = datetime.now(timezone.utc)
        self._increment_version()

    def record_delivery_attempt(self, attempt: NotificationDeliveryAttempt):
        """Record a delivery attempt"""
        self._delivery_attempts.append(attempt)

        if attempt.status == NotificationStatus.DELIVERED:
            self._successful_deliveries += 1
            if self._status == NotificationStatus.SENT:
                self._status = NotificationStatus.DELIVERED
                self._delivered_at = attempt.attempted_at

            # Raise success event
            event = NotificationDelivered.create(
                aggregate_id=self.id.value,
                event_type="NotificationDelivered",
                notification_type=self._notification_type.value,
                channel=attempt.channel.value,
                recipient_user_id="",  # Would need recipient context
            )
            self.add_domain_event(event)

        elif attempt.status == NotificationStatus.FAILED:
            self._failed_deliveries += 1

            # Check if we should mark as failed overall
            if len(self._delivery_attempts) >= self._max_retry_attempts:
                self._status = NotificationStatus.FAILED

            # Raise failure event
            event = NotificationFailed.create(
                aggregate_id=self.id.value,
                event_type="NotificationFailed",
                notification_type=self._notification_type.value,
                channel=attempt.channel.value,
                recipient_user_id="",
                error_message=attempt.error_message or "Unknown error",
            )
            self.add_domain_event(event)

        self._increment_version()

    def mark_as_read(self, user_id: str):
        """Mark notification as read by user"""
        if self._status not in [NotificationStatus.DELIVERED, NotificationStatus.SENT]:
            raise BusinessRuleViolationError(
                "Can only mark delivered notifications as read"
            )

        self._status = NotificationStatus.READ
        self._read_at = datetime.now(timezone.utc)

        # Record interaction
        self._interaction_data["read_by"] = user_id
        self._interaction_data["read_at"] = self._read_at.isoformat()

        self._increment_version()

    def track_link_click(self, url: str, user_id: str):
        """Track link click in notification"""
        if url not in self._clicked_links:
            self._clicked_links.append(url)

        # Record interaction
        if "link_clicks" not in self._interaction_data:
            self._interaction_data["link_clicks"] = []

        self._interaction_data["link_clicks"].append(
            {
                "url": url,
                "clicked_by": user_id,
                "clicked_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        self._increment_version()

    def is_expired(self) -> bool:
        """Check if notification has expired"""
        return datetime.now(timezone.utc) > self._expires_at

    def can_be_sent(self) -> bool:
        """Check if notification can be sent"""
        return (
            self._status == NotificationStatus.PENDING
            and not self.is_expired()
            and (
                self._scheduled_for is None
                or self._scheduled_for <= datetime.now(timezone.utc)
            )
        )

    def should_retry(self) -> bool:
        """Check if notification should be retried"""
        return (
            self._status in [NotificationStatus.PENDING, NotificationStatus.SENT]
            and self._failed_deliveries > 0
            and len(self._delivery_attempts) < self._max_retry_attempts
            and not self.is_expired()
        )

    def get_next_retry_time(self) -> Optional[datetime]:
        """Get the time for next retry attempt"""
        if not self.should_retry():
            return None

        retry_index = min(
            len(self._delivery_attempts), len(self._retry_delay_minutes) - 1
        )
        delay_minutes = self._retry_delay_minutes[retry_index]

        # Use the last attempt time or sent time
        base_time = self._sent_at or datetime.now(timezone.utc)
        if self._delivery_attempts:
            base_time = max(base_time, self._delivery_attempts[-1].attempted_at)

        return base_time + timedelta(minutes=delay_minutes)

    def get_personalized_content(self, recipient: NotificationRecipient) -> str:
        """Get personalized content for specific recipient"""
        content = self._content

        # Replace recipient-specific variables
        recipient_vars = {
            "{{RECIPIENT_NAME}}": recipient.name,
            "{{RECIPIENT_EMAIL}}": recipient.email.value if recipient.email else "",
        }

        for placeholder, value in recipient_vars.items():
            content = content.replace(placeholder, str(value))

        # Replace general variables
        for key, value in self._variables.items():
            placeholder = "{{" + key.upper() + "}}"
            content = content.replace(placeholder, str(value))

        return content

    def get_personalized_subject(self, recipient: NotificationRecipient) -> str:
        """Get personalized subject for specific recipient"""
        subject = self._subject

        # Replace recipient-specific variables
        recipient_vars = {
            "{{RECIPIENT_NAME}}": recipient.name,
        }

        for placeholder, value in recipient_vars.items():
            subject = subject.replace(placeholder, str(value))

        # Replace general variables
        for key, value in self._variables.items():
            placeholder = "{{" + key.upper() + "}}"
            subject = subject.replace(placeholder, str(value))

        return subject

    def get_delivery_rate(self) -> float:
        """Get delivery success rate"""
        total_attempts = self._successful_deliveries + self._failed_deliveries
        if total_attempts == 0:
            return 0.0

        return self._successful_deliveries / total_attempts

    def get_engagement_score(self) -> float:
        """Calculate engagement score based on interactions"""
        score = 0.0

        # Base score for delivery
        if self._status in [NotificationStatus.DELIVERED, NotificationStatus.READ]:
            score += 50.0

        # Read score
        if self._status == NotificationStatus.READ:
            score += 30.0

        # Link click score
        if self._clicked_links:
            score += min(20.0, len(self._clicked_links) * 5.0)

        return min(100.0, score)

    def expire(self):
        """Mark notification as expired"""
        if self._status == NotificationStatus.PENDING:
            self._status = NotificationStatus.EXPIRED
            self._increment_version()

    # Validation methods
    def _validate_subject(self, subject: str):
        """Validate notification subject"""
        if not subject or not subject.strip():
            raise DomainValidationError(
                "Notification subject cannot be empty", "subject", subject
            )

        if len(subject.strip()) > 200:
            raise DomainValidationError(
                "Notification subject too long (max 200 characters)", "subject", subject
            )

    def _validate_content(self, content: str):
        """Validate notification content"""
        if not content or not content.strip():
            raise DomainValidationError(
                "Notification content cannot be empty", "content", content
            )

    def _validate_recipients(self, recipients: List[NotificationRecipient]):
        """Validate notification recipients"""
        if not recipients:
            raise DomainValidationError(
                "Notification must have at least one recipient",
                "recipients",
                recipients,
            )

        if len(recipients) > 1000:  # Reasonable batch limit
            raise DomainValidationError(
                "Too many recipients (max 1000)", "recipients", recipients
            )

    def _validate_user_id(self, user_id: str):
        """Validate user ID"""
        if not user_id or not user_id.strip():
            raise DomainValidationError(
                "User ID cannot be empty", "created_by_user_id", user_id
            )
