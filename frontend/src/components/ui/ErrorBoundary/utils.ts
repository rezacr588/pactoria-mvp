import { ExclamationTriangleIcon, BugAntIcon } from '@heroicons/react/24/outline';
import { ErrorLevelConfig } from './types';

export const getErrorLevelConfig = (level: 'page' | 'component' | 'critical' = 'component'): ErrorLevelConfig => {
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