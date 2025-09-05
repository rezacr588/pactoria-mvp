// Enhanced error handling utilities for API integration

export interface ApiError {
  status: number;
  message: string;
  data?: any;
  name: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  detail: string | ValidationErrorDetail[];
  message?: string;
}

/**
 * Extract a user-friendly error message from API error response
 */
export function getErrorMessage(error: any): string {
  // Check if it's our ApiError type
  if (error && typeof error === 'object') {
    // Handle API error with data
    if (error.data?.detail) {
      const detail = error.data.detail;
      
      // Handle validation errors (array of field errors)
      if (Array.isArray(detail)) {
        return detail.map((err: ValidationErrorDetail) => 
          `${err.field}: ${err.message}`
        ).join(', ');
      }
      
      // Handle single error message
      if (typeof detail === 'string') {
        return detail;
      }
    }
    
    // Handle direct message
    if (error.message) {
      return error.message;
    }
    
    // Handle status-specific messages
    if (error.status) {
      switch (error.status) {
        case 400:
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Authentication required. Please log in and try again.';
        case 403:
          return 'Access denied. You don\'t have permission for this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          return 'This action conflicts with existing data.';
        case 422:
          return 'The submitted data is invalid.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'A server error occurred. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'The service is temporarily unavailable. Please try again later.';
        default:
          return `An error occurred (Status: ${error.status})`;
      }
    }
  }
  
  // Fallback for unknown error types
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Determine if an error is a network/connection error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.status === 0 || 
    error?.code === 'NETWORK_ERROR' ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.name === 'NetworkError'
  );
}

/**
 * Determine if an error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return error?.status === 401;
}

/**
 * Determine if an error is a validation error
 */
export function isValidationError(error: any): boolean {
  return error?.status === 422 || (
    error?.data?.detail && Array.isArray(error.data.detail)
  );
}

/**
 * Determine if an error is a permission error
 */
export function isPermissionError(error: any): boolean {
  return error?.status === 403;
}

/**
 * Get appropriate error color class for UI
 */
export function getErrorColorClass(error: any): string {
  if (isAuthError(error)) return 'text-yellow-600';
  if (isPermissionError(error)) return 'text-orange-600';
  if (isValidationError(error)) return 'text-blue-600';
  if (isNetworkError(error)) return 'text-purple-600';
  return 'text-red-600';
}

/**
 * Get appropriate error icon name for UI
 */
export function getErrorIconName(error: any): string {
  if (isAuthError(error)) return 'key';
  if (isPermissionError(error)) return 'shield-x';
  if (isValidationError(error)) return 'alert-circle';
  if (isNetworkError(error)) return 'wifi-off';
  return 'x-circle';
}

/**
 * Error logging utility for development and debugging
 */
export function logError(error: any, context: string = '') {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error ${context ? `in ${context}` : ''}`);
    console.error('Error object:', error);
    console.error('Error message:', getErrorMessage(error));
    console.error('Stack trace:', error?.stack);
    console.groupEnd();
  }
}

/**
 * Retry logic for failed API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry for client errors (4xx), only server errors (5xx) or network errors
      if (!isNetworkError(error) && (error as any)?.status && (error as any).status < 500) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError;
}

/**
 * Toast notification helper for errors
 */
export function createErrorToast(error: any, title: string = 'Error') {
  return {
    id: `error-${Date.now()}`,
    type: 'error' as const,
    title,
    message: getErrorMessage(error),
    duration: isNetworkError(error) ? 8000 : 5000, // Show network errors longer
    actions: isNetworkError(error) ? [
      {
        label: 'Retry',
        onClick: () => window.location.reload()
      }
    ] : undefined
  };
}

/**
 * Success toast helper
 */
export function createSuccessToast(message: string, title: string = 'Success') {
  return {
    id: `success-${Date.now()}`,
    type: 'success' as const,
    title,
    message,
    duration: 3000
  };
}

/**
 * Warning toast helper
 */
export function createWarningToast(message: string, title: string = 'Warning') {
  return {
    id: `warning-${Date.now()}`,
    type: 'warning' as const,
    title,
    message,
    duration: 4000
  };
}