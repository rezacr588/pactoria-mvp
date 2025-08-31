import React from 'react';
import { classNames } from '../../utils/classNames';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', dot = false, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center rounded-full font-medium';
    
    const variants = {
      default: 'bg-neutral-100 dark:bg-secondary-800 text-neutral-800 dark:text-secondary-200',
      primary: 'bg-primary-100 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400',
      success: 'bg-success-100 dark:bg-success-950/30 text-success-800 dark:text-success-400',
      warning: 'bg-warning-100 dark:bg-warning-950/30 text-warning-800 dark:text-warning-400',
      danger: 'bg-danger-100 dark:bg-danger-950/30 text-danger-800 dark:text-danger-400',
      info: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400'
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base'
    };

    const dotVariants = {
      default: 'bg-neutral-400 dark:bg-secondary-500',
      primary: 'bg-primary-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      info: 'bg-blue-500'
    };

    if (dot) {
      return (
        <span className={classNames('inline-flex items-center gap-x-1.5', className)} {...props} ref={ref}>
          <span className={classNames('h-1.5 w-1.5 rounded-full', dotVariants[variant])} />
          <span className="text-sm text-neutral-700 dark:text-secondary-300">{children}</span>
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={classNames(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export function NotificationBadge({ count, max = 99, className }: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={classNames(
        'absolute -top-1 -right-1 h-4 w-4 rounded-full bg-danger-500 flex items-center justify-center',
        className
      )}
    >
      <span className="text-xs text-white font-medium">{displayCount}</span>
    </span>
  );
}

export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'draft';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    active: { label: 'Active', variant: 'success' as const },
    inactive: { label: 'Inactive', variant: 'default' as const },
    pending: { label: 'Pending', variant: 'warning' as const },
    completed: { label: 'Completed', variant: 'success' as const },
    cancelled: { label: 'Cancelled', variant: 'danger' as const },
    draft: { label: 'Draft', variant: 'default' as const }
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export default Badge;