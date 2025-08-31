import { useState } from 'react';
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

interface Notification {
  id: string;
  type: 'deadline' | 'compliance' | 'team' | 'system' | 'contract';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionRequired?: boolean;
  relatedContract?: {
    id: string;
    name: string;
  };
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'deadline',
    title: 'Contract Review Due Tomorrow',
    message: 'Marketing Consultant Agreement requires your review and approval before the deadline.',
    timestamp: '2025-08-30T14:30:00Z',
    read: false,
    priority: 'high',
    actionRequired: true,
    relatedContract: { id: '1', name: 'Marketing Consultant Agreement' }
  },
  {
    id: '2',
    type: 'compliance',
    title: 'GDPR Compliance Alert',
    message: 'Data Processing Agreement needs GDPR clause updates to maintain compliance.',
    timestamp: '2025-08-30T10:15:00Z',
    read: false,
    priority: 'high',
    actionRequired: true,
    relatedContract: { id: '2', name: 'Data Processing Agreement' }
  },
  {
    id: '3',
    type: 'contract',
    title: 'Contract Signed',
    message: 'TechCorp Website Development contract has been signed by all parties.',
    timestamp: '2025-08-29T16:45:00Z',
    read: true,
    priority: 'medium',
    relatedContract: { id: '3', name: 'TechCorp Website Development' }
  },
  {
    id: '4',
    type: 'team',
    title: 'New Team Member Added',
    message: 'Sarah Johnson has been added to your team with Editor permissions.',
    timestamp: '2025-08-29T09:20:00Z',
    read: true,
    priority: 'low'
  },
  {
    id: '5',
    type: 'system',
    title: 'System Maintenance Scheduled',
    message: 'Planned maintenance scheduled for Sunday 2:00 AM - 4:00 AM GMT.',
    timestamp: '2025-08-28T18:00:00Z',
    read: false,
    priority: 'low'
  },
  {
    id: '6',
    type: 'deadline',
    title: 'Contract Renewal Reminder',
    message: 'Supplier Agreement with ABC Ltd expires in 30 days.',
    timestamp: '2025-08-28T12:30:00Z',
    read: true,
    priority: 'medium',
    relatedContract: { id: '4', name: 'ABC Ltd Supplier Agreement' }
  }
];

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
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getTypeColor(type: Notification['type']) {
  switch (type) {
    case 'deadline':
      return 'text-orange-700 bg-orange-100';
    case 'compliance':
      return 'text-red-700 bg-red-100';
    case 'contract':
      return 'text-green-700 bg-green-100';
    case 'team':
      return 'text-blue-700 bg-blue-100';
    case 'system':
      return 'text-gray-700 bg-gray-100';
    default:
      return 'text-gray-700 bg-gray-100';
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
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !typeFilter || notification.type === typeFilter;
    const matchesPriority = !priorityFilter || notification.priority === priorityFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'unread') matchesStatus = !notification.read;
    else if (statusFilter === 'read') matchesStatus = notification.read;
    else if (statusFilter === 'actionRequired') matchesStatus = notification.actionRequired || false;

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Stay updated with important alerts and activities
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
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

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {filteredNotifications.length} of {notifications.length} notifications
        </p>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || typeFilter || priorityFilter || statusFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'You have no notifications at this time.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            return (
              <Card 
                key={notification.id} 
                variant="bordered" 
                className={classNames(
                  'transition-all duration-200 hover:shadow-md',
                  !notification.read && 'ring-2 ring-primary-100 bg-primary-50/20'
                )}
              >
                <div className="flex items-start justify-between p-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={classNames(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      notification.actionRequired ? 'bg-orange-100' : 'bg-gray-100'
                    )}>
                      <Icon className={classNames(
                        'h-5 w-5',
                        notification.actionRequired ? 'text-orange-600' : 'text-gray-600'
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={classNames(
                          'text-sm font-medium truncate',
                          notification.read ? 'text-gray-700' : 'text-gray-900'
                        )}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0"></div>
                        )}
                        {notification.actionRequired && (
                          <Badge variant="warning" className="text-xs">
                            Action Required
                          </Badge>
                        )}
                      </div>
                      
                      <p className={classNames(
                        'text-sm mt-1',
                        notification.read ? 'text-gray-500' : 'text-gray-600'
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
                        
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        
                        {notification.relatedContract && (
                          <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
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