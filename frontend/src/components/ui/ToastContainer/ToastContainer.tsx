import React from 'react';
import { useToast, Toast } from '../../../contexts/ToastContext';
import { classNames } from '../../../utils/classNames';
import { ToastItem } from './ToastItem';
import { ToastAnimationStyles } from './animations';
import { getPositionClasses } from './utils';
import { ToastsByPosition } from './types';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  // Group toasts by position
  const toastsByPosition = toasts.reduce((groups: ToastsByPosition, toast: Toast) => {
    const position = toast.position || 'top-right';
    if (!groups[position]) {
      groups[position] = [];
    }
    groups[position].push(toast);
    return groups;
  }, {} as ToastsByPosition);

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
      <ToastAnimationStyles />
    </>
  );
};