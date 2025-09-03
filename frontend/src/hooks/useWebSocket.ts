import { useEffect, useState, useRef, useCallback } from 'react';
import { WebSocketService } from '../services/api';
import { 
  WebSocketMessage,
  ConnectionMessage,
  ContractUpdateMessage,
  NotificationMessage,
  SystemMessage,
  AlertMessage,
  BulkOperationMessage
} from '../types';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  send: (message: any) => void;
  subscribe: (topics: string[]) => void;
  ping: () => void;
  connectionAttempts: number;
  lastMessage: WebSocketMessage | null;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    autoConnect = false,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    onConnect,
    onDisconnect,
    onError,
    onMessage
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket service
  useEffect(() => {
    wsServiceRef.current = new WebSocketService();
    
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  // Set up event handlers
  useEffect(() => {
    if (!wsServiceRef.current) return;

    const ws = wsServiceRef.current;

    // Connection status handler
    ws.onConnection((connected) => {
      setIsConnected(connected);
      setConnectionAttempts(prev => connected ? 0 : prev + 1);
      
      if (connected) {
        onConnect?.();
      } else {
        onDisconnect?.();
        
        // Auto-reconnect logic
        if (tokenRef.current && connectionAttempts < reconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, connectionAttempts);
          reconnectTimerRef.current = setTimeout(() => {
            connect(tokenRef.current!);
          }, delay);
        }
      }
    });

    // Generic message handler
    ws.onMessage('*', (message: WebSocketMessage) => {
      setLastMessage(message);
      onMessage?.(message);
    });

    // Error handler
    ws.onMessage('error', (message: any) => {
      onError?.(message.error_message || 'WebSocket error occurred');
    });

  }, [connectionAttempts, reconnectAttempts, reconnectDelay, onConnect, onDisconnect, onError, onMessage]);

  // Connect function
  const connect = useCallback((token: string) => {
    if (!wsServiceRef.current) return;
    
    tokenRef.current = token;
    wsServiceRef.current.connect(token);
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    tokenRef.current = null;
    setConnectionAttempts(0);
    
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
    }
  }, []);

  // Send message function
  const send = useCallback((message: any) => {
    if (wsServiceRef.current) {
      wsServiceRef.current.send(message);
    }
  }, []);

  // Subscribe to topics
  const subscribe = useCallback((topics: string[]) => {
    if (wsServiceRef.current) {
      wsServiceRef.current.subscribe(topics);
    }
  }, []);

  // Ping function
  const ping = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.ping();
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      // Try to get token from auth storage
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage).state?.token : null;
      
      if (token) {
        connect(token);
      }
    }
  }, [autoConnect, connect]);

  return {
    isConnected,
    connect,
    disconnect,
    send,
    subscribe,
    ping,
    connectionAttempts,
    lastMessage
  };
};

// Specialized hooks for different message types
export const useContractUpdates = (onUpdate?: (message: ContractUpdateMessage) => void) => {
  const wsServiceRef = useRef<WebSocketService | null>(null);
  
  const { isConnected, connect, disconnect, subscribe } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      subscribe(['contracts', 'contract_updates']);
    }
  });

  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = new WebSocketService();
    }

    const handleContractUpdate = (message: ContractUpdateMessage) => {
      onUpdate?.(message);
    };

    const ws = wsServiceRef.current;
    ws.onMessage('contract_update', handleContractUpdate);
    ws.onMessage('contract_created', handleContractUpdate);
    ws.onMessage('contract_deleted', handleContractUpdate);
    ws.onMessage('contract_status_changed', handleContractUpdate);

    return () => {
      if (ws) {
        ws.disconnect();
      }
    };
  }, [onUpdate]);

  return { isConnected, connect, disconnect };
};

export const useNotifications = (onNotification?: (message: NotificationMessage) => void) => {
  const wsServiceRef = useRef<WebSocketService | null>(null);
  
  const { isConnected, connect, disconnect, subscribe } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      subscribe(['notifications', 'alerts', 'system']);
    }
  });

  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = new WebSocketService();
    }

    const ws = wsServiceRef.current;
    
    ws.onMessage('notification', (message: NotificationMessage) => {
      onNotification?.(message);
      
      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(message.title, {
          body: message.message,
          icon: '/favicon.ico',
          tag: message.message_id
        });
      }
    });

    return () => {
      if (ws) {
        ws.disconnect();
      }
    };
  }, [onNotification]);

  return { isConnected, connect, disconnect };
};

export const useSystemMessages = (onMessage?: (message: SystemMessage | AlertMessage) => void) => {
  const wsServiceRef = useRef<WebSocketService | null>(null);
  
  const { isConnected, connect, disconnect, subscribe } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      subscribe(['system', 'alerts']);
    }
  });

  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = new WebSocketService();
    }

    const ws = wsServiceRef.current;
    
    ws.onMessage('system', onMessage);
    ws.onMessage('alert', onMessage);

    return () => {
      if (ws) {
        ws.disconnect();
      }
    };
  }, [onMessage]);

  return { isConnected, connect, disconnect };
};

export const useBulkOperationUpdates = (onUpdate?: (message: BulkOperationMessage) => void) => {
  const wsServiceRef = useRef<WebSocketService | null>(null);
  
  const { isConnected, connect, disconnect, subscribe } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      subscribe(['bulk_operations']);
    }
  });

  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = new WebSocketService();
    }

    const ws = wsServiceRef.current;
    ws.onMessage('bulk_operation', onUpdate);

    return () => {
      if (ws) {
        ws.disconnect();
      }
    };
  }, [onUpdate]);

  return { isConnected, connect, disconnect };
};

// WebSocket status indicator component hook
export const useWebSocketStatus = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  const { isConnected, connectionAttempts } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      setStatus('connected');
      setLastConnected(new Date());
    },
    onDisconnect: () => {
      setStatus('disconnected');
    },
    onError: () => {
      setStatus('error');
    }
  });

  useEffect(() => {
    if (connectionAttempts > 0 && !isConnected) {
      setStatus('connecting');
    }
  }, [connectionAttempts, isConnected]);

  return {
    status,
    isConnected,
    connectionAttempts,
    lastConnected
  };
};

// Request notification permission hook
export const useNotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return permission;
  }, [permission]);

  return {
    permission,
    requestPermission,
    isSupported: 'Notification' in window
  };
};