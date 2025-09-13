// Export main components
export { NotificationBell } from './NotificationBell';
export { NotificationDropdown } from './NotificationDropdown';
export { NotificationItem } from './NotificationItem';
export { NotificationHeader } from './NotificationHeader';
export { NotificationList } from './NotificationList';

// Export utilities
export { formatTimeAgo, getPriorityColor, getTypeIcon } from './utils';

// Export types
export type {
  NotificationBellProps,
  NotificationItemProps,
  NotificationDropdownProps,
  NotificationHeaderProps,
  NotificationListProps
} from './types';

// Default export for backwards compatibility
export { NotificationBell as default } from './NotificationBell';