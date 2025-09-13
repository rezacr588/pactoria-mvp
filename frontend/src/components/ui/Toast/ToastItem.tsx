import React, { useState, useCallback, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../../utils/classNames';
import { ToastItemProps } from './types';
import { getToastIcon, getToastStyles } from './utils';

export function ToastItem({ toast, onRemove }: ToastItemProps) {
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