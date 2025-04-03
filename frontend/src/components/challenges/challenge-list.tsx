'use client'

import React from 'react';
import { ChallengeCard } from './challenge-card';
import { useGameStore, Challenge as StoreChallenge, GamePhase } from '@/store/useGameStore';
import { useGetChallenges, Challenge as ApiChallenge } from '@/services/api/services/challengeService';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface ChallengeListProps {
  maxItems?: number;
  challenges?: ApiChallenge[];
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * Component for displaying a list of challenges
 * Can either fetch challenges internally using useGetChallenges or accept them as props
 */
export const ChallengeList: React.FC<ChallengeListProps> = ({ 
  maxItems,
  challenges: propChallenges,
  isLoading: propIsLoading,
  error: propError
}) => {
  const { setGamePhase, setCurrentChallenge } = useGameStore(state => ({
    setGamePhase: state.setGamePhase,
    setCurrentChallenge: state.setCurrentChallenge
  }));

  // Use either provided challenges or fetch them
  const { 
    data: challengesResponse, 
    isLoading: queryIsLoading, 
    error: queryError,
  } = useGetChallenges();

  // Determine which values to use based on props or query results
  const challenges = propChallenges || challengesResponse?.data || [];
  const isLoading = propIsLoading !== undefined ? propIsLoading : queryIsLoading;
  const error = propError || queryError;

  const handleChallengeClick = (challenge: ApiChallenge) => {
    console.log('Selected challenge:', challenge.id);
    
    // Convert API challenge to store challenge format
    const storeChallenge: StoreChallenge = {
      ...challenge,
      // Ensure difficulty is one of the accepted enum values
      difficulty: (challenge.difficulty === 'Easy' || 
                 challenge.difficulty === 'Medium' || 
                 challenge.difficulty === 'Hard') 
                ? challenge.difficulty as StoreChallenge['difficulty']
                : 'Medium' // Default to Medium if not a valid value
    };
    
    // Save the challenge to the game store
    setCurrentChallenge(storeChallenge);
    
    // Set the game phase to round1
    setGamePhase(GamePhase.ROUND1);
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(maxItems || 3)].map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-8 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>Error loading challenges: {error.message || 'Unknown error'}</span>
      </div>
    );
  }

  if (challenges.length === 0) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No challenges found.</div>;
  }

  const displayedChallenges = maxItems ? challenges.slice(0, maxItems) : challenges;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {displayedChallenges.map(challenge => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          onClick={() => handleChallengeClick(challenge)}
        />
      ))}
    </div>
  );
}

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`border bg-card text-card-foreground shadow-sm rounded-lg ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
);

const CardContent: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

const CardFooter: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`flex items-center p-6 pt-0 ${className}`}>
    {children}
  </div>
);
