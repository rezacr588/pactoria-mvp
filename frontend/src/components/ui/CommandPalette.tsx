import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MagnifyingGlassIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import { useCommandPalette } from '../../hooks/useKeyboardShortcuts';
import { classNames } from '../../utils/classNames';
import Modal from './Modal';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchCommands } = useCommandPalette();

  const filteredCommands = useMemo(() => {
    return searchCommands(query);
  }, [query, searchCommands]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Update selected index when results change
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  const executeCommand = (commandIndex: number = selectedIndex) => {
    const command = filteredCommands[commandIndex];
    if (command) {
      try {
        command.action();
        onClose();
      } catch (error) {
        console.error('Error executing command:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        executeCommand();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0); // Reset to first item when searching
  };

  const groupedCommands = useMemo(() => {
    const groups: Record<string, typeof filteredCommands> = {};
    
    filteredCommands.forEach(command => {
      // Simple grouping logic - could be enhanced
      let group = 'Commands';
      if (command.title.includes('Go to')) {
        group = 'Navigation';
      } else if (command.title.includes('Create') || command.title.includes('New')) {
        group = 'Actions';
      } else if (command.title.includes('Settings') || command.title.includes('Help')) {
        group = 'System';
      }
      
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(command);
    });

    return groups;
  }, [filteredCommands]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="command-palette"
      closeOnBackdropClick={true}
      showCloseButton={false}
    >
      <div className="command-palette-container">
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-neutral-200 dark:border-secondary-700">
          <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400 dark:text-secondary-500 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-secondary-100 placeholder-neutral-500 dark:placeholder-secondary-400"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center space-x-1 text-xs text-neutral-400 dark:text-secondary-500">
            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-secondary-700 rounded border">↑</kbd>
            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-secondary-700 rounded border">↓</kbd>
            <span>to navigate</span>
            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-secondary-700 rounded border">⏎</kbd>
            <span>to select</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CommandLineIcon className="h-12 w-12 text-neutral-400 dark:text-secondary-500 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-neutral-900 dark:text-secondary-100 mb-1">
                No commands found
              </h3>
              <p className="text-sm text-neutral-500 dark:text-secondary-400">
                {query ? `No results for "${query}"` : 'Try typing to search for commands'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedCommands).map(([groupName, groupCommands]) => (
                <div key={groupName}>
                  {Object.keys(groupedCommands).length > 1 && (
                    <div className="px-4 py-2 text-xs font-semibold text-neutral-500 dark:text-secondary-400 uppercase tracking-wide">
                      {groupName}
                    </div>
                  )}
                  {groupCommands.map((command) => {
                    const globalIndex = filteredCommands.findIndex(c => c.id === command.id);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <div
                        key={command.id}
                        className={classNames(
                          'flex items-center justify-between px-4 py-3 cursor-pointer transition-colors',
                          isSelected 
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                            : 'hover:bg-neutral-50 dark:hover:bg-secondary-700 text-neutral-900 dark:text-secondary-100'
                        )}
                        onClick={() => executeCommand(globalIndex)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {command.title}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-secondary-400 truncate">
                            {command.description}
                          </div>
                        </div>
                        
                        {command.shortcut && (
                          <div className="ml-4 flex-shrink-0">
                            <div className="flex items-center space-x-1">
                              {command.shortcut.split(' + ').map((key, keyIndex) => (
                                <kbd
                                  key={keyIndex}
                                  className="px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-secondary-600 text-neutral-600 dark:text-secondary-300 rounded border border-neutral-200 dark:border-secondary-500"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-secondary-700 bg-neutral-50 dark:bg-secondary-800/50">
          <div className="flex items-center space-x-4 text-xs text-neutral-500 dark:text-secondary-400">
            <div className="flex items-center space-x-1">
              <CommandLineIcon className="h-3 w-3" />
              <span>Command Palette</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-secondary-600 rounded">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-secondary-600 rounded">K</kbd>
              <span>to open</span>
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-secondary-400">
            Press <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-secondary-600 rounded">Esc</kbd> to close
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CommandPalette;