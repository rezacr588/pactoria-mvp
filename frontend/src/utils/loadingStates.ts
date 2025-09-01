// Loading state utilities for consistent UX

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface AsyncOperation<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * Create initial loading state
 */
export function createLoadingState(): LoadingState {
  return {
    isLoading: false,
    error: null,
    lastUpdated: null
  };
}

/**
 * Create initial async operation state
 */
export function createAsyncState<T>(): AsyncOperation<T> {
  return {
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  };
}

/**
 * Set loading state to loading
 */
export function setLoading<T>(state: LoadingState | AsyncOperation<T>): LoadingState | AsyncOperation<T> {
  return {
    ...state,
    isLoading: true,
    error: null
  };
}

/**
 * Set loading state to success
 */
export function setSuccess<T>(
  state: AsyncOperation<T>, 
  data: T
): AsyncOperation<T> {
  return {
    ...state,
    data,
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Set loading state to error
 */
export function setError<T>(
  state: LoadingState | AsyncOperation<T>, 
  error: string
): LoadingState | AsyncOperation<T> {
  return {
    ...state,
    isLoading: false,
    error
  };
}

/**
 * Check if data is stale (older than specified minutes)
 */
export function isDataStale(lastUpdated: string | null, maxAgeMinutes: number = 5): boolean {
  if (!lastUpdated) return true;
  
  const updated = new Date(lastUpdated);
  const now = new Date();
  const ageMinutes = (now.getTime() - updated.getTime()) / (1000 * 60);
  
  return ageMinutes > maxAgeMinutes;
}

/**
 * Loading state hook-like pattern for stores
 */
export class LoadingManager {
  private states: Map<string, LoadingState> = new Map();
  
  /**
   * Start loading for a specific key
   */
  startLoading(key: string): void {
    const current = this.states.get(key) || createLoadingState();
    this.states.set(key, setLoading(current));
  }
  
  /**
   * Set success for a specific key
   */
  setSuccess(key: string): void {
    const current = this.states.get(key) || createLoadingState();
    this.states.set(key, {
      ...current,
      isLoading: false,
      error: null,
      lastUpdated: new Date().toISOString()
    });
  }
  
  /**
   * Set error for a specific key
   */
  setError(key: string, error: string): void {
    const current = this.states.get(key) || createLoadingState();
    this.states.set(key, setError(current, error));
  }
  
  /**
   * Get loading state for a specific key
   */
  getState(key: string): LoadingState {
    return this.states.get(key) || createLoadingState();
  }
  
  /**
   * Check if any operation is loading
   */
  isAnyLoading(): boolean {
    return Array.from(this.states.values()).some(state => state.isLoading);
  }
  
  /**
   * Get all errors
   */
  getErrors(): string[] {
    return Array.from(this.states.values())
      .map(state => state.error)
      .filter(error => error !== null) as string[];
  }
  
  /**
   * Clear all states
   */
  clear(): void {
    this.states.clear();
  }
  
  /**
   * Clear specific state
   */
  clearState(key: string): void {
    this.states.delete(key);
  }
}

/**
 * Debounce utility for search and other frequent operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle utility for scroll and resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(backoffFactor, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Loading skeleton data generators for UI
 */
export const skeletonData = {
  contracts: (count: number = 5) => Array(count).fill(null).map((_, index) => ({
    id: `skeleton-${index}`,
    title: '█'.repeat(20 + Math.random() * 20),
    contract_type: 'service_agreement',
    status: 'draft',
    created_at: new Date().toISOString(),
    currency: 'GBP',
    version: 1,
    is_current_version: true,
    company_id: '',
    created_by: ''
  })),
  
  analytics: () => ({
    total_contracts: 0,
    active_contracts: 0,
    draft_contracts: 0,
    completed_contracts: 0,
    terminated_contracts: 0,
    total_contract_value: 0,
    average_contract_value: 0,
    compliance_score_average: 0,
    high_risk_contracts: 0,
    contracts_this_month: 0,
    contracts_last_month: 0,
    growth_rate: 0
  }),
  
  user: () => ({
    id: '',
    email: '█'.repeat(20),
    full_name: '█'.repeat(15),
    is_active: true,
    timezone: 'Europe/London',
    company_id: '',
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString()
  })
};

/**
 * Loading states for different UI patterns
 */
export const loadingPatterns = {
  // For lists
  list: 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
  
  // For cards
  card: 'animate-pulse bg-gray-200 rounded-lg',
  
  // For text
  text: 'animate-pulse bg-gray-200 h-4 rounded',
  
  // For buttons
  button: 'animate-pulse bg-gray-300 opacity-75 cursor-not-allowed',
  
  // For avatars
  avatar: 'animate-pulse bg-gray-200 rounded-full',
  
  // For charts
  chart: 'animate-pulse bg-gradient-to-t from-gray-200 to-gray-100'
};