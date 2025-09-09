import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
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
import { NotificationMessage } from '../../types';
import { useNotifications } from '../../hooks/useWebSocket';
import { NotificationBell } from '../notifications/NotificationBell';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';
import DropdownMenu from '../ui/DropdownMenu';
import Avatar from '../ui/Avatar';
import { textStyles, textColors, typography } from '../../utils/typography';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
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


  // WebSocket notifications
  useNotifications((message: NotificationMessage) => {
    setUnreadCount(prev => prev + 1);
    console.log('Real-time notification received:', message);
  });




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
        <div id="search" className="flex-1 max-w-lg ml-4 lg:ml-0">
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
          <NotificationBell />

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