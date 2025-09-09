// Consistent Form Field Component
import React from 'react';
import { classNames } from '../../utils/classNames';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function FormField({
  label,
  error,
  hint,
  required = false,
  className,
  children
}: FormFieldProps) {
  return (
    <div className={classNames('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-secondary-300">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {children}
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-danger-500" />
          </div>
        )}
      </div>
      
      {hint && !error && (
        <p className="text-xs text-neutral-500 dark:text-secondary-400">
          {hint}
        </p>
      )}
      
      {error && (
        <p className="text-xs text-danger-600 dark:text-danger-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
