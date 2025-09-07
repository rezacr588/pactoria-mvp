"""
Integration domain entity and related value objects
Represents external integrations for Pactoria platform
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from enum import Enum
from uuid import uuid4

from app.domain.entities.base import AggregateRoot, DomainEvent
from app.domain.value_objects import Email


class IntegrationCategory(str, Enum):
    """Categories of integrations"""
    EMAIL = "email"
    CALENDAR = "calendar" 
    EXPORT = "export"
    CRM = "crm"
    ACCOUNTING = "accounting"
    STORAGE = "storage"
    COMMUNICATION = "communication"
    HR = "hr"
    PRODUCTIVITY = "productivity"
    LEGAL = "legal"
    ANALYTICS = "analytics"


class IntegrationStatus(str, Enum):
    """Integration connection status"""
    AVAILABLE = "available"
    CONNECTED = "connected"
    PENDING = "pending"
    ERROR = "error"
    SETUP_REQUIRED = "setup_required"


class IntegrationProvider(str, Enum):
    """Integration providers"""
    PACTORIA = "pactoria"  # Built-in integrations
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    SLACK = "slack"
    HUBSPOT = "hubspot"
    SALESFORCE = "salesforce"
    XERO = "xero"
    QUICKBOOKS = "quickbooks"
    DROPBOX = "dropbox"
    ONEDRIVE = "onedrive"


class PriceTier(str, Enum):
    """Integration pricing tiers"""
    FREE = "free"
    BASIC = "basic" 
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass(frozen=True)
class IntegrationConfiguration:
    """Value object for integration configuration"""
    settings: Dict[str, Any] = field(default_factory=dict)
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    credentials: Optional[Dict[str, str]] = field(default_factory=dict)
    
    def __post_init__(self):
        # Ensure sensitive data is handled properly
        if self.api_key and len(self.api_key) < 8:
            raise ValueError("API key too short")


@dataclass(frozen=True)
class IntegrationFeatures:
    """Value object for integration features"""
    features: List[str] = field(default_factory=list)
    
    def has_feature(self, feature: str) -> bool:
        """Check if integration has specific feature"""
        return feature.lower() in [f.lower() for f in self.features]


@dataclass(frozen=True)
class SyncStatus:
    """Value object for sync status information"""
    status: str
    last_sync: Optional[datetime] = None
    next_sync: Optional[datetime] = None
    records_synced: int = 0
    sync_frequency: str = "manual"
    error_message: Optional[str] = None
    sync_job_id: Optional[str] = None


# Domain Events
@dataclass(frozen=True)
class IntegrationConnectedEvent(DomainEvent):
    """Event raised when integration is connected"""
    integration_id: str
    provider: str
    category: str
    user_id: str
    company_id: str


@dataclass(frozen=True)
class IntegrationDisconnectedEvent(DomainEvent):
    """Event raised when integration is disconnected"""
    integration_id: str
    provider: str
    user_id: str
    company_id: str


@dataclass(frozen=True)
class IntegrationConfiguredEvent(DomainEvent):
    """Event raised when integration is configured"""
    integration_id: str
    provider: str
    user_id: str
    company_id: str
    configuration_keys: List[str]


@dataclass(frozen=True)
class IntegrationSyncTriggeredEvent(DomainEvent):
    """Event raised when sync is triggered"""
    integration_id: str
    provider: str
    sync_job_id: str
    user_id: str


class Integration(AggregateRoot[str]):
    """Integration aggregate root"""
    
    def __init__(
        self,
        integration_id: str,
        name: str,
        description: str,
        category: IntegrationCategory,
        provider: IntegrationProvider,
        status: IntegrationStatus = IntegrationStatus.AVAILABLE,
        price_tier: PriceTier = PriceTier.FREE,
        features: Optional[IntegrationFeatures] = None,
        configuration: Optional[IntegrationConfiguration] = None,
        is_popular: bool = False,
        is_premium: bool = False,
        setup_time_minutes: int = 5,
        connections_count: int = 0,
        rating: float = 0.0,
        company_id: Optional[str] = None,
        connected_by_user_id: Optional[str] = None,
        connected_at: Optional[datetime] = None,
    ):
        super().__init__(integration_id)
        self._name = name
        self._description = description
        self._category = category
        self._provider = provider
        self._status = status
        self._price_tier = price_tier
        self._features = features or IntegrationFeatures()
        self._configuration = configuration or IntegrationConfiguration()
        self._is_popular = is_popular
        self._is_premium = is_premium
        self._setup_time_minutes = setup_time_minutes
        self._connections_count = connections_count
        self._rating = rating
        self._company_id = company_id
        self._connected_by_user_id = connected_by_user_id
        self._connected_at = connected_at
        self._sync_status: Optional[SyncStatus] = None
        
    # Properties
    @property
    def name(self) -> str:
        return self._name
        
    @property
    def description(self) -> str:
        return self._description
        
    @property
    def category(self) -> IntegrationCategory:
        return self._category
        
    @property
    def provider(self) -> IntegrationProvider:
        return self._provider
        
    @property
    def status(self) -> IntegrationStatus:
        return self._status
        
    @property
    def price_tier(self) -> PriceTier:
        return self._price_tier
        
    @property
    def features(self) -> IntegrationFeatures:
        return self._features
        
    @property
    def configuration(self) -> IntegrationConfiguration:
        return self._configuration
        
    @property
    def is_popular(self) -> bool:
        return self._is_popular
        
    @property
    def is_premium(self) -> bool:
        return self._is_premium
        
    @property
    def setup_time_minutes(self) -> int:
        return self._setup_time_minutes
        
    @property
    def connections_count(self) -> int:
        return self._connections_count
        
    @property
    def rating(self) -> float:
        return self._rating
        
    @property
    def company_id(self) -> Optional[str]:
        return self._company_id
        
    @property
    def connected_by_user_id(self) -> Optional[str]:
        return self._connected_by_user_id
        
    @property
    def connected_at(self) -> Optional[datetime]:
        return self._connected_at
        
    @property
    def sync_status(self) -> Optional[SyncStatus]:
        return self._sync_status
        
    @property
    def is_connected(self) -> bool:
        """Check if integration is connected"""
        return self._status == IntegrationStatus.CONNECTED
        
    # Business Methods
    def connect(
        self, 
        user_id: str, 
        company_id: str, 
        configuration: Optional[IntegrationConfiguration] = None
    ) -> None:
        """Connect the integration"""
        if self._status == IntegrationStatus.CONNECTED:
            raise ValueError(f"Integration {self._name} is already connected")
            
        if self._status == IntegrationStatus.ERROR:
            raise ValueError(f"Integration {self._name} has errors, cannot connect")
            
        # Update state
        self._status = IntegrationStatus.CONNECTED
        self._company_id = company_id
        self._connected_by_user_id = user_id
        self._connected_at = datetime.now(timezone.utc)
        self._connections_count += 1
        
        if configuration:
            self._configuration = configuration
            
        self._increment_version()
        
        # Emit domain event
        event = IntegrationConnectedEvent.create(
            aggregate_id=self.id,
            event_type="integration.connected",
            integration_id=self.id,
            provider=self._provider.value,
            category=self._category.value,
            user_id=user_id,
            company_id=company_id
        )
        self.add_domain_event(event)
        
    def disconnect(self, user_id: str) -> None:
        """Disconnect the integration"""
        if not self.is_connected:
            raise ValueError(f"Integration {self._name} is not connected")
            
        # Update state
        old_company_id = self._company_id
        self._status = IntegrationStatus.AVAILABLE
        self._company_id = None
        self._connected_by_user_id = None
        self._connected_at = None
        self._sync_status = None
        
        self._increment_version()
        
        # Emit domain event
        event = IntegrationDisconnectedEvent.create(
            aggregate_id=self.id,
            event_type="integration.disconnected",
            integration_id=self.id,
            provider=self._provider.value,
            user_id=user_id,
            company_id=old_company_id or ""
        )
        self.add_domain_event(event)
        
    def update_configuration(
        self, 
        user_id: str, 
        configuration: IntegrationConfiguration
    ) -> None:
        """Update integration configuration"""
        if not self.is_connected:
            raise ValueError(f"Integration {self._name} must be connected to configure")
            
        self._configuration = configuration
        self._increment_version()
        
        # Emit domain event
        event = IntegrationConfiguredEvent.create(
            aggregate_id=self.id,
            event_type="integration.configured", 
            integration_id=self.id,
            provider=self._provider.value,
            user_id=user_id,
            company_id=self._company_id or "",
            configuration_keys=list(configuration.settings.keys())
        )
        self.add_domain_event(event)
        
    def trigger_sync(self, user_id: str) -> str:
        """Trigger data synchronization"""
        if not self.is_connected:
            raise ValueError(f"Integration {self._name} must be connected to sync")
            
        sync_job_id = str(uuid4())
        
        # Update sync status
        self._sync_status = SyncStatus(
            status="running",
            last_sync=datetime.now(timezone.utc),
            sync_job_id=sync_job_id,
            sync_frequency=self._sync_status.sync_frequency if self._sync_status else "manual"
        )
        
        self._increment_version()
        
        # Emit domain event
        event = IntegrationSyncTriggeredEvent.create(
            aggregate_id=self.id,
            event_type="integration.sync_triggered",
            integration_id=self.id,
            provider=self._provider.value,
            sync_job_id=sync_job_id,
            user_id=user_id
        )
        self.add_domain_event(event)
        
        return sync_job_id
        
    def update_sync_status(self, sync_status: SyncStatus) -> None:
        """Update sync status information"""
        if not self.is_connected:
            raise ValueError(f"Integration {self._name} must be connected to have sync status")
            
        self._sync_status = sync_status
        self._increment_version()
        
    def mark_error(self, error_message: str) -> None:
        """Mark integration as having an error"""
        self._status = IntegrationStatus.ERROR
        if self._sync_status:
            self._sync_status = SyncStatus(
                status="error",
                last_sync=self._sync_status.last_sync,
                next_sync=None,
                records_synced=self._sync_status.records_synced,
                sync_frequency=self._sync_status.sync_frequency,
                error_message=error_message,
                sync_job_id=self._sync_status.sync_job_id
            )
        self._increment_version()
        
    def can_be_connected_by_user(self, user_id: str, company_id: str) -> bool:
        """Check if integration can be connected by specific user"""
        # Integration is available or belongs to same company
        if self._status == IntegrationStatus.AVAILABLE:
            return True
            
        if self._status == IntegrationStatus.CONNECTED:
            return self._company_id == company_id
            
        return False
        
    def has_feature(self, feature: str) -> bool:
        """Check if integration has specific feature"""
        return self._features.has_feature(feature)
        
    @staticmethod
    def create_email_notifications() -> "Integration":
        """Factory method for email notifications integration"""
        return Integration(
            integration_id="email-notifications",
            name="Email Notifications",
            description="Automated email alerts for contract deadlines and updates",
            category=IntegrationCategory.EMAIL,
            provider=IntegrationProvider.PACTORIA,
            status=IntegrationStatus.AVAILABLE,
            price_tier=PriceTier.FREE,
            features=IntegrationFeatures([
                "Deadline reminders",
                "Status updates", 
                "UK business hours"
            ]),
            setup_time_minutes=2,
            is_popular=True
        )
        
    @staticmethod
    def create_calendar_sync() -> "Integration":
        """Factory method for calendar sync integration"""
        return Integration(
            integration_id="calendar-sync",
            name="Calendar Integration",
            description="Sync important contract dates with your calendar",
            category=IntegrationCategory.CALENDAR,
            provider=IntegrationProvider.PACTORIA,
            status=IntegrationStatus.AVAILABLE,
            price_tier=PriceTier.FREE,
            features=IntegrationFeatures([
                "Contract deadlines",
                "Review dates",
                "Outlook & Google support"
            ]),
            setup_time_minutes=3,
            is_popular=True
        )
        
    @staticmethod
    def create_csv_export() -> "Integration":
        """Factory method for CSV export integration"""
        return Integration(
            integration_id="csv-export", 
            name="CSV Export",
            description="Export contract data for record keeping and reporting",
            category=IntegrationCategory.EXPORT,
            provider=IntegrationProvider.PACTORIA,
            status=IntegrationStatus.CONNECTED,  # Pre-connected for MVP
            price_tier=PriceTier.FREE,
            features=IntegrationFeatures([
                "Contract summaries",
                "Compliance reports", 
                "UK date formats"
            ]),
            setup_time_minutes=1,
            is_popular=True
        )