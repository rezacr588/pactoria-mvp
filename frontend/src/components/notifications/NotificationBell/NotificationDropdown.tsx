import React from 'react';
import { NotificationDropdownProps } from './types';
import { NotificationHeader } from './NotificationHeader';
import { NotificationList } from './NotificationList';

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  totalCount,
  loading,
  error,
  onMarkAllRead,
  onNotificationClick,
  onDeleteNotification
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
      <NotificationHeader
        unreadCount={unreadCount}
        onMarkAllRead={onMarkAllRead}
        onClose={onClose}
      />
      
      <div className="max-h-96 overflow-y-auto">
        <NotificationList
          notifications={notifications}
          loading={loading}
          error={error}
          totalCount={totalCount}
          onNotificationClick={onNotificationClick}
          onDeleteNotification={onDeleteNotification}
          onClose={onClose}
        />
      </div>
    </div>
  );
};