'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useUserPreferencesStore } from '@/store/user-preferences-store';

// Define the context type
interface AccessibilityContextType {
  highContrast: boolean;
  reduceMotion: boolean;
  largerText: boolean;
  applyAccessibilityClass: (baseClass: string) => string;
}

// Create the context with default values
const AccessibilityContext = createContext<AccessibilityContextType>({
  highContrast: false,
  reduceMotion: false,
  largerText: false,
  applyAccessibilityClass: (baseClass) => baseClass,
});

// Hook to use the accessibility context
export const useAccessibility = () => useContext(AccessibilityContext);

// Provider component
export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Select accessibility settings from the store
  const accessibility = useUserPreferencesStore((state) => state.accessibility);

  // Memoize the helper function based on its dependencies
  const applyAccessibilityClass = useCallback((baseClass: string): string => {
    let classes = baseClass;
    if (accessibility.highContrast) {
      classes += ' dark'; // Assuming highContrast implies dark mode for components
    }
    if (accessibility.largerText) {
      classes += ' text-lg'; // Example class for larger text
    }
    return classes;
  }, [accessibility.highContrast, accessibility.largerText]); // Depend only on the relevant primitive values

  // Memoize the context value object itself
  const contextValue = useMemo(() => ({
    highContrast: accessibility.highContrast,
    reduceMotion: accessibility.reduceMotion,
    largerText: accessibility.largerText,
    applyAccessibilityClass,
  }), [accessibility, applyAccessibilityClass]); // Depend on the entire accessibility object

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};
