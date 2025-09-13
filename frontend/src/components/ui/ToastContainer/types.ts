import { Toast } from '../../contexts/ToastContext';

export interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export interface ToastContainerProps {
  // Empty for now, but allows for future extensibility
}

export interface ToastsByPosition {
  [position: string]: Toast[];
}

export type ToastPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';