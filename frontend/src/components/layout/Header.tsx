import { useState, useCallback } from 'react';
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
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';
import DropdownMenu from '../ui/DropdownMenu';
import Avatar from '../ui/Avatar';
import { NotificationBadge } from '../ui/Badge';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

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

  // Mock notifications - in real app would come from store
  const notifications = [
    {
      id: '1',
      title: 'Contract Review Due',
      message: 'Marketing Consultant Agreement requires your review',
      time: '2 hours ago',
      unread: true
    },
    {
      id: '2',
      title: 'Contract Signed',
      message: 'TechCorp Website Development contract has been signed',
      time: '1 day ago',
      unread: false
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="bg-white dark:bg-secondary-900 border-b border-neutral-200 dark:border-secondary-700 h-16">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md text-neutral-400 dark:text-secondary-500 hover:text-neutral-500 dark:hover:text-secondary-400 hover:bg-neutral-100 dark:hover:bg-secondary-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-lg ml-4 lg:ml-0">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400 dark:text-secondary-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-2 border border-neutral-300 dark:border-secondary-600 rounded-xl leading-5 bg-white dark:bg-secondary-800 placeholder-neutral-500 dark:placeholder-secondary-500 text-neutral-900 dark:text-secondary-100 focus:outline-none focus:placeholder-neutral-400 dark:focus:placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all"
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
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 dark:text-secondary-500 hover:text-neutral-600 dark:hover:text-secondary-300"
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
              <button className="relative p-2 text-neutral-400 dark:text-secondary-500 hover:text-neutral-500 dark:hover:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 rounded-xl">
                <BellIcon className="h-6 w-6" />
                <NotificationBadge count={unreadCount} />
              </button>
            }
            header={
              <div className="p-4">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-secondary-100 mb-3">Notifications</h3>
                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                          notification.unread ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-secondary-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-secondary-100">
                            {notification.title}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-secondary-400 truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-secondary-500 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-secondary-400">No new notifications</p>
                  )}
                </div>
              </div>
            }
            footer={
              <div className="p-4 border-t border-neutral-200 dark:border-secondary-700">
                <Link to="/notifications" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
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
                    <p className="text-sm font-semibold text-neutral-900 dark:text-secondary-100 truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-secondary-400 truncate">
                      {user?.email}
                    </p>
                    {user?.company && (
                      <p className="text-xs text-neutral-400 dark:text-secondary-500 truncate">
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