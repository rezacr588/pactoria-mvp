import React from 'react';
import { classNames } from '../../utils/classNames';
import { textStyles, textColors } from '../../utils/typography';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helpText, 
    options,
    placeholder,
    id,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseStyles = `block w-full rounded-lg border-neutral-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 ${textColors.primary} shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 dark:focus:ring-offset-secondary-900 sm:text-sm`;
    const errorStyles = 'border-danger-300 dark:border-danger-500 focus:border-danger-500 focus:ring-danger-500';

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className={`block ${textStyles.formLabel}`}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={classNames(
            baseStyles,
            error ? errorStyles : '',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className={textStyles.formError}>{error}</p>
        )}
        {helpText && !error && (
          <p className={textStyles.formHelpText}>{helpText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;