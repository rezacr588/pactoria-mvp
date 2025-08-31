import React from 'react';
import { classNames } from '../../utils/classNames';
import Input, { InputProps } from './Input';
import Textarea from './Textarea';
import Select from './Select';

export interface FormFieldProps extends Omit<InputProps, 'onChange' | 'onBlur'> {
  name: string;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'textarea' | 'select';
  value: any;
  error?: string;
  touched?: boolean;
  dirty?: boolean;
  helpText?: string;
  required?: boolean;
  showValidation?: boolean;
  validationDelay?: boolean;
  options?: Array<{ label: string; value: string | number }>;
  rows?: number;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  children?: React.ReactNode; // For select options
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  value,
  error,
  touched = false,
  dirty = false,
  helpText,
  required = false,
  showValidation = true,
  validationDelay = false,
  options = [],
  rows = 4,
  onChange,
  onBlur,
  children,
  className,
  disabled,
  placeholder,
  ...props
}) => {
  const hasError = touched && error;
  const showSuccess = touched && !error && dirty && showValidation;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    onChange?.(newValue);
  };

  const handleBlur = () => {
    onBlur?.();
  };

  const renderField = () => {
    const commonProps = {
      id: name,
      name,
      value: value || '',
      onChange: handleChange,
      onBlur: handleBlur,
      disabled,
      placeholder,
      required,
      'aria-describedby': error ? `${name}-error` : helpText ? `${name}-help` : undefined,
      'aria-invalid': hasError ? true : undefined,
      ...props,
    };

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={rows}
            error={hasError ? error : undefined}
            success={showSuccess}
          />
        );

      case 'select':
        return (
          <Select
            {...commonProps}
            error={hasError ? error : undefined}
            success={showSuccess}
          >
            {children || options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      default:
        return (
          <Input
            {...commonProps}
            type={type}
            error={hasError ? error : undefined}
            success={showSuccess}
            loading={validationDelay && dirty && !touched}
          />
        );
    }
  };

  return (
    <div className={classNames('space-y-1', className)}>
      {label && (
        <label 
          htmlFor={name}
          className={classNames(
            'block text-sm font-medium transition-colors',
            hasError ? 'text-danger-700 dark:text-danger-400' 
            : showSuccess ? 'text-success-700 dark:text-success-400'
            : 'text-neutral-700 dark:text-secondary-300',
            disabled && 'text-neutral-400 dark:text-secondary-600'
          )}
        >
          {label}
          {required && (
            <span className="text-danger-500 dark:text-danger-400 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      {renderField()}
      
      {/* Error Message */}
      {hasError && (
        <div 
          id={`${name}-error`}
          className="flex items-start space-x-2 text-sm text-danger-600 dark:text-danger-400 animate-slide-in-down"
          role="alert"
          aria-live="polite"
        >
          <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center space-x-2 text-sm text-success-600 dark:text-success-400 animate-slide-in-down">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Looks good!</span>
        </div>
      )}
      
      {/* Help Text */}
      {helpText && !hasError && !showSuccess && (
        <p 
          id={`${name}-help`}
          className="text-sm text-neutral-500 dark:text-secondary-400"
        >
          {helpText}
        </p>
      )}
    </div>
  );
};

// Specialized form fields for common use cases
export const EmailField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="email" />
);

export const PasswordField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="password" />
);

export const NumberField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="number" />
);

export const TextareaField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="textarea" />
);

export const SelectField: React.FC<Omit<FormFieldProps, 'type'>> = (props) => (
  <FormField {...props} type="select" />
);

export default FormField;