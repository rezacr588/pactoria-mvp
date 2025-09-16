import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '../../../utils/classNames';

export const getToastIcon = (type: string) => {
  const iconClass = 'h-6 w-6 flex-shrink-0';
  switch (type) {
    case 'success':
      return <CheckCircleIcon className={classNames(iconClass, 'text-success-500')} />;
    case 'error':
      return <ExclamationCircleIcon className={classNames(iconClass, 'text-danger-500')} />;
    case 'warning':
      return <ExclamationTriangleIcon className={classNames(iconClass, 'text-warning-500')} />;
    case 'info':
      return <InformationCircleIcon className={classNames(iconClass, 'text-blue-500')} />;
    default:
      return <InformationCircleIcon className={classNames(iconClass, 'text-blue-500')} />;
  }
};

export const getBorderColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'border-l-success-500';
    case 'error':
      return 'border-l-danger-500';
    case 'warning':
      return 'border-l-warning-500';
    case 'info':
      return 'border-l-blue-500';
    default:
      return 'border-l-blue-500';
  }
};

export const getProgressColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-success-500';
    case 'error':
      return 'bg-danger-500';
    case 'warning':
      return 'bg-warning-500';
    case 'info':
      return 'bg-blue-500';
    default:
      return 'bg-blue-500';
  }
};

export const getPositionClasses = (position: string): string => {
  switch (position) {
    case 'top-left':
      return 'top-0 left-0';
    case 'top-center':
      return 'top-0 left-1/2 transform -translate-x-1/2';
    case 'top-right':
      return 'top-0 right-0';
    case 'bottom-left':
      return 'bottom-0 left-0';
    case 'bottom-center':
      return 'bottom-0 left-1/2 transform -translate-x-1/2';
    case 'bottom-right':
      return 'bottom-0 right-0';
    default:
      return 'top-0 right-0';
  }
};