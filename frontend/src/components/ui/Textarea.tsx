import React from 'react';
import { classNames } from '../../utils/classNames';
import { textStyles, textColors } from '../../utils/typography';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  variant?: 'default' | 'ghost' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  resize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helpText, 
    variant = 'default',
    size = 'md',
    loading = false,
    success = false,
    resize = true,
    id, 
    disabled,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    
    // Size variants
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-3 py-2.5 text-sm',
      lg: 'px-4 py-3 text-base'
    };

    // Variant styles
    const variantStyles = {
      default: 'border-neutral-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 focus:border-primary-500 focus:ring-primary-500',
      ghost: 'border-transparent bg-neutral-50 dark:bg-secondary-800 focus:border-primary-500 focus:ring-primary-500 focus:bg-white dark:focus:bg-secondary-800',
      filled: 'border-neutral-200 dark:border-secondary-700 bg-neutral-50 dark:bg-secondary-800 focus:border-primary-500 focus:ring-primary-500 focus:bg-white dark:focus:bg-secondary-800'
    };

    // State styles
    const stateStyles = error 
      ? 'border-danger-300 dark:border-danger-500 focus:border-danger-500 focus:ring-danger-500' 
      : success 
      ? 'border-success-300 dark:border-success-500 focus:border-success-500 focus:ring-success-500'
      : variantStyles[variant];

    const baseStyles = classNames(
      'block w-full rounded-lg transition-colors duration-200',
      textColors.primary,
      textColors.placeholder,
      'focus:outline-none focus:ring-2 focus:ring-offset-0 dark:focus:ring-offset-secondary-900',
      'disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-secondary-800 disabled:text-neutral-500 dark:disabled:text-secondary-400 disabled:border-neutral-200 dark:disabled:border-secondary-700',
      sizeStyles[size],
      stateStyles,
      resize ? 'resize-y' : 'resize-none',
      loading && 'cursor-wait'
    );

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={textareaId} 
            className={classNames(
              textStyles.formLabel,
              error ? textColors.danger : success ? textColors.success : '',
              disabled && textColors.subtle
            )}
          >
            {label}
            {props.required && <span className={`${textColors.danger} ml-1`}>*</span>}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled || loading}
            className={classNames(baseStyles, className)}
            {...props}
          />
          {loading && (
            <div className="absolute top-3 right-3">
              <div className="h-4 w-4">
                <svg className="animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
        {error && (
          <p className={`${textStyles.formError} flex items-center`}>
            <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        {success && !error && (
          <p className={`text-sm ${textColors.success} flex items-center`}>
            <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Looks good!
          </p>
        )}
        {helpText && !error && !success && (
          <p className={textStyles.formHelpText}>{helpText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;