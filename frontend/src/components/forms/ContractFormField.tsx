import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface ContractFormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  tooltip?: string;
  showTooltip?: string | null;
  onTooltipClick?: (key: string) => void;
  children?: React.ReactNode; // For select options
  className?: string;
  'data-testid'?: string;
  min?: string;
  step?: string;
}

export function ContractFormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  helpText,
  tooltip,
  showTooltip,
  onTooltipClick,
  children,
  className = '',
  'data-testid': testId,
  ...props
}: ContractFormFieldProps) {
  const baseInputClasses = "form-input-lg";
  const errorClasses = error ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : '';

  const inputProps = {
    type,
    name,
    id: name,
    value,
    onChange,
    placeholder,
    className: `${baseInputClasses} ${errorClasses} ${className}`,
    'data-testid': testId,
    'aria-describedby': error ? `${name}-error` : helpText ? `${name}-help` : undefined,
    ...props,
  };

  return (
    <div>
      <label htmlFor={name} className="form-label">
        {label}
        {required && <span className="text-danger-500 ml-1">*</span>}
        {tooltip && onTooltipClick && (
          <button
            type="button"
            className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-secondary-300"
            onClick={() => onTooltipClick(name)}
          >
            <InformationCircleIcon className="h-4 w-4 inline" />
          </button>
        )}
      </label>

      {type === 'textarea' ? (
        <textarea {...(inputProps as any)} rows={4} />
      ) : type === 'select' ? (
        <select {...(inputProps as any)}>
          {children}
        </select>
      ) : (
        <input {...inputProps} />
      )}

      {error && (
        <div id={`${name}-error`} className="form-error">
          {error}
        </div>
      )}

      {helpText && (
        <div id={`${name}-help`} className="form-help">
          {helpText}
        </div>
      )}

      {tooltip && showTooltip === name && (
        <div className="form-help">
          {tooltip}
        </div>
      )}
    </div>
  );
}
