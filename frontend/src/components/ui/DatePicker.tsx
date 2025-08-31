import { useState, useRef, useEffect } from 'react';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';

export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  format?: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base'
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  error,
  label,
  required = false,
  minDate,
  maxDate,
  className,
  size = 'md',
  format = 'dd/mm/yyyy'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value.getFullYear(), value.getMonth()) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    switch (format) {
      case 'mm/dd/yyyy':
        return `${month}/${day}/${year}`;
      case 'yyyy-mm-dd':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  };

  const handleDateSelect = (date: Date) => {
    onChange?.(date);
    setIsOpen(false);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Helper function for future month/year navigation
  // const handleMonthYearChange = (monthOffset: number) => {
  //   setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset));
  // };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDateSelected = (date: Date): boolean => {
    if (!value) return false;
    return (
      date.getDate() === value.getDate() &&
      date.getMonth() === value.getMonth() &&
      date.getFullYear() === value.getFullYear()
    );
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getDaysInMonth = (): (Date | null)[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    // const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: (Date | null)[] = [];
    const totalDays = 42; // 6 rows × 7 days

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      if (date.getMonth() === month) {
        days.push(date);
      } else {
        days.push(null);
      }
    }

    return days;
  };

  const days = getDaysInMonth();

  return (
    <div ref={containerRef} className={classNames('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={formatDate(value ?? null)}
          onClick={handleInputClick}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={classNames(
            'w-full border rounded-xl transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400',
            sizeClasses[size],
            disabled
              ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed border-neutral-200'
              : error
              ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-100'
              : 'border-neutral-200 hover:border-neutral-300 bg-white'
          )}
        />
        <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 pointer-events-none" />
      </div>

      {error && (
        <p className="mt-2 text-sm text-danger-600">{error}</p>
      )}

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-strong p-6 min-w-[320px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              type="button"
            >
              <ChevronLeftIcon className="h-5 w-5 text-neutral-600" />
            </button>
            
            <div className="flex-1 text-center">
              <h3 className="text-lg font-semibold text-neutral-800">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              type="button"
            >
              <ChevronRightIcon className="h-5 w-5 text-neutral-600" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="h-10 flex items-center justify-center text-sm font-medium text-neutral-600"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) {
                return <div key={index} className="h-10" />;
              }

              const disabled = isDateDisabled(date);
              const selected = isDateSelected(date);
              const today = isToday(date);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => !disabled && handleDateSelect(date)}
                  disabled={disabled}
                  className={classNames(
                    'h-10 w-10 flex items-center justify-center text-sm rounded-xl transition-all duration-150 font-medium',
                    disabled
                      ? 'text-neutral-300 cursor-not-allowed'
                      : selected
                      ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
                      : today
                      ? 'bg-primary-50 text-primary-700 border-2 border-primary-200 hover:bg-primary-100'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-100">
            <button
              onClick={() => handleDateSelect(new Date())}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              type="button"
            >
              Today
            </button>
            <button
              onClick={() => {
                onChange?.(null);
                setIsOpen(false);
              }}
              className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Date Range Picker Component
export interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onChange?: (startDate: Date | null, endDate: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  format?: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = 'Select date range',
  disabled = false,
  error,
  label,
  required = false,
  minDate,
  maxDate,
  className,
  size = 'md',
  format = 'dd/mm/yyyy'
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectingStart, setSelectingStart] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectingStart(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    switch (format) {
      case 'mm/dd/yyyy':
        return `${month}/${day}/${year}`;
      case 'yyyy-mm-dd':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  };

  const getDisplayValue = (): string => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    if (startDate && selectingStart === false) {
      return `${formatDate(startDate)} - Select end date`;
    }
    return '';
  };

  const handleDateSelect = (date: Date) => {
    if (selectingStart || !startDate) {
      onChange?.(date, null);
      setSelectingStart(false);
    } else {
      if (date >= startDate) {
        onChange?.(startDate, date);
        setIsOpen(false);
        setSelectingStart(true);
      } else {
        onChange?.(date, null);
        setSelectingStart(false);
      }
    }
  };

  return (
    <div ref={containerRef} className={classNames('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={getDisplayValue()}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={classNames(
            'w-full border rounded-xl transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400',
            sizeClasses[size],
            disabled
              ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed border-neutral-200'
              : error
              ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-100'
              : 'border-neutral-200 hover:border-neutral-300 bg-white'
          )}
        />
        <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 pointer-events-none" />
      </div>

      {error && (
        <p className="mt-2 text-sm text-danger-600">{error}</p>
      )}

      {/* Calendar Dropdown - Similar to DatePicker but with range selection logic */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-strong p-6 min-w-[320px]">
          <div className="text-sm text-neutral-600 mb-4 text-center">
            {selectingStart ? 'Select start date' : 'Select end date'}
          </div>
          <DatePicker
            value={selectingStart ? (startDate ?? null) : (endDate ?? null)}
            onChange={(date) => date && handleDateSelect(date)}
            minDate={minDate}
            maxDate={maxDate}
            format={format}
          />
        </div>
      )}
    </div>
  );
}