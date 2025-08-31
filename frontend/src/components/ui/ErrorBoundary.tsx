import React, { Component, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon, BugAntIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';
import Button from './Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showErrorDetails?: boolean;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  level?: 'page' | 'component' | 'critical';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // In production, you might want to log to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange) {
      // Reset error boundary when props change
      const hasPropsChanged = Object.keys(this.props).some(
        key => key !== 'children' && (this.props as any)[key] !== (prevProps as any)[key]
      );

      if (hasPropsChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
    });
  };

  retryRender = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  navigateHome = () => {
    window.location.href = '/dashboard';
  };

  reloadPage = () => {
    window.location.reload();
  };

  getErrorLevelConfig = () => {
    const { level = 'component' } = this.props;
    
    switch (level) {
      case 'critical':
        return {
          title: 'Critical System Error',
          description: 'A critical error has occurred that affects the entire application.',
          icon: BugAntIcon,
          iconColor: 'text-danger-500',
          bgColor: 'bg-danger-50 dark:bg-danger-900/20',
          borderColor: 'border-danger-200 dark:border-danger-800',
          showReload: true,
        };
      case 'page':
        return {
          title: 'Page Error',
          description: 'This page encountered an error and could not load properly.',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-warning-500',
          bgColor: 'bg-warning-50 dark:bg-warning-900/20',
          borderColor: 'border-warning-200 dark:border-warning-800',
          showReload: false,
        };
      default: // component
        return {
          title: 'Component Error',
          description: 'A component on this page encountered an error.',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          showReload: false,
        };
    }
  };

  renderErrorDetails = () => {
    const { showErrorDetails = false } = this.props;
    const { error, errorInfo, errorId } = this.state;

    if (!showErrorDetails || !error) return null;

    return (
      <details className="mt-6 p-4 bg-neutral-100 dark:bg-secondary-800 rounded-lg">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700 dark:text-secondary-300 hover:text-neutral-900 dark:hover:text-secondary-100">
          Error Details (Click to expand)
        </summary>
        <div className="mt-4 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-neutral-600 dark:text-secondary-400 uppercase tracking-wide">
              Error ID
            </h4>
            <p className="text-sm font-mono text-neutral-700 dark:text-secondary-300 mt-1">
              {errorId}
            </p>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold text-neutral-600 dark:text-secondary-400 uppercase tracking-wide">
              Error Message
            </h4>
            <p className="text-sm font-mono text-danger-700 dark:text-danger-300 mt-1">
              {error.message}
            </p>
          </div>
          
          {error.stack && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-600 dark:text-secondary-400 uppercase tracking-wide">
                Stack Trace
              </h4>
              <pre className="text-xs font-mono text-neutral-600 dark:text-secondary-400 mt-1 overflow-x-auto whitespace-pre-wrap bg-neutral-50 dark:bg-secondary-900 p-2 rounded border">
                {error.stack}
              </pre>
            </div>
          )}
          
          {errorInfo?.componentStack && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-600 dark:text-secondary-400 uppercase tracking-wide">
                Component Stack
              </h4>
              <pre className="text-xs font-mono text-neutral-600 dark:text-secondary-400 mt-1 overflow-x-auto whitespace-pre-wrap bg-neutral-50 dark:bg-secondary-900 p-2 rounded border">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { fallback, children, maxRetries = 3 } = this.props;

    if (hasError && error && errorInfo) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo, this.retryRender);
      }

      const config = this.getErrorLevelConfig();
      const Icon = config.icon;
      const canRetry = retryCount < maxRetries;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className={classNames(
            'max-w-md w-full p-8 rounded-2xl border-2 text-center',
            config.bgColor,
            config.borderColor
          )}>
            <div className="flex justify-center mb-6">
              <div className="p-3 rounded-full bg-white dark:bg-secondary-800 shadow-soft">
                <Icon className={classNames('h-8 w-8', config.iconColor)} />
              </div>
            </div>

            <h2 className="text-xl font-bold text-neutral-900 dark:text-secondary-100 mb-3">
              {config.title}
            </h2>
            
            <p className="text-neutral-600 dark:text-secondary-400 mb-6 leading-relaxed">
              {config.description}
            </p>

            {retryCount > 0 && (
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {canRetry && (
                <Button
                  onClick={this.retryRender}
                  variant="primary"
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                  size="sm"
                >
                  Try Again
                </Button>
              )}
              
              <Button
                onClick={this.navigateHome}
                variant="secondary"
                icon={<HomeIcon className="h-4 w-4" />}
                size="sm"
              >
                Go Home
              </Button>
              
              {config.showReload && (
                <Button
                  onClick={this.reloadPage}
                  variant="warning"
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                  size="sm"
                >
                  Reload Page
                </Button>
              )}
            </div>

            {this.renderErrorDetails()}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook-based error boundary wrapper for functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

// Higher-order component for adding error boundaries
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;