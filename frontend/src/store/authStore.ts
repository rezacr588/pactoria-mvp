import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Company, AuthResponse } from '../types';
import { AuthService } from '../services/api';

interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, company_name?: string, timezone?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// Token storage configuration
const TOKEN_STORAGE_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || 'auth-token';

// Helper function to store token
const storeToken = (token: string) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

// Helper function to clear token
const clearToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

// Helper function to get stored token
const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      token: getStoredToken(),
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await AuthService.login(email, password);
          
          // Store token separately for security
          storeToken(response.token.access_token);
          
          // Enhance user object with computed properties for UI consistency
          const enhancedUser = {
            ...response.user,
            name: response.user.full_name, // Use full_name as display name
            avatar: undefined, // Backend doesn't provide avatar yet, using default
            company: response.company?.name || undefined // Company name for display
          };
          
          set({ 
            user: enhancedUser,
            company: response.company,
            token: response.token.access_token,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          const errorMessage = error.data?.detail || error.message || 'Authentication failed';
          set({ 
            error: errorMessage,
            isLoading: false,
            user: null,
            company: null,
            token: null
          });
          clearToken();
          throw error;
        }
      },

      register: async (email: string, password: string, full_name: string, company_name?: string, timezone = 'Europe/London') => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await AuthService.register({
            email,
            password,
            full_name,
            company_name,
            timezone
          });
          
          // Store token separately for security
          storeToken(response.token.access_token);
          
          // Enhance user object with computed properties for UI consistency
          const enhancedUser = {
            ...response.user,
            name: response.user.full_name, // Use full_name as display name
            avatar: undefined, // Backend doesn't provide avatar yet, using default
            company: response.company?.name || undefined // Company name for display
          };
          
          set({ 
            user: enhancedUser,
            company: response.company,
            token: response.token.access_token,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          const errorMessage = error.data?.detail || error.message || 'Registration failed';
          set({ 
            error: errorMessage,
            isLoading: false,
            user: null,
            company: null,
            token: null
          });
          clearToken();
          throw error;
        }
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;
        
        try {
          const userResponse = await AuthService.getCurrentUser();
          // Enhance user object with computed properties for UI consistency
          const enhancedUser = {
            ...userResponse,
            name: userResponse.full_name,
            avatar: undefined,
            company: get().company?.name || undefined
          };
          set({ user: enhancedUser, error: null });
        } catch (error: any) {
          // Token might be expired, clear auth state
          set({ user: null, company: null, token: null, error: 'Session expired' });
          clearToken();
          throw error;
        }
      },

      logout: () => {
        clearToken();
        set({ 
          user: null,
          company: null,
          token: null,
          error: null 
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user and company data, not the token (for security)
      partialize: (state) => ({
        user: state.user,
        company: state.company,
      }),
    }
  )
);

// Initialize token from localStorage on app start
if (typeof window !== 'undefined') {
  const token = getStoredToken();
  if (token) {
    useAuthStore.setState({ token });
    // Optionally refresh user data if token exists
    useAuthStore.getState().refreshUser().catch(() => {
      // Silently handle refresh errors on initialization
      useAuthStore.getState().logout();
    });
  }
}