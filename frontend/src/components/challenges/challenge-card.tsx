import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '@/components/ui/button';
import { Challenge as ApiChallenge } from '@/services/api/services/challengeService';
import { GamePhase, useGameStore } from '@/store/useGameStore';
import { ChallengeCompatibilityDisplay } from './challenge-compatibility';

interface ChallengeCardProps {
  challenge: ApiChallenge;
  onClick?: (challenge: ApiChallenge) => void;
}

/**
 * Challenge card component for displaying a challenge
 */
export const ChallengeCard: React.FC<ChallengeCardProps> = ({ 
  challenge, 
  onClick 
}) => {
  const { setGamePhase, isAuthenticated } = useGameStore(state => ({ 
    setGamePhase: state.setGamePhase,
    isAuthenticated: state.isAuthenticated
  }));
  
  const handleStartChallenge = () => {
    if (onClick) {
      onClick(challenge);
    } else {
      // Default behavior is to start the game
      setGamePhase(GamePhase.ROUND1);
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{challenge.title}</CardTitle>
          <Badge 
            variant={
              challenge.difficulty === 'Easy' ? 'secondary' :
              challenge.difficulty === 'Medium' ? 'default' :
              'destructive'
            }
          >
            {challenge.difficulty}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {challenge.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {challenge.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        {/* Display challenge compatibility if authenticated */}
        {isAuthenticated && (
          <div className="mb-3">
            <ChallengeCompatibilityDisplay 
              challengeId={challenge.id} 
              isAuthenticated={isAuthenticated}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <div className="text-sm text-muted-foreground">
          {challenge.estimatedTime}
        </div>
        <Button onClick={handleStartChallenge}>
          Start Challenge
        </Button>
      </CardFooter>
    </Card>
  );
};
