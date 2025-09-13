import React from 'react';
import { BellIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { NotificationListProps } from './types';
import { NotificationItem } from './NotificationItem';

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  loading,
  error,
  totalCount,
  onNotificationClick,
  onDeleteNotification,
  onClose
}) => {
  const recentNotifications = notifications.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 text-center text-red-600 dark:text-red-400">
        <ExclamationCircleIcon className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (recentNotifications.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
        <BellIcon className="h-8 w-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm">No notifications yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          We'll notify you when something important happens
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {recentNotifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onNotificationClick={onNotificationClick}
          onDeleteNotification={onDeleteNotification}
        />
      ))}

      {/* View All Link */}
      {totalCount > 5 && (
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700">
          <button 
            className="w-full text-center text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            onClick={() => {
              onClose();
              // Navigate to full notifications page
              window.location.href = '/notifications';
            }}
          >
            View all {totalCount} notifications
          </button>
        </div>
      )}
    </div>
  );
};