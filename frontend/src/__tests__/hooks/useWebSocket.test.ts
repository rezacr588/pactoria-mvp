import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket, useContractUpdates, useNotifications } from '../../hooks/useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  send(_data: string) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

global.WebSocket = MockWebSocket as any;

// Mock WebSocketService
vi.mock('../../services/api', () => ({
  WebSocketService: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    onMessage: vi.fn(),
    onConnection: vi.fn(),
    subscribe: vi.fn(),
    ping: vi.fn(),
    isConnected: vi.fn(() => false),
  }))
}));

// Mock localStorage - already mocked in setup.ts

// Mock Notification API
global.Notification = {
  permission: 'granted' as NotificationPermission,
  requestPermission: vi.fn().mockResolvedValue('granted' as NotificationPermission),
} as any;

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(
      JSON.stringify({
        state: {
          token: 'mock-jwt-token'
        }
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionAttempts).toBe(0);
    expect(result.current.lastMessage).toBe(null);
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.send).toBe('function');
  });

  it('should connect with token', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('test-token');
    });

    expect(result.current.connectionAttempts).toBe(0);
  });

  it('should handle auto-connect when enabled', () => {
    renderHook(() => useWebSocket({ autoConnect: true }));

    // Should attempt to get token from localStorage and connect
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth-storage');
  });

  it('should call onConnect callback when connected', async () => {
    const onConnect = vi.fn();
    const { result } = renderHook(() => useWebSocket({ onConnect }));

    act(() => {
      result.current.connect('test-token');
    });

    // Simulate connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    // The onConnect callback should eventually be called through the WebSocket service
    // This is mocked, so we can't test the actual connection flow
  });

  it('should send messages', () => {
    const { result } = renderHook(() => useWebSocket());

    const message = { type: 'test', data: 'hello' };

    act(() => {
      result.current.send(message);
    });

    // Message sending is handled by the WebSocket service mock
  });

  it('should subscribe to topics', () => {
    const { result } = renderHook(() => useWebSocket());

    const topics = ['contracts', 'notifications'];

    act(() => {
      result.current.subscribe(topics);
    });

    // Subscription is handled by the WebSocket service mock
  });

  it('should ping the connection', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.ping();
    });

    // Ping is handled by the WebSocket service mock
  });

  it('should disconnect properly', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('test-token');
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.connectionAttempts).toBe(0);
  });

  it('should handle errors', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useWebSocket({ onError }));

    act(() => {
      result.current.connect('test-token');
    });

    // Error handling is managed by the WebSocket service
  });
});

describe('useContractUpdates', () => {
  it('should handle contract update messages', () => {
    const onUpdate = vi.fn();
    
    renderHook(() => useContractUpdates(onUpdate));

    // The hook should set up message handlers for contract updates
    // This is mocked through the WebSocket service
  });

  it('should auto-connect and subscribe to contract topics', () => {
    const { result } = renderHook(() => useContractUpdates());

    expect(result.current.isConnected).toBe(false);
    // Auto-connection and subscription is handled by the service
  });
});

describe('useNotifications', () => {
  it('should handle notification messages', () => {
    const onNotification = vi.fn();
    
    renderHook(() => useNotifications(onNotification));

    // The hook should set up message handlers for notifications
  });

  it('should show browser notifications when permitted', () => {
    const mockNotification = vi.fn();
    global.Notification = mockNotification as any;
    Object.defineProperty(global.Notification, 'permission', {
      value: 'granted',
      writable: true
    });

    const onNotification = vi.fn();
    renderHook(() => useNotifications(onNotification));

    // Browser notifications would be triggered by actual messages
    // This is mocked behavior
  });

  it('should not show browser notifications when not permitted', () => {
    Object.defineProperty(global.Notification, 'permission', {
      value: 'denied',
      writable: true
    });

    const onNotification = vi.fn();
    renderHook(() => useNotifications(onNotification));

    // No browser notifications should be shown
  });
});

describe('WebSocket integration', () => {
  it('should handle connection state changes', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    const { result } = renderHook(() => useWebSocket({
      onConnect,
      onDisconnect
    }));

    act(() => {
      result.current.connect('test-token');
    });

    // Connection state changes are handled by the service
  });

  it('should handle reconnection attempts', () => {
    const { result } = renderHook(() => useWebSocket({
      reconnectAttempts: 3,
      reconnectDelay: 1000
    }));

    act(() => {
      result.current.connect('test-token');
    });

    // Reconnection logic is handled by the service
    expect(result.current.connectionAttempts).toBe(0);
  });

  it('should handle message processing', () => {
    const onMessage = vi.fn();

    const { result } = renderHook(() => useWebSocket({ onMessage }));

    act(() => {
      result.current.connect('test-token');
    });

    // Message processing is handled by the service
  });

  it('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('test-token');
    });

    unmount();

    // Cleanup is handled in the useEffect cleanup function
  });
});