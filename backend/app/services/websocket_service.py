"""
WebSocket Service - Domain service for real-time communication
Manages WebSocket connections, message routing, and real-time updates
"""

import json
import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
import logging

from fastapi import WebSocket

from app.domain.exceptions import BusinessRuleViolationError
from app.schemas.websocket import (
    MessageType,
    ContractUpdateMessage,
    NotificationMessage,
    SystemMessage,
    ConnectionMessage,
    ErrorMessage,
    UserJoinedMessage,
    UserLeftMessage,
    BulkOperationMessage,
)

logger = logging.getLogger(__name__)


@dataclass
class WebSocketConnection:
    """Represents an active WebSocket connection"""

    websocket: WebSocket
    user_id: str
    company_id: str
    session_id: str
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_ping: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    subscriptions: Set[str] = field(default_factory=set)
    is_active: bool = True


@dataclass
class RateLimitInfo:
    """Rate limiting information for a user"""

    requests: List[datetime] = field(default_factory=list)
    blocked_until: Optional[datetime] = None


class WebSocketManager:
    """
    Domain service for managing WebSocket connections and message routing
    Handles connection lifecycle, message broadcasting, and company isolation
    """

    # Configuration constants
    MAX_CONNECTIONS_PER_USER = 5
    MAX_CONNECTIONS_PER_COMPANY = 1000
    PING_INTERVAL = 30  # seconds
    CONNECTION_TIMEOUT = 300  # seconds
    RATE_LIMIT_REQUESTS = 100  # requests per minute
    RATE_LIMIT_WINDOW = 60  # seconds

    def __init__(self):
        # Active connections by session_id
        self.connections: Dict[str, WebSocketConnection] = {}

        # User to session mapping
        self.user_sessions: Dict[str, Set[str]] = defaultdict(set)

        # Company to sessions mapping
        self.company_sessions: Dict[str, Set[str]] = defaultdict(set)

        # Rate limiting
        self.rate_limits: Dict[str, RateLimitInfo] = defaultdict(RateLimitInfo)

        # Background tasks
        self._background_tasks: Set[asyncio.Task] = set()
        self._background_tasks_started = False

    async def connect(self, websocket: WebSocket, user_id: str, company_id: str) -> str:
        """
        Establish WebSocket connection with authentication and company isolation
        """
        try:
            # Start background tasks if not already started
            if not self._background_tasks_started:
                self._start_background_tasks()
                self._background_tasks_started = True

            # Validate connection limits
            await self._validate_connection_limits(user_id, company_id)

            # Accept WebSocket connection
            await websocket.accept()

            # Generate session ID
            session_id = str(uuid.uuid4())

            # Create connection record
            connection = WebSocketConnection(
                websocket=websocket,
                user_id=user_id,
                company_id=company_id,
                session_id=session_id,
            )

            # Store connection
            self.connections[session_id] = connection
            self.user_sessions[user_id].add(session_id)
            self.company_sessions[company_id].add(session_id)

            # Send connection confirmation
            connection_msg = ConnectionMessage.connected(
                user_id, company_id, session_id
            )
            await self._send_to_connection(connection, connection_msg.dict())

            # Notify other users in company about user joining
            user_joined_msg = UserJoinedMessage(
                user_id=user_id,
                user_name="User",  # Would get from user object
                status="online",
            )
            await self.broadcast_to_company(
                company_id, user_joined_msg.dict(), exclude_sessions={session_id}
            )

            logger.info(
                f"WebSocket connected: user_id={user_id}, session_id={session_id}"
            )
            return session_id

        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await websocket.close(code=1000, reason=str(e))
            raise

    async def disconnect(self, session_id: str, reason: str = "Connection closed"):
        """
        Disconnect WebSocket and cleanup resources
        """
        connection = self.connections.get(session_id)
        if not connection:
            return

        try:
            # Mark as inactive
            connection.is_active = False

            # Send disconnect message
            disconnect_msg = ConnectionMessage.disconnected(
                connection.user_id, connection.company_id
            )
            await self._send_to_connection(connection, disconnect_msg.dict())

            # Notify other users about user leaving
            user_left_msg = UserLeftMessage(
                user_id=connection.user_id,
                user_name="User",  # Would get from user object
                status="offline",
            )
            await self.broadcast_to_company(
                connection.company_id,
                user_left_msg.dict(),
                exclude_sessions={session_id},
            )

            # Cleanup connection records
            self._cleanup_connection(session_id, connection)

            # Close WebSocket
            if not connection.websocket.client_state.DISCONNECTED:
                await connection.websocket.close()

            logger.info(
                f"WebSocket disconnected: session_id={session_id}, reason={reason}"
            )

        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {e}")
        finally:
            # Ensure cleanup happens
            self._cleanup_connection(session_id, connection)

    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> int:
        """
        Send message to all sessions of a specific user
        Returns number of successful sends
        """
        sent_count = 0
        user_sessions = self.user_sessions.get(user_id, set())

        for session_id in user_sessions.copy():
            connection = self.connections.get(session_id)
            if connection and connection.is_active:
                try:
                    await self._send_to_connection(connection, message)
                    sent_count += 1
                except Exception as e:
                    logger.error(
                        f"Failed to send to user {user_id}, session {session_id}: {e}"
                    )
                    await self.disconnect(session_id, f"Send error: {e}")

        return sent_count

    async def broadcast_to_company(
        self,
        company_id: str,
        message: Dict[str, Any],
        exclude_sessions: Optional[Set[str]] = None,
    ) -> int:
        """
        Broadcast message to all users in a company
        Returns number of successful sends
        """
        exclude_sessions = exclude_sessions or set()
        sent_count = 0
        company_sessions = self.company_sessions.get(company_id, set())

        for session_id in company_sessions.copy():
            if session_id in exclude_sessions:
                continue

            connection = self.connections.get(session_id)
            if connection and connection.is_active:
                try:
                    await self._send_to_connection(connection, message)
                    sent_count += 1
                except Exception as e:
                    logger.error(
                        f"Failed to broadcast to company {company_id}, session {session_id}: {e}"
                    )
                    await self.disconnect(session_id, f"Broadcast error: {e}")

        return sent_count

    async def broadcast_to_all(self, message: Dict[str, Any]) -> int:
        """
        Broadcast message to all connected users
        Returns number of successful sends
        """
        sent_count = 0

        for session_id, connection in self.connections.items():
            if connection.is_active:
                try:
                    await self._send_to_connection(connection, message)
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Failed to broadcast to session {session_id}: {e}")
                    await self.disconnect(session_id, f"Broadcast error: {e}")

        return sent_count

    async def handle_message(self, session_id: str, message: Dict[str, Any]):
        """
        Handle incoming WebSocket message
        """
        connection = self.connections.get(session_id)
        if not connection or not connection.is_active:
            return

        try:
            # Check rate limiting
            if not await self._check_rate_limit(connection.user_id):
                error_msg = ErrorMessage(
                    error_code="RATE_LIMIT_EXCEEDED",
                    error_message="Too many requests. Please slow down.",
                )
                await self._send_to_connection(connection, error_msg.dict())
                return

            # Update last activity
            connection.last_ping = datetime.now(timezone.utc)

            # Handle different message types
            message_type = message.get("type")

            if message_type == MessageType.PING:
                pong_msg = {
                    "type": MessageType.PONG,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await self._send_to_connection(connection, pong_msg)

            elif message_type == "subscribe":
                # Handle subscription management
                topics = message.get("topics", [])
                connection.subscriptions.update(topics)

            elif message_type == "unsubscribe":
                # Handle unsubscription
                topics = message.get("topics", [])
                connection.subscriptions.difference_update(topics)

            else:
                logger.warning(f"Unknown message type: {message_type}")

        except Exception as e:
            logger.error(f"Error handling message from session {session_id}: {e}")
            error_msg = ErrorMessage(
                error_code="MESSAGE_PROCESSING_ERROR",
                error_message="Failed to process message",
            )
            await self._send_to_connection(connection, error_msg.dict())

    def get_connection_stats(self) -> Dict[str, Any]:
        """
        Get WebSocket connection statistics
        """
        active_connections = sum(
            1 for conn in self.connections.values() if conn.is_active
        )

        company_stats = {}
        for company_id, sessions in self.company_sessions.items():
            active_sessions = sum(
                1
                for session_id in sessions
                if session_id in self.connections
                and self.connections[session_id].is_active
            )
            company_stats[company_id] = active_sessions

        return {
            "total_connections": len(self.connections),
            "active_connections": active_connections,
            "companies_connected": len([c for c in company_stats.values() if c > 0]),
            "company_stats": company_stats,
            "uptime_seconds": int(time.time()),  # Would track actual uptime
        }

    # Private helper methods

    async def _validate_connection_limits(self, user_id: str, company_id: str):
        """Validate connection limits for user and company"""
        # Check user connection limit
        user_active_sessions = sum(
            1
            for session_id in self.user_sessions.get(user_id, set())
            if session_id in self.connections and self.connections[session_id].is_active
        )

        if user_active_sessions >= self.MAX_CONNECTIONS_PER_USER:
            raise BusinessRuleViolationError(
                f"Maximum connections per user exceeded ({self.MAX_CONNECTIONS_PER_USER})"
            )

        # Check company connection limit
        company_active_sessions = sum(
            1
            for session_id in self.company_sessions.get(company_id, set())
            if session_id in self.connections and self.connections[session_id].is_active
        )

        if company_active_sessions >= self.MAX_CONNECTIONS_PER_COMPANY:
            raise BusinessRuleViolationError(
                f"Maximum connections per company exceeded ({self.MAX_CONNECTIONS_PER_COMPANY})"
            )

    async def _send_to_connection(
        self, connection: WebSocketConnection, message: Dict[str, Any]
    ):
        """Send message to a specific connection"""
        if not connection.is_active:
            return

        try:
            # Add timestamp if not present
            if "timestamp" not in message:
                message["timestamp"] = datetime.now(timezone.utc).isoformat()

            await connection.websocket.send_text(json.dumps(message))

        except Exception as e:
            logger.error(
                f"Failed to send message to connection {connection.session_id}: {e}"
            )
            # Mark connection as inactive
            connection.is_active = False
            raise

    def _cleanup_connection(self, session_id: str, connection: WebSocketConnection):
        """Cleanup connection from all tracking structures"""
        # Remove from main connections
        self.connections.pop(session_id, None)

        # Remove from user sessions
        if connection.user_id in self.user_sessions:
            self.user_sessions[connection.user_id].discard(session_id)
            if not self.user_sessions[connection.user_id]:
                del self.user_sessions[connection.user_id]

        # Remove from company sessions
        if connection.company_id in self.company_sessions:
            self.company_sessions[connection.company_id].discard(session_id)
            if not self.company_sessions[connection.company_id]:
                del self.company_sessions[connection.company_id]

    async def _check_rate_limit(self, user_id: str) -> bool:
        """Check if user is within rate limits"""
        rate_limit = self.rate_limits[user_id]
        now = datetime.now(timezone.utc)

        # Check if user is temporarily blocked
        if rate_limit.blocked_until and now < rate_limit.blocked_until:
            return False

        # Clean old requests
        cutoff = now.timestamp() - self.RATE_LIMIT_WINDOW
        rate_limit.requests = [
            req for req in rate_limit.requests if req.timestamp() > cutoff
        ]

        # Check rate limit
        if len(rate_limit.requests) >= self.RATE_LIMIT_REQUESTS:
            # Block user for 1 minute
            rate_limit.blocked_until = datetime.now(timezone.utc).replace(
                minute=datetime.now(timezone.utc).minute + 1
            )
            return False

        # Add current request
        rate_limit.requests.append(now)
        return True

    def _start_background_tasks(self):
        """Start background maintenance tasks"""
        # Ping task
        ping_task = asyncio.create_task(self._ping_connections())
        self._background_tasks.add(ping_task)
        ping_task.add_done_callback(self._background_tasks.discard)

        # Cleanup task
        cleanup_task = asyncio.create_task(self._cleanup_inactive_connections())
        self._background_tasks.add(cleanup_task)
        cleanup_task.add_done_callback(self._background_tasks.discard)

    async def _ping_connections(self):
        """Background task to ping connections and detect disconnects"""
        while True:
            try:
                await asyncio.sleep(self.PING_INTERVAL)

                now = datetime.now(timezone.utc)
                ping_message = {"type": MessageType.PING, "timestamp": now.isoformat()}

                for session_id, connection in list(self.connections.items()):
                    if not connection.is_active:
                        continue

                    try:
                        await self._send_to_connection(connection, ping_message)
                    except Exception:
                        await self.disconnect(session_id, "Ping failed")

            except Exception as e:
                logger.error(f"Error in ping task: {e}")

    async def _cleanup_inactive_connections(self):
        """Background task to cleanup inactive connections"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute

                now = datetime.now(timezone.utc)
                timeout_threshold = now.timestamp() - self.CONNECTION_TIMEOUT

                for session_id, connection in list(self.connections.items()):
                    if connection.last_ping.timestamp() < timeout_threshold:
                        await self.disconnect(session_id, "Connection timeout")

            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")


# Global WebSocket manager instance
websocket_manager = WebSocketManager()


# Convenience functions for broadcasting messages


async def broadcast_contract_update(message: ContractUpdateMessage, company_id: str):
    """Broadcast contract update to company users"""
    return await websocket_manager.broadcast_to_company(company_id, message.dict())


async def broadcast_contract_creation(message: ContractUpdateMessage, company_id: str):
    """Broadcast contract creation to company users"""
    return await websocket_manager.broadcast_to_company(company_id, message.dict())


async def send_user_notification(message: NotificationMessage):
    """Send notification to specific user"""
    if message.target_user_id:
        return await websocket_manager.send_to_user(
            message.target_user_id, message.dict()
        )
    return 0


async def broadcast_system_notification(message: SystemMessage):
    """Broadcast system notification to all users"""
    return await websocket_manager.broadcast_to_all(message.dict())


async def notify_users_by_role(
    company_id: str, roles: List[str], message: Dict[str, Any]
):
    """Notify users with specific roles in a company"""
    # This would integrate with user service to get users by role
    # For now, broadcast to entire company
    return await websocket_manager.broadcast_to_company(company_id, message)


async def send_bulk_operation_update(
    operation_id: str, message: BulkOperationMessage, user_id: str
):
    """Send bulk operation progress update to user"""
    return await websocket_manager.send_to_user(user_id, message.dict())


async def batch_send_notifications(
    user_id: str, notifications: List[NotificationMessage]
):
    """Send multiple notifications as a batch"""
    batch_message = {
        "type": "batch",
        "batch": [notification.dict() for notification in notifications],
        "total": len(notifications),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return await websocket_manager.send_to_user(user_id, batch_message)


# Factory function for dependency injection
def get_websocket_manager() -> WebSocketManager:
    """Factory function to get WebSocket manager"""
    return websocket_manager
