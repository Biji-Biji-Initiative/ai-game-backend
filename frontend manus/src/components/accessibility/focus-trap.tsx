'use client';

import React, { useEffect, useRef } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  initialFocus?: boolean;
}

/**
 * A component that traps focus within its children
 * This is important for modals, dialogs, and other UI elements
 * that should prevent focus from leaving while they are active
 */
export const FocusTrap: React.FC<FocusTrapProps> = ({ 
  children, 
  active = true,
  initialFocus = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element when the trap becomes active
  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
    
    return () => {
      // Restore focus when the component is unmounted
      if (previousFocusRef.current && active) {
        previousFocusRef.current.focus();
      }
    };
  }, [active]);

  // Set initial focus when the trap becomes active
  useEffect(() => {
    if (active && initialFocus && containerRef.current) {
      // Find the first focusable element
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      } else {
        // If no focusable elements, focus the container itself
        containerRef.current.tabIndex = -1;
        containerRef.current.focus();
      }
    }
  }, [active, initialFocus]);

  // Handle tab key to keep focus within the container
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!active || !containerRef.current || e.key !== 'Tab') {return;}
    
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) {return;}
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // If shift+tab on first element, move to last element
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } 
    // If tab on last element, move to first element
    else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} tabIndex={-1}>
      {children}
    </div>
  );
};
