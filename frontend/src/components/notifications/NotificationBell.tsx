// Re-export everything from the NotificationBell module for backwards compatibility
export {
  NotificationBell,
  NotificationDropdown,
  NotificationItem,
  NotificationHeader,
  NotificationList,
  formatTimeAgo,
  getPriorityColor,
  getTypeIcon
} from './NotificationBell/index';

export type {
  NotificationBellProps,
  NotificationItemProps,
  NotificationDropdownProps,
  NotificationHeaderProps,
  NotificationListProps
} from './NotificationBell/index';

export { default } from './NotificationBell/index';