import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
  } = options;

  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                        target.contentEditable === 'true' ||
                        target.closest('[contenteditable="true"]');

    if (isInputField) return;

    const matchedShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = Boolean(shortcut.ctrl) === event.ctrlKey;
      const shiftMatch = Boolean(shortcut.shift) === event.shiftKey;
      const altMatch = Boolean(shortcut.alt) === event.altKey;
      const metaMatch = Boolean(shortcut.meta) === event.metaKey;

      return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
    });

    if (matchedShortcut) {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      
      try {
        matchedShortcut.action();
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error);
      }
    }
  }, [enabled, preventDefault, stopPropagation]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return shortcuts;
};

export const useGlobalKeyboardShortcuts = (enabled: boolean = true) => {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'd',
      ctrl: true,
      action: () => navigate('/dashboard'),
      description: 'Go to Dashboard',
      category: 'Navigation',
    },
    {
      key: 'c',
      ctrl: true,
      action: () => navigate('/contracts'),
      description: 'Go to Contracts',
      category: 'Navigation',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => navigate('/contracts/new'),
      description: 'Create New Contract',
      category: 'Actions',
    },
    {
      key: 't',
      ctrl: true,
      action: () => navigate('/team'),
      description: 'Go to Team',
      category: 'Navigation',
    },
    {
      key: 's',
      ctrl: true,
      action: () => navigate('/settings'),
      description: 'Go to Settings',
      category: 'Navigation',
    },
    {
      key: 'a',
      ctrl: true,
      action: () => navigate('/analytics'),
      description: 'Go to Analytics',
      category: 'Navigation',
    },
    {
      key: '/',
      action: () => {
        // Focus search if available
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus Search',
      category: 'Actions',
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals, dropdowns, etc.
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        // Dispatch custom event for components to listen to
        document.dispatchEvent(new CustomEvent('closeModals'));
      },
      description: 'Close Modal/Escape',
      category: 'Actions',
    },
    {
      key: '?',
      shift: true,
      action: () => {
        // Show keyboard shortcuts help
        document.dispatchEvent(new CustomEvent('showKeyboardHelp'));
      },
      description: 'Show Keyboard Shortcuts Help',
      category: 'Help',
    },
  ];

  return useKeyboardShortcuts(shortcuts, { enabled });
};

export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts = [];
  
  if (shortcut.meta) parts.push('⌘');
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  
  // Format key
  let key = shortcut.key;
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '⏎',
    'Tab': '⇥',
    'Backspace': '⌫',
    'Delete': '⌦',
  };
  
  if (keyMap[key]) {
    key = keyMap[key];
  } else if (key.length === 1) {
    key = key.toUpperCase();
  }
  
  parts.push(key);
  
  return parts.join(' + ');
};

// Hook for command palette functionality
export const useCommandPalette = () => {
  const navigate = useNavigate();

  const commands = [
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      description: 'View your main dashboard',
      keywords: ['dashboard', 'home', 'overview'],
      action: () => navigate('/dashboard'),
      shortcut: 'Ctrl + D',
    },
    {
      id: 'contracts',
      title: 'View Contracts',
      description: 'Manage all your contracts',
      keywords: ['contracts', 'agreements', 'documents'],
      action: () => navigate('/contracts'),
      shortcut: 'Ctrl + C',
    },
    {
      id: 'new-contract',
      title: 'Create New Contract',
      description: 'Start creating a new contract',
      keywords: ['new', 'create', 'contract', 'add'],
      action: () => navigate('/contracts/new'),
      shortcut: 'Ctrl + N',
    },
    {
      id: 'team',
      title: 'Team Management',
      description: 'Manage your team members',
      keywords: ['team', 'users', 'members', 'people'],
      action: () => navigate('/team'),
      shortcut: 'Ctrl + T',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure your account settings',
      keywords: ['settings', 'preferences', 'config', 'account'],
      action: () => navigate('/settings'),
      shortcut: 'Ctrl + S',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View analytics and reports',
      keywords: ['analytics', 'reports', 'stats', 'metrics'],
      action: () => navigate('/analytics'),
      shortcut: 'Ctrl + A',
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help and support',
      keywords: ['help', 'support', 'documentation', 'faq'],
      action: () => navigate('/help'),
    },
  ];

  const searchCommands = useCallback((query: string) => {
    if (!query.trim()) return commands;

    const normalizedQuery = query.toLowerCase().trim();
    
    return commands.filter(command => {
      const matchesTitle = command.title.toLowerCase().includes(normalizedQuery);
      const matchesDescription = command.description.toLowerCase().includes(normalizedQuery);
      const matchesKeywords = command.keywords.some(keyword => 
        keyword.toLowerCase().includes(normalizedQuery)
      );
      
      return matchesTitle || matchesDescription || matchesKeywords;
    });
  }, []);

  return {
    commands,
    searchCommands,
  };
};