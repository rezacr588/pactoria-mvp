import { Notification } from '../../../contexts/NotificationContext';

export interface NotificationBellProps {
  className?: string;
}

export interface NotificationItemProps {
  notification: Notification;
  onNotificationClick: (notificationId: string, isRead: boolean) => void;
  onDeleteNotification: (notificationId: string, event: React.MouseEvent) => void;
}

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  onMarkAllRead: () => void;
  onNotificationClick: (notificationId: string, isRead: boolean) => void;
  onDeleteNotification: (notificationId: string, event: React.MouseEvent) => void;
}

export interface NotificationHeaderProps {
  unreadCount: number;
  onMarkAllRead: () => void;
  onClose: () => void;
}

export interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  onNotificationClick: (notificationId: string, isRead: boolean) => void;
  onDeleteNotification: (notificationId: string, event: React.MouseEvent) => void;
  onClose: () => void;
}