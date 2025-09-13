import React, { useState, useCallback } from 'react';
import { classNames } from '../../../utils/classNames';
import { ToastProviderProps, Toast } from './types';
import { ToastContext } from './context';
import { ToastItem } from './ToastItem';
import { getPositionStyles } from './utils';

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