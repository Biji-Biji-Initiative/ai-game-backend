'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface AccessibilityContextType {
  isHighContrast: boolean;
  isLargerText: boolean;
  isReducedMotion: boolean;
  toggleHighContrast: () => void;
  toggleLargerText: () => void;
  toggleReducedMotion: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargerText, setIsLargerText] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Check for saved preferences in localStorage
    const savedHighContrast = localStorage.getItem('highContrast');
    const savedLargerText = localStorage.getItem('largerText');
    const savedReducedMotion = localStorage.getItem('reducedMotion');

    if (savedHighContrast === 'true') setIsHighContrast(true);
    if (savedLargerText === 'true') setIsLargerText(true);
    if (savedReducedMotion === 'true') setIsReducedMotion(true);
  }, []);

  const toggleHighContrast = () => {
    setIsHighContrast(prev => !prev);
    localStorage.setItem('highContrast', !isHighContrast.toString());
  };

  const toggleLargerText = () => {
    setIsLargerText(prev => !prev);
    localStorage.setItem('largerText', !isLargerText.toString());
  };

  const toggleReducedMotion = () => {
    setIsReducedMotion(prev => !prev);
    localStorage.setItem('reducedMotion', !isReducedMotion.toString());
  };

  return (
    <AccessibilityContext.Provider
      value={{
        isHighContrast,
        isLargerText,
        isReducedMotion,
        toggleHighContrast,
        toggleLargerText,
        toggleReducedMotion,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
