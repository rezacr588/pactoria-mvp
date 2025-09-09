// Consistent Loading Spinner Component
import React from 'react';
import { classNames } from '../../utils/classNames';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
  label?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary',
  className,
  label = 'Loading...'
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colors = {
    primary: 'text-primary-600',
    secondary: 'text-neutral-600 dark:text-secondary-400',
    white: 'text-white'
  };

  return (
    <div className={classNames('flex items-center justify-center', className)}>
      <div className="flex items-center space-x-2">
        <svg
          className={classNames(
            'animate-spin',
            sizes[size],
            colors[color]
          )}
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {label && (
          <span className={classNames(
            'text-sm font-medium',
            color === 'white' ? 'text-white' : 'text-neutral-600 dark:text-secondary-400'
          )}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
