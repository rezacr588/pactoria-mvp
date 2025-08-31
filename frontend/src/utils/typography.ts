// Typography utility classes following our design system

// Text Colors - Primary Content
export const textColors = {
  // Primary text
  primary: 'text-neutral-900 dark:text-secondary-100',
  
  // Secondary text
  secondary: 'text-neutral-600 dark:text-secondary-300',
  
  // Muted/disabled text
  muted: 'text-neutral-500 dark:text-secondary-400',
  
  // Subtle text (captions, timestamps)
  subtle: 'text-neutral-400 dark:text-secondary-500',
  
  // Interactive elements
  interactive: 'text-primary-600 dark:text-primary-400',
  interactiveHover: 'hover:text-primary-700 dark:hover:text-primary-300',
  
  // Status colors
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  danger: 'text-danger-600 dark:text-danger-400',
  info: 'text-blue-600 dark:text-blue-400',
  
  // Special contexts
  onPrimary: 'text-white',
  onDark: 'text-white',
  placeholder: 'placeholder-neutral-500 dark:placeholder-secondary-400'
};

// Typography Scale
export const typography = {
  // Display text (hero sections, main headings)
  display: {
    large: 'text-4xl sm:text-5xl font-bold tracking-tight',
    medium: 'text-3xl sm:text-4xl font-bold tracking-tight',
    small: 'text-2xl sm:text-3xl font-bold tracking-tight'
  },
  
  // Headings
  heading: {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-bold', 
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-semibold',
    h5: 'text-base font-semibold',
    h6: 'text-sm font-semibold'
  },
  
  // Body text
  body: {
    large: 'text-lg',
    medium: 'text-base',
    small: 'text-sm'
  },
  
  // Caption text
  caption: {
    large: 'text-sm',
    medium: 'text-xs',
    small: 'text-xs'
  },
  
  // Labels
  label: {
    large: 'text-sm font-medium',
    medium: 'text-sm font-medium',
    small: 'text-xs font-medium'
  },
  
  // Code text
  code: {
    inline: 'font-mono text-sm',
    block: 'font-mono text-sm'
  }
};

// Pre-built combinations for common use cases
export const textStyles = {
  // Page headers
  pageTitle: `${typography.heading.h1} ${textColors.primary}`,
  pageSubtitle: `${typography.body.large} ${textColors.secondary}`,
  
  // Section headers
  sectionTitle: `${typography.heading.h2} ${textColors.primary}`,
  sectionSubtitle: `${typography.body.medium} ${textColors.secondary}`,
  
  // Card headers
  cardTitle: `${typography.heading.h3} ${textColors.primary}`,
  cardSubtitle: `${typography.body.small} ${textColors.muted}`,
  
  // Form elements
  formLabel: `${typography.label.medium} ${textColors.primary}`,
  formHelpText: `${typography.body.small} ${textColors.muted}`,
  formError: `${typography.body.small} ${textColors.danger}`,
  
  // Data display
  dataLabel: `${typography.label.small} ${textColors.muted}`,
  dataValue: `${typography.body.medium} ${textColors.primary}`,
  
  // Navigation
  navItem: `${typography.body.medium} ${textColors.secondary}`,
  navItemActive: `${typography.body.medium} ${textColors.primary}`,
  
  // Status and badges
  statusText: `${typography.caption.medium} font-medium`,
  
  // Interactive elements
  link: `${textColors.interactive} ${textColors.interactiveHover}`,
  button: `font-medium`,
  
  // Timestamps and metadata
  timestamp: `${typography.caption.small} ${textColors.subtle}`,
  metadata: `${typography.caption.medium} ${textColors.muted}`
};

// Helper function to combine classes
export function tw(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}