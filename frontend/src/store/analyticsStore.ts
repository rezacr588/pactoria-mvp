import { create } from 'zustand';
import { 
  BusinessMetrics,
  UserMetrics,
  ContractTypeMetrics,
  ComplianceMetrics,
  TimeSeriesData,
  DashboardResponse
} from '../types';
import { AnalyticsService } from '../services/api';

interface AnalyticsState {
  dashboard: DashboardResponse | null;
  businessMetrics: BusinessMetrics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  // Actions
  fetchDashboard: () => Promise<void>;
  fetchBusinessMetrics: () => Promise<void>;
  fetchTimeSeries: (metric: string, period?: 'DAILY' | 'WEEKLY' | 'MONTHLY', days?: number) => Promise<TimeSeriesData>;
  clearError: () => void;
  refreshData: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  dashboard: null,
  businessMetrics: null,
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const dashboard = await AnalyticsService.getDashboard();
      set({ 
        dashboard,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to load dashboard data';
      set({ 
        error: errorMessage,
        isLoading: false,
        dashboard: null
      });
      throw error;
    }
  },

  fetchBusinessMetrics: async () => {
    set({ isLoading: true, error: null });
    try {
      const businessMetrics = await AnalyticsService.getBusinessMetrics();
      set({ 
        businessMetrics,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to load business metrics';
      set({ 
        error: errorMessage,
        isLoading: false,
        businessMetrics: null
      });
      throw error;
    }
  },

  fetchTimeSeries: async (metric: string, period = 'MONTHLY', days = 30) => {
    set({ isLoading: true, error: null });
    try {
      const timeSeries = await AnalyticsService.getTimeSeries(metric, period, days);
      set({ 
        isLoading: false,
        error: null
      });
      return timeSeries;
    } catch (error: any) {
      const errorMessage = error.data?.detail || error.message || 'Failed to load time series data';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  refreshData: async () => {
    // Refresh all data
    const promises = [];
    
    if (get().dashboard) {
      promises.push(get().fetchDashboard());
    }
    
    if (get().businessMetrics) {
      promises.push(get().fetchBusinessMetrics());
    }
    
    if (promises.length > 0) {
      try {
        await Promise.all(promises);
      } catch (error) {
        // Individual fetch methods will handle their own errors
        console.warn('Some analytics data failed to refresh:', error);
      }
    }
  }
}));

// Export useful constants for analytics
export const METRIC_TYPES = {
  CONTRACTS_CREATED: 'contracts_created',
  CONTRACT_VALUE: 'contract_value'
} as const;

export const TIME_PERIODS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
} as const;