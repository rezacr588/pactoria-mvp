import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface UIState {
  // Modal management
  modals: Record<string, boolean>;
  
  // Dropdown management
  dropdowns: Record<string, boolean>;
  
  // Loading states
  loading: Record<string, boolean>;
  
  // Error management
  errors: Record<string, string | null>;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
    persistent?: boolean;
  }>;
  
  // Theme and preferences
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  compactMode: boolean;
  
  // Search and filters
  globalSearch: string;
  activeFilters: Record<string, any>;
  
  // Navigation
  breadcrumbs: Array<{ label: string; href?: string }>;
  
  // Performance tracking
  lastInteraction: number;
  renderCount: number;
}

export interface UIActions {
  // Modal actions
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;
  closeAllModals: () => void;
  
  // Dropdown actions
  openDropdown: (dropdownId: string) => void;
  closeDropdown: (dropdownId: string) => void;
  toggleDropdown: (dropdownId: string) => void;
  closeAllDropdowns: () => void;
  
  // Loading actions
  setLoading: (loadingId: string, loading: boolean) => void;
  clearAllLoading: () => void;
  
  // Error actions
  setError: (errorId: string, error: string | null) => void;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Theme actions
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  
  // Search and filter actions
  setGlobalSearch: (search: string) => void;
  setFilter: (key: string, value: any) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  
  // Navigation actions
  setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => void;
  addBreadcrumb: (breadcrumb: UIState['breadcrumbs'][0]) => void;
  
  // Utility actions
  trackInteraction: () => void;
  incrementRenderCount: () => void;
  resetUIState: () => void;
}

const initialState: UIState = {
  modals: {},
  dropdowns: {},
  loading: {},
  errors: {},
  notifications: [],
  theme: 'system',
  sidebarCollapsed: false,
  compactMode: false,
  globalSearch: '',
  activeFilters: {},
  breadcrumbs: [],
  lastInteraction: Date.now(),
  renderCount: 0,
};

export const useUIStore = create<UIState & UIActions>()(
  subscribeWithSelector(
    immer((set) => ({
      ...initialState,
      
      // Modal actions
      openModal: (modalId: string) => {
        set((state) => {
          state.modals[modalId] = true;
          state.lastInteraction = Date.now();
        });
      },
      
      closeModal: (modalId: string) => {
        set((state) => {
          state.modals[modalId] = false;
          state.lastInteraction = Date.now();
        });
      },
      
      toggleModal: (modalId: string) => {
        set((state) => {
          state.modals[modalId] = !state.modals[modalId];
          state.lastInteraction = Date.now();
        });
      },
      
      closeAllModals: () => {
        set((state) => {
          state.modals = {};
          state.lastInteraction = Date.now();
        });
      },
      
      // Dropdown actions
      openDropdown: (dropdownId: string) => {
        set((state) => {
          // Close other dropdowns when opening a new one
          state.dropdowns = { [dropdownId]: true };
          state.lastInteraction = Date.now();
        });
      },
      
      closeDropdown: (dropdownId: string) => {
        set((state) => {
          state.dropdowns[dropdownId] = false;
          state.lastInteraction = Date.now();
        });
      },
      
      toggleDropdown: (dropdownId: string) => {
        set((state) => {
          const isOpen = state.dropdowns[dropdownId];
          // Close all dropdowns first
          state.dropdowns = {};
          // Then toggle the target dropdown
          if (!isOpen) {
            state.dropdowns[dropdownId] = true;
          }
          state.lastInteraction = Date.now();
        });
      },
      
      closeAllDropdowns: () => {
        set((state) => {
          state.dropdowns = {};
          state.lastInteraction = Date.now();
        });
      },
      
      // Loading actions
      setLoading: (loadingId: string, loading: boolean) => {
        set((state) => {
          state.loading[loadingId] = loading;
          state.lastInteraction = Date.now();
        });
      },
      
      clearAllLoading: () => {
        set((state) => {
          state.loading = {};
          state.lastInteraction = Date.now();
        });
      },
      
      // Error actions
      setError: (errorId: string, error: string | null) => {
        set((state) => {
          state.errors[errorId] = error;
          state.lastInteraction = Date.now();
        });
      },
      
      clearError: (errorId: string) => {
        set((state) => {
          delete state.errors[errorId];
          state.lastInteraction = Date.now();
        });
      },
      
      clearAllErrors: () => {
        set((state) => {
          state.errors = {};
          state.lastInteraction = Date.now();
        });
      },
      
      // Notification actions
      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification = { ...notification, id };
        
        set((state) => {
          state.notifications.push(newNotification);
          state.lastInteraction = Date.now();
        });
        
        // Auto-remove non-persistent notifications
        if (!notification.persistent && notification.duration !== 0) {
          setTimeout(() => {
            set((state) => {
              state.notifications = state.notifications.filter(n => n.id !== id);
            });
          }, notification.duration || 5000);
        }
        
        return id;
      },
      
      removeNotification: (id: string) => {
        set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
          state.lastInteraction = Date.now();
        });
      },
      
      clearAllNotifications: () => {
        set((state) => {
          state.notifications = [];
          state.lastInteraction = Date.now();
        });
      },
      
      // Theme actions
      setTheme: (theme: UIState['theme']) => {
        set((state) => {
          state.theme = theme;
          state.lastInteraction = Date.now();
        });
      },
      
      toggleSidebar: () => {
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
          state.lastInteraction = Date.now();
        });
      },
      
      setSidebarCollapsed: (collapsed: boolean) => {
        set((state) => {
          state.sidebarCollapsed = collapsed;
          state.lastInteraction = Date.now();
        });
      },
      
      setCompactMode: (compact: boolean) => {
        set((state) => {
          state.compactMode = compact;
          state.lastInteraction = Date.now();
        });
      },
      
      // Search and filter actions
      setGlobalSearch: (search: string) => {
        set((state) => {
          state.globalSearch = search;
          state.lastInteraction = Date.now();
        });
      },
      
      setFilter: (key: string, value: any) => {
        set((state) => {
          state.activeFilters[key] = value;
          state.lastInteraction = Date.now();
        });
      },
      
      clearFilter: (key: string) => {
        set((state) => {
          delete state.activeFilters[key];
          state.lastInteraction = Date.now();
        });
      },
      
      clearAllFilters: () => {
        set((state) => {
          state.activeFilters = {};
          state.lastInteraction = Date.now();
        });
      },
      
      // Navigation actions
      setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => {
        set((state) => {
          state.breadcrumbs = breadcrumbs;
          state.lastInteraction = Date.now();
        });
      },
      
      addBreadcrumb: (breadcrumb: UIState['breadcrumbs'][0]) => {
        set((state) => {
          state.breadcrumbs.push(breadcrumb);
          state.lastInteraction = Date.now();
        });
      },
      
      // Utility actions
      trackInteraction: () => {
        set((state) => {
          state.lastInteraction = Date.now();
        });
      },
      
      incrementRenderCount: () => {
        set((state) => {
          state.renderCount += 1;
        });
      },
      
      resetUIState: () => {
        set(() => ({ ...initialState }));
      },
    }))
  )
);

// Selectors for optimized subscriptions
export const useUISelectors = {
  // Modal selectors
  useModal: (modalId: string) => useUIStore((state) => state.modals[modalId] || false),
  useAnyModalOpen: () => useUIStore((state) => Object.values(state.modals).some(Boolean)),
  
  // Dropdown selectors
  useDropdown: (dropdownId: string) => useUIStore((state) => state.dropdowns[dropdownId] || false),
  useAnyDropdownOpen: () => useUIStore((state) => Object.values(state.dropdowns).some(Boolean)),
  
  // Loading selectors
  useLoading: (loadingId: string) => useUIStore((state) => state.loading[loadingId] || false),
  useAnyLoading: () => useUIStore((state) => Object.values(state.loading).some(Boolean)),
  
  // Error selectors
  useError: (errorId: string) => useUIStore((state) => state.errors[errorId] || null),
  useHasErrors: () => useUIStore((state) => Object.values(state.errors).some(Boolean)),
  
  // Theme selectors
  useTheme: () => useUIStore((state) => state.theme),
  useSidebarCollapsed: () => useUIStore((state) => state.sidebarCollapsed),
  useCompactMode: () => useUIStore((state) => state.compactMode),
  
  // Search and filter selectors
  useGlobalSearch: () => useUIStore((state) => state.globalSearch),
  useFilter: (key: string) => useUIStore((state) => state.activeFilters[key]),
  useHasActiveFilters: () => useUIStore((state) => Object.keys(state.activeFilters).length > 0),
  
  // Notification selectors
  useNotifications: () => useUIStore((state) => state.notifications),
  useNotificationCount: () => useUIStore((state) => state.notifications.length),
  
  // Navigation selectors
  useBreadcrumbs: () => useUIStore((state) => state.breadcrumbs),
};
