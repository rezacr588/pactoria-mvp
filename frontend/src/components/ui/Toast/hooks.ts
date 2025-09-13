import { useToast } from './context';
import { Toast } from './types';

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { addToast } = useToast();

  return {
    success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      addToast({ type: 'success', message, ...options });
    },
    error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      addToast({ type: 'error', message, persistent: true, ...options });
    },
    warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      addToast({ type: 'warning', message, ...options });
    },
    info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      addToast({ type: 'info', message, ...options });
    }
  };
};