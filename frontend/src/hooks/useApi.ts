import { useState, useEffect, useCallback, useRef } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

export interface UseApiOptions {
  immediate?: boolean;
  cacheTime?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export interface UseApiReturn<T> extends ApiState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
  refresh: () => Promise<T>;
  isStale: boolean;
}

/**
 * Enhanced API hook for data fetching with caching, retry logic, and error handling
 */
export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const {
    immediate = false,
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    retryAttempts = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetched: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastArgsRef = useRef<any[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isStale = state.lastFetched 
    ? Date.now() - state.lastFetched > cacheTime 
    : true;

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    lastArgsRef.current = args;

    setState(prev => ({ ...prev, loading: true, error: null }));

    const attemptRequest = async (attempt: number): Promise<T> => {
      try {
        const result = await apiFunction(...args);
        
        setState({
          data: result,
          loading: false,
          error: null,
          lastFetched: Date.now()
        });

        onSuccess?.(result);
        return result;
      } catch (error: any) {
        // Don't retry if request was aborted
        if (error.name === 'AbortError') {
          throw error;
        }

        // Retry logic
        if (attempt < retryAttempts) {
          return new Promise((resolve, reject) => {
            retryTimeoutRef.current = setTimeout(() => {
              attemptRequest(attempt + 1).then(resolve).catch(reject);
            }, retryDelay * Math.pow(2, attempt)); // Exponential backoff
          });
        }

        // Final failure
        const errorMessage = error.data?.detail || error.message || 'Request failed';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));

        onError?.(error);
        throw error;
      }
    };

    return attemptRequest(1);
  }, [apiFunction, retryAttempts, retryDelay, onSuccess, onError]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setState({
      data: null,
      loading: false,
      error: null,
      lastFetched: null
    });
  }, []);

  const refresh = useCallback(() => {
    return execute(...lastArgsRef.current);
  }, [execute]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
    refresh,
    isStale
  };
}
