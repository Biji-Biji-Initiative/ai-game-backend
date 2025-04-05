'use client';

import { useEffect, useRef } from 'react';

type KeyCombination = string | string[];
type KeyHandler = (event: KeyboardEvent) => void;

interface KeyboardShortcut {
  keys: KeyCombination;
  handler: KeyHandler;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disabled?: boolean;
}

/**
 * Hook to manage keyboard shortcuts
 * @param shortcuts Array of keyboard shortcuts to register
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    // Check if a key combination matches the event
    const matchesKeyCombination = (combination: KeyCombination, event: KeyboardEvent): boolean => {
      // Convert single key to array for consistent handling
      const keys = Array.isArray(combination) ? combination : [combination];
      
      // Special handling for modifier keys
      const modifiers = {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      };
      
      // Check if all keys in the combination are pressed
      return keys.every(key => {
        if (key.toLowerCase() in modifiers) {
          return modifiers[key.toLowerCase() as keyof typeof modifiers];
        }
        
        // For regular keys, check if the event key matches
        return event.key.toLowerCase() === key.toLowerCase();
      });
    };

    // Handle keydown events
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if target is an input, textarea, or select
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Check each shortcut
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.disabled) {continue;}
        
        if (matchesKeyCombination(shortcut.keys, event)) {
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          
          shortcut.handler(event);
          break;
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

// Predefined keyboard shortcuts for common actions
export const KEYBOARD_SHORTCUTS = {
  OPEN_SETTINGS: ['?'],
  TOGGLE_DARK_MODE: ['ctrl', 'd'],
  NAVIGATE_HOME: ['g', 'h'],
  NAVIGATE_DASHBOARD: ['g', 'd'],
  NAVIGATE_CHALLENGES: ['g', 'c'],
  NAVIGATE_RESULTS: ['g', 'r'],
  HELP: ['shift', '?'],
  ESCAPE: ['Escape'],
};
