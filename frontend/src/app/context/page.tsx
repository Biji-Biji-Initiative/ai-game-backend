'use client';

import { useEffect } from 'react';
import { useGameStore, GamePhase } from '@/store/useGameStore';
import UserContextForm from '@/features/onboarding/UserContextForm';

export default function ContextPage() {
  const { gamePhase, setGamePhase } = useGameStore();
  
  // If the user reaches this page directly, ensure the game phase is set correctly
  useEffect(() => {
    if (gamePhase !== GamePhase.CONTEXT) {
      setGamePhase(GamePhase.CONTEXT);
    }
  }, [gamePhase, setGamePhase]);
  
  return (
    <div className="container max-w-5xl mx-auto p-4 my-8">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Personal Context</h1>
        <p className="text-gray-600 dark:text-gray-300 text-center max-w-2xl">
          Before we assess your human edge, we need to understand your professional context.
          This helps us provide more relevant insights tailored to your specific situation.
        </p>
      </div>
      
      <UserContextForm />
    </div>
  );
}
