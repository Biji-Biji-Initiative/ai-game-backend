'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/useGameStore';
import { useGeneratePersonalityInsights } from '@/services/api/services/personalityService';
import { Brain, Lightbulb, Users, Zap } from 'lucide-react';

export function PersonalitySnippets() {
  const { personality } = useGameStore(state => ({
    personality: state.personality
  }));
  
  // Get personality insights
  const { data: insightsData, isLoading, error } = useGeneratePersonalityInsights(true);
  
  // Get top traits and attitudes
  const topTrait = personality.traits.length > 0 
    ? personality.traits.sort((a, b) => b.value - a.value)[0] 
    : null;
    
  const topAttitude = personality.attitudes.length > 0 
    ? personality.attitudes.sort((a, b) => b.strength - a.strength)[0] 
    : null;
  
  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Personality Profile</CardTitle>
          <CardDescription>
            We couldn&apos;t load your personality data at this time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Default state with insights
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="mr-2 h-5 w-5 text-indigo-500" />
          Your Personality Profile
        </CardTitle>
        <CardDescription>
          Key insights from your assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insightsData?.success && insightsData.data ? (
          <>
            <div className="space-y-3">
              {/* Communication Style */}
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Communication Style:</h4>
                  <p className="text-sm text-muted-foreground">
                    {insightsData.data.communicationStyle.primary} 
                    {insightsData.data.communicationStyle.secondary && 
                      ` with ${insightsData.data.communicationStyle.secondary} tendencies`}
                  </p>
                </div>
              </div>
              
              {/* AI Collaboration Strategy */}
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">AI Collaboration Strategy:</h4>
                  <p className="text-sm text-muted-foreground">
                    {insightsData.data.aiCollaborationStrategy.title}
                  </p>
                </div>
              </div>
              
              {/* Key Insight */}
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Key Insight:</h4>
                  <p className="text-sm text-muted-foreground">
                    {insightsData.data.keyTraitInsights[0]}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Trait and Attitude Badges */}
            <div className="pt-2">
              <h4 className="text-xs uppercase text-muted-foreground font-medium mb-2">Your Traits & Attitudes</h4>
              <div className="flex flex-wrap gap-2">
                {topTrait && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200">
                    {topTrait.name}: {topTrait.value}%
                  </Badge>
                )}
                {personality.traits.slice(1, 3).map(trait => (
                  <Badge key={trait.id} variant="outline">
                    {trait.name}: {trait.value}%
                  </Badge>
                ))}
                {topAttitude && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200">
                    {topAttitude.attitude}: {topAttitude.strength}
                  </Badge>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Complete your assessment to see your personality profile.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 