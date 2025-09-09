"""
Notification Repository Interface
Following DDD Repository pattern with proper abstraction for notifications
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from app.domain.entities.notification import (
    Notification,
    NotificationId,
    NotificationStatus,
    NotificationCategory,
    NotificationPriority,
    NotificationType as DomainNotificationType
)


@dataclass
class NotificationFilter:
    """Filter criteria for notification queries"""

    user_id: Optional[str] = None
    notification_type: Optional[str] = None  # Using string to match API
    category: Optional[NotificationCategory] = None
    priority: Optional[NotificationPriority] = None
    status: Optional[NotificationStatus] = None
    read: Optional[bool] = None
    action_required: Optional[bool] = None
    related_entity_id: Optional[str] = None
    related_entity_type: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    expires_after: Optional[datetime] = None
    expires_before: Optional[datetime] = None
    search_query: Optional[str] = None  # For searching in title and message
    tags: Optional[List[str]] = None

    def has_criteria(self) -> bool:
        """Check if filter has any criteria set"""
        return any([
            self.user_id,
            self.notification_type,
            self.category,
            self.priority,
            self.status,
            self.read is not None,
            self.action_required is not None,
            self.related_entity_id,
            self.related_entity_type,
            self.created_after,
            self.created_before,
            self.expires_after,
            self.expires_before,
            self.search_query,
            self.tags,
        ])

    def to_dict(self) -> Dict[str, Any]:
        """Convert filter to dictionary (excluding None values)"""
        result = {}
        for field, value in self.__dict__.items():
            if value is not None:
                if hasattr(value, 'value'):  # Handle enums
                    result[field] = value.value
                else:
                    result[field] = value
        return result


@dataclass
class NotificationSortCriteria:
    """Sort criteria for notification queries"""

    field: str = "created_at"  # timestamp in API format
    direction: str = "DESC"  # DESC for newest first

    VALID_FIELDS = [
        "timestamp", "created_at", "priority", "type", "read", "action_required"
    ]
    VALID_DIRECTIONS = ["ASC", "DESC"]

    def __post_init__(self):
        if self.field not in self.VALID_FIELDS:
            raise ValueError(f"Invalid sort field: {self.field}")
        if self.direction not in self.VALID_DIRECTIONS:
            raise ValueError(f"Invalid sort direction: {self.direction}")


@dataclass
class NotificationSearchResult:
    """Paginated search results for notifications"""

    notifications: List[Notification]
    total_count: int
    unread_count: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class NotificationRepository(ABC):
    """Repository interface for notification aggregate"""

    @abstractmethod
    async def get_by_id(self, notification_id: NotificationId) -> Optional[Notification]:
        """Get notification by ID"""
        pass

    @abstractmethod
    async def save(self, notification: Notification) -> None:
        """Save notification to repository"""
        pass

    @abstractmethod
    async def delete(self, notification_id: NotificationId) -> None:
        """Delete notification from repository"""
        pass

    @abstractmethod
    async def get_by_user(
        self,
        user_id: str,
        filters: Optional[NotificationFilter] = None,
        sort_criteria: Optional[NotificationSortCriteria] = None,
        limit: int = 20,
        offset: int = 0
    ) -> NotificationSearchResult:
        """Get notifications for a specific user with filtering, sorting, and pagination"""
        pass

    @abstractmethod
    async def get_by_recipient(
        self,
        user_id: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Notification]:
        """Get notifications where user is a recipient (for compatibility with existing service)"""
        pass

    @abstractmethod
    async def search(
        self,
        filters: NotificationFilter,
        sort_criteria: Optional[NotificationSortCriteria] = None,
        limit: int = 20,
        offset: int = 0
    ) -> NotificationSearchResult:
        """Search notifications with advanced filtering"""
        pass

    @abstractmethod
    async def mark_as_read(self, notification_id: NotificationId, user_id: str) -> bool:
        """Mark notification as read by user"""
        pass

    @abstractmethod
    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for user, returns count of updated notifications"""
        pass

    @abstractmethod
    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for user"""
        pass

    @abstractmethod
    async def get_scheduled_for_delivery(self) -> List[Notification]:
        """Get notifications that are scheduled for delivery"""
        pass

    @abstractmethod
    async def get_pending_retries(self) -> List[Notification]:
        """Get notifications that need to be retried"""
        pass

    @abstractmethod
    async def get_expired_notifications(self) -> List[Notification]:
        """Get notifications that have expired"""
        pass

    @abstractmethod
    async def get_statistics(
        self,
        date_from: datetime,
        date_to: datetime,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get notification statistics for a date range"""
        pass

    @abstractmethod
    async def cleanup_old_notifications(self, older_than_days: int = 90) -> int:
        """Clean up old notifications, returns count of deleted notifications"""
        pass

    @abstractmethod
    async def bulk_create(self, notifications: List[Notification]) -> None:
        """Create multiple notifications efficiently"""
        pass

    @abstractmethod
    async def get_by_related_entity(
        self,
        entity_type: str,
        entity_id: str,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications related to a specific entity"""
        pass

    @abstractmethod
    async def count_by_type(self, user_id: str) -> Dict[str, int]:
        """Get notification counts by type for a user"""
        pass

    @abstractmethod
    async def get_recent_activity(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get recent notification activity for dashboard"""
        pass
