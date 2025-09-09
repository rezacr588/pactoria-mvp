import { useCallback, useEffect, useRef } from 'react';
import { StoreApi, UseBoundStore } from 'zustand';

/**
 * Enhanced store hook with performance optimizations and debugging
 */
export function useStore<T, U>(
  store: UseBoundStore<StoreApi<T>>,
  selector: (state: T) => U,
  equalityFn?: (a: U, b: U) => boolean
) {
  const selectorRef = useRef(selector);
  const equalityRef = useRef(equalityFn);
  
  // Update refs on each render to ensure we have the latest functions
  selectorRef.current = selector;
  equalityRef.current = equalityFn;
  
  return store(
    useCallback((state: T) => selectorRef.current(state), []),
    equalityRef.current
  );
}

/**
 * Hook for subscribing to store changes with cleanup
 */
export function useStoreSubscription<T>(
  store: UseBoundStore<StoreApi<T>>,
  listener: (state: T, prevState: T) => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const unsubscribe = store.subscribe(listener);
    return unsubscribe;
  }, [store, listener, ...deps]);
}

/**
 * Hook for tracking store performance and debugging
 */
export function useStoreDebug<T>(
  store: UseBoundStore<StoreApi<T>>,
  storeName: string,
  enabled = process.env.NODE_ENV === 'development'
) {
  const renderCount = useRef(0);
  const lastState = useRef<T>();
  
  useEffect(() => {
    if (!enabled) return;
    
    renderCount.current += 1;
    const currentState = store.getState();
    
    if (lastState.current && lastState.current !== currentState) {
      console.group(`🏪 ${storeName} Store Update #${renderCount.current}`);
      console.log('Previous State:', lastState.current);
      console.log('Current State:', currentState);
      console.log('Render Count:', renderCount.current);
      console.groupEnd();
    }
    
    lastState.current = currentState;
  });
  
  return {
    renderCount: renderCount.current,
    currentState: store.getState()
  };
}

/**
 * Hook for optimistic updates with rollback capability
 */
export function useOptimisticUpdate<T>(
  store: UseBoundStore<StoreApi<T>>,
  updateFn: (state: T) => T
) {
  const previousState = useRef<T>();
  
  const applyOptimisticUpdate = useCallback(() => {
    previousState.current = store.getState();
    store.setState(updateFn);
  }, [store, updateFn]);
  
  const rollback = useCallback(() => {
    if (previousState.current) {
      store.setState(previousState.current);
      previousState.current = undefined;
    }
  }, [store]);
  
  const commit = useCallback(() => {
    previousState.current = undefined;
  }, []);
  
  return {
    applyOptimisticUpdate,
    rollback,
    commit,
    hasOptimisticUpdate: !!previousState.current
  };
}

/**
 * Hook for batching multiple store updates
 */
export function useStoreBatch<T>(store: UseBoundStore<StoreApi<T>>) {
  const updates = useRef<Array<(state: T) => T>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const batchUpdate = useCallback((updateFn: (state: T) => T) => {
    updates.current.push(updateFn);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (updates.current.length > 0) {
        store.setState((state) => {
          return updates.current.reduce((acc, update) => update(acc), state);
        });
        updates.current = [];
      }
    }, 0);
  }, [store]);
  
  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (updates.current.length > 0) {
      store.setState((state) => {
        return updates.current.reduce((acc, update) => update(acc), state);
      });
      updates.current = [];
    }
  }, [store]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    batchUpdate,
    flushUpdates,
    pendingUpdates: updates.current.length
  };
}

/**
 * Hook for creating computed values from store state
 */
export function useStoreComputed<T, U>(
  store: UseBoundStore<StoreApi<T>>,
  computeFn: (state: T) => U,
  deps: React.DependencyList = []
) {
  const computedRef = useRef<U>();
  const depsRef = useRef(deps);
  
  return store(
    useCallback((state: T) => {
      const depsChanged = !depsRef.current.every((dep, index) => dep === deps[index]);
      
      if (!computedRef.current || depsChanged) {
        computedRef.current = computeFn(state);
        depsRef.current = deps;
      }
      
      return computedRef.current;
    }, [computeFn, deps])
  );
}

/**
 * Hook for store state persistence
 */
export function useStorePersistence<T>(
  store: UseBoundStore<StoreApi<T>>,
  key: string,
  options: {
    serialize?: (state: T) => string;
    deserialize?: (str: string) => T;
    storage?: Storage;
  } = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    storage = localStorage
  } = options;
  
  // Load initial state from storage
  useEffect(() => {
    try {
      const stored = storage.getItem(key);
      if (stored) {
        const parsedState = deserialize(stored);
        store.setState(parsedState);
      }
    } catch (error) {
      console.warn(`Failed to load state from storage for key "${key}":`, error);
    }
  }, [key, deserialize, storage, store]);
  
  // Subscribe to state changes and persist
  useStoreSubscription(
    store,
    useCallback((state: T) => {
      try {
        const serialized = serialize(state);
        storage.setItem(key, serialized);
      } catch (error) {
        console.warn(`Failed to persist state for key "${key}":`, error);
      }
    }, [key, serialize, storage]),
    [key, serialize, storage]
  );
}
