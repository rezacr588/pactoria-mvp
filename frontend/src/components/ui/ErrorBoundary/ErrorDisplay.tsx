import React from 'react';
import { ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../../utils/classNames';
import Button from '../Button';
import { ErrorLevelConfig } from './types';
import { ErrorDetails } from './ErrorDetails';

interface ErrorDisplayProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
  maxRetries: number;
  config: ErrorLevelConfig;
  showErrorDetails?: boolean;
  onRetry: () => void;
  onNavigateHome: () => void;
  onReloadPage: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  maxRetries,
  config,
  showErrorDetails,
  onRetry,
  onNavigateHome,
  onReloadPage
}) => {
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
              onClick={onRetry}
              variant="primary"
              icon={<ArrowPathIcon className="h-4 w-4" />}
              size="sm"
            >
              Try Again
            </Button>
          )}
          
          <Button
            onClick={onNavigateHome}
            variant="secondary"
            icon={<HomeIcon className="h-4 w-4" />}
            size="sm"
          >
            Go Home
          </Button>
          
          {config.showReload && (
            <Button
              onClick={onReloadPage}
              variant="warning"
              icon={<ArrowPathIcon className="h-4 w-4" />}
              size="sm"
            >
              Reload Page
            </Button>
          )}
        </div>

        <ErrorDetails
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          showErrorDetails={showErrorDetails}
        />
      </div>
    </div>
  );
};