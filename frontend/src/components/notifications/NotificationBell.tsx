import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, CalendarIcon, UsersIcon, CogIcon } from '@heroicons/react/24/outline';
import { useNotificationContext } from '../../contexts/NotificationContext';
// Helper function to format time
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return time.toLocaleDateString();
};

interface NotificationBellProps {
  className?: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
    case 'low':
      return 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'deadline':
      return <CalendarIcon className="w-full h-full" />;
    case 'compliance':
      return <ExclamationCircleIcon className="w-full h-full" />;
    case 'contract':
      return <CheckCircleIcon className="w-full h-full" />;
    case 'team':
      return <UsersIcon className="w-full h-full" />;
    case 'system':
      return <CogIcon className="w-full h-full" />;
    default:
      return <BellIcon className="w-full h-full" />;
  }
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { state, markAsRead, markAllAsRead, deleteNotification } = useNotificationContext();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteNotification(notificationId);
  };

  const unreadNotifications = state.notifications.filter(n => !n.read);
  const recentNotifications = state.notifications.slice(0, 5);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
          state.unreadCount > 0 ? 'text-primary-600 dark:text-primary-400' : ''
        }`}
        aria-label={`Notifications (${state.unreadCount} unread)`}
      >
        <BellIcon className="h-6 w-6" />
        {state.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.25rem] h-5">
            {state.unreadCount > 99 ? '99+' : state.unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Notifications
              {state.unreadCount > 0 && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({state.unreadCount} unread)
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {state.unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {state.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : state.error ? (
              <div className="px-4 py-6 text-center text-red-600 dark:text-red-400">
                <ExclamationCircleIcon className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">{state.error}</p>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                <BellIcon className="h-8 w-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  We'll notify you when something important happens
                </p>
              </div>
            ) : (
              <div className="py-1">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-l-3 ${
                      notification.read
                        ? 'border-transparent'
                        : 'border-primary-500 dark:border-primary-400 bg-primary-50/30 dark:bg-primary-900/20'
                    }`}
                    onClick={() => handleNotificationClick(notification.id, notification.read)}
                  >
                    <div className="flex items-start space-x-2.5">
                      {/* Type Icon */}
                      <div className={`flex-shrink-0 p-1.5 rounded-full ${getPriorityColor(notification.priority)}`}>
                        <div className="h-3.5 w-3.5">
                          {getTypeIcon(notification.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-xs font-medium text-gray-900 dark:text-gray-100 ${
                              !notification.read ? 'font-semibold' : ''
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            {/* Metadata */}
                            <div className="flex items-center space-x-3 mt-1.5">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                              
                              {notification.priority === 'high' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                  High Priority
                                </span>
                              )}
                              
                              {notification.action_required && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                                  Action Required
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className="flex-shrink-0 ml-1.5 p-0.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete notification"
                          >
                            <XMarkIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* View All Link */}
                {state.totalCount > 5 && (
                  <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      className="w-full text-center text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                      onClick={() => {
                        setIsOpen(false);
                        // Navigate to full notifications page
                        window.location.href = '/notifications';
                      }}
                    >
                      View all {state.totalCount} notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};