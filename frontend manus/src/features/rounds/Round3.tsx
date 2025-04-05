'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useGameStore, GamePhase } from '@/store/useGameStore';
import AIVisualizer from '@/components/ui/ai-visualizer';
import { useGenerateChallenge, useSubmitResponse, useGenerateProfile } from '@/services/api/services';

// Define types not included in centralized system
interface ResponseSubmissionRequest {
  challengeId: string;
  response: string;
  round: number;
}

// Update the ChallengeResponse interface to match the actual structure
interface ChallengeResponse {
  // Make content optional since the API might return a different structure
  content?: string | Record<string, unknown>;
  id?: string;
  // Allow description as an alternative field that might contain the content
  description?: string;
  [key: string]: unknown;
}

// Define the GenerateChallenge parameters to match the API
interface GenerateChallengeParams {
  focusArea: string;
  // Make difficulty required to match the API expectations
  difficulty: string;
  [key: string]: unknown;
}

export default function Round3() {
  const router = useRouter();
  const [challenge, setChallenge] = useState('');
  const [userResponse, setUserResponse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAiThinking, setShowAiThinking] = useState(false);
  
  // Get game store values and actions
  const { 
    personality, 
    userInfo, 
    focus, 
    responses, 
    currentChallenge,
    saveRound3Response, 
    saveProfileId, 
    setGamePhase 
  } = useGameStore(state => ({
    personality: state.personality,
    userInfo: state.userInfo,
    focus: state.focus,
    responses: state.responses,
    currentChallenge: state.currentChallenge,
    saveRound3Response: state.saveRound3Response,
    saveProfileId: state.saveProfileId,
    setGamePhase: state.setGamePhase
  }));
  
  // Check if user has completed round 2 and if we have a challenge
  const hasCompletedRound2 = !!responses.round2?.userResponse;
  const challengeId = currentChallenge?.id;
  
  // If no challenge ID from store, redirect to round 2
  useEffect(() => {
    if (!challengeId || !hasCompletedRound2) {
      router.push('/round2');
    }
  }, [challengeId, hasCompletedRound2, router]);
  
  // Generate challenge mutation
  const generateChallengeMutation = useGenerateChallenge();
  
  // Submit response mutation
  const submitResponseMutation = useSubmitResponse();
  
  // Generate profile mutation
  const generateProfileMutation = useGenerateProfile();
  
  // Generate a challenge based on the user's traits and focus area
  const generateChallenge = useCallback(async () => {
    if (!hasCompletedRound2 || !focus || !personality) {
      router.push('/round2');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create challenge request with proper type
      const request = {
        focusArea: focus.id,
        difficulty: 'intermediate', // Add this to match the expected parameter
        personalityContext: {
          traits: personality.traits || [],
          attitudes: personality.attitudes || []
        },
        professionalContext: {
          title: userInfo.professionalTitle || '',
          location: userInfo.location || ''
        },
        preferredDifficulty: 'intermediate',
        round: 3
      } as GenerateChallengeParams;
      
      const result = await generateChallengeMutation.mutateAsync(request);
      
      // Safely access the response data
      if (result && result.success && result.data) {
        // Extract content with type safety by first converting to unknown
        const responseData = result.data as unknown as ChallengeResponse;
        
        // Get content as string, handling different possible formats
        let content = '';
        
        if (responseData.content && typeof responseData.content === 'string') {
          content = responseData.content;
        } else if (responseData.content && typeof responseData.content === 'object') {
          content = JSON.stringify(responseData.content);
        } else if (responseData.description) {
          // Fallback to description field if content is not available
          content = responseData.description;
        } else {
          content = 'No challenge content available';
        }
            
        setChallenge(content);
      } else {
        throw new Error('Failed to generate challenge');
      }
    } catch (error) {
      console.error('Error generating challenge:', error);
    } finally {
      setIsLoading(false);
    }
  }, [focus, personality, userInfo, hasCompletedRound2, generateChallengeMutation, router]);
  
  // Generate challenge on component mount
  useEffect(() => {
    if (!hasCompletedRound2 || !challengeId) {
      router.push('/round2');
      return;
    }
    
    void generateChallenge();
  }, [hasCompletedRound2, challengeId, generateChallenge, router]);
  
  // Handle user response submission and generate profile
  const handleSubmit = async () => {
    if (!userResponse.trim() || !challengeId || !focus) {
      return;
    }
    
    setIsSubmitting(true);
    setShowAiThinking(true);
    
    try {
      // Create submission request
      const submissionRequest: ResponseSubmissionRequest = {
        challengeId: challengeId,
        response: userResponse,
        round: 3
      };
      
      // Submit response to API using challenge ID from store
      await submitResponseMutation.mutateAsync(submissionRequest);
      
      // Save response to game state
      saveRound3Response(userResponse);

      // Since there's a type mismatch, use a more direct approach with the expected structure
      // that the API function expects
      const profileResult = await generateProfileMutation.mutateAsync({
        focus: focus.id,
        responses: {
          round1: responses.round1 ? {
            userResponse: responses.round1.userResponse || '',
            challenge: responses.round1.challenge,
            aiResponse: undefined
          } : undefined,
          round2: responses.round2 ? {
            userResponse: responses.round2.userResponse || '',
            challenge: undefined,
            aiResponse: undefined
          } : undefined,
          round3: {
            userResponse: userResponse,
            challenge: challenge,
            aiResponse: undefined
          }
        }
      });
      
      // Simulate AI thinking time for profile generation
      setTimeout(() => {
        setShowAiThinking(false);
        
        if (profileResult && profileResult.success && profileResult.data?.id) {
          // Save profile ID to game state
          saveProfileId(profileResult.data.id.toString());
          
          // Set game phase to results
          setGamePhase(GamePhase.RESULTS);
          
          // Navigate to results
          router.push('/results');
        } else {
          throw new Error('Failed to generate profile');
        }
      }, 4000); // Slightly longer time for profile generation
    } catch (error) {
      console.error('Error submitting response:', error);
      setShowAiThinking(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-lg text-gray-600 dark:text-gray-300">
          Generating your final challenge...
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          Round 3: Final Challenge
        </CardTitle>
        <CardDescription>
          Now that you&apos;ve seen how AI approaches your challenge, let&apos;s push your thinking further with a final challenge.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="border-l-4 border-indigo-500 pl-4 py-3 bg-indigo-50 dark:bg-indigo-900/20">
          <h3 className="font-semibold text-lg mb-2">Final Challenge:</h3>
          <p className="text-gray-800 dark:text-gray-200">
            {challenge || currentChallenge?.description}
          </p>
        </div>
        
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Your Response:</h3>
          <Textarea 
            value={userResponse}
            onChange={(e) => setUserResponse(e.target.value)}
            placeholder="Type your response here..."
            className="min-h-[150px] resize-y"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This is your chance to demonstrate your human edge in your focus area. Think deeply about what makes your approach uniquely human.
          </p>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => router.push('/round2')}
        >
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !userResponse.trim() || !challengeId}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
        >
          {isSubmitting ? 'Generating Profile...' : 'See Your Human Edge Profile'}
        </Button>
      </CardFooter>
    </Card>
    
    {/* AI Thinking Visualization */}
    {showAiThinking && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md w-full text-center">
          <h3 className="text-xl font-bold mb-4">AI is generating your Human Edge Profile</h3>
          <AIVisualizer />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            The AI is analyzing all your responses to create a comprehensive profile of your human edge.
          </p>
        </div>
      </div>
    )}
    </div>
  );
}
