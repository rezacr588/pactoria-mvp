/**
 * Error Handling Service
 * Centralized error handling with user-friendly messages and automatic recovery
 */

import { env } from '../config/env';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  context?: any;
  stack?: string;
  canRetry: boolean;
  retryDelay?: number;
}

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  showUserNotifications: boolean;
  autoRetryEnabled: boolean;
  maxRetryAttempts: number;
}

export type ErrorHandler = (error: AppError) => void;

class ErrorHandlingService {
  private config: ErrorHandlerConfig;
  private errorHandlers: ErrorHandler[] = [];
  private errorCounts = new Map<string, number>();
  private readonly ERROR_THRESHOLD = 5; // Max errors of same type per session

  constructor() {
    this.config = {
      enableLogging: env.get('DEBUG_API_CALLS'),
      enableReporting: env.isProduction(),
      showUserNotifications: true,
      autoRetryEnabled: true,
      maxRetryAttempts: env.get('ERROR_RETRY_ATTEMPTS')
    };

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  /**
   * Handle any error and convert to standardized format
   */
  handleError(error: any, context?: any): AppError {
    const appError = this.normalizeError(error, context);
    
    // Track error frequency
    this.trackError(appError);
    
    // Log error if enabled
    if (this.config.enableLogging) {
      this.logError(appError);
    }

    // Notify handlers
    this.notifyHandlers(appError);

    // Report to monitoring service if enabled
    if (this.config.enableReporting && appError.severity === 'high' || appError.severity === 'critical') {
      this.reportError(appError);
    }

    return appError;
  }

  /**
   * Handle API errors specifically
   */
  handleApiError(error: any, endpoint?: string): AppError {
    const context = { 
      type: 'api_error',
      endpoint,
      timestamp: Date.now()
    };

    // Determine if this is a connection issue
    const isConnectionError = !error.status || error.status === 0 || error.status >= 500;
    
    const appError: AppError = {
      code: this.getErrorCode(error),
      message: error.message || 'An error occurred',
      userMessage: this.getUserFriendlyMessage(error),
      severity: this.getErrorSeverity(error),
      timestamp: Date.now(),
      context: { ...context, originalError: error },
      canRetry: isConnectionError || error.status === 408 || error.status === 429,
      retryDelay: this.getRetryDelay(error)
    };

    return this.handleError(appError);
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: any): AppError {
    const appError: AppError = {
      code: 'AUTH_ERROR',
      message: error.message || 'Authentication failed',
      userMessage: 'Please log in again to continue',
      severity: 'high',
      timestamp: Date.now(),
      context: { type: 'auth_error', originalError: error },
      canRetry: false
    };

    return this.handleError(appError);
  }

  /**
   * Handle network connectivity errors
   */
  handleNetworkError(error: any): AppError {
    const appError: AppError = {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      userMessage: 'Please check your internet connection and try again',
      severity: 'medium',
      timestamp: Date.now(),
      context: { type: 'network_error', originalError: error },
      canRetry: true,
      retryDelay: 5000
    };

    return this.handleError(appError);
  }

  /**
   * Handle validation errors
   */
  handleValidationError(error: any, field?: string): AppError {
    const appError: AppError = {
      code: 'VALIDATION_ERROR',
      message: error.message || 'Validation failed',
      userMessage: this.getValidationMessage(error, field),
      severity: 'low',
      timestamp: Date.now(),
      context: { type: 'validation_error', field, originalError: error },
      canRetry: false
    };

    return this.handleError(appError);
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Create user notification for error
   */
  createNotification(error: AppError): {
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    actions?: Array<{ label: string; action: () => void }>;
  } {
    const type: "error" | "warning" | "info" = error.severity === 'critical' || error.severity === 'high' ? 'error' : 
                 error.severity === 'medium' ? 'warning' : 'info';

    const notification = {
      type,
      title: this.getErrorTitle(error),
      message: error.userMessage,
      actions: [] as Array<{ label: string; action: () => void }>
    };

    // Add retry action if applicable
    if (error.canRetry) {
      notification.actions.push({
        label: 'Retry',
        action: () => {
          // This would trigger a retry of the failed operation
          console.log('Retrying operation...');
        }
      });
    }

    return notification;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = Array.from(this.errorCounts.entries()).map(([code, count]) => ({
      code,
      count,
      lastOccurred: Date.now() // This would be tracked properly in a real implementation
    }));

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByType: stats,
      sessionStartTime: Date.now() // This would be tracked properly
    };
  }

  /**
   * Clear error statistics
   */
  clearErrorStats(): void {
    this.errorCounts.clear();
  }

  /**
   * Private helper methods
   */
  private normalizeError(error: any, context?: any): AppError {
    if (this.isAppError(error)) {
      return { ...error, context: { ...error.context, ...context } };
    }

    // Convert various error types to AppError
    if (error instanceof Error) {
      return {
        code: error.name || 'UNKNOWN_ERROR',
        message: error.message,
        userMessage: 'An unexpected error occurred',
        severity: 'medium',
        timestamp: Date.now(),
        context,
        stack: error.stack,
        canRetry: false
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        code: 'STRING_ERROR',
        message: error,
        userMessage: error,
        severity: 'low',
        timestamp: Date.now(),
        context,
        canRetry: false
      };
    }

    // Handle object errors (like from API)
    if (typeof error === 'object' && error !== null) {
      return {
        code: error.code || error.type || 'OBJECT_ERROR',
        message: error.message || error.detail || 'Unknown error',
        userMessage: this.getUserFriendlyMessage(error),
        severity: this.getErrorSeverity(error),
        timestamp: Date.now(),
        context: { ...context, originalError: error },
        canRetry: false
      };
    }

    // Fallback for unknown error types
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      userMessage: 'An unexpected error occurred',
      severity: 'medium',
      timestamp: Date.now(),
      context,
      canRetry: false
    };
  }

  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 
           'code' in error && 'message' in error && 'userMessage' in error;
  }

  private getErrorCode(error: any): string {
    if (error.status) {
      switch (error.status) {
        case 400: return 'BAD_REQUEST';
        case 401: return 'UNAUTHORIZED';
        case 403: return 'FORBIDDEN';
        case 404: return 'NOT_FOUND';
        case 408: return 'REQUEST_TIMEOUT';
        case 429: return 'RATE_LIMITED';
        case 500: return 'SERVER_ERROR';
        case 502: return 'BAD_GATEWAY';
        case 503: return 'SERVICE_UNAVAILABLE';
        case 504: return 'GATEWAY_TIMEOUT';
        default: return `HTTP_${error.status}`;
      }
    }
    
    return error.code || error.type || 'UNKNOWN_ERROR';
  }

  private getUserFriendlyMessage(error: any): string {
    if (error.status) {
      switch (error.status) {
        case 400:
          return 'The request was invalid. Please check your input and try again.';
        case 401:
          return 'You need to log in to access this feature.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 408:
          return 'The request timed out. Please try again.';
        case 429:
          return 'Too many requests. Please wait a moment before trying again.';
        case 500:
          return 'A server error occurred. We have been notified and are working to fix it.';
        case 502:
          return 'Service temporarily unavailable. Please try again later.';
        case 503:
          return 'Service is currently under maintenance. Please try again later.';
        case 504:
          return 'The request timed out. Please try again.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    }

    return error.userMessage || error.message || 'An unexpected error occurred';
  }

  private getErrorSeverity(error: any): AppError['severity'] {
    if (error.status) {
      if (error.status >= 500) return 'high';
      if (error.status === 401 || error.status === 403) return 'high';
      if (error.status >= 400) return 'medium';
    }

    return 'low';
  }

  private getRetryDelay(error: any): number {
    if (error.status === 429) return 10000; // Rate limited
    if (error.status >= 500) return 5000; // Server errors
    if (error.status === 408) return 2000; // Timeout
    
    return env.get('ERROR_RETRY_DELAY');
  }

  private getValidationMessage(error: any, field?: string): string {
    if (field) {
      return `Please check the ${field} field and try again.`;
    }
    
    return error.message || 'Please check your input and try again.';
  }

  private getErrorTitle(error: AppError): string {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Authentication Required';
      case 'FORBIDDEN':
        return 'Access Denied';
      case 'NOT_FOUND':
        return 'Not Found';
      case 'NETWORK_ERROR':
        return 'Connection Problem';
      case 'VALIDATION_ERROR':
        return 'Invalid Input';
      case 'SERVER_ERROR':
        return 'Server Error';
      default:
        return 'Error';
    }
  }

  private trackError(error: AppError): void {
    const count = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, count + 1);

    // Log warning if error frequency is high
    if (count >= this.ERROR_THRESHOLD) {
      console.warn(`High frequency of ${error.code} errors: ${count} occurrences`);
    }
  }

  private logError(error: AppError): void {
    const logLevel = error.severity === 'critical' || error.severity === 'high' ? 'error' : 
                     error.severity === 'medium' ? 'warn' : 'info';

    console[logLevel](`[ErrorHandler] ${error.code}: ${error.message}`, {
      userMessage: error.userMessage,
      context: error.context,
      stack: error.stack
    });
  }

  private notifyHandlers(error: AppError): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });
  }

  private reportError(error: AppError): void {
    // This would send errors to a monitoring service like Sentry
    if (env.isProduction()) {
      console.log('Reporting error to monitoring service:', error);
      // Implementation would go here
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason, { type: 'unhandled_promise_rejection' });
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleError(event.error, { 
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlingService();
export default errorHandler;