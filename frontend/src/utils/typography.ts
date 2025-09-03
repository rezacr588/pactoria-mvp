// Typography utility classes following our design system

// Text Colors - Comprehensive semantic color system
export const textColors = {
  // Primary text hierarchy
  primary: 'text-neutral-900 dark:text-secondary-100',
  secondary: 'text-neutral-600 dark:text-secondary-300',
  muted: 'text-neutral-500 dark:text-secondary-400',
  subtle: 'text-neutral-400 dark:text-secondary-500',
  disabled: 'text-neutral-300 dark:text-secondary-600',
  
  // Interactive elements
  interactive: 'text-primary-600 dark:text-primary-400',
  interactiveHover: 'hover:text-primary-700 dark:hover:text-primary-300',
  interactivePressed: 'active:text-primary-800 dark:active:text-primary-200',
  
  // Status colors with proper contrast
  success: 'text-success-600 dark:text-success-400',
  successMuted: 'text-success-500 dark:text-success-500',
  warning: 'text-warning-600 dark:text-warning-400',
  warningMuted: 'text-warning-500 dark:text-warning-500',
  danger: 'text-danger-600 dark:text-danger-400',
  dangerMuted: 'text-danger-500 dark:text-danger-500',
  info: 'text-primary-600 dark:text-primary-400',
  infoMuted: 'text-primary-500 dark:text-primary-500',
  
  // Special contexts
  onPrimary: 'text-white dark:text-white',
  onSecondary: 'text-secondary-900 dark:text-secondary-100',
  onSuccess: 'text-white dark:text-white',
  onWarning: 'text-warning-900 dark:text-warning-100',
  onDanger: 'text-white dark:text-white',
  onDark: 'text-white dark:text-white',
  
  // Form elements
  placeholder: 'placeholder-neutral-400 dark:placeholder-secondary-500',
  placeholderMuted: 'placeholder-neutral-300 dark:placeholder-secondary-600',
  
  // Inverse colors for dark backgrounds
  inverse: 'text-white dark:text-secondary-900',
  inverseMuted: 'text-neutral-200 dark:text-secondary-700',
};

// Typography Scale
export const typography = {
  // Display text (hero sections, main headings)
  display: {
    large: 'text-4xl sm:text-5xl font-bold tracking-tight leading-tight',
    medium: 'text-3xl sm:text-4xl font-bold tracking-tight leading-tight',
    small: 'text-2xl sm:text-3xl font-bold tracking-tight leading-tight'
  },
  
  // Headings
  heading: {
    h1: 'text-3xl font-bold leading-tight tracking-tight',
    h2: 'text-2xl font-bold leading-tight tracking-tight', 
    h3: 'text-xl font-semibold leading-snug tracking-tight',
    h4: 'text-lg font-semibold leading-snug',
    h5: 'text-base font-semibold leading-snug',
    h6: 'text-sm font-semibold leading-normal'
  },
  
  // Body text
  body: {
    large: 'text-lg leading-relaxed',
    medium: 'text-base leading-normal',
    small: 'text-sm leading-normal'
  },
  
  // Caption text
  caption: {
    large: 'text-sm leading-normal',
    medium: 'text-xs leading-normal',
    small: 'text-xs leading-tight'
  },
  
  // Labels
  label: {
    large: 'text-sm font-medium leading-normal',
    medium: 'text-sm font-medium leading-normal',
    small: 'text-xs font-medium leading-normal'
  },
  
  // Code text
  code: {
    inline: 'font-mono text-sm leading-normal',
    block: 'font-mono text-sm leading-relaxed'
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
  
  // List item headers
  listTitle: `${typography.heading.h4} ${textColors.primary}`,
  listSubtitle: `${typography.body.small} ${textColors.secondary}`,
  
  // Form elements
  formLabel: `${typography.label.medium} ${textColors.primary}`,
  formHelpText: `${typography.body.small} ${textColors.muted}`,
  formError: `${typography.body.small} ${textColors.danger}`,
  formSuccess: `${typography.body.small} ${textColors.success}`,
  formWarning: `${typography.body.small} ${textColors.warning}`,
  
  // Data display
  dataLabel: `${typography.label.small} ${textColors.muted}`,
  dataValue: `${typography.body.medium} ${textColors.primary}`,
  dataLarge: `${typography.body.large} ${textColors.primary}`,
  
  // Navigation
  navItem: `${typography.body.medium} ${textColors.secondary}`,
  navItemActive: `${typography.body.medium} ${textColors.primary}`,
  navItemHover: `${typography.body.medium} ${textColors.interactive} ${textColors.interactiveHover}`,
  
  // Status and badges
  statusText: `${typography.caption.medium} font-medium`,
  badgeText: `${typography.caption.small} font-medium`,
  
  // Interactive elements
  link: `${textColors.interactive} ${textColors.interactiveHover} ${textColors.interactivePressed}`,
  linkMuted: `${textColors.secondary} ${textColors.interactiveHover}`,
  button: `font-medium`,
  
  // Content text
  bodyText: `${typography.body.medium} ${textColors.primary}`,
  bodyTextSecondary: `${typography.body.medium} ${textColors.secondary}`,
  captionText: `${typography.caption.medium} ${textColors.muted}`,
  
  // Empty states
  emptyStateTitle: `${typography.heading.h3} ${textColors.primary}`,
  emptyStateDescription: `${typography.body.medium} ${textColors.secondary}`,
  
  // Timestamps and metadata
  timestamp: `${typography.caption.small} ${textColors.subtle}`,
  metadata: `${typography.caption.medium} ${textColors.muted}`,
  metadataLarge: `${typography.body.small} ${textColors.muted}`,
  
  // Loading and placeholder text
  placeholder: `${typography.body.medium} ${textColors.muted}`,
  skeletonText: `${typography.body.medium} animate-pulse`,
};

// Helper function to combine classes
export function tw(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Responsive text scales for better mobile/desktop experience
export const responsiveText = {
  hero: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl',
  title: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
  subtitle: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
  body: 'text-sm sm:text-base md:text-lg',
  caption: 'text-xs sm:text-sm md:text-base'
};

// Mobile-first accessibility improvements
export const accessibleText = {
  minContrast: {
    light: 'text-neutral-800 dark:text-neutral-200',
    medium: 'text-neutral-700 dark:text-neutral-300',
    low: 'text-neutral-600 dark:text-neutral-400'
  },
  focusVisible: 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
  screenReader: 'sr-only'
};