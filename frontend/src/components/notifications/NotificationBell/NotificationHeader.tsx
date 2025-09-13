import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { NotificationHeaderProps } from './types';

export const NotificationHeader: React.FC<NotificationHeaderProps> = ({
  unreadCount,
  onMarkAllRead,
  onClose
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        Notifications
        {unreadCount > 0 && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({unreadCount} unread)
          </span>
        )}
      </h3>
      <div className="flex items-center space-x-2">
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            Mark all read
          </button>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};