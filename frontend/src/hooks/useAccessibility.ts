import { useEffect, useState, useCallback, useRef } from 'react';
import { usePrefersReducedMotion, usePrefersHighContrast } from './useResponsive';

// Hook for managing focus
export const useFocusManagement = () => {
  const focusableElementsRef = useRef<HTMLElement[]>([]);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  const trapFocus = useCallback((containerElement: HTMLElement) => {
    const focusableElements = getFocusableElements(containerElement);
    focusableElementsRef.current = focusableElements;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    containerElement.addEventListener('keydown', handleKeyDown);

    // Focus first element
    firstFocusable?.focus();

    return () => {
      containerElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [getFocusableElements]);

  const saveFocus = useCallback(() => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (lastFocusedElementRef.current) {
      lastFocusedElementRef.current.focus();
      lastFocusedElementRef.current = null;
    }
  }, []);

  return {
    trapFocus,
    saveFocus,
    restoreFocus,
    getFocusableElements,
  };
};

// Hook for managing ARIA announcements
export const useAnnouncer = () => {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region for announcements
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('class', 'sr-only');
    announcer.setAttribute('id', 'announcer');
    document.body.appendChild(announcer);
    announcerRef.current = announcer;

    return () => {
      if (announcer.parentNode) {
        announcer.parentNode.removeChild(announcer);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return { announce };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (
  items: Array<{ id: string; element?: HTMLElement }>,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    onSelect?: (id: string) => void;
  } = {}
) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const { loop = true, orientation = 'vertical', onSelect } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (items.length === 0) return;

    let nextIndex = activeIndex;
    let shouldPreventDefault = true;

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = loop && activeIndex === items.length - 1 ? 0 : Math.min(activeIndex + 1, items.length - 1);
        } else {
          shouldPreventDefault = false;
        }
        break;
      
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = loop && activeIndex === 0 ? items.length - 1 : Math.max(activeIndex - 1, 0);
        } else {
          shouldPreventDefault = false;
        }
        break;
      
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = loop && activeIndex === items.length - 1 ? 0 : Math.min(activeIndex + 1, items.length - 1);
        } else {
          shouldPreventDefault = false;
        }
        break;
      
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = loop && activeIndex === 0 ? items.length - 1 : Math.max(activeIndex - 1, 0);
        } else {
          shouldPreventDefault = false;
        }
        break;
      
      case 'Home':
        nextIndex = 0;
        break;
      
      case 'End':
        nextIndex = items.length - 1;
        break;
      
      case 'Enter':
      case ' ':
        if (onSelect && items[activeIndex]) {
          onSelect(items[activeIndex].id);
        }
        break;
      
      default:
        shouldPreventDefault = false;
    }

    if (shouldPreventDefault) {
      e.preventDefault();
    }

    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
      setFocusedId(items[nextIndex]?.id || null);
      
      // Focus the element if available
      const element = items[nextIndex]?.element;
      if (element) {
        element.focus();
      }
    }
  }, [activeIndex, items, loop, orientation, onSelect]);

  const setFocus = useCallback((id: string) => {
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      setActiveIndex(index);
      setFocusedId(id);
      
      const element = items[index]?.element;
      if (element) {
        element.focus();
      }
    }
  }, [items]);

  return {
    activeIndex,
    focusedId,
    handleKeyDown,
    setFocus,
  };
};

// Hook for color contrast checking
export const useColorContrast = () => {
  const prefersHighContrast = usePrefersHighContrast();

  const calculateLuminance = useCallback((hex: string): number => {
    const rgb = hex.replace('#', '').match(/.{2}/g);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(component => {
      const value = parseInt(component, 16) / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, []);

  const calculateContrastRatio = useCallback((color1: string, color2: string): number => {
    const lum1 = calculateLuminance(color1);
    const lum2 = calculateLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }, [calculateLuminance]);

  const checkContrast = useCallback((foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): {
    ratio: number;
    passes: boolean;
    passesLarge: boolean;
  } => {
    const ratio = calculateContrastRatio(foreground, background);
    const minRatio = level === 'AAA' ? 7 : 4.5;
    const minRatioLarge = level === 'AAA' ? 4.5 : 3;

    return {
      ratio,
      passes: ratio >= minRatio,
      passesLarge: ratio >= minRatioLarge,
    };
  }, [calculateContrastRatio]);

  return {
    prefersHighContrast,
    checkContrast,
    calculateContrastRatio,
  };
};

// Hook for managing reduced motion
export const useReducedMotion = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const getAnimationClass = useCallback((normalClass: string, reducedClass?: string): string => {
    return prefersReducedMotion ? (reducedClass || '') : normalClass;
  }, [prefersReducedMotion]);

  const getTransition = useCallback((duration: string): string => {
    return prefersReducedMotion ? 'transition-none' : `transition-all duration-${duration}`;
  }, [prefersReducedMotion]);

  return {
    prefersReducedMotion,
    getAnimationClass,
    getTransition,
  };
};

// Hook for managing skip links
export const useSkipLinks = () => {
  const [skipLinks, setSkipLinks] = useState<Array<{ id: string; label: string }>>([]);

  const addSkipLink = useCallback((id: string, label: string) => {
    setSkipLinks(prev => [...prev.filter(link => link.id !== id), { id, label }]);
  }, []);

  const removeSkipLink = useCallback((id: string) => {
    setSkipLinks(prev => prev.filter(link => link.id !== id));
  }, []);

  const skipTo = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return {
    skipLinks,
    addSkipLink,
    removeSkipLink,
    skipTo,
  };
};

// Hook for managing ARIA descriptions
export const useAriaDescription = () => {
  const descriptionIds = useRef<Set<string>>(new Set());

  const addDescription = useCallback((id: string, text: string): string => {
    const descId = `${id}-description`;
    
    if (!descriptionIds.current.has(descId)) {
      const description = document.createElement('div');
      description.id = descId;
      description.textContent = text;
      description.className = 'sr-only';
      document.body.appendChild(description);
      descriptionIds.current.add(descId);
    }
    
    return descId;
  }, []);

  const removeDescription = useCallback((id: string) => {
    const descId = `${id}-description`;
    const element = document.getElementById(descId);
    
    if (element) {
      element.remove();
      descriptionIds.current.delete(descId);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup all descriptions on unmount
      descriptionIds.current.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.remove();
        }
      });
      descriptionIds.current.clear();
    };
  }, []);

  return {
    addDescription,
    removeDescription,
  };
};