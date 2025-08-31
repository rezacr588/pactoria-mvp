import React from 'react';
import { classNames } from '../../utils/classNames';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass' | 'gradient';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
  hover?: boolean;
  interactive?: boolean;
  loading?: boolean;
  pulse?: boolean;
  glow?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant = 'default', 
    padding = 'md', 
    hover = false,
    interactive = false,
    loading = false,
    pulse = false,
    glow = false,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = classNames(
      'rounded-2xl relative overflow-hidden',
      'transition-all duration-300 ease-out transform-gpu',
      loading && 'pointer-events-none',
      pulse && 'animate-pulse',
      glow && 'ring-1 ring-primary-200 dark:ring-primary-800',
      (hover || interactive) && 'group cursor-pointer',
      !loading && 'hover:scale-[1.01] active:scale-[0.99]'
    );
    
    const variants = {
      default: 'bg-white dark:bg-secondary-900',
      
      bordered: classNames(
        'bg-white dark:bg-secondary-900',
        'border border-neutral-200 dark:border-secondary-700',
        'hover:border-neutral-300 dark:hover:border-secondary-600',
        'hover:shadow-sm dark:hover:shadow-secondary-950/20'
      ),
      
      elevated: classNames(
        'bg-white dark:bg-secondary-900',
        'shadow-soft hover:shadow-medium dark:shadow-secondary-950/40',
        'ring-1 ring-neutral-100 dark:ring-secondary-800',
        'hover:ring-neutral-200 dark:hover:ring-secondary-700'
      ),
      
      glass: classNames(
        'bg-white/80 dark:bg-secondary-900/80',
        'backdrop-blur-lg border border-white/20 dark:border-secondary-700/20',
        'shadow-soft hover:shadow-medium',
        'hover:bg-white/90 dark:hover:bg-secondary-900/90'
      ),

      gradient: classNames(
        'bg-gradient-to-br from-white via-white to-neutral-50',
        'dark:from-secondary-900 dark:via-secondary-900 dark:to-secondary-800',
        'border border-neutral-200/50 dark:border-secondary-700/50',
        'shadow-soft hover:shadow-medium',
        'hover:from-neutral-50 hover:via-white hover:to-white',
        'dark:hover:from-secondary-800 dark:hover:via-secondary-900 dark:hover:to-secondary-900'
      )
    };

    const paddings = {
      none: '',
      xs: 'p-3',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10'
    };

    return (
      <div
        ref={ref}
        className={classNames(
          baseStyles,
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {/* Shimmer effect for loading */}
        {loading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-secondary-700/20 animate-shimmer" />
        )}
        
        {/* Hover glow effect */}
        {(hover || interactive) && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

// Sub-components
export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <div className={classNames('pb-5 mb-6 border-b border-neutral-200 dark:border-secondary-700', className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <h3 className={classNames('text-xl font-bold text-neutral-900 dark:text-secondary-100 tracking-tight', className)}>
    {children}
  </h3>
);

export const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => (
  <div className={classNames('', className)}>
    {children}
  </div>
);

export default Card;