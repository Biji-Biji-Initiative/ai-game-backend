'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAdaptiveRecommendations, AdaptiveRecommendation } from '@/services/api/services/adaptiveService';
import { Target, Award, ChevronRight, BookOpen, Brain, Lightbulb } from 'lucide-react';

interface AdaptiveRecommendationsProps {
  userId?: string;
}

export function AdaptiveRecommendations({ userId }: AdaptiveRecommendationsProps) {
  const router = useRouter();
  const { data: recommendationsData, isLoading, error } = useGetAdaptiveRecommendations(userId);

  // Handle recommendation click
  const handleRecommendationClick = (recommendation: AdaptiveRecommendation) => {
    if (recommendation.type === 'challenge' && recommendation.metadata?.challengeId) {
      router.push(`/challenges/${recommendation.metadata.challengeId}`);
    } else if (recommendation.type === 'focus_area' && recommendation.metadata?.focusAreaId) {
      router.push(`/focus?highlight=${recommendation.metadata.focusAreaId}`);
    } else {
      // For other recommendation types, just log for now
      console.log('Clicked recommendation:', recommendation);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personalized Recommendations</CardTitle>
          <CardDescription>
            We couldn&apos;t load your recommendations at this time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  // No recommendations
  if (!recommendationsData?.success || !recommendationsData.data || recommendationsData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-indigo-500" />
            Personalized Recommendations
          </CardTitle>
          <CardDescription>
            Complete more challenges to get personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As you use the platform more, we&apos;ll provide tailored recommendations to help you improve.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => router.push('/challenges')}>
            Browse All Challenges
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Default state with recommendations
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="mr-2 h-5 w-5 text-indigo-500" />
          Personalized Recommendations
        </CardTitle>
        <CardDescription>
          Suggestions tailored to your profile and progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendationsData.data.map((recommendation) => (
          <div 
            key={recommendation.id} 
            className="flex items-start gap-4 p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            onClick={() => handleRecommendationClick(recommendation)}
          >
            <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
              {recommendation.type === 'challenge' && (
                <Award className="h-5 w-5 text-amber-500" />
              )}
              {recommendation.type === 'focus_area' && (
                <Target className="h-5 w-5 text-indigo-500" />
              )}
              {recommendation.type === 'skill_development' && (
                <Brain className="h-5 w-5 text-green-500" />
              )}
              {recommendation.type === 'resource' && (
                <BookOpen className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium">{recommendation.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {recommendation.description}
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2 italic">
                {recommendation.rationale}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 