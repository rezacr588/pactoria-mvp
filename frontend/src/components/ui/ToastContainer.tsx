import React, { useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useToast, Toast } from '../../contexts/ToastContext';
import { classNames } from '../../utils/classNames';

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const { id, title, message, type, action, dismissible } = toast;

  useEffect(() => {
    // Add entrance animation class
    const element = document.getElementById(`toast-${id}`);
    if (element) {
      element.classList.add('animate-slide-in-right');
    }
  }, [id]);

  const handleRemove = () => {
    const element = document.getElementById(`toast-${id}`);
    if (element) {
      element.classList.add('animate-slide-out-right');
      setTimeout(() => {
        onRemove(id);
      }, 300); // Match animation duration
    } else {
      onRemove(id);
    }
  };

  const getIcon = () => {
    const iconClass = 'h-6 w-6 flex-shrink-0';
    switch (type) {
      case 'success':
        return <CheckCircleIcon className={classNames(iconClass, 'text-success-500')} />;
      case 'error':
        return <ExclamationCircleIcon className={classNames(iconClass, 'text-danger-500')} />;
      case 'warning':
        return <ExclamationTriangleIcon className={classNames(iconClass, 'text-warning-500')} />;
      case 'info':
        return <InformationCircleIcon className={classNames(iconClass, 'text-blue-500')} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-l-success-500';
      case 'error':
        return 'border-l-danger-500';
      case 'warning':
        return 'border-l-warning-500';
      case 'info':
        return 'border-l-blue-500';
    }
  };

  const getProgressColor = () => {
    switch (type) {
      case 'success':
        return 'bg-success-500';
      case 'error':
        return 'bg-danger-500';
      case 'warning':
        return 'bg-warning-500';
      case 'info':
        return 'bg-blue-500';
    }
  };

  return (
    <div
      id={`toast-${id}`}
      className={classNames(
        'relative max-w-sm w-full bg-white dark:bg-secondary-800 shadow-lg rounded-lg pointer-events-auto border-l-4',
        getBorderColor(),
        'ring-1 ring-black ring-opacity-5 dark:ring-secondary-600 overflow-hidden'
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Progress bar for timed toasts */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-neutral-200 dark:bg-secondary-700 w-full">
          <div
            className={classNames(
              'h-full transition-all ease-linear',
              getProgressColor()
            )}
            style={{
              animation: `shrink ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon()}</div>
          
          <div className="ml-3 w-0 flex-1">
            {title && (
              <p className="text-sm font-semibold text-neutral-900 dark:text-secondary-100 mb-1">
                {title}
              </p>
            )}
            <p className="text-sm text-neutral-600 dark:text-secondary-300 leading-relaxed">
              {message}
            </p>
            
            {action && (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none focus:underline transition-colors"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
          
          {dismissible && (
            <div className="ml-4 flex-shrink-0 flex">
              <button
                type="button"
                className="bg-white dark:bg-secondary-800 rounded-md inline-flex text-neutral-400 hover:text-neutral-500 dark:text-secondary-500 dark:hover:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                onClick={handleRemove}
                aria-label="Close notification"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  // Group toasts by position
  const toastsByPosition = toasts.reduce((groups, toast) => {
    const position = toast.position || 'top-right';
    if (!groups[position]) {
      groups[position] = [];
    }
    groups[position].push(toast);
    return groups;
  }, {} as Record<string, Toast[]>);

  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top-left':
        return 'top-0 left-0';
      case 'top-center':
        return 'top-0 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-0 right-0';
      case 'bottom-left':
        return 'bottom-0 left-0';
      case 'bottom-center':
        return 'bottom-0 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-0 right-0';
      default:
        return 'top-0 right-0';
    }
  };

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div
          key={position}
          className={classNames(
            'fixed z-50 p-6 space-y-4 pointer-events-none',
            getPositionClasses(position)
          )}
          aria-live="polite"
        >
          {positionToasts.map(toast => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={removeToast}
            />
          ))}
        </div>
      ))}
      
      {/* CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
          
          .animate-slide-in-right {
            animation: slideInRight 0.3s ease-out forwards;
          }
          
          .animate-slide-out-right {
            animation: slideOutRight 0.3s ease-in forwards;
          }
          
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOutRight {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `
      }} />
    </>
  );
};

export default ToastContainer;