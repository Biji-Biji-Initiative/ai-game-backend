'use client';

import React from 'react';
import { useGetAllEvaluations } from '@/services/api/services/evaluationService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
// Import UIEvaluation from centralized type system
import { UIEvaluation } from '@/types/api';

/**
 * EvaluationBreakdown component displays detailed evaluation metrics
 * for each round, including category scores and feedback
 */
export const EvaluationBreakdown = () => {
  const { data: evaluations, isLoading, error } = useGetAllEvaluations();

  // Show loading state
  if (isLoading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error || !evaluations?.data) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>
          Unable to load evaluation data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Sort rounds by number safely
  const sortedEvaluations: UIEvaluation[] = [...evaluations.data]
    .sort((a, b) => (a?.roundNumber ?? 0) - (b?.roundNumber ?? 0));

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">Your Human Edge Evaluation</CardTitle>
        <CardDescription>
          Analysis of your performance across all rounds, highlighting your unique human strengths
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={`round-${sortedEvaluations[0]?.roundNumber || 1}`}>
          <TabsList className="mb-4">
            {sortedEvaluations.map((evaluation) => (
              <TabsTrigger key={evaluation.roundNumber} value={`round-${evaluation.roundNumber}`}>
                Round {evaluation.roundNumber}
              </TabsTrigger>
            ))}
            <TabsTrigger value="overall">Overall</TabsTrigger>
          </TabsList>

          {/* Individual round tabs */}
          {sortedEvaluations.map((evaluation) => (
            <TabsContent key={evaluation.roundNumber} value={`round-${evaluation.roundNumber}`}>
              <div className="space-y-6">
                {/* Overall score */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">Overall Score</h3>
                    <span className="text-xl font-bold">{evaluation.overallScore}%</span>
                  </div>
                  <Progress value={evaluation.overallScore} className="h-2" />
                </div>

                {/* Summary */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Round Summary</h3>
                  <p className="text-muted-foreground">{evaluation.summary}</p>
                </div>

                {/* Strengths and areas for improvement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Your Strengths</h3>
                    <ul className="space-y-2">
                      {(evaluation.strengths ?? []).map((strength, index) => (
                        <li key={index} className="flex items-start">
                          <Badge className="mr-2 bg-green-500" variant="secondary">✓</Badge>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Areas for Development</h3>
                    <ul className="space-y-2">
                      {(evaluation.areasForImprovement ?? []).map((area, index) => (
                        <li key={index} className="flex items-start">
                          <Badge className="mr-2 bg-amber-500" variant="secondary">→</Badge>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Detailed category breakdown */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Detailed Breakdown</h3>
                  <div className="space-y-4">
                    {(evaluation.categories ?? []).map((category) => (
                      <div key={category?.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{category?.name ?? 'Unknown Category'}</h4>
                          <span className="font-bold">{category?.score ?? 0}%</span>
                        </div>
                        <Progress value={category?.score ?? 0} className="h-2 mb-2" />
                        <p className="text-sm text-muted-foreground">{category?.feedback ?? 'No feedback'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}

          {/* Overall tab */}
          <TabsContent value="overall">
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Overall Human Edge Analysis</h3>
                <p className="text-muted-foreground">
                  Based on your responses across all rounds, you&apos;ve demonstrated key human edge capabilities 
                  that complement and extend beyond AI capabilities. Your combined score reflects your overall 
                  effectiveness in leveraging uniquely human strengths.
                </p>
              </div>

              {/* Average score across all rounds */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Combined Score</h3>
                  <span className="text-xl font-bold">
                    {Math.round(
                      sortedEvaluations.reduce((sum, evaluation) => sum + (evaluation?.overallScore ?? 0), 0) / 
                      (sortedEvaluations.length || 1)
                    )}%
                  </span>
                </div>
                <Progress 
                  value={
                    Math.round(
                      sortedEvaluations.reduce((sum, evaluation) => sum + (evaluation?.overallScore ?? 0), 0) / 
                      (sortedEvaluations.length || 1)
                    )
                  } 
                  className="h-2" 
                />
              </div>

              {/* Top strengths across all rounds */}
              <div>
                <h3 className="text-lg font-medium mb-2">Your Top Human Edge Qualities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Extract top categories from all rounds */}
                  {sortedEvaluations
                    .flatMap(evaluation => evaluation?.categories ?? [])
                    .filter(category => category)
                    .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))
                    .slice(0, 4)
                    .map((category, index) => (
                      <div key={category?.id || index} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{category?.name ?? 'Unknown Category'}</h4>
                          <span className="font-bold">{category?.score ?? 0}%</span>
                        </div>
                        <Progress value={category?.score ?? 0} className="h-2 mb-2" />
                        <p className="text-sm text-muted-foreground">{category?.feedback ?? 'No feedback'}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        These evaluations are based on your responses to AI Fight Club challenges, measuring your unique human edge capabilities.
      </CardFooter>
    </Card>
  );
};

export default EvaluationBreakdown;
