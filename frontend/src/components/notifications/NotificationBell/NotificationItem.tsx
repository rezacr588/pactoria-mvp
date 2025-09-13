import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { NotificationItemProps } from './types';
import { formatTimeAgo, getPriorityColor, getTypeIcon } from './utils';

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onNotificationClick,
  onDeleteNotification
}) => {
  return (
    <div
      className={`group px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-l-3 ${
        notification.read
          ? 'border-transparent'
          : 'border-primary-500 dark:border-primary-400 bg-primary-50/30 dark:bg-primary-900/20'
      }`}
      onClick={() => onNotificationClick(notification.id, notification.read)}
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
              onClick={(e) => onDeleteNotification(notification.id, e)}
              className="flex-shrink-0 ml-1.5 p-0.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete notification"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};