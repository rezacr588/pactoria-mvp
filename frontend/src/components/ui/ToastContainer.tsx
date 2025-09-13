// Re-export everything from the ToastContainer module for backwards compatibility
export { 
  ToastContainer, 
  ToastItem, 
  getToastIcon, 
  getBorderColor, 
  getProgressColor, 
  getPositionClasses,
  ToastAnimationStyles,
  toastAnimationStyles
} from './ToastContainer/index';

export type { 
  ToastItemProps, 
  ToastContainerProps, 
  ToastsByPosition, 
  ToastPosition 
} from './ToastContainer/index';

export { default } from './ToastContainer/index';