"""
WebSocket API Endpoints - Real-time communication
Provides WebSocket endpoints for real-time features and live collaboration
"""
import json
import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
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


@router.get("/test", response_class=HTMLResponse, summary="WebSocket Test Page")
async def websocket_test_page():
    """
    WebSocket test page for development and debugging.
    
    **Development Only:** This endpoint provides a simple HTML page
    for testing WebSocket connections during development.
    
    **Features:**
    - Connect/disconnect controls
    - Message sending interface
    - Real-time message display
    - Connection status indicator
    
    **Security Note:** This endpoint should be disabled in production.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test page not available in production"
        )
    
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>WebSocket Test - Pactoria</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
            .connected { background-color: #d4edda; color: #155724; }
            .disconnected { background-color: #f8d7da; color: #721c24; }
            .messages { height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; }
            .message { margin: 5px 0; padding: 5px; border-left: 3px solid #007bff; }
            input, button { padding: 8px; margin: 5px; }
            button { background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:disabled { background-color: #6c757d; cursor: not-allowed; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>WebSocket Test - Pactoria</h1>
            
            <div id="status" class="status disconnected">
                Status: Disconnected
            </div>
            
            <div>
                <input type="text" id="tokenInput" placeholder="JWT Token" style="width: 300px;">
                <button id="connectBtn" onclick="connect()">Connect</button>
                <button id="disconnectBtn" onclick="disconnect()" disabled>Disconnect</button>
            </div>
            
            <div>
                <input type="text" id="messageInput" placeholder="Message JSON" style="width: 400px;">
                <button id="sendBtn" onclick="sendMessage()" disabled>Send Message</button>
            </div>
            
            <div>
                <button onclick="sendPing()">Send Ping</button>
                <button onclick="sendSubscribe()">Subscribe to Contracts</button>
                <button onclick="clearMessages()">Clear Messages</button>
            </div>
            
            <h3>Messages:</h3>
            <div id="messages" class="messages"></div>
        </div>
        
        <script>
            let ws = null;
            const statusDiv = document.getElementById('status');
            const messagesDiv = document.getElementById('messages');
            const connectBtn = document.getElementById('connectBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');
            const sendBtn = document.getElementById('sendBtn');
            
            function updateStatus(message, isConnected) {
                statusDiv.textContent = `Status: ${message}`;
                statusDiv.className = `status ${isConnected ? 'connected' : 'disconnected'}`;
                connectBtn.disabled = isConnected;
                disconnectBtn.disabled = !isConnected;
                sendBtn.disabled = !isConnected;
            }
            
            function addMessage(message, type = 'received') {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                messageDiv.innerHTML = `
                    <strong>[${type}]</strong> ${new Date().toLocaleTimeString()}<br>
                    <pre>${JSON.stringify(message, null, 2)}</pre>
                `;
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            function connect() {
                const token = document.getElementById('tokenInput').value;
                if (!token) {
                    alert('Please enter a JWT token');
                    return;
                }
                
                const wsUrl = `ws://localhost:8000/api/v1/ws/connect?token=${encodeURIComponent(token)}`;
                ws = new WebSocket(wsUrl);
                
                ws.onopen = function() {
                    updateStatus('Connected', true);
                    addMessage({type: 'connection', status: 'connected'}, 'system');
                };
                
                ws.onmessage = function(event) {
                    try {
                        const message = JSON.parse(event.data);
                        addMessage(message, 'received');
                    } catch (e) {
                        addMessage({error: 'Invalid JSON', data: event.data}, 'error');
                    }
                };
                
                ws.onclose = function(event) {
                    updateStatus(`Disconnected (${event.code}: ${event.reason})`, false);
                    addMessage({type: 'connection', status: 'disconnected', code: event.code, reason: event.reason}, 'system');
                    ws = null;
                };
                
                ws.onerror = function(error) {
                    updateStatus('Connection Error', false);
                    addMessage({type: 'error', error: 'WebSocket error occurred'}, 'error');
                };
            }
            
            function disconnect() {
                if (ws) {
                    ws.close();
                }
            }
            
            function sendMessage() {
                if (!ws) return;
                
                const messageText = document.getElementById('messageInput').value;
                if (!messageText) {
                    alert('Please enter a message');
                    return;
                }
                
                try {
                    const message = JSON.parse(messageText);
                    ws.send(JSON.stringify(message));
                    addMessage(message, 'sent');
                    document.getElementById('messageInput').value = '';
                } catch (e) {
                    alert('Invalid JSON message');
                }
            }
            
            function sendPing() {
                if (!ws) return;
                const message = {type: 'ping'};
                ws.send(JSON.stringify(message));
                addMessage(message, 'sent');
            }
            
            function sendSubscribe() {
                if (!ws) return;
                const message = {
                    type: 'subscribe',
                    topics: ['contracts', 'notifications']
                };
                ws.send(JSON.stringify(message));
                addMessage(message, 'sent');
            }
            
            function clearMessages() {
                messagesDiv.innerHTML = '';
            }
            
            // Allow Enter key to send messages
            document.getElementById('messageInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


# Helper functions for message handling

async def handle_websocket_message(websocket: WebSocket, message: Dict[str, Any], user: User):
    """Handle incoming WebSocket message"""
    # This would be called from the main websocket endpoint
    # Implementation would route to appropriate handlers based on message type
    pass


# WebSocket authentication is now handled in app.core.auth


# Import settings for test page check
from app.core.config import settings