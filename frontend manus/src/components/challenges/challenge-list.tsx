'use client'

import React from 'react';
import { ChallengeCard } from './challenge-card';
import { useGameStore, GamePhase } from '@/store/useGameStore';
import { useGetChallenges } from '@/services/api/services';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { UIChallenge } from '@/types/api';
import logger from '@/lib/utils/logger';
import { Challenge } from '@/services/api/services/challengeService';

interface ChallengeListProps {
  maxItems?: number;
  challenges?: Challenge[];
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
    data: fetchedChallengesResponse, 
    isLoading: queryIsLoading, 
    error: queryError,
  } = useGetChallenges();

  // Determine which values to use based on props or query results
  const apiChallenges = propChallenges || 
    (fetchedChallengesResponse?.success ? fetchedChallengesResponse.data : []);
  const isLoading = propIsLoading !== undefined ? propIsLoading : queryIsLoading;
  const error = propError || (queryError as Error | null);

  // Function to convert Service Challenge to UIChallenge
  const convertToUIChallenge = (challenge: Challenge): UIChallenge => {
    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      content: challenge.description, // Use description as content
      difficulty: challenge.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      category: challenge.focusArea,
      focusArea: challenge.focusArea,
      userEmail: 'user@example.com', // Provide a default value
      status: 'pending', // Use a default status
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedTime: '15 min',
      tags: [challenge.type],
      matchScore: 90, // Default match score
      challengeType: challenge.type,
    };
  };

  const handleChallengeClick = (challenge: Challenge) => {
    logger.info('Challenge selected', { challengeId: challenge.id }, 'ChallengeList');
    
    // Convert Challenge to UIChallenge format expected by the game store
    const uiChallenge = convertToUIChallenge(challenge);
    
    // Save the challenge to the game store
    setCurrentChallenge(uiChallenge);
    
    // Set the game phase to round1
    setGamePhase(GamePhase.ROUND1);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

  if (!apiChallenges || apiChallenges.length === 0) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No challenges found.</div>;
  }

  const displayedChallenges = maxItems ? apiChallenges.slice(0, maxItems) : apiChallenges;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {displayedChallenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={convertToUIChallenge(challenge)}
          onClick={() => handleChallengeClick(challenge)}
        />
      ))}
    </div>
  );
}
