import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { NotificationsService } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Notification, PaginatedNotificationResponse, NotificationMessage } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

type NotificationAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: PaginatedNotificationResponse }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<Notification> } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ'; payload: number }
  | { type: 'UPDATE_UNREAD_COUNT'; payload: number };

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  totalPages: 0,
};

function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        loading: false,
        notifications: action.payload.notifications,
        unreadCount: action.payload.unread_count,
        totalCount: action.payload.total,
        currentPage: action.payload.page,
        pageSize: action.payload.size,
        totalPages: action.payload.pages,
        error: null,
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: action.payload.read ? state.unreadCount : state.unreadCount + 1,
        totalCount: state.totalCount + 1,
      };

    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id
            ? { ...notification, ...action.payload.updates }
            : notification
        ),
      };

    case 'REMOVE_NOTIFICATION':
      const removedNotification = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadCount: removedNotification && !removedNotification.read 
          ? state.unreadCount - 1 
          : state.unreadCount,
        totalCount: state.totalCount - 1,
      };

    case 'MARK_AS_READ':
      const notification = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
        unreadCount: notification && !notification.read 
          ? state.unreadCount - 1 
          : state.unreadCount,
      };

    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      };

    case 'UPDATE_UNREAD_COUNT':
      return {
        ...state,
        unreadCount: action.payload,
      };

    default:
      return state;
  }
}

interface NotificationContextValue {
  state: NotificationState;
  loadNotifications: (filters?: any) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // WebSocket integration for real-time updates
  const { isConnected } = useWebSocket({
    autoConnect: true,
    onMessage: (message) => {
      switch (message.type) {
        case 'notification':
          // New notification received - cast to NotificationMessage
          const notificationMessage = message as NotificationMessage;
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              id: message.message_id || `temp_${Date.now()}`,
              type: notificationMessage.notification_type,
              title: notificationMessage.title,
              message: notificationMessage.message,
              priority: notificationMessage.priority?.toLowerCase() as 'low' | 'medium' | 'high' || 'medium',
              action_required: false,
              read: false,
              timestamp: message.timestamp,
              user_id: notificationMessage.target_user_id || '',
              metadata: notificationMessage.data || {},
            } as Notification,
          });
          break;

        case 'notification_read':
          // Notification marked as read - cast to any for the id
          dispatch({
            type: 'MARK_AS_READ',
            payload: (message as any).notification_id,
          });
          break;

        case 'notifications_all_read':
          // All notifications marked as read
          dispatch({
            type: 'MARK_ALL_AS_READ',
            payload: (message as any).updated_count,
          });
          break;

        case 'notification_deleted':
          // Notification deleted
          dispatch({
            type: 'REMOVE_NOTIFICATION',
            payload: (message as any).notification_id,
          });
          break;
      }
    },
  });

  const loadNotifications = useCallback(async (filters: any = {}) => {
    dispatch({ type: 'LOAD_START' });
    
    try {
      const response = await NotificationsService.getNotifications({
        page: state.currentPage,
        size: state.pageSize,
        ...filters,
      });

      dispatch({ type: 'LOAD_SUCCESS', payload: response });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load notifications';
      dispatch({ type: 'LOAD_ERROR', payload: errorMessage });
      console.error('Error loading notifications:', error);
    }
  }, [state.currentPage, state.pageSize]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await NotificationsService.markAsRead(notificationId);
      
      // The real-time update should handle the UI update via WebSocket
      // If WebSocket is not connected, update locally
      if (!isConnected) {
        dispatch({ type: 'MARK_AS_READ', payload: notificationId });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Could dispatch an error action here
    }
  }, [isConnected]);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await NotificationsService.markAllAsRead();
      
      // The real-time update should handle the UI update via WebSocket
      // If WebSocket is not connected, update locally
      if (!isConnected) {
        dispatch({ type: 'MARK_ALL_AS_READ', payload: response.updated_count });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [isConnected]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await NotificationsService.deleteNotification(notificationId);
      
      // The real-time update should handle the UI update via WebSocket
      // If WebSocket is not connected, update locally
      if (!isConnected) {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [isConnected]);

  const refetch = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Load notifications on mount and when WebSocket reconnects
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Refetch when WebSocket reconnects
  useEffect(() => {
    if (isConnected && state.notifications.length === 0) {
      loadNotifications();
    }
  }, [isConnected, loadNotifications, state.notifications.length]);

  // Polling mechanism as WebSocket fallback
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000); // Poll every 30 seconds when WebSocket is disconnected

      return () => clearInterval(interval);
    }
  }, [isConnected, loadNotifications]);

  const value: NotificationContextValue = {
    state,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};