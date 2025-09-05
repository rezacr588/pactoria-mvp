import React from 'react';
import { classNames } from '../../utils/classNames';
import { textColors, textStyles, typography } from '../../utils/typography';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'ghost' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    label, 
    error, 
    helpText, 
    leftIcon, 
    rightIcon,
    variant = 'default',
    size = 'md',
    loading = false,
    success = false,
    id,
    disabled,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    // Size variants
    const sizeStyles = {
      sm: `px-3 py-2 ${typography.body.small}`,
      md: `px-3 py-2.5 ${typography.body.medium}`,
      lg: `px-4 py-3 ${typography.body.large}`
    };

    // Variant styles
    const variantStyles = {
      default: 'border-neutral-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400',
      ghost: 'border-transparent bg-neutral-50 dark:bg-secondary-700 focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 focus:bg-white dark:focus:bg-secondary-800',
      filled: 'border-neutral-200 dark:border-secondary-700 bg-neutral-50 dark:bg-secondary-700 focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 focus:bg-white dark:focus:bg-secondary-800'
    };

    // State styles
    const stateStyles = error 
      ? 'border-danger-300 dark:border-danger-600 focus:border-danger-500 focus:ring-danger-500 dark:focus:border-danger-400 dark:focus:ring-danger-400' 
      : success 
      ? 'border-success-300 dark:border-success-600 focus:border-success-500 focus:ring-success-500 dark:focus:border-success-400 dark:focus:ring-success-400'
      : variantStyles[variant];

    const baseStyles = classNames(
      'block w-full rounded-xl transition-all duration-200',
      textColors.placeholder,
      textColors.primary,
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      `disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-neutral-50 dark:disabled:bg-secondary-800 ${textColors.disabled} disabled:border-neutral-200 dark:disabled:border-secondary-700`,
      sizeStyles[size],
      stateStyles
    );

    // Icon positioning based on size
    const iconPositioning = {
      sm: { left: 'left-0 pl-2.5', right: 'right-0 pr-2.5', input: leftIcon ? 'pl-8' : rightIcon ? 'pr-8' : '' },
      md: { left: 'left-0 pl-3', right: 'right-0 pr-3', input: leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '' },
      lg: { left: 'left-0 pl-3.5', right: 'right-0 pr-3.5', input: leftIcon ? 'pl-11' : rightIcon ? 'pr-11' : '' }
    };

    const iconSize = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-5 w-5'
    };

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId} 
            className={classNames(
              'block text-sm font-medium',
              error ? textColors.danger : success ? textColors.success : textColors.secondary,
              disabled && textColors.disabled
            )}
          >
            {label}
            {props.required && <span className="text-danger-500 dark:text-danger-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className={classNames(
              'absolute inset-y-0 flex items-center pointer-events-none',
              iconPositioning[size].left
            )}>
              <div className={classNames(
                iconSize[size],
                error ? textColors.dangerMuted : success ? textColors.successMuted : textColors.subtle
              )}>
                {leftIcon}
              </div>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled || loading}
            aria-describedby={classNames(
              error && `${inputId}-error`,
              helpText && `${inputId}-help`
            )}
            aria-invalid={error ? 'true' : 'false'}
            className={classNames(
              baseStyles,
              iconPositioning[size].input,
              loading && 'cursor-wait',
              className
            )}
            {...props}
          />
          {(rightIcon || loading || success) && (
            <div className={classNames(
              'absolute inset-y-0 flex items-center',
              iconPositioning[size].right
            )}>
              {loading ? (
                <div className={classNames(iconSize[size])}>
                  <svg className="animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : success && !rightIcon ? (
                <div className={classNames(iconSize[size], 'text-success-400 dark:text-success-500')}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : rightIcon ? (
                <div className={classNames(
                  iconSize[size],
                  error ? textColors.dangerMuted : success ? textColors.successMuted : textColors.subtle
                )}>
                  {rightIcon}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className={`${textStyles.formError} flex items-center mt-2`}>
            <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        {success && !error && (
          <p className={`${textStyles.formSuccess} flex items-center mt-2`}>
            <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Looks good!
          </p>
        )}
        {helpText && !error && !success && (
          <p id={`${inputId}-help`} className={`${textStyles.formHelpText} mt-1`}>{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;