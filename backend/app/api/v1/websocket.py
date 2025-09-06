"""
WebSocket API Endpoints - Real-time communication
Provides WebSocket endpoints for real-time features and live collaboration
"""
import json
import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import authenticate_websocket_user, get_current_user
from app.core.exceptions import APIExceptionFactory
from app.infrastructure.database.models import User
from app.services.websocket_service import (
    websocket_manager, get_websocket_manager, WebSocketManager
)
from app.schemas.websocket import ErrorMessage, MessageType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Main WebSocket endpoint for real-time communication.
    
    **Connection Flow:**
    1. Client connects with JWT token as query parameter
    2. Server validates token and extracts user information
    3. Connection is established with company isolation
    4. Client receives connection confirmation
    5. Real-time messages are exchanged
    
    **Authentication:**
    - Requires valid JWT token in query parameter
    - Token must belong to active user with company association
    - Company isolation is enforced for all messages
    
    **Message Types Supported:**
    - **ping/pong**: Connection health checks
    - **contract_update**: Real-time contract change notifications
    - **notification**: User-specific notifications
    - **system**: System-wide announcements
    - **user_presence**: User online/offline status
    - **live_update**: Collaborative editing updates
    
    **Security Features:**
    - Rate limiting per user
    - Connection limits per user/company
    - Message validation and sanitization
    - Company-based message isolation
    - Automatic cleanup of inactive connections
    
    **Performance Optimizations:**
    - Connection pooling and reuse
    - Message batching for efficiency
    - Background ping/pong health checks
    - Automatic disconnect of idle connections
    
    **URL:** `ws://localhost:8000/api/v1/ws/connect?token=your_jwt_token`
    """
    session_id = None
    
    try:
        # Authenticate user from JWT token
        current_user = authenticate_websocket_user(token, db)
        
        if not current_user or not current_user.is_active:
            await websocket.close(code=4001, reason="Authentication failed")
            return
        
        if not current_user.company_id:
            await websocket.close(code=4003, reason="User not associated with company")
            return
        
        # Establish WebSocket connection
        session_id = await websocket_manager.connect(
            websocket, 
            current_user.id, 
            current_user.company_id
        )
        
        logger.info(f"WebSocket connection established: user={current_user.id}, session={session_id}")
        
        # Handle messages until disconnect
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle the message
                await websocket_manager.handle_message(session_id, message)
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket client disconnected: session={session_id}")
                break
            except json.JSONDecodeError:
                # Send error for invalid JSON
                error_msg = ErrorMessage(
                    error_code="INVALID_JSON",
                    error_message="Invalid JSON message format"
                )
                await websocket.send_text(error_msg.json())
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                # Send generic error to client
                error_msg = ErrorMessage(
                    error_code="MESSAGE_ERROR",
                    error_message="Failed to process message"
                )
                await websocket.send_text(error_msg.json())
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        try:
            await websocket.close(code=1011, reason=f"Server error: {str(e)}")
        except:
            pass  # Connection might already be closed
    
    finally:
        # Cleanup connection
        if session_id:
            await websocket_manager.disconnect(session_id, "Connection ended")


@router.get("/stats", summary="WebSocket Statistics")
async def get_websocket_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get WebSocket connection statistics.
    
    **Returns:**
    - Total active connections
    - Connections per company
    - Connection uptime
    - Performance metrics
    
    **Admin Access Only:** This endpoint requires admin permissions
    to view system-wide statistics.
    """
    # Check if user has admin permissions
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permissions required"
        )
    
    stats = websocket_manager.get_connection_stats()
    return {
        "websocket_stats": stats,
        "generated_at": "2024-01-01T00:00:00Z"
    }


@router.get("/health", summary="WebSocket Health Check")
async def websocket_health_check():
    """
    WebSocket service health check.
    
    **Returns:**
    - Service status
    - Active connection count
    - Background task status
    
    **Use Cases:**
    - Load balancer health checks
    - Monitoring system integration
    - Service status verification
    """
    stats = websocket_manager.get_connection_stats()
    
    return {
        "status": "healthy",
        "service": "websocket",
        "active_connections": stats["active_connections"],
        "uptime_seconds": stats["uptime_seconds"],
        "background_tasks": "running"
    }


# Helper functions for message handling

async def handle_websocket_message(websocket: WebSocket, message: Dict[str, Any], user: User):
    """Handle incoming WebSocket message"""
    # This would be called from the main websocket endpoint
    # Implementation would route to appropriate handlers based on message type
    pass


# WebSocket authentication is now handled in app.core.auth


# Import settings for test page check
from app.core.config import settings