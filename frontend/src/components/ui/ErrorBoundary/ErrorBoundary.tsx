import React, { Component } from 'react';
import { ErrorBoundaryProps, ErrorBoundaryState } from './types';
import { getErrorLevelConfig } from './utils';
import { ErrorDisplay } from './ErrorDisplay';

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

  render() {
    const { hasError, error, errorInfo, retryCount, errorId } = this.state;
    const { fallback, children, maxRetries = 3, showErrorDetails, level } = this.props;

    if (hasError && error && errorInfo) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo, this.retryRender);
      }

      const config = getErrorLevelConfig(level);

      return (
        <ErrorDisplay
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          retryCount={retryCount}
          maxRetries={maxRetries}
          config={config}
          showErrorDetails={showErrorDetails}
          onRetry={this.retryRender}
          onNavigateHome={this.navigateHome}
          onReloadPage={this.reloadPage}
        />
      );
    }

    return children;
  }
}