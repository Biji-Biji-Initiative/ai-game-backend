'use client';

import { useEffect } from 'react';
import { useUserPreferencesStore } from '@/store/user-preferences-store';
import { useAccessibility } from '@/contexts/accessibility-context';

/**
 * DOMClassApplier - Centralized component for applying CSS classes to document.documentElement
 * 
 * This component centralizes all DOM class manipulations in one place to avoid conflicts 
 * and potential infinite loops caused by multiple components trying to modify the same DOM elements.
 * 
 * Previously, these class manipulations were scattered across:
 * - ThemeToggle (dark mode)
 * - AppLayout (dark mode, animations)
 * - AccessibilityPanel (high contrast, reduce motion, larger text)
 */
export const DOMClassApplier = () => {
  const { darkMode, animationsEnabled } = useUserPreferencesStore();
  const { highContrast, reduceMotion, largerText } = useAccessibility();
  
  // Apply all classes to document.documentElement in one place
  useEffect(() => {
    // Dark mode
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Animations
    if (!animationsEnabled) {
      document.documentElement.classList.add('no-animations');
    } else {
      document.documentElement.classList.remove('no-animations');
    }
    
    // High contrast
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Motion reduction
    if (reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    
    // Larger text
    if (largerText) {
      document.documentElement.classList.add('larger-text');
    } else {
      document.documentElement.classList.remove('larger-text');
    }
    
    // Log that classes have been applied to help with debugging
    console.log('DOM classes applied:', { 
      darkMode, 
      animationsEnabled, 
      highContrast, 
      reduceMotion, 
      largerText 
    });
  }, [darkMode, animationsEnabled, highContrast, reduceMotion, largerText]);
  
  return null; // This component doesn't render anything
};

export default DOMClassApplier; 