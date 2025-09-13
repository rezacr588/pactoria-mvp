import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ToastType, ToastStyles } from './types';

export const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return CheckCircleIcon;
    case 'error':
      return ExclamationTriangleIcon;
    case 'warning':
      return ExclamationTriangleIcon;
    case 'info':
      return InformationCircleIcon;
    default:
      return InformationCircleIcon;
  }
};

export const getToastStyles = (type: ToastType): ToastStyles => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-success-50 dark:bg-success-950/20 border-success-200 dark:border-success-800/30',
        icon: 'text-success-600 dark:text-success-400',
        title: 'text-success-800 dark:text-success-300',
        message: 'text-success-700 dark:text-success-400',
        closeButton: 'text-success-400 dark:text-success-500 hover:text-success-600 dark:hover:text-success-300'
      };
    case 'error':
      return {
        bg: 'bg-danger-50 dark:bg-danger-950/20 border-danger-200 dark:border-danger-800/30',
        icon: 'text-danger-600 dark:text-danger-400',
        title: 'text-danger-800 dark:text-danger-300',
        message: 'text-danger-700 dark:text-danger-400',
        closeButton: 'text-danger-400 dark:text-danger-500 hover:text-danger-600 dark:hover:text-danger-300'
      };
    case 'warning':
      return {
        bg: 'bg-warning-50 dark:bg-warning-950/20 border-warning-200 dark:border-warning-800/30',
        icon: 'text-warning-600 dark:text-warning-400',
        title: 'text-warning-800 dark:text-warning-300',
        message: 'text-warning-700 dark:text-warning-400',
        closeButton: 'text-warning-400 dark:text-warning-500 hover:text-warning-600 dark:hover:text-warning-300'
      };
    case 'info':
      return {
        bg: 'bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800/30',
        icon: 'text-primary-600 dark:text-primary-400',
        title: 'text-primary-800 dark:text-primary-300',
        message: 'text-primary-700 dark:text-primary-400',
        closeButton: 'text-primary-400 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-300'
      };
    default:
      return {
        bg: 'bg-neutral-50 dark:bg-secondary-800 border-neutral-200 dark:border-secondary-600',
        icon: 'text-neutral-600 dark:text-secondary-400',
        title: 'text-neutral-800 dark:text-secondary-200',
        message: 'text-neutral-700 dark:text-secondary-300',
        closeButton: 'text-neutral-400 dark:text-secondary-500 hover:text-neutral-600 dark:hover:text-secondary-300'
      };
  }
};

export const getPositionStyles = (position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' = 'top-right') => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'top-center':
      return 'top-4 left-1/2 transform -translate-x-1/2';
    case 'bottom-center':
      return 'bottom-4 left-1/2 transform -translate-x-1/2';
    default: // top-right
      return 'top-4 right-4';
  }
};