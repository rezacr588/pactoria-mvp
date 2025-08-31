// Common text class replacements for consistent typography and dark mode support

export const textReplacements = {
  // Gray colors to neutral/secondary
  'text-gray-900': 'text-neutral-900 dark:text-secondary-100',
  'text-gray-800': 'text-neutral-800 dark:text-secondary-200', 
  'text-gray-700': 'text-neutral-700 dark:text-secondary-300',
  'text-gray-600': 'text-neutral-600 dark:text-secondary-300',
  'text-gray-500': 'text-neutral-500 dark:text-secondary-400',
  'text-gray-400': 'text-neutral-400 dark:text-secondary-500',

  // Hover states
  'hover:text-gray-900': 'hover:text-neutral-900 dark:hover:text-secondary-100',
  'hover:text-gray-700': 'hover:text-neutral-700 dark:hover:text-secondary-200',
  'hover:text-gray-600': 'hover:text-neutral-600 dark:hover:text-secondary-300',
  'hover:text-gray-500': 'hover:text-neutral-500 dark:hover:text-secondary-400',

  // Status colors
  'text-green-600': 'text-success-600 dark:text-success-400',
  'text-red-600': 'text-danger-600 dark:text-danger-400',
  'text-yellow-600': 'text-warning-600 dark:text-warning-400',
  'text-blue-600': 'text-blue-600 dark:text-blue-400',

  // Background colors for components
  'bg-gray-50': 'bg-neutral-50 dark:bg-secondary-800',
  'bg-gray-100': 'bg-neutral-100 dark:bg-secondary-800',
  'bg-gray-200': 'bg-neutral-200 dark:bg-secondary-700',
  'border-gray-200': 'border-neutral-200 dark:border-secondary-700',
  'border-gray-300': 'border-neutral-300 dark:border-secondary-600',

  // Interactive elements
  'text-primary-600': 'text-primary-600 dark:text-primary-400',
  'hover:text-primary-700': 'hover:text-primary-700 dark:hover:text-primary-300',
};

// Common patterns for specific UI elements
export const uiPatterns = {
  // Page headers
  pageTitle: 'text-3xl font-bold text-neutral-900 dark:text-secondary-100',
  pageSubtitle: 'text-lg text-neutral-600 dark:text-secondary-300',
  
  // Section headers
  sectionTitle: 'text-xl font-semibold text-neutral-900 dark:text-secondary-100',
  sectionSubtitle: 'text-sm text-neutral-500 dark:text-secondary-400',
  
  // Card content
  cardTitle: 'text-lg font-medium text-neutral-900 dark:text-secondary-100',
  cardDescription: 'text-sm text-neutral-500 dark:text-secondary-400',
  
  // Data display
  dataLabel: 'text-sm font-medium text-neutral-500 dark:text-secondary-400',
  dataValue: 'text-sm text-neutral-900 dark:text-secondary-100',
  
  // Form labels
  formLabel: 'text-sm font-medium text-neutral-700 dark:text-secondary-300',
  formHelp: 'text-sm text-neutral-500 dark:text-secondary-400',
  formError: 'text-sm text-danger-600 dark:text-danger-400',
  
  // Metadata
  timestamp: 'text-xs text-neutral-400 dark:text-secondary-500',
  metadata: 'text-sm text-neutral-500 dark:text-secondary-400',
  
  // Interactive
  link: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300',
  
  // Status
  statusSuccess: 'text-success-600 dark:text-success-400',
  statusWarning: 'text-warning-600 dark:text-warning-400',  
  statusDanger: 'text-danger-600 dark:text-danger-400',
  
  // Empty states
  emptyTitle: 'text-sm font-medium text-neutral-900 dark:text-secondary-100',
  emptyDescription: 'text-sm text-neutral-500 dark:text-secondary-400',
};

export function replaceTextClasses(className: string): string {
  let result = className;
  
  Object.entries(textReplacements).forEach(([oldClass, newClass]) => {
    result = result.replace(new RegExp(`\\b${oldClass}\\b`, 'g'), newClass);
  });
  
  return result;
}