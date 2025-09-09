// Consistent Error Message Component
import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorMessage({
  title,
  message,
  variant = 'error',
  size = 'md',
  showIcon = true,
  onRetry,
  onDismiss,
  className
}: ErrorMessageProps) {
  const variants = {
    error: {
      container: 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800',
      icon: 'text-danger-500',
      title: 'text-danger-800 dark:text-danger-400',
      message: 'text-danger-700 dark:text-danger-300',
      button: 'bg-danger-600 hover:bg-danger-700 text-white'
    },
    warning: {
      container: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800',
      icon: 'text-warning-500',
      title: 'text-warning-800 dark:text-warning-400',
      message: 'text-warning-700 dark:text-warning-300',
      button: 'bg-warning-600 hover:bg-warning-700 text-white'
    }
  };

  const sizes = {
    sm: {
      container: 'p-3',
      icon: 'h-4 w-4',
      title: 'text-sm font-medium',
      message: 'text-xs',
      button: 'px-2 py-1 text-xs'
    },
    md: {
      container: 'p-4',
      icon: 'h-5 w-5',
      title: 'text-base font-medium',
      message: 'text-sm',
      button: 'px-3 py-1.5 text-sm'
    },
    lg: {
      container: 'p-6',
      icon: 'h-6 w-6',
      title: 'text-lg font-semibold',
      message: 'text-base',
      button: 'px-4 py-2 text-base'
    }
  };

  const Icon = variant === 'error' ? XCircleIcon : ExclamationTriangleIcon;
  const variantStyles = variants[variant];
  const sizeStyles = sizes[size];

  return (
    <div className={classNames(
      'rounded-lg border',
      variantStyles.container,
      sizeStyles.container,
      className
    )}>
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            <Icon className={classNames(sizeStyles.icon, variantStyles.icon)} />
          </div>
        )}
        <div className={classNames('flex-1', showIcon && 'ml-3')}>
          {title && (
            <h3 className={classNames(sizeStyles.title, variantStyles.title, 'mb-1')}>
              {title}
            </h3>
          )}
          <p className={classNames(sizeStyles.message, variantStyles.message)}>
            {message}
          </p>
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={classNames(
                    'rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
                    sizeStyles.button,
                    variantStyles.button
                  )}
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className={classNames(
                    'rounded-md font-medium bg-transparent hover:bg-black/5 dark:hover:bg-white/5',
                    sizeStyles.button,
                    variantStyles.message
                  )}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
