'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KEYBOARD_SHORTCUTS, useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { FocusTrap } from './focus-trap';

/**
 * Component to display available keyboard shortcuts
 */
export const KeyboardShortcutsDialog: React.FC = () => {
  const [open, setOpen] = useState(false);

  // Register keyboard shortcut to open the dialog
  useKeyboardShortcuts([
    {
      keys: KEYBOARD_SHORTCUTS.HELP,
      handler: () => setOpen(true),
      preventDefault: true,
    },
    {
      keys: KEYBOARD_SHORTCUTS.ESCAPE,
      handler: () => setOpen(false),
      disabled: !open,
    },
  ]);

  // Format key combination for display
  const formatKeyCombination = (keys: string | string[]): string => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    return keyArray.map(key => {
      // Format special keys
      switch (key.toLowerCase()) {
        case 'ctrl':
          return 'Ctrl';
        case 'alt':
          return 'Alt';
        case 'shift':
          return 'Shift';
        case 'meta':
          return '⌘';
        case 'escape':
          return 'Esc';
        default:
          return key.length === 1 ? key.toUpperCase() : key;
      }
    }).join(' + ');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="fixed bottom-4 right-4 rounded-full h-10 w-10"
            aria-label="Keyboard shortcuts"
          >
            <span className="text-lg">?</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[550px]">
          <FocusTrap active={open}>
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
              <DialogDescription>
                Use these keyboard shortcuts to navigate the application more efficiently.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Navigation</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <span>Go to Home</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md text-sm font-mono">
                      {formatKeyCombination(KEYBOARD_SHORTCUTS.NAVIGATE_HOME)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <span>Go to Dashboard</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md text-sm font-mono">
                      {formatKeyCombination(KEYBOARD_SHORTCUTS.NAVIGATE_DASHBOARD)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <span>Go to Challenges</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md text-sm font-mono">
                      {formatKeyCombination(KEYBOARD_SHORTCUTS.NAVIGATE_CHALLENGES)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <span>Go to Results</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md text-sm font-mono">
                      {formatKeyCombination(KEYBOARD_SHORTCUTS.NAVIGATE_RESULTS)}
                    </kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Application</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <span>Open Settings</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md text-sm font-mono">
                      {formatKeyCombination(KEYBOARD_SHORTCUTS.OPEN_SETTINGS)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <span>Toggle Dark Mode</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md text-sm font-mono">
                      {formatKeyCombination(KEYBOARD_SHORTCUTS.TOGGLE_DARK_MODE)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <span>Show Shortcuts</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md text-sm font-mono">
                      {formatKeyCombination(KEYBOARD_SHORTCUTS.HELP)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <span>Close Dialog</span>
                    <kbd className="px-2 py-1 bg-muted rounded-md text-sm font-mono">
                      {formatKeyCombination(KEYBOARD_SHORTCUTS.ESCAPE)}
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          </FocusTrap>
        </DialogContent>
      </Dialog>
    </>
  );
};
