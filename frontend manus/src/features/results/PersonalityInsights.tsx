'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  Users, 
  BrainCircuit, 
  ListChecks, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Lightbulb
} from 'lucide-react';
import { useGeneratePersonalityInsights } from '@/services/api/services/personalityService';

// Define a proper interface for the UI component instead of importing from the service
// This represents the expected final shape of the data after processing
interface PersonalityInsightsData {
  overallSummary: string;
  communicationStyle: {
    primary: string;
    secondary: string;
    description: string;
  };
  workStyle: {
    strengths: string[];
    challenges: string[];
    recommendations: string[];
  };
  aiCollaborationStrategy: {
    title: string;
    description: string;
    tips: string[];
  };
  keyTraitInsights: string[];
  keyAttitudeInsights: string[];
}

interface PersonalityInsightsProps {
  showTitle?: boolean;
}

/**
 * Component for displaying detailed personality insights
 */
export default function PersonalityInsights({ showTitle = true }: PersonalityInsightsProps) {
  // Fetch insights data - pass the current user ID and enabled flag
  const { 
    data: insightsResponse, 
    isLoading, 
    error 
  } = useGeneratePersonalityInsights('current-user', true);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Error state
  if (error || !insightsResponse?.success || !insightsResponse?.data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Insights</AlertTitle>
        <AlertDescription>
          We couldn&apos;t load the detailed personality insights. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Transform the API response into our expected UI format
  const rawInsights = insightsResponse.data;
  
  // Helper function for safely extracting string values
  const safeString = (value: unknown, defaultValue: string = ''): string => {
    return typeof value === 'string' ? value : defaultValue;
  };
  
  // Helper function for safely extracting string arrays
  const safeStringArray = (value: unknown, defaultValue: string[] = []): string[] => {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : defaultValue;
  };
  
  // Create a properly structured insights object with type safety
  const insights: PersonalityInsightsData = {
    overallSummary: safeString(
      rawInsights.insights && typeof rawInsights.insights === 'object' 
        ? (rawInsights.insights as Record<string, unknown>).summary 
        : '',
      'No summary available'
    ),
    
    communicationStyle: {
      primary: safeString(
        rawInsights.communicationStyle && typeof rawInsights.communicationStyle === 'object'
          ? (rawInsights.communicationStyle as Record<string, unknown>).primary
          : '',
        'Not available'
      ),
      secondary: safeString(
        rawInsights.communicationStyle && typeof rawInsights.communicationStyle === 'object'
          ? (rawInsights.communicationStyle as Record<string, unknown>).secondary
          : '',
        'Not available'
      ),
      description: safeString(
        rawInsights.communicationStyle && typeof rawInsights.communicationStyle === 'object'
          ? (rawInsights.communicationStyle as Record<string, unknown>).description
          : '',
        'No communication style description available'
      )
    },
    
    workStyle: {
      strengths: safeStringArray(
        rawInsights.workStyle && typeof rawInsights.workStyle === 'object'
          ? (rawInsights.workStyle as Record<string, unknown>).strengths
          : [],
        ['No strengths identified']
      ),
      challenges: safeStringArray(
        rawInsights.workStyle && typeof rawInsights.workStyle === 'object'
          ? (rawInsights.workStyle as Record<string, unknown>).challenges
          : [],
        ['No challenges identified']
      ),
      recommendations: safeStringArray(
        rawInsights.workStyle && typeof rawInsights.workStyle === 'object'
          ? (rawInsights.workStyle as Record<string, unknown>).recommendations
          : [],
        ['No recommendations available']
      )
    },
    
    aiCollaborationStrategy: {
      title: safeString(
        rawInsights.aiCollaborationStrategy && typeof rawInsights.aiCollaborationStrategy === 'object'
          ? (rawInsights.aiCollaborationStrategy as Record<string, unknown>).title
          : '',
        'Generic Collaborator'
      ),
      description: safeString(
        rawInsights.aiCollaborationStrategy && typeof rawInsights.aiCollaborationStrategy === 'object'
          ? (rawInsights.aiCollaborationStrategy as Record<string, unknown>).description
          : '',
        'No collaboration strategy available'
      ),
      tips: safeStringArray(
        rawInsights.aiCollaborationStrategy && typeof rawInsights.aiCollaborationStrategy === 'object'
          ? (rawInsights.aiCollaborationStrategy as Record<string, unknown>).tips
          : [],
        ['No specific tips available']
      )
    },
    
    keyTraitInsights: safeStringArray(
      rawInsights.keyTraitInsights,
      ['No trait insights available']
    ),
    
    keyAttitudeInsights: safeStringArray(
      rawInsights.keyAttitudeInsights,
      ['No attitude insights available']
    )
  };

  return (
    <div className="space-y-8">
      {showTitle && (
        <h2 className="text-2xl font-bold">Personality Insights</h2>
      )}
      
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Overall Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{insights.overallSummary}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Communication Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Communication Style
            </CardTitle>
            <CardDescription>
              Primary: {insights.communicationStyle.primary} | Secondary: {insights.communicationStyle.secondary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{insights.communicationStyle.description}</p>
          </CardContent>
        </Card>

        {/* AI Collaboration Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              AI Collaboration Strategy
            </CardTitle>
            <CardDescription>{insights.aiCollaborationStrategy.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{insights.aiCollaborationStrategy.description}</p>
            <h4 className="font-medium text-sm mb-1">Tips:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {insights.aiCollaborationStrategy.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Work Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-green-600 dark:text-green-400" />
            Work Style Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium mb-2 text-sm text-green-700 dark:text-green-300">Strengths</h4>
            <ul className="list-none space-y-1 text-sm text-muted-foreground">
              {insights.workStyle.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-sm text-amber-700 dark:text-amber-300">Potential Challenges</h4>
            <ul className="list-none space-y-1 text-sm text-muted-foreground">
              {insights.workStyle.challenges.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-sm text-blue-700 dark:text-blue-300">Recommendations</h4>
            <ul className="list-none space-y-1 text-sm text-muted-foreground">
              {insights.workStyle.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Zap className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Trait Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Key Trait Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              {insights.keyTraitInsights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        {/* Attitude Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Key Attitude Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              {insights.keyAttitudeInsights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 