'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { useGetAdaptiveRecommendations } from '@/services/api/services/adaptiveService';
import { ApiError } from '@/components/ui/api-error';
import { AdaptiveRecommendation } from '@/types/api';

interface AdaptiveRecommendationsProps {
  userId?: string;
  className?: string;
}

export const AdaptiveRecommendations: React.FC<AdaptiveRecommendationsProps> = ({
  userId,
  className,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const [currentRecommendationIndex, setCurrentRecommendationIndex] = useState<number>(0);
  
  // Use limit and proper enabled flag
  const { data, isLoading, isError } = useGetAdaptiveRecommendations(
    userId, 
    3,  // Limit to 3 recommendations
    !!userId // Only enable if userId exists
  );
  
  // Memoize the recommendations array to prevent unnecessary re-renders
  const recommendations = useMemo(() => {
    return data?.success && data.data ? data.data : [];
  }, [data]);
  
  // Only reset the index when recommendations change and there are actual recommendations
  useEffect(() => {
    if (recommendations.length > 0) {
      setCurrentRecommendationIndex(0);
    }
  }, [recommendations.length]);
  
  // Memoize the current recommendation to prevent unnecessary re-renders
  const currentRecommendation = useMemo(() => {
    return recommendations[currentRecommendationIndex];
  }, [recommendations, currentRecommendationIndex]);
  
  // Memoize the navigation handler to prevent unnecessary re-renders
  const handleNextRecommendation = useCallback(() => {
    if (recommendations.length > 0) {
      setCurrentRecommendationIndex(
        (prev) => (prev + 1) % recommendations.length
      );
    }
  }, [recommendations.length]);
  
  // Memoize the action click handler to prevent unnecessary re-renders
  const handleActionClick = useCallback((recommendation: AdaptiveRecommendation) => {
    switch (recommendation.type) {
      case 'challenge':
        router.push(`/challenges/${recommendation.contentId}`);
        break;
      case 'skill_focus':
        router.push(`/skills/${recommendation.contentId}`);
        break;
      case 'resource':
        if (recommendation.metadata?.url) {
          window.open(recommendation.metadata.url as string, '_blank');
        } else {
          router.push(`/resources/${recommendation.contentId}`);
        }
        break;
      default:
        toast({
          title: 'Not implemented',
          description: `Action for ${recommendation.type} is not implemented yet.`,
        });
    }
  }, [router, toast]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-1/3" />
        </CardFooter>
      </Card>
    );
  }

  if (isError || !recommendations.length) {
    return null; // Don't show anything if there's an error or no recommendations
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
        <CardDescription>Personalized suggestions based on your progress</CardDescription>
      </CardHeader>
      {currentRecommendation && (
        <CardContent>
          <h3 className="font-medium text-lg mb-2">
            {currentRecommendation.type === 'challenge' && 'Try this challenge'}
            {currentRecommendation.type === 'skill_focus' && 'Focus on this skill'}
            {currentRecommendation.type === 'resource' && 'Check out this resource'}
            {currentRecommendation.type === 'difficulty_adjustment' && 'Difficulty adjustment'}
          </h3>
          <p className="text-muted-foreground">{currentRecommendation.reason}</p>
        </CardContent>
      )}
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextRecommendation}
          disabled={recommendations.length <= 1}
        >
          Next
        </Button>
        {currentRecommendation && (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => handleActionClick(currentRecommendation)}
          >
            {currentRecommendation.type === 'challenge' && 'Go to challenge'}
            {currentRecommendation.type === 'skill_focus' && 'Explore skill'}
            {currentRecommendation.type === 'resource' && 'View resource'}
            {currentRecommendation.type === 'difficulty_adjustment' && 'Apply'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}; 