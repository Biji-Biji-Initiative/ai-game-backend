'use client';

import { useEffect, useRef } from 'react';
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
interface DOMClassApplierProps {
  children: React.ReactNode;
}

export const DOMClassApplier = ({ children }: DOMClassApplierProps) => {
  // To avoid potential deep object comparison issues, read only primitive values
  const darkMode = useUserPreferencesStore((state) => state.darkMode);
  const animationsEnabled = useUserPreferencesStore((state) => state.animationsEnabled);
  
  // Read accessibility primitives and immediately destructure
  const { highContrast, reduceMotion, largerText } = useAccessibility();

  // Use ref to store previous values to compare against
  const previousValues = useRef({
    darkMode,
    animationsEnabled,
    highContrast,
    reduceMotion,
    largerText
  });

  // Apply DOM classes when values change
  useEffect(() => {
    // Safeguard: Skip effect in SSR environment
    if (typeof document === 'undefined') {
      return;
    }

    // Helper function to safely toggle class
    const toggleClass = (className: string, active: boolean) => {
      if (active) {
        document.documentElement.classList.add(className);
      } else {
        document.documentElement.classList.remove(className);
      }
    };

    // Apply all DOM classes in a single batch
    toggleClass('dark', darkMode);
    toggleClass('no-animations', !animationsEnabled);
    toggleClass('high-contrast', highContrast);
    toggleClass('reduce-motion', reduceMotion);
    toggleClass('larger-text', largerText);

    // Create a local copy of current values for comparison
    const currentValues = {
      darkMode,
      animationsEnabled,
      highContrast,
      reduceMotion,
      largerText
    };

    // Update the ref using the local copy - but only if something changed
    if (
      currentValues.darkMode !== previousValues.current.darkMode ||
      currentValues.animationsEnabled !== previousValues.current.animationsEnabled ||
      currentValues.highContrast !== previousValues.current.highContrast ||
      currentValues.reduceMotion !== previousValues.current.reduceMotion ||
      currentValues.largerText !== previousValues.current.largerText
    ) {
      previousValues.current = { ...currentValues };
    }

  // Dependencies: Include only primitive values, not objects or references
  }, [darkMode, animationsEnabled, highContrast, reduceMotion, largerText]);

  // Simple render - only children
  return <>{children}</>;
};

export default DOMClassApplier; 