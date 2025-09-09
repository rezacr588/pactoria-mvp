// Consistent Form Input Component
import React from 'react';
import { classNames } from '../../utils/classNames';
import FormField from './FormField';

export interface FormInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  onRightIconClick?: () => void;
}

export default function FormInput({
  label,
  error,
  hint,
  required = false,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  className,
  size = 'md',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconClick
}: FormInputProps) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const inputElement = (
    <div className="relative">
      {LeftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <LeftIcon className="h-5 w-5 text-neutral-400" />
        </div>
      )}
      
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={classNames(
          'block w-full rounded-md border-neutral-300 dark:border-secondary-600',
          'bg-white dark:bg-secondary-800',
          'text-neutral-900 dark:text-secondary-100',
          'placeholder-neutral-500 dark:placeholder-secondary-400',
          'shadow-sm focus:border-primary-500 focus:ring-primary-500',
          'disabled:bg-neutral-50 dark:disabled:bg-secondary-900',
          'disabled:text-neutral-500 dark:disabled:text-secondary-500',
          'disabled:cursor-not-allowed',
          sizes[size],
          LeftIcon && 'pl-10',
          RightIcon && 'pr-10',
          error && 'border-danger-300 focus:border-danger-500 focus:ring-danger-500',
          className
        )}
      />
      
      {RightIcon && (
        <div className={classNames(
          'absolute inset-y-0 right-0 pr-3 flex items-center',
          onRightIconClick ? 'cursor-pointer' : 'pointer-events-none'
        )}
        onClick={onRightIconClick}>
          <RightIcon className="h-5 w-5 text-neutral-400" />
        </div>
      )}
    </div>
  );

  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      {inputElement}
    </FormField>
  );
}
