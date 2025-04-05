import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '@/components/ui/button';
import { Challenge as ApiChallenge, UIChallenge } from '@/types/api';
import { GamePhase, useGameStore } from '@/store/useGameStore';
import { ChallengeCompatibilityDisplay } from './challenge-compatibility';

interface ChallengeCardProps {
  challenge: ApiChallenge | UIChallenge;
  onClick?: (challenge: ApiChallenge | UIChallenge) => void;
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
  
  // Helper function to safely get string values
  const getStringProp = (val: unknown): string => {
    if (val === null || val === undefined) {return '';}
    return typeof val === 'string' ? val : String(val);
  };
    
  // Format difficulty for badge styling
  const difficulty = typeof challenge.difficulty === 'string' ? challenge.difficulty : '';
  
  // Helper function to get the title - prioritizes UI fields then falls back
  const getTitle = (): string => {
    // If it's a UIChallenge with title property
    if ('title' in challenge && challenge.title) {
      return getStringProp(challenge.title);
    }
    // Otherwise try to get from content
    if (typeof challenge.content === 'string') {
      return challenge.content.substring(0, 30) + '...';
    } else if (challenge.content && typeof challenge.content === 'object') {
      // Try to extract title from content object if present
      const contentObj = challenge.content as Record<string, unknown>;
      if (contentObj.title && typeof contentObj.title === 'string') {
        return contentObj.title;
      }
    }
    // Last resort
    return 'Challenge Title';
  };

  // Helper function to get description
  const getDescription = (): string => {
    // If it's a UIChallenge with description
    if ('description' in challenge && challenge.description) {
      return getStringProp(challenge.description);
    }
    // Try to extract from content if it's an object
    if (challenge.content && typeof challenge.content === 'object') {
      const contentObj = challenge.content as Record<string, unknown>;
      if (contentObj.description && typeof contentObj.description === 'string') {
        return contentObj.description;
      }
    }
    // Fallback to string content or empty string
    return typeof challenge.content === 'string' ? challenge.content : '';
  };

  // Helper function to get tags
  const getTags = (): string[] => {
    // If it's a UIChallenge with tags
    if ('tags' in challenge && Array.isArray(challenge.tags)) {
      return challenge.tags.filter((tag): tag is string => 
        typeof tag === 'string' && tag.length > 0
      );
    }
    // Otherwise, use focus area or challenge type as a tag
    const tags: string[] = [];
    if (challenge.focusArea && typeof challenge.focusArea === 'string') {
      tags.push(challenge.focusArea);
    }
    if (challenge.challengeType && typeof challenge.challengeType === 'string') {
      tags.push(challenge.challengeType);
    }
    return tags;
  };
  
  // Get the estimated time with a fallback
  const getEstimatedTime = (): string => {
    if ('estimatedTime' in challenge && challenge.estimatedTime) {
      return getStringProp(challenge.estimatedTime);
    }
    return '15 min'; // Default fallback
  };
  
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <CardTitle className="text-lg sm:text-xl">
            {getTitle()}
          </CardTitle>
          <Badge 
            variant={
              difficulty === 'beginner' ? 'secondary' :
              difficulty === 'intermediate' ? 'default' :
              difficulty === 'advanced' ? 'destructive' :
              'outline'
            }
            className="w-fit"
          >
            {difficulty || 'unknown'}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 mt-1">
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 flex-grow">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {getTags().map((tag, index) => (
            <Badge key={`${tag}-${index}`} variant="outline" className="text-xs">
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
      <CardFooter className="flex flex-col sm:flex-row sm:justify-between pt-0 gap-2 flex-shrink-0">
        <div className="text-sm text-muted-foreground">
          {getEstimatedTime()}
        </div>
        <Button onClick={handleStartChallenge} className="w-full sm:w-auto">
          Start Challenge
        </Button>
      </CardFooter>
    </Card>
  );
};
