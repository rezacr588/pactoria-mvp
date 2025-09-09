"""
SQLAlchemy implementation of NotificationRepository
Maps between domain entities and database models
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc, text
from sqlalchemy.exc import SQLAlchemyError
import logging

from app.domain.repositories.notification_repository import (
    NotificationRepository,
    NotificationFilter,
    NotificationSortCriteria,
    NotificationSearchResult,
)
from app.domain.entities.notification import (
    Notification as DomainNotification,
    NotificationId,
    NotificationRecipient,
    NotificationStatus,
    NotificationCategory,
    NotificationPriority,
    NotificationType as DomainNotificationType,
)
from app.infrastructure.database.models import (
    Notification as NotificationModel,
    User as UserModel,
    Contract as ContractModel,
    NotificationType,
    NotificationPriority as ModelPriority,
)
from app.domain.value_objects import Email
from app.domain.exceptions import RepositoryError, NotFoundError


logger = logging.getLogger(__name__)


class SQLAlchemyNotificationRepository(NotificationRepository):
    """SQLAlchemy implementation of notification repository"""

    def __init__(self, db_session: Session):
        self.db = db_session

    async def get_by_id(self, notification_id: NotificationId) -> Optional[DomainNotification]:
        """Get notification by ID"""
        try:
            model = (
                self.db.query(NotificationModel)
                .filter(NotificationModel.id == notification_id.value)
                .first()
            )
            return self._model_to_domain(model) if model else None
        except SQLAlchemyError as e:
            logger.error(f"Error getting notification {notification_id}: {e}")
            raise RepositoryError(f"Failed to get notification: {str(e)}")

    async def save(self, notification: DomainNotification) -> None:
        """Save notification to repository"""
        try:
            existing = (
                self.db.query(NotificationModel)
                .filter(NotificationModel.id == notification.id.value)
                .first()
            )

            if existing:
                # Update existing
                self._update_model_from_domain(existing, notification)
            else:
                # Create new
                model = self._domain_to_model(notification)
                self.db.add(model)

            self.db.commit()
            logger.info(f"Saved notification {notification.id.value}")

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error saving notification {notification.id.value}: {e}")
            raise RepositoryError(f"Failed to save notification: {str(e)}")

    async def delete(self, notification_id: NotificationId) -> None:
        """Delete notification from repository"""
        try:
            model = (
                self.db.query(NotificationModel)
                .filter(NotificationModel.id == notification_id.value)
                .first()
            )

            if not model:
                raise NotFoundError(f"Notification {notification_id.value} not found")

            self.db.delete(model)
            self.db.commit()
            logger.info(f"Deleted notification {notification_id.value}")

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error deleting notification {notification_id}: {e}")
            raise RepositoryError(f"Failed to delete notification: {str(e)}")

    async def get_by_user(
        self,
        user_id: str,
        filters: Optional[NotificationFilter] = None,
        sort_criteria: Optional[NotificationSortCriteria] = None,
        limit: int = 20,
        offset: int = 0
    ) -> NotificationSearchResult:
        """Get notifications for a specific user with filtering, sorting, and pagination"""
        try:
            query = self.db.query(NotificationModel).filter(
                NotificationModel.user_id == user_id
            )

            # Apply filters
            if filters:
                query = self._apply_filters(query, filters)

            # Count total and unread before applying pagination
            total_count = query.count()
            unread_count = query.filter(NotificationModel.read == False).count()

            # Apply sorting
            if sort_criteria:
                query = self._apply_sorting(query, sort_criteria)
            else:
                # Default sort: newest first
                query = query.order_by(desc(NotificationModel.created_at))

            # Apply pagination
            query = query.offset(offset).limit(limit)

            models = query.all()
            notifications = [self._model_to_domain(model) for model in models]

            total_pages = (total_count + limit - 1) // limit if total_count > 0 else 0
            current_page = (offset // limit) + 1

            return NotificationSearchResult(
                notifications=notifications,
                total_count=total_count,
                unread_count=unread_count,
                page=current_page,
                page_size=limit,
                total_pages=total_pages,
                has_next=(offset + limit) < total_count,
                has_previous=offset > 0,
            )

        except SQLAlchemyError as e:
            logger.error(f"Error getting notifications for user {user_id}: {e}")
            raise RepositoryError(f"Failed to get notifications: {str(e)}")

    async def get_by_recipient(
        self,
        user_id: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[DomainNotification]:
        """Get notifications where user is a recipient (for compatibility)"""
        try:
            # Convert dict filters to NotificationFilter for consistency
            notification_filter = None
            if filters:
                notification_filter = NotificationFilter(
                    user_id=user_id,
                    notification_type=filters.get('type'),
                    priority=NotificationPriority(filters['priority']) if filters.get('priority') else None,
                    status=NotificationStatus(filters['status']) if filters.get('status') else None,
                    category=NotificationCategory(filters['category']) if filters.get('category') else None,
                )

            result = await self.get_by_user(
                user_id=user_id,
                filters=notification_filter,
                limit=limit,
                offset=offset
            )
            return result.notifications

        except Exception as e:
            logger.error(f"Error getting notifications by recipient {user_id}: {e}")
            raise RepositoryError(f"Failed to get notifications: {str(e)}")

    async def search(
        self,
        filters: NotificationFilter,
        sort_criteria: Optional[NotificationSortCriteria] = None,
        limit: int = 20,
        offset: int = 0
    ) -> NotificationSearchResult:
        """Search notifications with advanced filtering"""
        try:
            query = self.db.query(NotificationModel)

            # Apply filters
            query = self._apply_filters(query, filters)

            # Count results
            total_count = query.count()
            unread_count = query.filter(NotificationModel.read == False).count()

            # Apply sorting
            if sort_criteria:
                query = self._apply_sorting(query, sort_criteria)
            else:
                query = query.order_by(desc(NotificationModel.created_at))

            # Apply pagination
            query = query.offset(offset).limit(limit)

            models = query.all()
            notifications = [self._model_to_domain(model) for model in models]

            total_pages = (total_count + limit - 1) // limit if total_count > 0 else 0
            current_page = (offset // limit) + 1

            return NotificationSearchResult(
                notifications=notifications,
                total_count=total_count,
                unread_count=unread_count,
                page=current_page,
                page_size=limit,
                total_pages=total_pages,
                has_next=(offset + limit) < total_count,
                has_previous=offset > 0,
            )

        except SQLAlchemyError as e:
            logger.error(f"Error searching notifications: {e}")
            raise RepositoryError(f"Failed to search notifications: {str(e)}")

    async def mark_as_read(self, notification_id: NotificationId, user_id: str) -> bool:
        """Mark notification as read by user"""
        try:
            model = (
                self.db.query(NotificationModel)
                .filter(
                    and_(
                        NotificationModel.id == notification_id.value,
                        NotificationModel.user_id == user_id
                    )
                )
                .first()
            )

            if not model:
                return False

            if not model.read:
                model.read = True
                model.read_at = datetime.now(timezone.utc)
                self.db.commit()
                logger.info(f"Marked notification {notification_id.value} as read")

            return True

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error marking notification as read {notification_id}: {e}")
            raise RepositoryError(f"Failed to mark notification as read: {str(e)}")

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read for user"""
        try:
            updated = (
                self.db.query(NotificationModel)
                .filter(
                    and_(
                        NotificationModel.user_id == user_id,
                        NotificationModel.read == False
                    )
                )
                .update({
                    "read": True,
                    "read_at": datetime.now(timezone.utc)
                })
            )

            self.db.commit()
            logger.info(f"Marked {updated} notifications as read for user {user_id}")
            return updated

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error marking all notifications as read for user {user_id}: {e}")
            raise RepositoryError(f"Failed to mark all notifications as read: {str(e)}")

    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for user"""
        try:
            count = (
                self.db.query(NotificationModel)
                .filter(
                    and_(
                        NotificationModel.user_id == user_id,
                        NotificationModel.read == False
                    )
                )
                .count()
            )
            return count

        except SQLAlchemyError as e:
            logger.error(f"Error getting unread count for user {user_id}: {e}")
            raise RepositoryError(f"Failed to get unread count: {str(e)}")

    async def get_scheduled_for_delivery(self) -> List[DomainNotification]:
        """Get notifications that are scheduled for delivery"""
        # Note: This is a simplified implementation since the current model doesn't
        # have all the complex delivery tracking from the domain entity
        try:
            models = (
                self.db.query(NotificationModel)
                .filter(NotificationModel.read == False)
                .filter(
                    or_(
                        NotificationModel.expires_at.is_(None),
                        NotificationModel.expires_at > datetime.now(timezone.utc)
                    )
                )
                .all()
            )
            return [self._model_to_domain(model) for model in models]

        except SQLAlchemyError as e:
            logger.error(f"Error getting scheduled notifications: {e}")
            raise RepositoryError(f"Failed to get scheduled notifications: {str(e)}")

    async def get_pending_retries(self) -> List[DomainNotification]:
        """Get notifications that need to be retried"""
        # Note: Simplified implementation - would need additional fields for retry tracking
        try:
            models = (
                self.db.query(NotificationModel)
                .filter(NotificationModel.read == False)
                .filter(
                    and_(
                        NotificationModel.expires_at.isnot(None),
                        NotificationModel.expires_at > datetime.now(timezone.utc)
                    )
                )
                .all()
            )
            return [self._model_to_domain(model) for model in models]

        except SQLAlchemyError as e:
            logger.error(f"Error getting pending retries: {e}")
            raise RepositoryError(f"Failed to get pending retries: {str(e)}")

    async def get_expired_notifications(self) -> List[DomainNotification]:
        """Get notifications that have expired"""
        try:
            models = (
                self.db.query(NotificationModel)
                .filter(
                    and_(
                        NotificationModel.expires_at.isnot(None),
                        NotificationModel.expires_at < datetime.now(timezone.utc)
                    )
                )
                .all()
            )
            return [self._model_to_domain(model) for model in models]

        except SQLAlchemyError as e:
            logger.error(f"Error getting expired notifications: {e}")
            raise RepositoryError(f"Failed to get expired notifications: {str(e)}")

    async def get_statistics(
        self,
        date_from: datetime,
        date_to: datetime,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get notification statistics for a date range"""
        try:
            query = self.db.query(NotificationModel).filter(
                and_(
                    NotificationModel.created_at >= date_from,
                    NotificationModel.created_at <= date_to
                )
            )

            if user_id:
                query = query.filter(NotificationModel.user_id == user_id)

            # Basic statistics
            total = query.count()
            unread = query.filter(NotificationModel.read == False).count()
            read = total - unread

            # By type
            type_stats = (
                self.db.query(
                    NotificationModel.type,
                    func.count(NotificationModel.id).label('count')
                )
                .filter(
                    and_(
                        NotificationModel.created_at >= date_from,
                        NotificationModel.created_at <= date_to
                    )
                )
            )

            if user_id:
                type_stats = type_stats.filter(NotificationModel.user_id == user_id)

            type_stats = type_stats.group_by(NotificationModel.type).all()

            # By priority
            priority_stats = (
                self.db.query(
                    NotificationModel.priority,
                    func.count(NotificationModel.id).label('count')
                )
                .filter(
                    and_(
                        NotificationModel.created_at >= date_from,
                        NotificationModel.created_at <= date_to
                    )
                )
            )

            if user_id:
                priority_stats = priority_stats.filter(NotificationModel.user_id == user_id)

            priority_stats = priority_stats.group_by(NotificationModel.priority).all()

            return {
                "total_notifications": total,
                "read_notifications": read,
                "unread_notifications": unread,
                "delivered_notifications": read,  # Simplified
                "by_type": {str(type_name.value): count for type_name, count in type_stats},
                "by_priority": {str(priority.value): count for priority, count in priority_stats},
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
            }

        except SQLAlchemyError as e:
            logger.error(f"Error getting notification statistics: {e}")
            raise RepositoryError(f"Failed to get statistics: {str(e)}")

    async def cleanup_old_notifications(self, older_than_days: int = 90) -> int:
        """Clean up old notifications"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=older_than_days)

            deleted = (
                self.db.query(NotificationModel)
                .filter(NotificationModel.created_at < cutoff_date)
                .filter(NotificationModel.read)  # Only delete read notifications
                .count()
            )

            self.db.query(NotificationModel).filter(
                and_(
                    NotificationModel.created_at < cutoff_date,
                    NotificationModel.read
                )
            ).delete()

            self.db.commit()
            logger.info(f"Cleaned up {deleted} old notifications")
            return deleted

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error cleaning up notifications: {e}")
            raise RepositoryError(f"Failed to cleanup notifications: {str(e)}")

    async def bulk_create(self, notifications: List[DomainNotification]) -> None:
        """Create multiple notifications efficiently"""
        try:
            models = [self._domain_to_model(notification) for notification in notifications]
            self.db.add_all(models)
            self.db.commit()
            logger.info(f"Bulk created {len(models)} notifications")

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error bulk creating notifications: {e}")
            raise RepositoryError(f"Failed to bulk create notifications: {str(e)}")

    async def get_by_related_entity(
        self,
        entity_type: str,
        entity_id: str,
        limit: int = 50
    ) -> List[DomainNotification]:
        """Get notifications related to a specific entity"""
        try:
            if entity_type.lower() == "contract":
                models = (
                    self.db.query(NotificationModel)
                    .filter(NotificationModel.related_contract_id == entity_id)
                    .order_by(desc(NotificationModel.created_at))
                    .limit(limit)
                    .all()
                )
            else:
                # For other entity types, we could search in metadata
                models = (
                    self.db.query(NotificationModel)
                    .filter(
                        NotificationModel.notification_metadata.contains(
                            {entity_type + "_id": entity_id}
                        )
                    )
                    .order_by(desc(NotificationModel.created_at))
                    .limit(limit)
                    .all()
                )

            return [self._model_to_domain(model) for model in models]

        except SQLAlchemyError as e:
            logger.error(f"Error getting notifications for entity {entity_type}:{entity_id}: {e}")
            raise RepositoryError(f"Failed to get notifications by entity: {str(e)}")

    async def count_by_type(self, user_id: str) -> Dict[str, int]:
        """Get notification counts by type for a user"""
        try:
            counts = (
                self.db.query(
                    NotificationModel.type,
                    func.count(NotificationModel.id).label('count')
                )
                .filter(NotificationModel.user_id == user_id)
                .group_by(NotificationModel.type)
                .all()
            )

            return {str(type_name.value): count for type_name, count in counts}

        except SQLAlchemyError as e:
            logger.error(f"Error counting notifications by type for user {user_id}: {e}")
            raise RepositoryError(f"Failed to count by type: {str(e)}")

    async def get_recent_activity(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get recent notification activity for dashboard"""
        try:
            models = (
                self.db.query(NotificationModel)
                .filter(NotificationModel.user_id == user_id)
                .order_by(desc(NotificationModel.created_at))
                .limit(limit)
                .all()
            )

            activity = []
            for model in models:
                activity.append({
                    "type": model.type.value,
                    "title": model.title,
                    "timestamp": model.created_at.isoformat(),
                    "read": model.read,
                    "priority": model.priority.value,
                    "action_required": model.action_required,
                })

            return activity

        except SQLAlchemyError as e:
            logger.error(f"Error getting recent activity for user {user_id}: {e}")
            raise RepositoryError(f"Failed to get recent activity: {str(e)}")

    # Private helper methods

    def _apply_filters(self, query, filters: NotificationFilter):
        """Apply filters to query"""
        if filters.user_id:
            query = query.filter(NotificationModel.user_id == filters.user_id)

        if filters.notification_type:
            # Map string type to enum
            try:
                type_enum = NotificationType(filters.notification_type.lower())
                query = query.filter(NotificationModel.type == type_enum)
            except ValueError:
                pass  # Invalid type, ignore filter

        if filters.priority:
            try:
                priority_enum = ModelPriority(filters.priority.value.lower())
                query = query.filter(NotificationModel.priority == priority_enum)
            except (ValueError, AttributeError):
                pass

        if filters.read is not None:
            query = query.filter(NotificationModel.read == filters.read)

        if filters.action_required is not None:
            query = query.filter(NotificationModel.action_required == filters.action_required)

        if filters.related_entity_id and filters.related_entity_type == "contract":
            query = query.filter(NotificationModel.related_contract_id == filters.related_entity_id)

        if filters.created_after:
            query = query.filter(NotificationModel.created_at >= filters.created_after)

        if filters.created_before:
            query = query.filter(NotificationModel.created_at <= filters.created_before)

        if filters.expires_after:
            query = query.filter(NotificationModel.expires_at >= filters.expires_after)

        if filters.expires_before:
            query = query.filter(NotificationModel.expires_at <= filters.expires_before)

        if filters.search_query:
            search = f"%{filters.search_query}%"
            query = query.filter(
                or_(
                    NotificationModel.title.ilike(search),
                    NotificationModel.message.ilike(search)
                )
            )

        return query

    def _apply_sorting(self, query, sort_criteria: NotificationSortCriteria):
        """Apply sorting to query"""
        # Map API field names to model fields
        field_map = {
            "timestamp": NotificationModel.created_at,
            "created_at": NotificationModel.created_at,
            "priority": NotificationModel.priority,
            "type": NotificationModel.type,
            "read": NotificationModel.read,
            "action_required": NotificationModel.action_required,
        }

        field = field_map.get(sort_criteria.field, NotificationModel.created_at)

        if sort_criteria.direction == "DESC":
            return query.order_by(desc(field))
        else:
            return query.order_by(asc(field))

    def _model_to_domain(self, model: NotificationModel) -> DomainNotification:
        """Convert database model to domain entity"""
        if not model:
            return None

        # Get user info for recipient
        user = model.user if hasattr(model, 'user') and model.user else None
        if not user:
            user = self.db.query(UserModel).filter(UserModel.id == model.user_id).first()

        recipients = []
        if user:
            email = None
            try:
                email = Email(user.email) if user.email else None
            except BaseException:
                pass  # Invalid email, skip

            recipient = NotificationRecipient(
                user_id=user.id,
                name=user.full_name,
                email=email,
                preferred_channels=[DomainNotificationType.IN_APP],
                timezone=getattr(user, 'timezone', 'Europe/London'),
            )
            recipients.append(recipient)

        # Map model enums to domain enums
        domain_type = self._map_model_type_to_domain(model.type)
        domain_category = self._infer_category_from_type(model.type)
        domain_priority = self._map_model_priority_to_domain(model.priority)

        # Create domain notification
        notification = DomainNotification.create(
            notification_id=NotificationId(model.id),
            notification_type=domain_type,
            category=domain_category,
            priority=domain_priority,
            subject=model.title,
            content=model.message,
            recipients=recipients,
            created_by_user_id="system",  # Default for existing notifications
            expires_at=model.expires_at,
        )

        # Set the created_at timestamp from the model
        if model.created_at:
            notification._created_at = model.created_at

        # Set proper notification status based on model state
        # First set to DELIVERED (required for proper domain state)
        notification._status = NotificationStatus.DELIVERED
        notification._delivered_at = model.created_at

        # For read notifications, set the appropriate status
        if model.read:
            # Use the domain method properly - first ensure it's delivered, then mark as read
            try:
                notification.mark_as_read(model.user_id)
            except Exception:
                # If domain validation fails, set the status directly
                notification._status = NotificationStatus.READ
                notification._read_at = model.read_at or model.created_at

        if model.related_contract_id:
            notification.set_related_entity(model.related_contract_id, "contract")

        if model.notification_metadata:
            notification.set_variables(model.notification_metadata)

        return notification

    def _domain_to_model(self, notification: DomainNotification) -> NotificationModel:
        """Convert domain entity to database model"""
        # Get the primary recipient (first one)
        recipient = notification.recipients[0] if notification.recipients else None

        model = NotificationModel(
            id=notification.id.value,
            type=self._map_domain_type_to_model(notification.notification_type),
            title=notification.subject,
            message=notification.content,
            priority=self._map_domain_priority_to_model(notification.priority),
            action_required=False,  # Would need to derive from domain logic
            read=(notification.status == NotificationStatus.READ),
            user_id=recipient.user_id if recipient else None,
            related_contract_id=notification.related_entity_id if notification.related_entity_id else None,
            expires_at=notification.expires_at,
            notification_metadata=notification.variables,
            created_at=notification.created_at if hasattr(notification, 'created_at') else datetime.now(timezone.utc),
            read_at=notification._read_at if hasattr(notification, '_read_at') else None,
        )

        return model

    def _update_model_from_domain(self, model: NotificationModel, notification: DomainNotification):
        """Update existing model with domain entity data"""
        model.title = notification.subject
        model.message = notification.content
        model.priority = self._map_domain_priority_to_model(notification.priority)
        model.read = (notification.status == NotificationStatus.READ)
        model.expires_at = notification.expires_at
        model.notification_metadata = notification.variables

        if notification.status == NotificationStatus.READ and not model.read_at:
            model.read_at = datetime.now(timezone.utc)

    def _map_model_type_to_domain(self, model_type: NotificationType) -> DomainNotificationType:
        """Map model notification type to domain type"""
        # For now, default to IN_APP since model types are different from domain types
        return DomainNotificationType.IN_APP

    def _map_domain_type_to_model(self, domain_type: DomainNotificationType) -> NotificationType:
        """Map domain notification type to model type"""
        # Default mapping - could be more sophisticated
        return NotificationType.SYSTEM

    def _infer_category_from_type(self, model_type: NotificationType) -> NotificationCategory:
        """Infer domain category from model type"""
        type_to_category = {
            NotificationType.DEADLINE: NotificationCategory.DEADLINE_REMINDER,
            NotificationType.COMPLIANCE: NotificationCategory.COMPLIANCE_ALERT,
            NotificationType.CONTRACT: NotificationCategory.CONTRACT_STATUS,
            NotificationType.TEAM: NotificationCategory.TEAM_ACTIVITY,
            NotificationType.SYSTEM: NotificationCategory.SYSTEM_UPDATE,
        }
        return type_to_category.get(model_type, NotificationCategory.SYSTEM_UPDATE)

    def _map_model_priority_to_domain(self, model_priority: ModelPriority) -> NotificationPriority:
        """Map model priority to domain priority"""
        priority_map = {
            ModelPriority.LOW: NotificationPriority.LOW,
            ModelPriority.MEDIUM: NotificationPriority.MEDIUM,
            ModelPriority.HIGH: NotificationPriority.HIGH,
        }
        return priority_map.get(model_priority, NotificationPriority.MEDIUM)

    def _map_domain_priority_to_model(self, domain_priority: NotificationPriority) -> ModelPriority:
        """Map domain priority to model priority"""
        priority_map = {
            NotificationPriority.LOW: ModelPriority.LOW,
            NotificationPriority.MEDIUM: ModelPriority.MEDIUM,
            NotificationPriority.HIGH: ModelPriority.HIGH,
            NotificationPriority.URGENT: ModelPriority.HIGH,  # Map urgent to high
        }
        return priority_map.get(domain_priority, ModelPriority.MEDIUM)
