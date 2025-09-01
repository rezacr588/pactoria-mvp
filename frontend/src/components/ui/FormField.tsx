import React from 'react';
import { classNames } from '../../utils/classNames';
import { textColors, textStyles } from '../../utils/typography';
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
  options?: Array<{ label: string; value: string }>;
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
  className,
  disabled,
  placeholder,
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
    const baseProps = {
      id: name,
      name,
      value: value || '',
      onBlur: handleBlur,
      disabled,
      placeholder,
      required,
      'aria-describedby': error ? `${name}-error` : helpText ? `${name}-help` : undefined,
      'aria-invalid': hasError ? true : undefined,
    };

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...baseProps}
            onChange={handleChange}
            rows={rows}
            className={hasError ? 'border-danger-300 dark:border-danger-600' : showSuccess ? 'border-success-300 dark:border-success-600' : ''}
          />
        );

      case 'select':
        return (
          <Select
            {...baseProps}
            onChange={handleChange}
            options={options}
            className={hasError ? 'border-danger-300 dark:border-danger-600' : showSuccess ? 'border-success-300 dark:border-success-600' : ''}
          />
        );

      default:
        return (
          <Input
            {...baseProps}
            onChange={handleChange}
            type={type}
            error={hasError ? error : undefined}
            success={showSuccess}
            loading={validationDelay && dirty && !touched}
          />
        );
    }
  };

  return (
    <div className={classNames('space-y-2', className)}>
      {label && (
        <label 
          htmlFor={name}
          className={classNames(
            'block transition-colors',
            textStyles.formLabel,
            hasError ? textColors.danger 
            : showSuccess ? textColors.success
            : textColors.primary,
            disabled && textColors.disabled
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
          className={`flex items-start space-x-2 ${textStyles.formError} animate-slide-in-down`}
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
        <div className={`flex items-center space-x-2 ${textStyles.formSuccess} animate-slide-in-down`}>
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
          className={textStyles.formHelpText}
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