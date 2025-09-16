/**
 * WebSocket Service
 * Enhanced WebSocket client with authentication, reconnection, and message handling
 */

import { env } from '../config/env';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  id?: string;
}

export interface WebSocketConfig {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  debug?: boolean;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

export type MessageHandler = (message: WebSocketMessage) => void;
export type StatusHandler = (status: WebSocketStatus, error?: Error) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  
  // Event handlers
  private messageHandlers = new Map<string, MessageHandler[]>();
  private statusHandlers: StatusHandler[] = [];
  private generalMessageHandlers: MessageHandler[] = [];
  
  // Connection state
  private token: string | null = null;
  private connectionId: string | null = null;
  private lastPingTime: number = 0;
  private isManuallyDisconnected = false;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
      connectionTimeout: config.connectionTimeout || 10000,
      debug: config.debug !== undefined ? config.debug : env.get('DEBUG_API_CALLS')
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(authToken: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.log('Already connected to WebSocket');
      return;
    }

    this.token = authToken;
    this.isManuallyDisconnected = false;
    
    try {
      await this.establishConnection();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.reconnectAttempts = 0;
    
    this.clearTimers();
    
    if (this.ws) {
      this.setStatus('disconnecting');
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setStatus('disconnected');
    this.log('Disconnected from WebSocket');
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): boolean {
    if (!this.isConnected()) {
      this.log('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now(),
        id: this.generateMessageId()
      };

      this.ws!.send(JSON.stringify(messageWithTimestamp));
      this.log('Sent message:', messageWithTimestamp);
      return true;
    } catch (error) {
      this.log('Error sending message:', error);
      return false;
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    
    this.messageHandlers.get(messageType)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to all messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.generalMessageHandlers.push(handler);
    
    return () => {
      const index = this.generalMessageHandlers.indexOf(handler);
      if (index > -1) {
        this.generalMessageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    
    return () => {
      const index = this.statusHandlers.indexOf(handler);
      if (index > -1) {
        this.statusHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.status === 'connected';
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      connectionId: this.connectionId,
      lastPingTime: this.lastPingTime,
      isAuthenticated: !!this.token
    };
  }

  /**
   * Private methods
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.setStatus('connecting');
        
        const wsUrl = `${env.get('WS_URL')}/connect?token=${encodeURIComponent(this.token!)}`;
        this.log('Connecting to:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        // Set connection timeout
        this.connectionTimer = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          this.clearTimers();
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.log('WebSocket connected successfully');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          this.clearTimers();
          this.log(`WebSocket closed: ${event.code} - ${event.reason}`);
          
          if (!this.isManuallyDisconnected) {
            this.handleReconnection();
          } else {
            this.setStatus('disconnected');
          }
        };

        this.ws.onerror = (event) => {
          this.log('WebSocket error:', event);
          this.handleError(new Error('WebSocket connection error'));
          reject(new Error('WebSocket connection failed'));
        };
        
      } catch (error) {
        this.setStatus('error');
        reject(error);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      this.log('Received message:', message);

      // Handle system messages
      if (message.type === 'pong') {
        this.lastPingTime = Date.now();
        return;
      }

      if (message.type === 'connection_confirmed') {
        this.connectionId = message.data?.connection_id;
        return;
      }

      // Call specific type handlers
      const typeHandlers = this.messageHandlers.get(message.type) || [];
      typeHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          this.log('Error in message handler:', error);
        }
      });

      // Call general message handlers
      this.generalMessageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          this.log('Error in general message handler:', error);
        }
      });

    } catch (error) {
      this.log('Error parsing message:', error);
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setStatus('error', new Error('Max reconnection attempts reached'));
      this.log('Max reconnection attempts reached');
      return;
    }

    this.setStatus('disconnected');
    this.reconnectAttempts++;
    
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManuallyDisconnected && this.token) {
        this.establishConnection().catch(error => {
          this.log('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private setStatus(status: WebSocketStatus, error?: Error): void {
    const previousStatus = this.status;
    this.status = status;
    
    if (previousStatus !== status) {
      this.log(`Status changed: ${previousStatus} -> ${status}`);
      this.statusHandlers.forEach(handler => {
        try {
          handler(status, error);
        } catch (err) {
          this.log('Error in status handler:', err);
        }
      });
    }
  }

  private handleError(error: Error): void {
    this.log('WebSocket error:', error);
    this.setStatus('error', error);
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[WebSocket] ${message}`, ...args);
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;