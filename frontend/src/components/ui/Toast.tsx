import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return CheckCircleIcon;
    case 'error':
      return ExclamationTriangleIcon;
    case 'warning':
      return ExclamationTriangleIcon;
    case 'info':
      return InformationCircleIcon;
    default:
      return InformationCircleIcon;
  }
};

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-success-50 dark:bg-success-950/20 border-success-200 dark:border-success-800/30',
        icon: 'text-success-600 dark:text-success-400',
        title: 'text-success-800 dark:text-success-300',
        message: 'text-success-700 dark:text-success-400',
        closeButton: 'text-success-400 dark:text-success-500 hover:text-success-600 dark:hover:text-success-300'
      };
    case 'error':
      return {
        bg: 'bg-danger-50 dark:bg-danger-950/20 border-danger-200 dark:border-danger-800/30',
        icon: 'text-danger-600 dark:text-danger-400',
        title: 'text-danger-800 dark:text-danger-300',
        message: 'text-danger-700 dark:text-danger-400',
        closeButton: 'text-danger-400 dark:text-danger-500 hover:text-danger-600 dark:hover:text-danger-300'
      };
    case 'warning':
      return {
        bg: 'bg-warning-50 dark:bg-warning-950/20 border-warning-200 dark:border-warning-800/30',
        icon: 'text-warning-600 dark:text-warning-400',
        title: 'text-warning-800 dark:text-warning-300',
        message: 'text-warning-700 dark:text-warning-400',
        closeButton: 'text-warning-400 dark:text-warning-500 hover:text-warning-600 dark:hover:text-warning-300'
      };
    case 'info':
      return {
        bg: 'bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800/30',
        icon: 'text-primary-600 dark:text-primary-400',
        title: 'text-primary-800 dark:text-primary-300',
        message: 'text-primary-700 dark:text-primary-400',
        closeButton: 'text-primary-400 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-300'
      };
    default:
      return {
        bg: 'bg-neutral-50 dark:bg-secondary-800 border-neutral-200 dark:border-secondary-600',
        icon: 'text-neutral-600 dark:text-secondary-400',
        title: 'text-neutral-800 dark:text-secondary-200',
        message: 'text-neutral-700 dark:text-secondary-300',
        closeButton: 'text-neutral-400 dark:text-secondary-500 hover:text-neutral-600 dark:hover:text-secondary-300'
      };
  }
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const Icon = getToastIcon(toast.type);
  const styles = getToastStyles(toast.type);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Match animation duration
  }, [toast.id, onRemove]);

  React.useEffect(() => {
    if (!toast.persistent && toast.duration !== 0) {
      const duration = toast.duration || 5000;
      timeoutRef.current = setTimeout(() => {
        handleRemove();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [toast.duration, toast.persistent, handleRemove]);

  return (
    <div
      className={classNames(
        'transform transition-all duration-300 ease-in-out',
        isRemoving 
          ? 'translate-x-full opacity-0 scale-95' 
          : 'translate-x-0 opacity-100 scale-100'
      )}
    >
      <div
        className={classNames(
          'max-w-md w-full shadow-strong rounded-2xl border-l-4 p-4',
          styles.bg
        )}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={classNames('h-5 w-5', styles.icon)} />
          </div>
          
          <div className="ml-3 flex-1">
            {toast.title && (
              <h3 className={classNames('text-sm font-semibold', styles.title)}>
                {toast.title}
              </h3>
            )}
            <p className={classNames(
              'text-sm',
              toast.title ? 'mt-1' : 'mt-0',
              styles.message
            )}>
              {toast.message}
            </p>
            
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    handleRemove();
                  }}
                  className={classNames(
                    'text-sm font-medium underline hover:no-underline transition-all',
                    styles.title
                  )}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleRemove}
              className={classNames(
                'inline-flex rounded-xl p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                styles.closeButton
              )}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

const getPositionStyles = (position: ToastProviderProps['position']) => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'top-center':
      return 'top-4 left-1/2 transform -translate-x-1/2';
    case 'bottom-center':
      return 'bottom-4 left-1/2 transform -translate-x-1/2';
    default: // top-right
      return 'top-4 right-4';
  }
};

export function ToastProvider({ 
  children, 
  position = 'top-right',
  maxToasts = 5 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...toastData, id };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Keep only the latest toasts if we exceed maxToasts
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts);
      }
      return updated;
    });
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, removeAllToasts }}>
      {children}
      
      {/* Toast Container */}
      <div
        className={classNames(
          'fixed z-50 flex flex-col space-y-3 pointer-events-none',
          getPositionStyles(position)
        )}
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { addToast } = useToast();

  return {
    success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      addToast({ type: 'success', message, ...options });
    },
    error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      addToast({ type: 'error', message, persistent: true, ...options });
    },
    warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      addToast({ type: 'warning', message, ...options });
    },
    info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      addToast({ type: 'info', message, ...options });
    }
  };
};

export default ToastProvider;