import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Company } from '../types';
import { AuthService } from '../services/api';
import { env } from '../config/env';

interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, company_name?: string, timezone?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  checkAuthStatus: () => boolean;
  setConnectionStatus: (status: AuthState['connectionStatus']) => void;
}

// Token storage configuration
const TOKEN_STORAGE_KEY = env.get('TOKEN_STORAGE_KEY');

// Helper function to store token securely
const storeToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    
    if (env.get('DEBUG_API_CALLS')) {
      console.log('🔑 Token stored successfully');
    }
  } catch (error) {
    console.error('Failed to store authentication token:', error);
    throw new Error('Failed to store authentication token');
  }
};

// Helper function to clear token
const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    // Also clear old token storage for backward compatibility
    localStorage.removeItem('auth-token');
    
    if (env.get('DEBUG_API_CALLS')) {
      console.log('🔑 Token cleared successfully');
    }
  } catch (error) {
    console.error('Failed to clear authentication token:', error);
  }
};

// Helper function to get stored token
const getStoredToken = (): string | null => {
  try {
    // Try new storage key first
    let token = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    // Fallback to old key for backward compatibility
    if (!token) {
      token = localStorage.getItem('auth-token');
      // Migrate to new key if found
      if (token) {
        storeToken(token);
        localStorage.removeItem('auth-token');
      }
    }
    
    return token;
  } catch (error) {
    console.error('Failed to retrieve authentication token:', error);
    return null;
  }
};

// Token validation
const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    return payload.exp && payload.exp > currentTime;
  } catch (error) {
    return false;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      token: getStoredToken(),
      isLoading: false,
      error: null,
      isAuthenticated: false,
      connectionStatus: 'disconnected',

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await AuthService.login(email, password);
          
          // Validate token before storing
          if (!isTokenValid(response.token.access_token)) {
            throw new Error('Invalid token received from server');
          }
          
          // Store token securely
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
            isAuthenticated: true,
            isLoading: false,
            error: null,
            connectionStatus: 'connected'
          });
          
          if (env.get('DEBUG_API_CALLS')) {
            console.log('✅ User logged in successfully:', enhancedUser.email);
          }
        } catch (error: any) {
          const errorMessage = error.data?.detail || error.message || 'Authentication failed';
          
          if (env.get('DEBUG_API_CALLS')) {
            console.error('❌ Login failed:', errorMessage);
          }
          
          set({ 
            error: errorMessage,
            isLoading: false,
            user: null,
            company: null,
            token: null,
            isAuthenticated: false,
            connectionStatus: 'error'
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
        if (env.get('DEBUG_API_CALLS')) {
          console.log('🚪 User logging out');
        }
        
        clearToken();
        set({ 
          user: null,
          company: null,
          token: null,
          isAuthenticated: false,
          error: null,
          connectionStatus: 'disconnected'
        });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuthStatus: () => {
        const { token } = get();
        const isValid = isTokenValid(token);
        
        if (!isValid && token) {
          // Token exists but is invalid, clear it
          get().logout();
          return false;
        }
        
        set({ isAuthenticated: isValid });
        return isValid;
      },

      setConnectionStatus: (status: AuthState['connectionStatus']) => {
        set({ connectionStatus: status });
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