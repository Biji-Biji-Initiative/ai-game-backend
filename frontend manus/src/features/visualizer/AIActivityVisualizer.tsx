'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useUserPreferencesStore } from '@/store';

interface AIActivityVisualizerProps {
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * AIActivityVisualizer component
 * Visual indicator that shows AI is "thinking" or processing
 */
export const AIActivityVisualizer: React.FC<AIActivityVisualizerProps> = ({
  isActive = false,
  size = 'md',
  className = '',
}) => {
  const [dots, setDots] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const { animationsEnabled } = useUserPreferencesStore();

  // Size variations
  const sizeClasses = {
    sm: 'h-5 text-xs',
    md: 'h-6 text-sm',
    lg: 'h-8 text-base',
  };

  // Dot animation effect
  useEffect(() => {
    if (!isActive || !animationsEnabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      // Update every 350ms
      if (timestamp - lastUpdateRef.current > 350) {
        setDots(prev => (prev + 1) % 4);
        lastUpdateRef.current = timestamp;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, animationsEnabled]);

  // If not active, don't render
  if (!isActive) {return null;}

  return (
    <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
      <Loader2 className="animate-spin mr-2 h-4 w-4" />
      <span className="font-mono tracking-wider">
        AI thinking{'.'.repeat(dots)}
      </span>
    </div>
  );
};

export default AIActivityVisualizer;
