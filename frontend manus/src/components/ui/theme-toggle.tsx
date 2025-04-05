'use client'

import React, { useTransition } from 'react';
import { useUserPreferencesStore } from '@/store/user-preferences-store';
import { Switch } from './switch';
import { Label } from './label';
import { cn } from '@/lib/utils';

/**
 * Enhanced theme toggle component using shadcn/ui Switch component
 * Allows users to switch between light and dark modes
 * NOTE: DOM manipulation has been moved to app/layout.tsx for centralization
 */
export const ThemeToggle: React.FC = () => {
  const [isPending, startTransition] = useTransition();
  const { darkMode, setDarkMode } = useUserPreferencesStore();

  // Handler for the Switch's change event
  const handleCheckedChange = (checked: boolean) => {
    startTransition(() => {
      setDarkMode(checked);
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="dark-mode"
        disabled={isPending}
        checked={darkMode}
        onCheckedChange={handleCheckedChange}
      />
      <Label 
        htmlFor="dark-mode"
        className={cn(
          "text-sm font-medium cursor-pointer",
          darkMode ? "text-gray-300" : "text-gray-700"
        )}
      >
        <div className="flex items-center gap-2">
          {darkMode ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <span>Dark</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
              <span>Light</span>
            </>
          )}
        </div>
      </Label>
    </div>
  );
}
