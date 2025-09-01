import React from 'react';
import { CommandLineIcon } from '@heroicons/react/24/outline';
import { formatShortcut, KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import Modal from './Modal';

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'd',
      ctrl: true,
      action: () => {},
      description: 'Go to Dashboard',
      category: 'Navigation',
    },
    {
      key: 'c',
      ctrl: true,
      action: () => {},
      description: 'Go to Contracts',
      category: 'Navigation',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => {},
      description: 'Create New Contract',
      category: 'Actions',
    },
    {
      key: 't',
      ctrl: true,
      action: () => {},
      description: 'Go to Team',
      category: 'Navigation',
    },
    {
      key: 's',
      ctrl: true,
      action: () => {},
      description: 'Go to Settings',
      category: 'Navigation',
    },
    {
      key: 'a',
      ctrl: true,
      action: () => {},
      description: 'Go to Analytics',
      category: 'Navigation',
    },
    {
      key: 'k',
      meta: true,
      action: () => {},
      description: 'Open Command Palette',
      category: 'Actions',
    },
    {
      key: '/',
      action: () => {},
      description: 'Focus Search',
      category: 'Actions',
    },
    {
      key: 'Escape',
      action: () => {},
      description: 'Close Modal/Escape',
      category: 'Actions',
    },
    {
      key: '?',
      shift: true,
      action: () => {},
      description: 'Show This Help',
      category: 'Help',
    },
  ];

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryOrder = ['Navigation', 'Actions', 'Help', 'General'];
  const orderedCategories = categoryOrder.filter(category => groupedShortcuts[category]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Keyboard Shortcuts"
      description="Speed up your workflow with these keyboard shortcuts"
      className="keyboard-shortcuts-help"
    >
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-secondary-300">
          <CommandLineIcon className="h-5 w-5" />
          <span>Use these shortcuts to navigate faster through Pactoria</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orderedCategories.map(category => (
            <div key={category} className="space-y-3">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-secondary-100">
                {category}
              </h3>
              
              <div className="space-y-2">
                {groupedShortcuts[category].map((shortcut, index) => (
                  <div
                    key={`${category}-${index}`}
                    className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-secondary-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-secondary-700 transition-colors"
                  >
                    <span className="text-sm text-neutral-700 dark:text-secondary-300 font-medium">
                      {shortcut.description}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      {formatShortcut(shortcut).split(' + ').map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 text-xs font-medium bg-white dark:bg-secondary-600 text-neutral-600 dark:text-secondary-300 rounded border border-neutral-200 dark:border-secondary-500 shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pro Tips */}
        <div className="border-t border-neutral-200 dark:border-secondary-700 pt-6">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-secondary-100 mb-4">
            Pro Tips
          </h3>
          <div className="space-y-3 text-sm text-neutral-600 dark:text-secondary-300">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                Keyboard shortcuts work from anywhere in the application, except when typing in form fields.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                Use the Command Palette (<kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-secondary-700 rounded text-xs">⌘K</kbd>) 
                to quickly find and execute any action.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                Press <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-secondary-700 rounded text-xs">Esc</kbd> to 
                close any modal, dropdown, or overlay.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>
                In tables and lists, use arrow keys to navigate and <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-secondary-700 rounded text-xs">Enter</kbd> to select.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-secondary-700">
          <div className="text-xs text-neutral-500 dark:text-secondary-400">
            Shortcuts may vary based on your operating system
          </div>
          <button
            onClick={onClose}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Got it!
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;