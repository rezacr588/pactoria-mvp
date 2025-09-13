import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../../utils/classNames';
import { ToastItemProps } from './types';
import { getToastIcon, getBorderColor, getProgressColor } from './utils';

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
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

  return (
    <div
      id={`toast-${id}`}
      className={classNames(
        'relative max-w-sm w-full bg-white dark:bg-secondary-800 shadow-lg rounded-lg pointer-events-auto border-l-4',
        getBorderColor(type),
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
              getProgressColor(type)
            )}
            style={{
              animation: `shrink ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getToastIcon(type)}</div>
          
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