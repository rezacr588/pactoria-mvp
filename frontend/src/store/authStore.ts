import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, company: string) => Promise<void>;
  logout: () => void;
}

// Mock user data
const mockUser: User = {
  id: '1',
  email: 'demo@pactoria.com',
  name: 'Sarah Johnson',
  company: 'TechCorp Ltd',
  role: 'admin',
  avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=3b82f6&color=fff',
  joinedAt: new Date('2024-01-15'),
  lastActive: new Date(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Mock login - in real app would call API
          if (email === 'demo@pactoria.com' && password === 'demo123') {
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
            set({ user: mockUser, isLoading: false });
          } else {
            throw new Error('Invalid credentials');
          }
        } catch (error: unknown) {
          set({ error: error instanceof Error ? error.message : 'Authentication failed', isLoading: false });
          throw error;
        }
      },

      register: async (email: string, _password: string, name: string, company: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Mock registration - in real app would call API
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
          
          const newUser: User = {
            id: Date.now().toString(),
            email,
            name,
            company,
            role: 'admin',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`,
            joinedAt: new Date(),
            lastActive: new Date(),
          };
          
          set({ user: newUser, isLoading: false });
        } catch (error: unknown) {
          set({ error: error instanceof Error ? error.message : 'Registration failed', isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, error: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);