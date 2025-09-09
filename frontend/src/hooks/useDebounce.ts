import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce a value with configurable delay
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Advanced debounce hook with immediate execution option and cancel functionality
 */
export function useAdvancedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
) {
  const { leading = false, trailing = true, maxWait } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  const invoke = useCallback((...args: Parameters<T>) => {
    lastInvokeTimeRef.current = Date.now();
    return callback(...args);
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const isInvoking = shouldInvoke(now);
      
      lastCallTimeRef.current = now;

      if (isInvoking) {
        if (timeoutRef.current === null) {
          return leadingEdge(args);
        }
        if (maxWait !== undefined) {
          // Handle maxWait
          return invoke(...args);
        }
      }

      if (timeoutRef.current === null) {
        timeoutRef.current = setTimeout(() => timerExpired(args), delay);
      }

      function shouldInvoke(time: number): boolean {
        const timeSinceLastCall = time - lastCallTimeRef.current;
        const timeSinceLastInvoke = time - lastInvokeTimeRef.current;

        return (
          lastCallTimeRef.current === 0 ||
          timeSinceLastCall >= delay ||
          timeSinceLastCall < 0 ||
          (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
        );
      }

      function leadingEdge(args: Parameters<T>) {
        lastInvokeTimeRef.current = lastCallTimeRef.current;
        timeoutRef.current = setTimeout(() => timerExpired(args), delay);
        return leading ? invoke(...args) : undefined;
      }

      function timerExpired(args: Parameters<T>) {
        timeoutRef.current = null;
        if (trailing && lastCallTimeRef.current !== lastInvokeTimeRef.current) {
          return invoke(...args);
        }
      }
    },
    [callback, delay, leading, trailing, maxWait, invoke]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return cancel;
  }, [cancel]);

  return {
    debouncedCallback,
    cancel
  };
}
