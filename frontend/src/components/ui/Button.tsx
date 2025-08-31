import React from 'react';
import { classNames } from '../../utils/classNames';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    icon,
    fullWidth = false,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 focus:ring-primary-200 dark:focus:ring-primary-800 shadow-soft hover:shadow-medium dark:shadow-secondary-900/20',
      secondary: 'bg-white dark:bg-secondary-800 text-neutral-700 dark:text-secondary-200 border border-neutral-200 dark:border-secondary-700 hover:bg-neutral-50 dark:hover:bg-secondary-700 hover:border-neutral-300 dark:hover:border-secondary-600 focus:ring-primary-200 dark:focus:ring-primary-800 shadow-soft hover:shadow-medium',
      danger: 'bg-gradient-to-r from-danger-600 to-danger-700 text-white hover:from-danger-700 hover:to-danger-800 focus:ring-danger-200 dark:focus:ring-danger-800 shadow-soft hover:shadow-medium',
      warning: 'bg-gradient-to-r from-warning-600 to-warning-700 text-white hover:from-warning-700 hover:to-warning-800 focus:ring-warning-200 dark:focus:ring-warning-800 shadow-soft hover:shadow-medium',
      ghost: 'text-neutral-600 dark:text-secondary-300 hover:text-neutral-900 dark:hover:text-secondary-100 hover:bg-neutral-100 dark:hover:bg-secondary-800 focus:ring-primary-200 dark:focus:ring-primary-800 hover:shadow-soft'
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm gap-2',
      md: 'px-5 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-3'
    };

    return (
      <button
        ref={ref}
        className={classNames(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </>
        ) : (
          <>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;