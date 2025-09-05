import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Bars3Icon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  QuestionMarkCircleIcon,
  BellAlertIcon,
  ChartBarIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { NotificationsService } from '../../services/api';
import { Notification, NotificationMessage } from '../../types';
import { useNotifications } from '../../hooks/useWebSocket';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';
import DropdownMenu from '../ui/DropdownMenu';
import Avatar from '../ui/Avatar';
import { NotificationBadge } from '../ui/Badge';
import { textStyles, textColors, typography } from '../../utils/typography';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      // Navigate to search results or trigger search
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }, [navigate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchQuery);
    }
  };

  // Fetch notifications from the API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingNotifications(true);
    try {
      const response = await NotificationsService.getNotifications({
        page: 1,
        size: 10, // Show only the most recent 10 notifications in header
        read: false // Only show unread for header badge
      });
      
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Don't show error in header, just log it
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user]);

  // WebSocket notifications
  useNotifications((message: NotificationMessage) => {
    // Convert WebSocket notification to local notification format
    const validNotificationTypes = ['deadline', 'compliance', 'team', 'system', 'contract'];
    const notificationType = validNotificationTypes.includes(message.notification_type) 
      ? message.notification_type as 'deadline' | 'compliance' | 'team' | 'system' | 'contract'
      : 'system';
      
    const newNotification: Notification = {
      id: message.message_id || `ws-${Date.now()}`,
      type: notificationType,
      title: message.title,
      message: message.message,
      priority: message.priority.toLowerCase() as 'low' | 'medium' | 'high',
      action_required: false, // WebSocket message doesn't have this field
      read: false,
      timestamp: message.timestamp,
      user_id: message.target_user_id || '',
      related_contract: message.data?.contract ? {
        id: message.data.contract.id,
        name: message.data.contract.name
      } : undefined,
      metadata: message.data
    };
    
    // Add to notifications list
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep only 10 notifications
    setUnreadCount(prev => prev + 1);
    
    // Show toast notification or other UI feedback
    console.log('Real-time notification received:', message);
  });

  // Load notifications on mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await NotificationsService.markAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const formatNotificationTime = (timestamp: string): string => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notificationTime.toLocaleDateString();
  };

  return (
    <header className="bg-white dark:bg-secondary-900 border-b border-neutral-200 dark:border-secondary-700 h-16">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Logo for mobile */}
        <div className="flex items-center space-x-3 lg:hidden">
          <img
            src="/pactoria-logo-96.png"
            srcSet="/pactoria-logo-48.png 1x, /pactoria-logo-96.png 2x, /pactoria-logo-128.png 3x"
            alt="Pactoria - UK Contract Management"
            className="h-8 w-8 sm:h-10 sm:w-10 object-contain pactoria-logo"
            loading="lazy"
            width="40"
            height="40"
          />
          <span className={textStyles.pageTitle}>Pactoria</span>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className={`p-2 rounded-md ${textColors.subtle} hover:text-neutral-500 dark:hover:text-secondary-400 hover:bg-neutral-100 dark:hover:bg-secondary-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:focus:ring-offset-secondary-900 lg:hidden`}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-lg ml-4 lg:ml-0">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className={`h-5 w-5 ${textColors.subtle}`} />
            </div>
            <input
              type="text"
              className={`block w-full pl-10 pr-10 py-2.5 border border-neutral-300 dark:border-secondary-600 rounded-xl leading-5 bg-white dark:bg-secondary-800 ${textColors.placeholder} ${textColors.primary} focus:outline-none focus:placeholder-neutral-400 dark:focus:placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${typography.body.medium} transition-all`}
              placeholder="Search contracts, templates, or team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search contracts, templates, or team members"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${textColors.subtle} hover:text-neutral-600 dark:hover:text-secondary-300`}
                aria-label="Clear search"
              >
                <span className="h-4 w-4">✕</span>
              </button>
            )}
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* New Contract Button */}
          <Link to="/contracts/new" className="hidden sm:block">
            <Button size="sm" icon={<PlusIcon className="h-4 w-4" />}>
              New Contract
            </Button>
          </Link>
          <Link to="/contracts/new" className="sm:hidden">
            <Button size="sm" variant="ghost">
              <PlusIcon className="h-5 w-5" />
            </Button>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle size="sm" />

          {/* Notifications */}
          <DropdownMenu
            width="lg"
            trigger={
              <button className={`relative p-2 ${textColors.subtle} hover:text-neutral-500 dark:hover:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 rounded-xl`}>
                <BellIcon className="h-6 w-6" />
                <NotificationBadge count={unreadCount} />
              </button>
            }
            header={
              <div className="p-4">
                <h3 className={`${textStyles.sectionTitle} mb-3`}>Notifications</h3>
                <div className="space-y-3">
                  {isLoadingNotifications ? (
                    // Loading skeleton
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start space-x-3 animate-pulse">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full mt-2 bg-neutral-300 dark:bg-secondary-600" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-neutral-200 dark:bg-secondary-700 rounded-lg w-3/4"></div>
                          <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-full"></div>
                          <div className="h-3 bg-neutral-200 dark:bg-secondary-700 rounded w-1/3"></div>
                        </div>
                      </div>
                    ))
                  ) : notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className="flex items-start space-x-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-secondary-800 rounded-lg p-2 -m-2 transition-colors"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                          !notification.read ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-secondary-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`${textStyles.listTitle} ${!notification.read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          <p className={`${textStyles.listSubtitle} truncate`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className={`${textStyles.timestamp}`}>
                              {formatNotificationTime(notification.timestamp)}
                            </p>
                            {notification.action_required && (
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={textStyles.bodyTextSecondary}>No new notifications</p>
                  )}
                </div>
              </div>
            }
            footer={
              <div className="p-4 border-t border-neutral-200 dark:border-secondary-700">
                <Link to="/notifications" className={`text-sm font-medium ${textStyles.link}`}>
                  View all notifications
                </Link>
              </div>
            }
          />

          {/* User Profile Menu */}
          <DropdownMenu
            width="md"
            trigger={
              <Avatar
                src={user?.avatar}
                name={user?.name}
                size="sm"
                showRing
                onClick={() => {}}
                data-testid="user-avatar"
                className="cursor-pointer"
              />
            }
            header={
              <div className="px-4 py-4">
                <div className="flex items-center space-x-3">
                  <Avatar
                    src={user?.avatar}
                    name={user?.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`${textStyles.listTitle} truncate`}>
                      {user?.name}
                    </p>
                    <p className={`${textStyles.metadata} truncate`}>
                      {user?.email}
                    </p>
                    {user?.company && (
                      <p className={`${textStyles.timestamp} truncate`}>
                        {user?.company}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            }
            sections={[
              {
                id: 'navigation',
                items: [
                  {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: ChartBarIcon,
                    onClick: () => navigate('/dashboard')
                  },
                  {
                    id: 'landing',
                    label: 'Landing Page',
                    icon: GlobeAltIcon,
                    onClick: () => navigate('/')
                  },
                  {
                    id: 'notifications',
                    label: 'Notifications',
                    icon: BellAlertIcon,
                    onClick: () => navigate('/notifications'),
                    badge: unreadCount > 0 ? unreadCount : undefined
                  },
                  {
                    id: 'settings',
                    label: 'Settings',
                    icon: Cog6ToothIcon,
                    onClick: () => navigate('/settings')
                  },
                  {
                    id: 'help',
                    label: 'Help & Support',
                    icon: QuestionMarkCircleIcon,
                    onClick: () => navigate('/help')
                  }
                ]
              },
              {
                id: 'auth',
                items: [
                  {
                    id: 'logout',
                    label: 'Sign Out',
                    icon: ArrowRightOnRectangleIcon,
                    onClick: logout,
                    variant: 'danger' as const
                  }
                ]
              }
            ]}
          />
        </div>
      </div>
    </header>
  );
}