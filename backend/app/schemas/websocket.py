"""
Pydantic schemas for WebSocket real-time functionality
Defines message types and data structures for WebSocket communication
"""
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from enum import Enum


class MessageType(str, Enum):
    """WebSocket message types"""
    # Connection management
    CONNECTION = "connection"
    PING = "ping"
    PONG = "pong"
    ERROR = "error"
    
    # Contract updates
    CONTRACT_UPDATE = "contract_update"
    CONTRACT_CREATED = "contract_created"
    CONTRACT_DELETED = "contract_deleted"
    CONTRACT_STATUS_CHANGED = "contract_status_changed"
    
    # User notifications
    NOTIFICATION = "notification"
    SYSTEM = "system"
    ALERT = "alert"
    
    # Collaboration
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    USER_TYPING = "user_typing"
    
    # Real-time updates
    LIVE_UPDATE = "live_update"
    BULK_OPERATION = "bulk_operation"


class WebSocketMessage(BaseModel):
    """Base WebSocket message structure"""
    type: MessageType = Field(..., description="Message type")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    message_id: Optional[str] = Field(None, description="Unique message identifier")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ConnectionMessage(WebSocketMessage):
    """Connection status message"""
    type: MessageType = MessageType.CONNECTION
    status: str = Field(..., description="Connection status (connected, disconnected, error)")
    user_id: str = Field(..., description="Connected user ID")
    company_id: str = Field(..., description="User's company ID")
    session_id: Optional[str] = Field(None, description="Session identifier")
    
    @classmethod
    def connected(cls, user_id: str, company_id: str, session_id: Optional[str] = None):
        return cls(
            status="connected",
            user_id=user_id,
            company_id=company_id,
            session_id=session_id
        )
    
    @classmethod
    def disconnected(cls, user_id: str, company_id: str):
        return cls(
            status="disconnected",
            user_id=user_id,
            company_id=company_id
        )


class ErrorMessage(WebSocketMessage):
    """Error message"""
    type: MessageType = MessageType.ERROR
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class PingMessage(WebSocketMessage):
    """Ping message for connection health check"""
    type: MessageType = MessageType.PING


class PongMessage(WebSocketMessage):
    """Pong response message"""
    type: MessageType = MessageType.PONG


class ContractChangeDetails(BaseModel):
    """Details of contract changes"""
    field: str = Field(..., description="Changed field name")
    old_value: Optional[Any] = Field(None, description="Previous value")
    new_value: Optional[Any] = Field(None, description="New value")


class ContractUpdateMessage(WebSocketMessage):
    """Contract update notification"""
    type: MessageType = MessageType.CONTRACT_UPDATE
    contract_id: str = Field(..., description="Updated contract ID")
    contract_title: str = Field(..., description="Contract title")
    updated_by: str = Field(..., description="User ID who made the update")
    updated_by_name: str = Field(..., description="Full name of user who made the update")
    changes: Dict[str, Any] = Field(..., description="Summary of changes made")
    version: Optional[int] = Field(None, description="New contract version")
    
    @classmethod
    def status_change(
        cls,
        contract_id: str,
        contract_title: str,
        old_status: str,
        new_status: str,
        updated_by: str,
        updated_by_name: str,
        version: Optional[int] = None
    ):
        return cls(
            type=MessageType.CONTRACT_STATUS_CHANGED,
            contract_id=contract_id,
            contract_title=contract_title,
            updated_by=updated_by,
            updated_by_name=updated_by_name,
            changes={"status": {"old": old_status, "new": new_status}},
            version=version
        )


class ContractCreatedMessage(WebSocketMessage):
    """Contract creation notification"""
    type: MessageType = MessageType.CONTRACT_CREATED
    contract_id: str = Field(..., description="New contract ID")
    contract_title: str = Field(..., description="Contract title")
    contract_type: str = Field(..., description="Contract type")
    created_by: str = Field(..., description="User ID who created the contract")
    created_by_name: str = Field(..., description="Full name of creator")
    client_name: Optional[str] = Field(None, description="Client name")


class ContractDeletedMessage(WebSocketMessage):
    """Contract deletion notification"""
    type: MessageType = MessageType.CONTRACT_DELETED
    contract_id: str = Field(..., description="Deleted contract ID")
    contract_title: str = Field(..., description="Contract title")
    deleted_by: str = Field(..., description="User ID who deleted the contract")
    deleted_by_name: str = Field(..., description="Full name of user who deleted")
    deletion_reason: Optional[str] = Field(None, description="Reason for deletion")


class NotificationMessage(WebSocketMessage):
    """User notification message"""
    type: MessageType = MessageType.NOTIFICATION
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message body")
    notification_type: str = Field(..., description="Notification category")
    priority: str = Field("NORMAL", description="Notification priority (LOW, NORMAL, HIGH, URGENT)")
    target_user_id: Optional[str] = Field(None, description="Target user ID (if user-specific)")
    target_role: Optional[str] = Field(None, description="Target role (if role-specific)")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional notification data")
    action_url: Optional[str] = Field(None, description="URL for notification action")
    expires_at: Optional[datetime] = Field(None, description="Notification expiry time")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SystemMessage(WebSocketMessage):
    """System-wide message"""
    type: MessageType = MessageType.SYSTEM
    message: str = Field(..., description="System message text")
    level: str = Field(..., description="Message level (INFO, WARNING, ERROR, SUCCESS)")
    affects_all_users: bool = Field(True, description="Whether message affects all users")
    maintenance_mode: bool = Field(False, description="Whether system is in maintenance")
    estimated_duration: Optional[str] = Field(None, description="Estimated duration for maintenance")


class AlertMessage(WebSocketMessage):
    """Alert message for urgent notifications"""
    type: MessageType = MessageType.ALERT
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    severity: str = Field(..., description="Alert severity (LOW, MEDIUM, HIGH, CRITICAL)")
    category: str = Field(..., description="Alert category (SECURITY, COMPLIANCE, SYSTEM, BUSINESS)")
    affected_contracts: Optional[List[str]] = Field(None, description="List of affected contract IDs")
    action_required: bool = Field(False, description="Whether immediate action is required")
    auto_dismiss: bool = Field(False, description="Whether alert auto-dismisses")
    dismiss_after: Optional[int] = Field(None, description="Auto-dismiss time in seconds")


class UserPresenceMessage(WebSocketMessage):
    """User presence update"""
    user_id: str = Field(..., description="User ID")
    user_name: str = Field(..., description="User full name")
    status: str = Field(..., description="Presence status (online, offline, away, busy)")
    last_seen: Optional[datetime] = Field(None, description="Last seen timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserJoinedMessage(UserPresenceMessage):
    """User joined notification"""
    type: MessageType = MessageType.USER_JOINED


class UserLeftMessage(UserPresenceMessage):
    """User left notification"""
    type: MessageType = MessageType.USER_LEFT


class UserTypingMessage(WebSocketMessage):
    """User typing indicator"""
    type: MessageType = MessageType.USER_TYPING
    user_id: str = Field(..., description="Typing user ID")
    user_name: str = Field(..., description="Typing user name")
    contract_id: Optional[str] = Field(None, description="Contract being edited")
    is_typing: bool = Field(..., description="Whether user is currently typing")


class LiveUpdateMessage(WebSocketMessage):
    """Live collaborative update"""
    type: MessageType = MessageType.LIVE_UPDATE
    resource_type: str = Field(..., description="Type of resource being updated")
    resource_id: str = Field(..., description="ID of resource being updated")
    field: str = Field(..., description="Field being updated")
    value: Any = Field(..., description="New field value")
    updated_by: str = Field(..., description="User making the update")
    cursor_position: Optional[int] = Field(None, description="Cursor position for text fields")


class BulkOperationMessage(WebSocketMessage):
    """Bulk operation progress update"""
    type: MessageType = MessageType.BULK_OPERATION
    operation_id: str = Field(..., description="Bulk operation ID")
    operation_type: str = Field(..., description="Type of bulk operation")
    status: str = Field(..., description="Operation status (PENDING, RUNNING, COMPLETED, FAILED)")
    progress_percentage: float = Field(..., ge=0, le=100, description="Progress percentage")
    processed_count: int = Field(..., description="Number of items processed")
    total_count: int = Field(..., description="Total number of items")
    success_count: int = Field(0, description="Number of successful operations")
    failed_count: int = Field(0, description="Number of failed operations")
    eta_seconds: Optional[int] = Field(None, description="Estimated time remaining in seconds")
    current_item: Optional[str] = Field(None, description="Currently processing item")
    error_message: Optional[str] = Field(None, description="Error message if operation failed")


class BatchMessage(WebSocketMessage):
    """Batch of multiple messages"""
    messages: List[WebSocketMessage] = Field(..., description="List of messages in batch")
    batch_id: Optional[str] = Field(None, description="Batch identifier")
    total_messages: int = Field(..., description="Total number of messages in batch")


# Union type for all possible WebSocket messages
AnyWebSocketMessage = Union[
    ConnectionMessage,
    ErrorMessage,
    PingMessage,
    PongMessage,
    ContractUpdateMessage,
    ContractCreatedMessage,
    ContractDeletedMessage,
    NotificationMessage,
    SystemMessage,
    AlertMessage,
    UserJoinedMessage,
    UserLeftMessage,
    UserTypingMessage,
    LiveUpdateMessage,
    BulkOperationMessage,
    BatchMessage
]


class WebSocketEventData(BaseModel):
    """Data structure for WebSocket events"""
    event_type: str = Field(..., description="Type of event")
    source: str = Field(..., description="Source of the event")
    data: Dict[str, Any] = Field(..., description="Event data")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    company_id: Optional[str] = Field(None, description="Associated company ID")
    contract_id: Optional[str] = Field(None, description="Associated contract ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Event timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WebSocketSubscription(BaseModel):
    """WebSocket subscription configuration"""
    user_id: str = Field(..., description="Subscribing user ID")
    company_id: str = Field(..., description="User's company ID")
    subscriptions: List[str] = Field(..., description="List of subscription topics")
    filters: Optional[Dict[str, Any]] = Field(None, description="Subscription filters")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Subscription creation time")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }