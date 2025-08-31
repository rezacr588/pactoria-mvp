import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BreakpointValues {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

const defaultBreakpoints: BreakpointValues = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isXS: boolean;
  isSM: boolean;
  isMD: boolean;
  isLG: boolean;
  isXL: boolean;
  is2XL: boolean;
  orientation: 'portrait' | 'landscape';
}

export const useResponsive = (breakpoints: Partial<BreakpointValues> = {}): ResponsiveState => {
  const bp = { ...defaultBreakpoints, ...breakpoints };

  const getBreakpoint = useCallback((width: number): Breakpoint => {
    if (width >= bp['2xl']) return '2xl';
    if (width >= bp.xl) return 'xl';
    if (width >= bp.lg) return 'lg';
    if (width >= bp.md) return 'md';
    if (width >= bp.sm) return 'sm';
    return 'xs';
  }, [bp]);

  const getInitialState = useCallback((): ResponsiveState => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        breakpoint: 'lg',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isXS: false,
        isSM: false,
        isMD: false,
        isLG: true,
        isXL: false,
        is2XL: false,
        orientation: 'landscape',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    
    return {
      width,
      height,
      breakpoint,
      isMobile: breakpoint === 'xs' || breakpoint === 'sm',
      isTablet: breakpoint === 'md',
      isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
      isXS: breakpoint === 'xs',
      isSM: breakpoint === 'sm',
      isMD: breakpoint === 'md',
      isLG: breakpoint === 'lg',
      isXL: breakpoint === 'xl',
      is2XL: breakpoint === '2xl',
      orientation: width > height ? 'landscape' : 'portrait',
    };
  }, [getBreakpoint]);

  const [state, setState] = useState<ResponsiveState>(getInitialState);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setState(getInitialState());
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    
    // Set initial state
    setState(getInitialState());

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [getInitialState]);

  return state;
};

// Hook to check if current breakpoint matches condition
export const useBreakpoint = (condition: Breakpoint | `${Breakpoint}+` | `${Breakpoint}-`): boolean => {
  const { breakpoint } = useResponsive();
  
  if (condition.endsWith('+')) {
    const bp = condition.slice(0, -1) as Breakpoint;
    const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = order.indexOf(breakpoint);
    const targetIndex = order.indexOf(bp);
    return currentIndex >= targetIndex;
  }
  
  if (condition.endsWith('-')) {
    const bp = condition.slice(0, -1) as Breakpoint;
    const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = order.indexOf(breakpoint);
    const targetIndex = order.indexOf(bp);
    return currentIndex <= targetIndex;
  }
  
  return breakpoint === condition;
};

// Hook for responsive values
export const useResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>, fallback: T): T => {
  const { breakpoint } = useResponsive();
  
  // Check from current breakpoint down to find first available value
  const order: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const startIndex = order.indexOf(breakpoint);
  
  for (let i = startIndex; i < order.length; i++) {
    const bp = order[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  return fallback;
};

// Hook to detect touch device
export const useTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true, passive: true });

    return () => {
      window.removeEventListener('touchstart', checkTouch);
    };
  }, []);

  return isTouch;
};

// Hook for media queries
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

// Hook for detecting reduced motion preference
export const usePrefersReducedMotion = (): boolean => {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
};

// Hook for detecting dark mode preference
export const usePrefersDarkMode = (): boolean => {
  return useMediaQuery('(prefers-color-scheme: dark)');
};

// Hook for detecting high contrast preference
export const usePrefersHighContrast = (): boolean => {
  return useMediaQuery('(prefers-contrast: high)');
};