import { useState, useCallback, useRef, useEffect } from 'react';

export interface UIState {
  modals: Record<string, boolean>;
  dropdowns: Record<string, boolean>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>;
}

export interface UseUIStateReturn {
  // Modal management
  isModalOpen: (modalId: string) => boolean;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;
  closeAllModals: () => void;
  
  // Dropdown management
  isDropdownOpen: (dropdownId: string) => boolean;
  openDropdown: (dropdownId: string) => void;
  closeDropdown: (dropdownId: string) => void;
  toggleDropdown: (dropdownId: string) => void;
  closeAllDropdowns: () => void;
  
  // Loading states
  isLoading: (loadingId: string) => boolean;
  setLoading: (loadingId: string, loading: boolean) => void;
  clearAllLoading: () => void;
  
  // Error management
  getError: (errorId: string) => string | null;
  setError: (errorId: string, error: string | null) => void;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  
  // Notifications
  notifications: UIState['notifications'];
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Bulk operations
  resetUIState: () => void;
}

/**
 * Comprehensive UI state management hook for modals, dropdowns, loading states, errors, and notifications
 */
export function useUIState(): UseUIStateReturn {
  const [state, setState] = useState<UIState>({
    modals: {},
    dropdowns: {},
    loading: {},
    errors: {},
    notifications: []
  });

  const notificationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Modal management
  const isModalOpen = useCallback((modalId: string) => {
    return state.modals[modalId] || false;
  }, [state.modals]);

  const openModal = useCallback((modalId: string) => {
    setState(prev => ({
      ...prev,
      modals: { ...prev.modals, [modalId]: true }
    }));
  }, []);

  const closeModal = useCallback((modalId: string) => {
    setState(prev => ({
      ...prev,
      modals: { ...prev.modals, [modalId]: false }
    }));
  }, []);

  const toggleModal = useCallback((modalId: string) => {
    setState(prev => ({
      ...prev,
      modals: { ...prev.modals, [modalId]: !prev.modals[modalId] }
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setState(prev => ({
      ...prev,
      modals: {}
    }));
  }, []);

  // Dropdown management
  const isDropdownOpen = useCallback((dropdownId: string) => {
    return state.dropdowns[dropdownId] || false;
  }, [state.dropdowns]);

  const openDropdown = useCallback((dropdownId: string) => {
    setState(prev => ({
      ...prev,
      dropdowns: { ...prev.dropdowns, [dropdownId]: true }
    }));
  }, []);

  const closeDropdown = useCallback((dropdownId: string) => {
    setState(prev => ({
      ...prev,
      dropdowns: { ...prev.dropdowns, [dropdownId]: false }
    }));
  }, []);

  const toggleDropdown = useCallback((dropdownId: string) => {
    setState(prev => ({
      ...prev,
      dropdowns: { ...prev.dropdowns, [dropdownId]: !prev.dropdowns[dropdownId] }
    }));
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setState(prev => ({
      ...prev,
      dropdowns: {}
    }));
  }, []);

  // Loading states
  const isLoading = useCallback((loadingId: string) => {
    return state.loading[loadingId] || false;
  }, [state.loading]);

  const setLoading = useCallback((loadingId: string, loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [loadingId]: loading }
    }));
  }, []);

  const clearAllLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: {}
    }));
  }, []);

  // Error management
  const getError = useCallback((errorId: string) => {
    return state.errors[errorId] || null;
  }, [state.errors]);

  const setError = useCallback((errorId: string, error: string | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [errorId]: error }
    }));
  }, []);

  const clearError = useCallback((errorId: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [errorId]: null }
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {}
    }));
  }, []);

  // Notifications
  const addNotification = useCallback((notification: Omit<UIState['notifications'][0], 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = { ...notification, id };
    
    setState(prev => ({
      ...prev,
      notifications: [...prev.notifications, newNotification]
    }));

    // Auto-remove notification after duration
    if (notification.duration !== 0) {
      const timeout = setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
      
      notificationTimeouts.current[id] = timeout;
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));

    // Clear timeout if exists
    if (notificationTimeouts.current[id]) {
      clearTimeout(notificationTimeouts.current[id]);
      delete notificationTimeouts.current[id];
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    // Clear all timeouts
    Object.values(notificationTimeouts.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    notificationTimeouts.current = {};

    setState(prev => ({
      ...prev,
      notifications: []
    }));
  }, []);

  // Bulk operations
  const resetUIState = useCallback(() => {
    // Clear all timeouts
    Object.values(notificationTimeouts.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    notificationTimeouts.current = {};

    setState({
      modals: {},
      dropdowns: {},
      loading: {},
      errors: {},
      notifications: []
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(notificationTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    // Modal management
    isModalOpen,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    
    // Dropdown management
    isDropdownOpen,
    openDropdown,
    closeDropdown,
    toggleDropdown,
    closeAllDropdowns,
    
    // Loading states
    isLoading,
    setLoading,
    clearAllLoading,
    
    // Error management
    getError,
    setError,
    clearError,
    clearAllErrors,
    
    // Notifications
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    
    // Bulk operations
    resetUIState
  };
}
