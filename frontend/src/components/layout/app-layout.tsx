'use client'

import React from 'react';
import { AppHeader } from './app-header';
import { useUserPreferencesStore } from '@/store/user-preferences-store';
import { SkipToContent } from '@/components/accessibility/skip-to-content';
import { useAccessibility } from '@/contexts/accessibility-context';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout component
 * Wraps content with header and applies global styling based on user preferences
 * NOTE: DOM class manipulation moved to app/layout.tsx for centralization
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { darkMode } = useUserPreferencesStore();
  const { highContrast, reduceMotion, largerText } = useAccessibility();
  
  // DOM manipulations moved to app/layout.tsx - removing these effects
  // to prevent conflicts and infinite update loops
  
  return (
    <div className={`min-h-screen bg-background font-sans antialiased ${darkMode ? 'dark' : ''} ${highContrast ? 'high-contrast' : ''} ${reduceMotion ? 'reduce-motion' : ''} ${largerText ? 'larger-text' : ''}`}>
      <div className="relative flex min-h-screen flex-col">
        <SkipToContent contentId="main-content" />
        <AppHeader />
        <div className="flex-1">
          <main id="main-content" className="container mx-auto px-4 py-6 sm:px-6 lg:px-8" tabIndex={-1}>
            {children}
          </main>
        </div>
        <footer className="border-t py-6 md:py-0">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} AI Fight Club. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Discover your human edge in an AI-powered world
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
