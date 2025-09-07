"""
Enhanced Notification Service
Combines database persistence with real-time WebSocket broadcasting
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.domain.repositories.notification_repository import NotificationRepository
from app.domain.entities.notification import (
    Notification as DomainNotification,
    NotificationId,
    NotificationRecipient,
    NotificationPriority,
    NotificationCategory,
    NotificationType as DomainNotificationType
)
from app.infrastructure.repositories.sqlalchemy_notification_repository import SQLAlchemyNotificationRepository
from app.services.websocket_service import send_user_notification
from app.schemas.websocket import NotificationMessage, MessageType
from app.domain.exceptions import ValidationError, NotFoundError
from app.domain.value_objects import Email

logger = logging.getLogger(__name__)


class EnhancedNotificationService:
    """
    Enhanced notification service that provides both database persistence
    and real-time WebSocket broadcasting for comprehensive notification management
    """

    def __init__(self, db_session: Session):
        self.db_session = db_session
        self.repository: NotificationRepository = SQLAlchemyNotificationRepository(db_session)

    async def create_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "system",
        priority: str = "medium",
        action_required: bool = False,
        related_contract_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        broadcast_realtime: bool = True
    ) -> DomainNotification:
        """
        Create a notification with both database persistence and optional real-time broadcasting
        """
        try:
            # Get user info for creating recipient
            from app.infrastructure.database.models import User
            user = self.db_session.query(User).filter(User.id == user_id).first()
            if not user:
                raise NotFoundError(f"User {user_id} not found")

            # Create notification recipient
            email = None
            try:
                email = Email(user.email) if user.email else None
            except:
                pass  # Invalid email, proceed without

            recipient = NotificationRecipient(
                user_id=user.id,
                name=user.full_name,
                email=email,
                preferred_channels=[DomainNotificationType.IN_APP],
                timezone=getattr(user, 'timezone', 'Europe/London'),
            )

            # Map API types to domain types
            domain_category = self._map_api_type_to_category(notification_type)
            domain_priority = self._map_api_priority_to_domain(priority)

            # Create domain notification
            notification = DomainNotification.create(
                notification_id=NotificationId.generate(),
                notification_type=DomainNotificationType.IN_APP,
                category=domain_category,
                priority=domain_priority,
                subject=title,
                content=message,
                recipients=[recipient],
                created_by_user_id="system",  # Could be made configurable
            )

            # Set additional properties
            if related_contract_id:
                notification.set_related_entity(related_contract_id, "contract")

            if metadata:
                notification.set_variables(metadata)

            # Save to database
            await self.repository.save(notification)

            logger.info(f"Created notification {notification.id.value} for user {user_id}")

            # Broadcast real-time notification if requested
            if broadcast_realtime:
                await self._broadcast_notification(notification, action_required)

            return notification

        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            raise

    async def get_user_notifications(
        self,
        user_id: str,
        page: int = 1,
        size: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get paginated notifications for a user with filtering
        """
        try:
            from app.domain.repositories.notification_repository import NotificationFilter, NotificationSortCriteria

            # Build filters (don't include user_id as it's already filtered in repository)
            notification_filter = NotificationFilter(
                user_id=None,  # Don't include user_id as get_by_user already filters by it
                notification_type=filters.get('type') if filters else None,
                read=filters.get('read') if filters else None,
                action_required=filters.get('action_required') if filters else None,
                search_query=filters.get('search') if filters else None,
            )

            # Build sort criteria
            sort_criteria = NotificationSortCriteria(
                field="created_at",
                direction="DESC"
            )

            # Get notifications
            result = await self.repository.get_by_user(
                user_id=user_id,
                filters=notification_filter,
                sort_criteria=sort_criteria,
                limit=size,
                offset=(page - 1) * size
            )

            # Convert to API format
            api_notifications = []
            for notification in result.notifications:
                api_notification = self._domain_to_api_format(notification)
                api_notifications.append(api_notification)

            return {
                "notifications": api_notifications,
                "total": result.total_count,
                "unread_count": result.unread_count,
                "page": result.page,
                "size": result.page_size,
                "pages": result.total_pages,
            }

        except Exception as e:
            logger.error(f"Error getting notifications for user {user_id}: {e}")
            raise

    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """
        Mark a notification as read with real-time update
        """
        try:
            success = await self.repository.mark_as_read(
                NotificationId(notification_id), 
                user_id
            )

            if success:
                # Broadcast real-time update
                await self._broadcast_read_status_update(notification_id, user_id)
                logger.info(f"Marked notification {notification_id} as read for user {user_id}")

            return success

        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            raise

    async def mark_all_as_read(self, user_id: str) -> int:
        """
        Mark all notifications as read for a user with real-time update
        """
        try:
            updated_count = await self.repository.mark_all_as_read(user_id)

            if updated_count > 0:
                # Broadcast real-time update
                await self._broadcast_all_read_update(user_id, updated_count)
                logger.info(f"Marked {updated_count} notifications as read for user {user_id}")

            return updated_count

        except Exception as e:
            logger.error(f"Error marking all notifications as read: {e}")
            raise

    async def get_unread_count(self, user_id: str) -> int:
        """
        Get count of unread notifications for a user
        """
        try:
            return await self.repository.get_unread_count(user_id)
        except Exception as e:
            logger.error(f"Error getting unread count: {e}")
            return 0

    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """
        Delete a notification with real-time update
        """
        try:
            # First verify the notification belongs to the user
            notification = await self.repository.get_by_id(NotificationId(notification_id))
            if not notification:
                return False

            # Check if user is authorized (notification recipient)
            user_authorized = any(
                recipient.user_id == user_id 
                for recipient in notification.recipients
            )
            if not user_authorized:
                return False

            # Delete notification
            await self.repository.delete(NotificationId(notification_id))

            # Broadcast real-time update
            await self._broadcast_deletion_update(notification_id, user_id)

            logger.info(f"Deleted notification {notification_id} for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting notification: {e}")
            return False

    async def create_contract_notification(
        self,
        user_id: str,
        contract_id: str,
        contract_title: str,
        notification_type: str,
        message: str,
        priority: str = "medium"
    ) -> Optional[DomainNotification]:
        """
        Create a contract-related notification
        """
        title_map = {
            "created": f"Contract Created: {contract_title}",
            "updated": f"Contract Updated: {contract_title}",
            "signed": f"Contract Signed: {contract_title}",
            "expired": f"Contract Expired: {contract_title}",
            "review_required": f"Contract Review Required: {contract_title}",
        }

        title = title_map.get(notification_type, f"Contract Update: {contract_title}")

        return await self.create_notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type="contract",
            priority=priority,
            action_required=(notification_type in ["review_required", "expired"]),
            related_contract_id=contract_id,
            metadata={
                "contract_id": contract_id,
                "contract_title": contract_title,
                "notification_type": notification_type,
            }
        )

    async def create_system_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        priority: str = "low",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[DomainNotification]:
        """
        Create a system notification
        """
        return await self.create_notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type="system",
            priority=priority,
            metadata=metadata
        )

    async def broadcast_to_company_users(
        self,
        company_id: str,
        title: str,
        message: str,
        notification_type: str = "system",
        priority: str = "medium",
        exclude_user_ids: Optional[List[str]] = None
    ) -> int:
        """
        Create notifications for all users in a company
        """
        try:
            from app.infrastructure.database.models import User

            # Get all active users in the company
            query = self.db_session.query(User).filter(
                User.company_id == company_id,
                User.is_active == True
            )

            if exclude_user_ids:
                query = query.filter(~User.id.in_(exclude_user_ids))

            users = query.all()

            # Create notifications for each user
            created_count = 0
            for user in users:
                try:
                    await self.create_notification(
                        user_id=user.id,
                        title=title,
                        message=message,
                        notification_type=notification_type,
                        priority=priority,
                        metadata={"company_broadcast": True, "company_id": company_id}
                    )
                    created_count += 1
                except Exception as e:
                    logger.error(f"Failed to create notification for user {user.id}: {e}")

            logger.info(f"Created {created_count} company notifications for {company_id}")
            return created_count

        except Exception as e:
            logger.error(f"Error broadcasting to company users: {e}")
            return 0

    # Private helper methods

    async def _broadcast_notification(
        self, 
        notification: DomainNotification, 
        action_required: bool = False
    ):
        """
        Broadcast notification via WebSocket
        """
        try:
            # Get the first recipient (should be the target user)
            recipient = notification.recipients[0] if notification.recipients else None
            if not recipient:
                return

            # Create WebSocket message
            ws_message = NotificationMessage(
                type=MessageType.NOTIFICATION,
                title=notification.subject,
                message=notification.content,
                notification_type=self._map_category_to_api_type(notification.category),
                priority=notification.priority.value.upper(),
                target_user_id=recipient.user_id,
                data=notification.variables or {},
                action_url=self._get_action_url(notification),
                expires_at=notification.expires_at.isoformat() if notification.expires_at else None,
            )

            # Send via WebSocket
            await send_user_notification(ws_message)

        except Exception as e:
            logger.error(f"Error broadcasting notification: {e}")

    async def _broadcast_read_status_update(self, notification_id: str, user_id: str):
        """
        Broadcast read status update via WebSocket
        """
        try:
            ws_message = {
                "type": "notification_read",
                "notification_id": notification_id,
                "read": True,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            from app.services.websocket_service import websocket_manager
            await websocket_manager.send_to_user(user_id, ws_message)

        except Exception as e:
            logger.error(f"Error broadcasting read status update: {e}")

    async def _broadcast_all_read_update(self, user_id: str, count: int):
        """
        Broadcast all read status update via WebSocket
        """
        try:
            ws_message = {
                "type": "notifications_all_read",
                "updated_count": count,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            from app.services.websocket_service import websocket_manager
            await websocket_manager.send_to_user(user_id, ws_message)

        except Exception as e:
            logger.error(f"Error broadcasting all read update: {e}")

    async def _broadcast_deletion_update(self, notification_id: str, user_id: str):
        """
        Broadcast notification deletion via WebSocket
        """
        try:
            ws_message = {
                "type": "notification_deleted",
                "notification_id": notification_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            from app.services.websocket_service import websocket_manager
            await websocket_manager.send_to_user(user_id, ws_message)

        except Exception as e:
            logger.error(f"Error broadcasting deletion update: {e}")

    def _domain_to_api_format(self, notification: DomainNotification) -> Dict[str, Any]:
        """
        Convert domain notification to API format
        """
        recipient = notification.recipients[0] if notification.recipients else None
        
        # Determine read status from domain entity
        is_read = (notification.status.value == "read")
        
        # Get timestamp - use _created_at if available, otherwise current time with timezone
        timestamp = datetime.now(timezone.utc)
        if hasattr(notification, '_created_at') and notification._created_at:
            timestamp = notification._created_at
        elif hasattr(notification, 'created_at') and notification.created_at:
            timestamp = notification.created_at
        
        return {
            "id": notification.id.value,
            "type": self._map_category_to_api_type(notification.category),
            "title": notification.subject,
            "message": notification.content,
            "priority": notification.priority.value.lower(),
            "action_required": False,  # Could be derived from notification logic
            "read": is_read,
            "timestamp": timestamp.isoformat() if timestamp else datetime.now(timezone.utc).isoformat(),
            "user_id": recipient.user_id if recipient else None,
            "related_contract": self._get_related_contract_info(notification),
            "metadata": notification.variables or {},
        }

    def _map_api_type_to_category(self, api_type: str) -> NotificationCategory:
        """
        Map API notification type to domain category
        """
        type_to_category = {
            "deadline": NotificationCategory.DEADLINE_REMINDER,
            "compliance": NotificationCategory.COMPLIANCE_ALERT,
            "contract": NotificationCategory.CONTRACT_STATUS,
            "team": NotificationCategory.TEAM_ACTIVITY,
            "system": NotificationCategory.SYSTEM_UPDATE,
        }
        return type_to_category.get(api_type.lower(), NotificationCategory.SYSTEM_UPDATE)

    def _map_category_to_api_type(self, category: NotificationCategory) -> str:
        """
        Map domain category to API type
        """
        category_to_type = {
            NotificationCategory.DEADLINE_REMINDER: "deadline",
            NotificationCategory.COMPLIANCE_ALERT: "compliance",
            NotificationCategory.CONTRACT_STATUS: "contract",
            NotificationCategory.TEAM_ACTIVITY: "team",
            NotificationCategory.SYSTEM_UPDATE: "system",
            NotificationCategory.BILLING: "system",
            NotificationCategory.SECURITY: "system",
            NotificationCategory.LEGAL_REVIEW: "compliance",
            NotificationCategory.APPROVAL_REQUEST: "contract",
            NotificationCategory.INTEGRATION: "system",
        }
        return category_to_type.get(category, "system")

    def _map_api_priority_to_domain(self, api_priority: str) -> NotificationPriority:
        """
        Map API priority to domain priority
        """
        priority_map = {
            "low": NotificationPriority.LOW,
            "medium": NotificationPriority.MEDIUM,
            "high": NotificationPriority.HIGH,
            "urgent": NotificationPriority.URGENT,
        }
        return priority_map.get(api_priority.lower(), NotificationPriority.MEDIUM)

    def _get_related_contract_info(self, notification: DomainNotification) -> Optional[Dict[str, str]]:
        """
        Get related contract information
        """
        if (hasattr(notification, 'related_entity_id') and 
            notification.related_entity_id and 
            hasattr(notification, 'related_entity_type') and
            notification.related_entity_type == "contract"):
            return {
                "id": notification.related_entity_id,
                "name": f"Contract {notification.related_entity_id}"  # Could be enhanced
            }
        return None

    def _get_action_url(self, notification: DomainNotification) -> Optional[str]:
        """
        Generate action URL for notification
        """
        if hasattr(notification, 'related_entity_id') and notification.related_entity_id:
            if hasattr(notification, 'related_entity_type') and notification.related_entity_type == "contract":
                return f"/contracts/{notification.related_entity_id}"
        return None