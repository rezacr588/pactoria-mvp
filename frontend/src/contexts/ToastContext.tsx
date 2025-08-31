import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // in milliseconds, 0 means persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
  createdAt: Date;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, options?: Partial<Toast>) => string;
  error: (message: string, options?: Partial<Toast>) => string;
  warning: (message: string, options?: Partial<Toast>) => string;
  info: (message: string, options?: Partial<Toast>) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toastData: Omit<Toast, 'id' | 'createdAt'>) => {
    const id = Math.random().toString(36).substring(2, 15);
    const toast: Toast = {
      id,
      createdAt: new Date(),
      duration: 5000, // Default 5 seconds
      dismissible: true,
      position: 'top-right',
      ...toastData,
    };

    setToasts(prev => {
      // Limit to maximum 5 toasts
      const newToasts = [...prev, toast];
      if (newToasts.length > 5) {
        return newToasts.slice(-5);
      }
      return newToasts;
    });

    // Auto-remove toast after duration (if not persistent)
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, [removeToast]);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message: string, options: Partial<Toast> = {}) => {
    return addToast({
      message,
      type: 'success',
      ...options,
    });
  }, [addToast]);

  const error = useCallback((message: string, options: Partial<Toast> = {}) => {
    return addToast({
      message,
      type: 'error',
      duration: options.duration ?? 7000, // Longer duration for errors
      ...options,
    });
  }, [addToast]);

  const warning = useCallback((message: string, options: Partial<Toast> = {}) => {
    return addToast({
      message,
      type: 'warning',
      duration: options.duration ?? 6000,
      ...options,
    });
  }, [addToast]);

  const info = useCallback((message: string, options: Partial<Toast> = {}) => {
    return addToast({
      message,
      type: 'info',
      ...options,
    });
  }, [addToast]);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};