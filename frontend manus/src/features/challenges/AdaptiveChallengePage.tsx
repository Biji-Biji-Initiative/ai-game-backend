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
import { UIChallenge, mapToUIChallenge, validateChallenge } from '@/types/api';
import { z } from 'zod';
import { schemas } from '@/lib/api/generated-zodios-client';

// Define a schema for the API response structure specifically for this component
const ApiResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  data: schemas.Challenge.optional(),
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    details: z.any().optional()
  }).optional()
});

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
      void router.push('/');
      return;
    }
    
    // Generate a dynamic challenge
    const generateChallenge = async () => {
      try {
        // Validate that userId exists before making the API call
        if (!userId) {
          throw new Error('User ID is required to generate a challenge');
        }
        
        const response = await generateChallengeMutation.mutateAsync({
          userId,
          // Convert FocusArea to string if it exists
          focusArea: focus ? focus.name : undefined,
          traits: personality.traits,
          preferredDifficulty: 'intermediate'
        });
        
        // Validate the API response using the schema
        const validationResult = ApiResponseSchema.safeParse(response);
        
        if (!validationResult.success) {
          console.error('API response validation failed:', validationResult.error);
          throw new Error('Invalid API response format');
        }
        
        const validResponse = validationResult.data;
        
        if (validResponse.success && validResponse.data) {
          // Validate the challenge data
          const validChallenge = validateChallenge(validResponse.data);
          
          if (!validChallenge) {
            throw new Error('Invalid challenge data received');
          }
          
          // Convert the API challenge to the store challenge format using our mapper
          const storeChallenge = mapToUIChallenge(validChallenge);
          
          // Add any additional UI-specific fields needed that aren't in the mapper
          const enhancedChallenge: UIChallenge = {
            ...storeChallenge,
            matchScore: 95, // Adaptive challenges are highly personalized
            estimatedTime: '15-20 min',
          };
          
          // Save the challenge to the game store
          setCurrentChallenge(enhancedChallenge);
          
          // Set the game phase to round1
          setGamePhase(GamePhase.ROUND1);
          
          // Show a success toast
          toast({
            title: "Challenge Generated",
            description: "Your personalized challenge is ready!",
            variant: "default"
          });
          
          // Navigate to the round1 page
          void router.push('/round1');
        } else {
          // Handle the error case with more details if available
          const errorMessage = validResponse.error?.message || 'Failed to generate challenge';
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error generating challenge:', err);
        setError(`We encountered an error while generating your challenge: ${errorMessage}. Please try again.`);
        
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
  if (generateChallengeMutation.status === 'pending') {
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
              <Button variant="default" onClick={() => void router.push('/dashboard')}>
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