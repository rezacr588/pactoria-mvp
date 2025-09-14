import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Input, Select, Badge } from '../components/ui';
import { classNames } from '../utils/classNames';
import { NotificationsService } from '../services/api';
import { getErrorMessage } from '../utils/errorHandling';
import { useToast } from '../contexts/ToastContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  priority: string;
  action_required: boolean;
  read: boolean;
  user_id: string;
  related_contract?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, any>;
}


const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'deadline', label: 'Deadlines' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'contract', label: 'Contracts' },
  { value: 'team', label: 'Team' },
  { value: 'system', label: 'System' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' },
];

const statusOptions = [
  { value: '', label: 'All Notifications' },
  { value: 'unread', label: 'Unread Only' },
  { value: 'read', label: 'Read Only' },
  { value: 'actionRequired', label: 'Action Required' },
];

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'deadline':
      return ClockIcon;
    case 'compliance':
      return ExclamationTriangleIcon;
    case 'contract':
      return CheckCircleIcon;
    case 'team':
      return InformationCircleIcon;
    case 'system':
      return BellIcon;
    default:
      return BellIcon;
  }
}

function getPriorityColor(priority: Notification['priority']) {
  switch (priority) {
    case 'high':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    case 'low':
      return 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  }
}

function getTypeColor(type: Notification['type']) {
  switch (type) {
    case 'deadline':
      return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30';
    case 'compliance':
      return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
    case 'contract':
      return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30';
    case 'team':
      return 'text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30';
    case 'system':
      return 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800';
    default:
      return 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800';
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  }
}

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState({ total: 0, unread_count: 0, page: 1, size: 20, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch notifications
  const fetchNotifications = useCallback(async (params: {
    page?: number;
    size?: number;
    type?: string;
    priority?: string;
    read?: boolean;
    action_required?: boolean;
    search?: string;
  } = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await NotificationsService.getNotifications({
        page: params.page || 1,
        size: params.size || 20,
        ...(params.type && { type: params.type }),
        ...(params.priority && { priority: params.priority }),
        ...(params.read !== undefined && { read: params.read }),
        ...(params.action_required !== undefined && { action_required: params.action_required }),
        ...(params.search && { search: params.search }),
      });
      
      setNotifications(response.notifications);
      setPagination({
        total: response.total,
        unread_count: response.unread_count,
        page: response.page,
        size: response.size,
        pages: response.pages,
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Use ref to store fetchNotifications to avoid infinite loop
  const fetchNotificationsRef = useRef(fetchNotifications);
  fetchNotificationsRef.current = fetchNotifications;

  useEffect(() => {
    fetchNotificationsRef.current();
  }, [fetchNotificationsRef]);

  useEffect(() => {
    const params: any = {};
    
    if (searchQuery) params.search = searchQuery;
    if (typeFilter) params.type = typeFilter;
    if (priorityFilter) params.priority = priorityFilter;
    
    // Handle status filter mapping
    if (statusFilter === 'unread') params.read = false;
    else if (statusFilter === 'read') params.read = true;
    else if (statusFilter === 'actionRequired') params.action_required = true;
    
    fetchNotificationsRef.current(params);
  }, [searchQuery, typeFilter, priorityFilter, statusFilter, fetchNotificationsRef]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await NotificationsService.markAsRead(id);
      setNotifications(prev => prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      ));
      setPagination(prev => ({ ...prev, unread_count: prev.unread_count - 1 }));
      showToast('Notification marked as read', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  }, [showToast]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const response = await NotificationsService.markAllAsRead();
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
      setPagination(prev => ({ ...prev, unread_count: 0 }));
      showToast(`${response.updated_count} notifications marked as read`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  }, [showToast]);

  const handleDeleteNotification = useCallback(async (id: string) => {
    try {
      await NotificationsService.deleteNotification(id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      setPagination(prev => ({ 
        ...prev, 
        total: prev.total - 1,
        unread_count: notifications.find(n => n.id === id)?.read ? prev.unread_count : prev.unread_count - 1 
      }));
      showToast('Notification deleted', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  }, [showToast, notifications]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Stay updated with important alerts and activities
            {pagination.unread_count > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300">
                {pagination.unread_count} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={pagination.unread_count === 0 || isLoading}
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6" padding="md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            placeholder="Search notifications..."
            leftIcon={<MagnifyingGlassIcon />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Filter by type"
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
          <Select
            placeholder="Filter by priority"
            options={priorityOptions}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          />
          <Select
            placeholder="Filter by status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-4 text-red-600 dark:text-red-400 text-sm">
          Error: {error}
          <button 
            onClick={clearError} 
            className="ml-2 text-primary-600 dark:text-primary-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {notifications.length} of {pagination.total} notifications
        </p>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="flex items-center space-x-4 p-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded-lg w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No notifications found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || typeFilter || priorityFilter || statusFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'You have no notifications at this time.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            return (
              <Card 
                key={notification.id} 
                variant="bordered" 
                className={classNames(
                  'transition-all duration-200 hover:shadow-md',
                  !notification.read && 'ring-2 ring-primary-100 dark:ring-primary-800 bg-primary-50/20 dark:bg-primary-900/20'
                )}
              >
                <div className="flex items-start justify-between p-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={classNames(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      notification.action_required ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-800'
                    )}>
                      <Icon className={classNames(
                        'h-5 w-5',
                        notification.action_required ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={classNames(
                          'text-sm font-medium truncate',
                          notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'
                        )}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full flex-shrink-0"></div>
                        )}
                        {notification.action_required && (
                          <Badge variant="warning" className="text-xs">
                            Action Required
                          </Badge>
                        )}
                      </div>
                      
                      <p className={classNames(
                        'text-sm mt-1',
                        notification.read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'
                      )}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-3">
                        <Badge 
                          variant="default" 
                          className={classNames('text-xs', getTypeColor(notification.type))}
                        >
                          {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                        </Badge>
                        
                        <span className={classNames(
                          'text-xs px-2 py-1 rounded border',
                          getPriorityColor(notification.priority)
                        )}>
                          {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)} Priority
                        </span>
                        
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        
                        {notification.related_contract && (
                          <button className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                            View Contract →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}