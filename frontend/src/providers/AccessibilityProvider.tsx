'use client';

import React from 'react';
import { AccessibilityProvider as AccessibilityContextProvider } from '@/contexts/accessibility-context';
import { GlobalAnnouncer } from '@/components/accessibility/screen-reader-announcer';
import { KeyboardShortcutsDialog } from '@/components/accessibility/keyboard-shortcuts-dialog';

/**
 * Provider component that wraps the application with accessibility features
 */
export default function AccessibilityProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <AccessibilityContextProvider>
      {children}
      <GlobalAnnouncer />
      <KeyboardShortcutsDialog />
    </AccessibilityContextProvider>
  );
}
