import React from 'react';
import { classNames } from '../../utils/classNames';

interface ToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ 
    id,
    checked, 
    onChange, 
    disabled = false,
    label,
    description,
    className,
    size = 'md',
    ...props 
  }, ref) => {
    const sizeClasses = {
      sm: {
        switch: 'w-8 h-5',
        dot: 'w-3 h-3',
        translate: 'translate-x-3'
      },
      md: {
        switch: 'w-11 h-6',
        dot: 'w-4 h-4',
        translate: 'translate-x-5'
      },
      lg: {
        switch: 'w-14 h-7',
        dot: 'w-5 h-5',
        translate: 'translate-x-7'
      }
    };

    const currentSize = sizeClasses[size];

    const handleClick = () => {
      if (!disabled) {
        onChange(!checked);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div className={classNames('flex items-start space-x-3', className)}>
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={description ? `${id}-description` : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={classNames(
            'relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900',
            currentSize.switch,
            checked 
              ? 'bg-primary-600 dark:bg-primary-500' 
              : 'bg-neutral-200 dark:bg-secondary-600',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer'
          )}
          {...props}
        >
          <span className="sr-only">{label || 'Toggle'}</span>
          <span
            className={classNames(
              'pointer-events-none inline-block rounded-full bg-white dark:bg-secondary-100 shadow-sm ring-0 transition duration-200 ease-in-out transform',
              currentSize.dot,
              checked ? currentSize.translate : 'translate-x-0'
            )}
          />
        </button>
        
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label 
                htmlFor={id}
                className="text-sm font-medium text-neutral-900 dark:text-secondary-100 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p 
                id={`${id}-description`}
                className="text-sm text-neutral-500 dark:text-secondary-400"
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;