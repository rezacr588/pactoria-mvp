// Export the main ErrorBoundary component and related utilities
export { ErrorBoundary } from './ErrorBoundary';
export { useErrorHandler } from './hooks';
export { withErrorBoundary } from './withErrorBoundary';
export type { ErrorBoundaryProps, ErrorBoundaryState, ErrorLevelConfig } from './types';

// Default export for backwards compatibility
export { ErrorBoundary as default } from './ErrorBoundary';