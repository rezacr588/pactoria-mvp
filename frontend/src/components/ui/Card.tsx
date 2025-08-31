import React from 'react';
import { classNames } from '../../utils/classNames';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', hover = false, children, ...props }, ref) => {
    const baseStyles = 'rounded-2xl transition-all duration-200';
    
    const variants = {
      default: 'bg-white dark:bg-secondary-900',
      bordered: 'bg-white dark:bg-secondary-900 border border-neutral-200 dark:border-secondary-700 hover:border-neutral-300 dark:hover:border-secondary-600',
      elevated: 'bg-white dark:bg-secondary-900 shadow-soft hover:shadow-medium dark:shadow-secondary-950/40 ring-1 ring-neutral-100 dark:ring-secondary-800',
      glass: 'bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border border-white/20 dark:border-secondary-700/20 shadow-soft'
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10'
    };

    const hoverStyles = hover ? 'hover:scale-[1.01] hover:shadow-medium cursor-pointer' : '';

    return (
      <div
        ref={ref}
        className={classNames(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
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