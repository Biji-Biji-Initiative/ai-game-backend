import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Info, ThumbsUp, BrainCircuit } from 'lucide-react';
import { useGetChallengeCompatibility } from '@/services/api/services/personalityService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChallengeCompatibilityProps {
  challengeId: string;
  isAuthenticated?: boolean;
  showDetailed?: boolean;
}

/**
 * Component that displays challenge compatibility information with the user's personality profile
 */
export const ChallengeCompatibilityDisplay: React.FC<ChallengeCompatibilityProps> = ({
  challengeId,
  isAuthenticated = true,
  showDetailed = false
}) => {
  // Only fetch compatibility if user is authenticated
  const { data: compatibilityResponse, isLoading, error } = useGetChallengeCompatibility(
    challengeId,
    isAuthenticated
  );

  const compatibility = compatibilityResponse?.data;

  if (!isAuthenticated) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
        <Info className="h-3 w-3" />
        Sign in to see compatibility
      </Badge>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="h-4 w-24 mb-1" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  if (error || !compatibility) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-red-500">
        <AlertCircle className="h-3 w-3" />
        Compatibility unavailable
      </Badge>
    );
  }

  // Render compact version (for challenge cards)
  if (!showDetailed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm cursor-help">
              <Badge
                variant={compatibility.matchLevel === 'high' ? 'secondary' : 'outline'}
                className={
                  compatibility.matchLevel === 'high'
                    ? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : compatibility.matchLevel === 'medium'
                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                }
              >
                {compatibility.matchLevel === 'high' ? (
                  <ThumbsUp className="h-3 w-3 mr-1" />
                ) : (
                  <BrainCircuit className="h-3 w-3 mr-1" />
                )}
                {compatibility.score}% match
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium mb-1">Challenge Compatibility</p>
            <p className="text-sm mb-2">{compatibility.recommendation}</p>
            <div className="text-xs text-muted-foreground">
              {compatibility.matchLevel === 'high'
                ? 'Great fit for your profile!'
                : compatibility.matchLevel === 'medium'
                ? 'Good opportunity for growth'
                : 'Will push you outside your comfort zone'}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Render detailed version (for challenge detail page)
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <BrainCircuit className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          Personality Compatibility
        </h3>

        <div className="flex flex-col space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Match Score</span>
              <span
                className={
                  compatibility.matchLevel === 'high'
                    ? 'text-green-600 dark:text-green-400 font-semibold'
                    : compatibility.matchLevel === 'medium'
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-amber-600 dark:text-amber-400 font-semibold'
                }
              >
                {compatibility.score}%
              </span>
            </div>
            <Progress
              value={compatibility.score}
              className="h-2"
              indicatorClassName={
                compatibility.matchLevel === 'high'
                  ? 'bg-green-600 dark:bg-green-400'
                  : compatibility.matchLevel === 'medium'
                  ? 'bg-blue-600 dark:bg-blue-400'
                  : 'bg-amber-600 dark:bg-amber-400'
              }
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm">{compatibility.recommendation}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/20">
                {compatibility.primaryTraitMatch}
              </Badge>
              {compatibility.stretchTraits.map((trait) => (
                <Badge key={trait} variant="outline">
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 