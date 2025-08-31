import React from 'react';
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { classNames } from '../../utils/classNames';
import { useState, useRef, useEffect } from 'react';

type ThemeOption = 'light' | 'dark' | 'system';

const themeOptions: { value: ThemeOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: ComputerDesktopIcon },
];

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ 
  variant = 'button',
  size = 'md',
  showLabel = false,
  className 
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' ? MoonIcon : SunIcon;
    }
    return theme === 'dark' ? MoonIcon : SunIcon;
  };

  const CurrentIcon = getCurrentIcon();

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={classNames(
          'relative rounded-xl transition-all duration-200',
          'bg-white dark:bg-secondary-800',
          'border border-neutral-200 dark:border-secondary-700',
          'text-neutral-700 dark:text-secondary-200',
          'hover:bg-neutral-50 dark:hover:bg-secondary-700',
          'hover:border-neutral-300 dark:hover:border-secondary-600',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-800',
          'shadow-sm hover:shadow-md',
          sizeClasses[size],
          className
        )}
        title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        <div className="relative">
          <CurrentIcon className={classNames('transition-all duration-300', iconSizes[size])} />
          {theme === 'system' && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <ComputerDesktopIcon className="h-2.5 w-2.5 text-neutral-500 dark:text-secondary-400" />
            </div>
          )}
        </div>
        {showLabel && (
          <span className="sr-only">
            Current theme: {theme}. Click to toggle.
          </span>
        )}
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className={classNames('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200',
          'bg-white dark:bg-secondary-800',
          'border border-neutral-200 dark:border-secondary-700',
          'text-neutral-700 dark:text-secondary-200',
          'hover:bg-neutral-50 dark:hover:bg-secondary-700',
          'hover:border-neutral-300 dark:hover:border-secondary-600',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-800',
          'shadow-sm hover:shadow-md',
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
        )}
      >
        <CurrentIcon className={iconSizes[size]} />
        {showLabel && (
          <span className="font-medium">
            {themeOptions.find(opt => opt.value === theme)?.label}
          </span>
        )}
        <ChevronDownIcon 
          className={classNames(
            'transition-transform duration-200',
            iconSizes[size],
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {isOpen && (
        <div className={classNames(
          'absolute right-0 mt-2 py-2 w-40 z-50',
          'bg-white dark:bg-secondary-800',
          'border border-neutral-200 dark:border-secondary-700',
          'rounded-xl shadow-strong',
          'ring-1 ring-black/5 dark:ring-white/5'
        )}>
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={classNames(
                  'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                  'hover:bg-neutral-50 dark:hover:bg-secondary-700',
                  isActive 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/20' 
                    : 'text-neutral-700 dark:text-secondary-200',
                  size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
                )}
              >
                <Icon className={classNames(
                  iconSizes[size],
                  isActive 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-neutral-500 dark:text-secondary-400'
                )} />
                <span className="font-medium">{option.label}</span>
                {isActive && (
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}