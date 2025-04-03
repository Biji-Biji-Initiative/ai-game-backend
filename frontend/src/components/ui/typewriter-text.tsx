'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUserPreferencesStore } from '@/store';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

/**
 * TypewriterText component
 * Animates text being typed character by character
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 40,
  delay = 0,
  className = '',
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const { animationsEnabled } = useUserPreferencesStore();
  
  // Skip animation if animations are disabled
  const shouldAnimate = useMemo(() => animationsEnabled, [animationsEnabled]);
  
  useEffect(() => {
    // Reset state when text changes
    setDisplayedText('');
    setIsComplete(false);
    
    // If animations are disabled, just show the full text
    if (!shouldAnimate) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }
    
    // Initialize counters
    let currentIndex = 0;
    
    // Add delay before starting
    const startTimeout = setTimeout(() => {
      // Start the typewriter effect
      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);
      
      // Cleanup interval on unmount
      return () => clearInterval(interval);
    }, delay);
    
    // Cleanup timeout on unmount
    return () => clearTimeout(startTimeout);
  }, [text, speed, delay, shouldAnimate, onComplete]);
  
  return (
    <div className={className}>
      {displayedText}
      {!isComplete && shouldAnimate && (
        <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-0.5" />
      )}
    </div>
  );
};

export default TypewriterText;
