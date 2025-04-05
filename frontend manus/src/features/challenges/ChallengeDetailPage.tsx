'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useChallenge } from "@/services/api/services/challengeService";
import { useGameStore, GamePhase } from '@/store/useGameStore';
import { AlertCircle, Clock, BarChart2, ArrowLeft, Play } from 'lucide-react';
import { ChallengeCompatibilityDisplay } from '@/components/challenges/challenge-compatibility';
import ApiError from '@/components/ui/api-error';
import { UIChallenge } from '@/types/api';

export default function ChallengeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { setCurrentChallenge, setGamePhase, isAuthenticated } = useGameStore(state => ({
    setCurrentChallenge: state.setCurrentChallenge,
    setGamePhase: state.setGamePhase,
    isAuthenticated: state.isAuthenticated
  }));
  
  // Get challenge ID from URL params
  const { id } = params;
  
  // Fetch challenge details
  const { data: challengeResponse, isLoading, error, refetch } = useChallenge(id);
  const apiChallenge = challengeResponse?.data;
  
  // Map API challenge to UI challenge with proper type handling
  let challenge: UIChallenge | null = null;
  
  if (apiChallenge) {
    // Get difficulty with proper type validation
    let difficulty: "beginner" | "intermediate" | "advanced" | "expert" | undefined;
    
    if (apiChallenge.difficulty === "beginner" || 
        apiChallenge.difficulty === "intermediate" || 
        apiChallenge.difficulty === "advanced" || 
        apiChallenge.difficulty === "expert") {
      difficulty = apiChallenge.difficulty;
    } else {
      difficulty = "intermediate"; // Default fallback
    }
    
    challenge = {
      // Required fields from API Challenge
      id: apiChallenge.id,
      content: apiChallenge.description || '',
      userEmail: 'system@example.com', // Mock value
      status: 'pending',
      createdAt: new Date().toISOString(),
      
      // Optional fields from API Challenge
      focusArea: apiChallenge.focusArea,
      difficulty: difficulty,
      
      // UI-specific fields
      title: apiChallenge.title || 'Challenge',
      description: apiChallenge.description || '',
      category: apiChallenge.focusArea || 'General',
      estimatedTime: '15 min',
      tags: apiChallenge.objectives || [],
      matchScore: 85, // Mock score
    };
  }
  
  // Handle Start Challenge button click
  const handleStartChallenge = () => {
    if (challenge) {
      // Save the challenge to the game store
      setCurrentChallenge(challenge);
      
      // Set the game phase to round1
      setGamePhase(GamePhase.ROUND1);
      
      // Navigate to the game page
      router.push('/game');
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/challenges')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Challenges
          </Button>
          
          <Card className="w-full shadow-lg">
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-32 w-full rounded-md" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/challenges')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Challenges
          </Button>
          
          <Card className="w-full shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600 dark:text-red-400">
                <AlertCircle className="mr-2 h-5 w-5" />
                Challenge Not Found
              </CardTitle>
              <CardDescription>
                We couldn&apos;t find the challenge you&apos;re looking for.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiError 
                error={error || new Error("Challenge not found or not available")} 
                retry={() => refetch()}
                title="Error Loading Challenge"
              />
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/challenges')}>
                Browse All Challenges
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  // Successfully loaded challenge
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/challenges')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Challenges
        </Button>
        
        {/* Display compatibility for authenticated users */}
        {isAuthenticated && challenge && (
          <ChallengeCompatibilityDisplay 
            challengeId={challenge.id || ''}
            isAuthenticated={isAuthenticated}
            showDetailed={true}
          />
        )}
        
        <Card className="w-full shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {challenge?.title || 'Challenge Title'}
                </CardTitle>
                <CardDescription className="mt-2">
                  Category: {challenge?.category || 'General'}
                </CardDescription>
              </div>
              <Badge 
                variant={
                  challenge?.difficulty === 'beginner' ? 'secondary' :
                  challenge?.difficulty === 'intermediate' ? 'default' :
                  'destructive'
                }
                className="text-sm"
              >
                {challenge?.difficulty || 'intermediate'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">Challenge Description</h3>
              <p className="text-gray-700 dark:text-gray-300">
                {challenge?.description || 'No description available'}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {challenge?.tags?.map((tag: string) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-medium">Estimated Time</h3>
                </div>
                <p className="mt-2 text-lg">{challenge?.estimatedTime || '15 min'}</p>
              </div>
              
              {challenge?.matchScore && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-green-500" />
                    <h3 className="font-medium">Match Score</h3>
                  </div>
                  <p className="mt-2 text-lg">{challenge?.matchScore}% match</p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t pt-6">
            <Button 
              variant="outline" 
              onClick={() => router.push('/challenges')}
            >
              Browse More
            </Button>
            <Button 
              onClick={handleStartChallenge}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Challenge
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 