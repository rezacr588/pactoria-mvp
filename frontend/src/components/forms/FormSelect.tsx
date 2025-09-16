// Consistent Form Select Component
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';
import FormField from './FormField';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function FormSelect({
  label,
  error,
  hint,
  required = false,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  disabled = false,
  className,
  size = 'md'
}: FormSelectProps) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const selectElement = (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={classNames(
          'block w-full rounded-md border-neutral-300 dark:border-secondary-600',
          'bg-white dark:bg-secondary-800',
          'text-neutral-900 dark:text-secondary-100',
          'shadow-sm focus:border-primary-500 focus:ring-primary-500',
          'disabled:bg-neutral-50 dark:disabled:bg-secondary-900',
          'disabled:text-neutral-500 dark:disabled:text-secondary-500',
          'disabled:cursor-not-allowed',
          'appearance-none pr-10',
          sizes[size],
          error && 'border-danger-300 focus:border-danger-500 focus:ring-danger-500',
          className
        )}
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
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <ChevronDownIcon className="h-5 w-5 text-neutral-400" />
      </div>
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
      {selectElement}
    </FormField>
  );
}
