import React from 'react';

interface ErrorDetailsProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  showErrorDetails?: boolean;
}

export const ErrorDetails: React.FC<ErrorDetailsProps> = ({
  error,
  errorInfo,
  errorId,
  showErrorDetails = false
}) => {
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