import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { classNames } from '../../utils/classNames';
import { textColors, textStyles, typography } from '../../utils/typography';
import Avatar from '../ui/Avatar';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
  permission?: keyof ReturnType<typeof usePermissions>;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, permission: 'canView' },
  { name: 'Contracts', href: '/contracts', icon: DocumentTextIcon, permission: 'canManageContracts' },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, permission: 'canAccessAnalytics' },
  { name: 'Templates', href: '/templates', icon: DocumentDuplicateIcon, permission: 'canManageTemplates' },
  { name: 'Integrations', href: '/integrations', icon: PuzzlePieceIcon, permission: 'canAccessAdmin' },
  { name: 'Audit Trail', href: '/audit', icon: ShieldCheckIcon, permission: 'canAccessAuditLogs' },
  { name: 'Team', href: '/team', icon: UserGroupIcon, permission: 'canManageTeam' },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, permission: 'canView' },
  { name: 'Help', href: '/help', icon: QuestionMarkCircleIcon, permission: 'canView' },
];

const secondaryNavigation: NavigationItem[] = [
  { name: 'Landing Page', href: '/', icon: GlobeAltIcon, permission: 'canView' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const permissions = usePermissions();

  // Filter navigation items based on user permissions
  const visibleNavigation = navigation.filter(item => {
    if (!item.permission) return true;
    return permissions[item.permission];
  });

  const visibleSecondaryNavigation = secondaryNavigation.filter(item => {
    if (!item.permission) return true;
    return permissions[item.permission];
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-secondary-900 border-r border-neutral-200 dark:border-secondary-700">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-neutral-200 dark:border-secondary-700">
        <div className="flex items-center space-x-4">
          <img
            src="/pactoria-logo-128.png"
            srcSet="/pactoria-logo-64.png 1x, /pactoria-logo-128.png 2x, /pactoria-logo-256.png 3x"
            alt="Pactoria - UK Contract Management"
            className="w-12 h-12 lg:w-14 lg:h-14 object-contain pactoria-logo"
            loading="lazy"
            width="56"
            height="56"
          />
          <span className={`text-xl lg:text-2xl font-bold ${textColors.primary}`}>Pactoria</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {/* Main Navigation */}
        <div className="space-y-1">
          {visibleNavigation.map((item) => {
            const isActive = location.pathname === item.href || 
                            (item.href === '/contracts' && location.pathname.startsWith('/contracts'));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={classNames(
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 border-r-2 border-primary-500'
                    : 'text-neutral-600 dark:text-secondary-400 hover:bg-neutral-50 dark:hover:bg-secondary-800 hover:text-neutral-900 dark:hover:text-secondary-100',
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-l-lg transition-colors'
                )}
              >
                <Icon
                  className={classNames(
                    isActive ? 'text-primary-500' : 'text-neutral-400 dark:text-secondary-500 group-hover:text-neutral-500 dark:group-hover:text-secondary-400',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </div>
        
        {/* Secondary Navigation - only show if there are visible items */}
        {visibleSecondaryNavigation.length > 0 && (
          <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-secondary-700">
            <div className="mb-3">
              <h3 className={`px-3 ${typography.label.small} ${textColors.muted} uppercase tracking-wider`}>Quick Access</h3>
            </div>
            <div className="space-y-1">
              {visibleSecondaryNavigation.map((item) => {
                const isActive = location.pathname === item.href && item.href === '/';
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={classNames(
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 border-r-2 border-primary-500'
                        : 'text-neutral-600 dark:text-secondary-400 hover:bg-neutral-50 dark:hover:bg-secondary-800 hover:text-neutral-900 dark:hover:text-secondary-100',
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-l-lg transition-colors'
                    )}
                  >
                    <Icon
                      className={classNames(
                        isActive ? 'text-primary-500' : 'text-neutral-400 dark:text-secondary-500 group-hover:text-neutral-500 dark:group-hover:text-secondary-400',
                        'mr-3 h-5 w-5 flex-shrink-0'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User info and logout */}
      <div className="border-t border-neutral-200 dark:border-secondary-700 p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar
            src={user?.avatar}
            name={user?.name}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className={`${textStyles.listTitle} truncate`}>{user?.name}</p>
            <p className={`${textStyles.metadata} truncate`}>{user?.company}</p>
          </div>
        </div>
      </div>
    </div>
  );
}