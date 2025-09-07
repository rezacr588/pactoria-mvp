"""
Notifications API endpoints
Provides notification management and real-time updates
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.infrastructure.database.models import User
from app.infrastructure.repositories.sqlalchemy_notification_repository import SQLAlchemyNotificationRepository
from app.domain.repositories.notification_repository import NotificationFilter, NotificationSortCriteria

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# Request/Response Models
class NotificationBase(BaseModel):
    """Base notification model"""

    type: str = Field(
        description="Notification type: deadline, compliance, team, system, contract"
    )
    title: str
    message: str
    priority: str = Field(default="medium", description="Priority: low, medium, high")
    action_required: bool = Field(default=False)


class NotificationCreate(NotificationBase):
    """Notification creation model"""

    target_user_id: Optional[str] = None
    target_role: Optional[str] = None
    related_contract_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class Notification(NotificationBase):
    """Notification response model"""

    id: str
    read: bool = Field(default=False)
    timestamp: datetime
    user_id: str
    related_contract: Optional[dict] = None
    metadata: Optional[dict] = None


class NotificationUpdate(BaseModel):
    """Notification update model"""

    read: Optional[bool] = None


class NotificationStats(BaseModel):
    """Notification statistics"""

    total_notifications: int
    unread_count: int
    high_priority_count: int
    action_required_count: int
    notifications_by_type: dict
    recent_activity: List[dict]


class PaginatedNotificationResponse(BaseModel):
    """Paginated notifications response"""

    notifications: List[Notification]
    total: int
    unread_count: int
    page: int
    size: int
    pages: int


# Mock data for demonstration
def get_mock_notifications(user_id: str) -> List[Notification]:
    """Get mock notifications for a user"""
    return [
        Notification(
            id="1",
            type="deadline",
            title="Contract Review Due Tomorrow",
            message="Marketing Consultant Agreement requires your review and approval before the deadline.",
            priority="high",
            action_required=True,
            read=False,
            timestamp=datetime.now() - timedelta(hours=2),
            user_id=user_id,
            related_contract={"id": "1", "name": "Marketing Consultant Agreement"},
        ),
        Notification(
            id="2",
            type="compliance",
            title="GDPR Compliance Alert",
            message="Data Processing Agreement needs GDPR clause updates to maintain compliance.",
            priority="high",
            action_required=True,
            read=False,
            timestamp=datetime.now() - timedelta(hours=6),
            user_id=user_id,
            related_contract={"id": "2", "name": "Data Processing Agreement"},
        ),
        Notification(
            id="3",
            type="contract",
            title="Contract Signed",
            message="TechCorp Website Development contract has been signed by all parties.",
            priority="medium",
            action_required=False,
            read=True,
            timestamp=datetime.now() - timedelta(days=1),
            user_id=user_id,
            related_contract={"id": "3", "name": "TechCorp Website Development"},
        ),
        Notification(
            id="4",
            type="team",
            title="New Team Member Added",
            message="Sarah Johnson has been added to your team with Editor permissions.",
            priority="low",
            action_required=False,
            read=True,
            timestamp=datetime.now() - timedelta(days=2),
            user_id=user_id,
        ),
        Notification(
            id="5",
            type="system",
            title="System Maintenance Scheduled",
            message="Planned maintenance scheduled for Sunday 2:00 AM - 4:00 AM GMT.",
            priority="low",
            action_required=False,
            read=False,
            timestamp=datetime.now() - timedelta(days=3),
            user_id=user_id,
        ),
    ]


@router.get("/", response_model=PaginatedNotificationResponse)
async def get_notifications(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    type_filter: Optional[str] = Query(
        None, alias="type", description="Filter by type"
    ),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    read: Optional[bool] = Query(None, description="Filter by read status"),
    action_required: Optional[bool] = Query(
        None, description="Filter by action required"
    ),
    search: Optional[str] = Query(None, description="Search in title and message"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get notifications for the current user with filtering and pagination

    Returns paginated notifications with filtering options for type, priority,
    read status, and action required status.
    """
    try:
        # Create repository
        repository = SQLAlchemyNotificationRepository(db)

        # Build filters
        filters = NotificationFilter(
            user_id=current_user.id,
            notification_type=type_filter,
            priority=priority,
            read=read,
            action_required=action_required,
            search_query=search,
        )

        # Build sort criteria
        sort_criteria = NotificationSortCriteria(
            field="created_at",
            direction="DESC"
        )

        # Get notifications
        result = await repository.get_by_user(
            user_id=current_user.id,
            filters=filters,
            sort_criteria=sort_criteria,
            limit=size,
            offset=(page - 1) * size
        )

        # Convert domain notifications to API response format
        api_notifications = []
        for notification in result.notifications:
            # Get the first recipient (should be the current user)
            recipient = notification.recipients[0] if notification.recipients else None
            
            api_notification = Notification(
                id=notification.id.value,
                type=_map_domain_category_to_api_type(notification.category),
                title=notification.subject,
                message=notification.content,
                priority=notification.priority.value.lower(),
                action_required=False,  # Could be derived from notification logic
                read=(notification.status.value == "read"),
                timestamp=notification.created_at.isoformat() if hasattr(notification, 'created_at') else datetime.now().isoformat(),
                user_id=recipient.user_id if recipient else current_user.id,
                related_contract=_get_related_contract_info(notification),
                metadata=notification.variables,
            )
            api_notifications.append(api_notification)

        return PaginatedNotificationResponse(
            notifications=api_notifications,
            total=result.total_count,
            unread_count=result.unread_count,
            page=result.page,
            size=result.page_size,
            pages=result.total_pages,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve notifications: {str(e)}"
        )


@router.get("/{notification_id}", response_model=Notification)
async def get_notification(
    notification_id: str, current_user: User = Depends(get_current_user)
):
    """Get a specific notification by ID"""
    try:
        # TODO: Implement actual database query
        notifications = get_mock_notifications(current_user.id)

        for notification in notifications:
            if notification.id == notification_id:
                return notification

        raise HTTPException(status_code=404, detail="Notification not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve notification: {str(e)}"
        )


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read"""
    try:
        from app.domain.entities.notification import NotificationId
        
        # Create repository
        repository = SQLAlchemyNotificationRepository(db)
        
        # Mark as read
        success = await repository.mark_as_read(
            NotificationId(notification_id), 
            current_user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=404, 
                detail="Notification not found or user not authorized"
            )

        return {
            "success": True,
            "data": {
                "message": "Notification marked as read",
                "notification_id": notification_id,
                "read": True,
                "updated_at": datetime.now(),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to mark notification as read: {str(e)}"
        )


@router.put("/read-all")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
    try:
        # Create repository
        repository = SQLAlchemyNotificationRepository(db)
        
        # Mark all as read
        updated_count = await repository.mark_all_as_read(current_user.id)

        return {
            "success": True,
            "data": {
                "message": "All notifications marked as read",
                "updated_count": updated_count,
                "updated_at": datetime.now(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to mark all notifications as read: {str(e)}",
        )


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str, current_user: User = Depends(get_current_user)
):
    """Delete a specific notification"""
    try:
        # TODO: Implement actual database deletion
        # Mock implementation
        return {
            "success": True,
            "data": {
                "message": "Notification deleted successfully",
                "notification_id": notification_id,
                "deleted_at": datetime.now(),
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete notification: {str(e)}"
        )


@router.get("/stats/summary", response_model=NotificationStats)
async def get_notification_stats(current_user: User = Depends(get_current_user)):
    """Get notification statistics for the current user"""
    try:
        # TODO: Implement actual database queries
        # Mock implementation
        notifications = get_mock_notifications(current_user.id)

        unread_count = sum(1 for n in notifications if not n.read)
        high_priority_count = sum(1 for n in notifications if n.priority == "high")
        action_required_count = sum(1 for n in notifications if n.action_required)

        # Group by type
        notifications_by_type = {}
        for notification in notifications:
            notifications_by_type[notification.type] = (
                notifications_by_type.get(notification.type, 0) + 1
            )

        return NotificationStats(
            total_notifications=len(notifications),
            unread_count=unread_count,
            high_priority_count=high_priority_count,
            action_required_count=action_required_count,
            notifications_by_type=notifications_by_type,
            recent_activity=[
                {
                    "type": "deadline",
                    "count": 2,
                    "last_occurred": datetime.now() - timedelta(hours=2),
                },
                {
                    "type": "compliance",
                    "count": 1,
                    "last_occurred": datetime.now() - timedelta(hours=6),
                },
            ],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve notification statistics: {str(e)}",
        )


@router.post("/", response_model=Notification)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new notification

    This endpoint is typically used by system processes or admin users
    to create notifications for users.
    """
    try:
        # TODO: Implement actual database creation
        # Mock implementation
        new_notification = Notification(
            id=f"notif_{int(datetime.now().timestamp())}",
            **notification_data.dict(),
            read=False,
            timestamp=datetime.now(),
            user_id=notification_data.target_user_id or current_user.id,
        )

        return new_notification

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create notification: {str(e)}"
        )


# Helper functions for API response mapping

def _map_domain_category_to_api_type(category) -> str:
    """Map domain notification category to API type"""
    from app.domain.entities.notification import NotificationCategory
    
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


def _get_related_contract_info(notification) -> Optional[dict]:
    """Get related contract information from notification"""
    if (hasattr(notification, 'related_entity_id') and 
        notification.related_entity_id and 
        hasattr(notification, 'related_entity_type') and
        notification.related_entity_type == "contract"):
        return {
            "id": notification.related_entity_id,
            "name": f"Contract {notification.related_entity_id}"  # Could be enhanced with actual contract name
        }
    return None
