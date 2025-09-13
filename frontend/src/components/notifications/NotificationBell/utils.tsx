import React from 'react';
import { CalendarIcon, UsersIcon, CogIcon, CheckCircleIcon, ExclamationCircleIcon, BellIcon } from '@heroicons/react/24/outline';

// Helper function to format time
export const formatTimeAgo = (timestamp: string): string => {
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

export const getPriorityColor = (priority: string) => {
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

export const getTypeIcon = (type: string): React.ReactElement => {
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