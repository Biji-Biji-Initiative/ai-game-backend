'use client';

import { ReactNode, useEffect } from 'react';
import { useGameStore, GamePhase } from '@/store/useGameStore';

interface GamePhaseWrapperProps {
  children: ReactNode;
  targetPhase: GamePhase;
}

/**
 * Wrapper component that ensures the game phase is set correctly
 * This component centralizes the game phase logic so it doesn't need to be
 * repeated in every page component
 */
export default function GamePhaseWrapper({ children, targetPhase }: GamePhaseWrapperProps) {
  const { gamePhase, setGamePhase } = useGameStore();
  
  // If the user reaches this page directly, ensure the game phase is set correctly
  useEffect(() => {
    if (gamePhase !== targetPhase) {
      setGamePhase(targetPhase);
    }
  }, [gamePhase, setGamePhase, targetPhase]);
  
  return <>{children}</>;
} 