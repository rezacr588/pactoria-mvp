import React from 'react';
import { classNames } from '../../utils/classNames';
import { textColors, typography } from '../../utils/typography';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  pulse?: boolean;
  gradient?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    pulse = false,
    gradient = true,
    rounded = 'lg',
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = classNames(
      'inline-flex items-center justify-center font-semibold relative overflow-hidden',
      'transition-all duration-200 ease-out transform-gpu',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-secondary-900',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
      'hover:scale-[1.01] active:scale-[0.99] hover:shadow-md',
      'before:absolute before:inset-0 before:bg-gradient-to-r before:opacity-0',
      'hover:before:opacity-5 before:transition-opacity before:duration-200',
      pulse && !loading && 'animate-pulse',
      !disabled && !loading && 'group'
    );
    
    const variants = {
      primary: gradient 
        ? 'bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 text-white hover:from-primary-700 hover:via-primary-700 hover:to-primary-800 focus:ring-primary-300 dark:focus:ring-primary-700 shadow-lg hover:shadow-xl before:from-white before:to-white'
        : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-300 dark:focus:ring-primary-700 shadow-md hover:shadow-lg',
      
      secondary: `bg-white dark:bg-secondary-800 ${textColors.secondary} border border-neutral-300 dark:border-secondary-600 hover:bg-neutral-50 dark:hover:bg-secondary-700 hover:border-neutral-400 dark:hover:border-secondary-500 focus:ring-primary-300 dark:focus:ring-primary-700 shadow-sm hover:shadow-md before:from-primary-500 before:to-primary-600`,
      
      danger: gradient
        ? 'bg-gradient-to-r from-danger-600 via-danger-600 to-danger-700 text-white hover:from-danger-700 hover:via-danger-700 hover:to-danger-800 focus:ring-danger-300 dark:focus:ring-danger-700 shadow-lg hover:shadow-xl before:from-white before:to-white'
        : 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-300 dark:focus:ring-danger-700 shadow-md hover:shadow-lg',
      
      success: gradient
        ? 'bg-gradient-to-r from-success-600 via-success-600 to-success-700 text-white hover:from-success-700 hover:via-success-700 hover:to-success-800 focus:ring-success-300 dark:focus:ring-success-700 shadow-lg hover:shadow-xl before:from-white before:to-white'
        : 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-300 dark:focus:ring-success-700 shadow-md hover:shadow-lg',
      
      warning: gradient
        ? 'bg-gradient-to-r from-warning-600 via-warning-600 to-warning-700 text-white hover:from-warning-700 hover:via-warning-700 hover:to-warning-800 focus:ring-warning-300 dark:focus:ring-warning-700 shadow-lg hover:shadow-xl before:from-white before:to-white'
        : 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-300 dark:focus:ring-warning-700 shadow-md hover:shadow-lg',
      
      ghost: `${textColors.secondary} hover:text-neutral-900 dark:hover:text-secondary-100 hover:bg-neutral-100 dark:hover:bg-secondary-800 focus:ring-primary-300 dark:focus:ring-primary-700 hover:shadow-sm before:from-primary-500 before:to-primary-600`
    };

    const sizes = {
      xs: `px-2.5 py-1.5 ${typography.caption.medium} gap-1 min-h-[28px]`,
      sm: `px-3 py-2 ${typography.body.small} gap-1.5 min-h-[36px]`,
      md: `px-4 py-2.5 ${typography.body.medium} gap-2 min-h-[40px]`,
      lg: `px-6 py-3 ${typography.body.large} gap-2.5 min-h-[48px]`,
      xl: `px-8 py-4 ${typography.heading.h6} gap-3 min-h-[56px]`
    };

    const roundedStyles = {
      sm: 'rounded-md',
      md: 'rounded-lg',
      lg: 'rounded-xl',
      full: 'rounded-full'
    };

    const iconSizes = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4', 
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
      xl: 'h-6 w-6'
    };

    const LoadingSpinner = () => (
      <svg className={classNames('animate-spin', iconSizes[size])} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    );

    const renderContent = () => {
      if (loading) {
        return (
          <div className="flex items-center gap-2">
            <LoadingSpinner />
            <span className="animate-pulse">Loading...</span>
          </div>
        );
      }

      const iconElement = icon && (
        <span 
          className={classNames(
            'flex items-center transition-transform duration-200 group-hover:scale-110',
            iconSizes[size]
          )}
        >
          {icon}
        </span>
      );

      if (iconPosition === 'right') {
        return (
          <>
            <span className="transition-transform duration-200 group-hover:scale-105">{children}</span>
            {iconElement}
          </>
        );
      }

      return (
        <>
          {iconElement}
          <span className="transition-transform duration-200 group-hover:scale-105">{children}</span>
        </>
      );
    };

    return (
      <button
        ref={ref}
        className={classNames(
          baseStyles,
          variants[variant],
          sizes[size],
          roundedStyles[rounded],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {/* Ripple effect overlay */}
        <span className="absolute inset-0 overflow-hidden rounded-inherit">
          <span className="absolute inset-0 rounded-inherit bg-white opacity-0 transition-opacity duration-150 group-hover:opacity-10" />
        </span>
        
        {/* Button content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {renderContent()}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;