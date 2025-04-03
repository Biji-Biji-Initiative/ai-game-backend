'use client';

import React, { createContext, useContext } from 'react';
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
  const { accessibility } = useUserPreferencesStore();
  
  // Remove DOM manipulation - now handled by DOMClassApplier
  
  // Helper function to apply accessibility classes to component classes
  const applyAccessibilityClass = (baseClass: string): string => {
    const { highContrast, largerText } = accessibility;
    let classes = baseClass;
    
    if (highContrast) {
      classes += ' dark';
    }
    
    if (largerText) {
      classes += ' text-lg';
    }
    
    return classes;
  };
  
  return (
    <AccessibilityContext.Provider 
      value={{ 
        ...accessibility,
        applyAccessibilityClass,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};
