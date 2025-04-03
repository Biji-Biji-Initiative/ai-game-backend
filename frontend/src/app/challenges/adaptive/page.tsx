'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore, GamePhase } from '@/store/useGameStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useGenerateDynamicChallenge } from '@/services/api/services/adaptiveService';
import AIActivityVisualizer from '@/features/visualizer/AIActivityVisualizer';

export default function AdaptiveChallengePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  
  // Get necessary data from the game store
  const { 
    userId, 
    isAuthenticated, 
    personality, 
    focus, 
    setCurrentChallenge, 
    setGamePhase 
  } = useGameStore(state => ({
    userId: state.userId,
    isAuthenticated: state.isAuthenticated,
    personality: state.personality,
    focus: state.focus,
    setCurrentChallenge: state.setCurrentChallenge,
    setGamePhase: state.setGamePhase
  }));
  
  // Get the mutation hook for generating a dynamic challenge
  const generateChallengeMutation = useGenerateDynamicChallenge();
  
  // Automatically generate a challenge when the page loads
  useEffect(() => {
    // Redirect to home if not authenticated
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    // Generate a dynamic challenge
    const generateChallenge = async () => {
      try {
        const response = await generateChallengeMutation.mutateAsync({
          userId,
          focusArea: focus || undefined,
          traits: personality.traits,
          preferredDifficulty: 'Medium'
        });
        
        if (response.success && response.data) {
          // Convert the API challenge to the store challenge format
          // The main difference is the difficulty type
          const storeChallenge = {
            ...response.data,
            // Ensure difficulty is one of the accepted enum values
            difficulty: (response.data.difficulty === 'Easy' || 
                        response.data.difficulty === 'Medium' || 
                        response.data.difficulty === 'Hard') 
                      ? response.data.difficulty 
                      : 'Medium' // Default to Medium if not a valid value
          };
          
          // Save the challenge to the game store
          setCurrentChallenge(storeChallenge);
          
          // Set the game phase to round1
          setGamePhase(GamePhase.ROUND1);
          
          // Show a success toast
          toast({
            title: "Challenge Generated",
            description: "Your personalized challenge is ready!",
            variant: "default"
          });
          
          // Navigate to the round1 page
          router.push('/round1');
        } else {
          throw new Error('Failed to generate challenge');
        }
      } catch (err) {
        console.error('Error generating challenge:', err);
        setError('We encountered an error while generating your challenge. Please try again.');
        
        toast({
          title: "Error",
          description: "Could not generate your challenge",
          variant: "destructive"
        });
      }
    };
    
    generateChallenge();
  }, [userId, isAuthenticated, personality, focus, setCurrentChallenge, setGamePhase, generateChallengeMutation, router, toast]);
  
  // Loading screen while generating challenge
  if (generateChallengeMutation.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-lg text-center p-8">
          <CardContent className="pt-6">
            <div className="h-48 flex items-center justify-center">
              <AIActivityVisualizer />
            </div>
            <p className="text-muted-foreground mt-6">
              Creating a challenge tailored to your profile, traits, and focus area...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error screen
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="flex items-center justify-center h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
              <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Challenge Generation Failed</h2>
            <p className="text-muted-foreground text-center mb-6">{error}</p>
            <div className="flex gap-3 mt-2">
              <Button variant="default" onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Default (should not normally be visible as we navigate away)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardContent className="pt-6">
          <p>Redirecting...</p>
        </CardContent>
      </Card>
    </div>
  );
} 