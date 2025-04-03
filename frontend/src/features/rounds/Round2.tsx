'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useGameStore, GamePhase } from '@/store/useGameStore';
import AIVisualizer from '@/components/ui/ai-visualizer';
import { useGetAIResponse, useSubmitResponse } from '@/services/api/services';

export default function Round2() {
  const router = useRouter();
  const [aiResponse, setAIResponse] = useState('');
  const [userAnalysis, setUserAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAiThinking, setShowAiThinking] = useState(false);
  
  // Get game store values and actions
  const { responses, currentChallenge, saveRound2Response, setGamePhase } = useGameStore(state => ({
    responses: state.responses,
    currentChallenge: state.currentChallenge,
    saveRound2Response: state.saveRound2Response,
    setGamePhase: state.setGamePhase
  }));
  
  // Check if user has completed round 1 and if we have a challenge
  const hasCompletedRound1 = !!responses.round1?.userResponse;
  const challengeId = currentChallenge?.id;
  
  // If no challenge ID from store, redirect to round 1
  useEffect(() => {
    if (!challengeId || !hasCompletedRound1) {
      router.push('/round1');
    }
  }, [challengeId, hasCompletedRound1, router]);
  
  // Submit response mutation
  const submitResponseMutation = useSubmitResponse();
  
  // Get AI response query - use the challenge ID from the game store
  const aiResponseQuery = useGetAIResponse(
    challengeId || '', 
    1,
    hasCompletedRound1 && !!challengeId
  );
  
  // Load AI response
  const loadAIResponse = useCallback(async () => {
    if (!hasCompletedRound1 || !challengeId) {
      router.push('/round1');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // If the query hasn't been executed yet, refetch
      if (!aiResponseQuery.data) {
        await aiResponseQuery.refetch();
      }
      
      if (aiResponseQuery.data?.success && aiResponseQuery.data?.data) {
        // Use any type to deal with the mock data structure
        const response = aiResponseQuery.data.data as any;
        setAIResponse(response.content || '');
      } else {
        console.error('No AI response data available');
      }
    } catch (error) {
      console.error('Error loading AI response:', error);
    } finally {
      setIsLoading(false);
    }
  }, [aiResponseQuery, hasCompletedRound1, challengeId, router]);
  
  // Load AI response on component mount
  useEffect(() => {
    if (!hasCompletedRound1 || !challengeId) {
      router.push('/round1');
      return;
    }
    
    loadAIResponse();
  }, [hasCompletedRound1, challengeId, loadAIResponse, router]);
  
  // Handle user response submission
  const handleSubmit = async () => {
    if (!userAnalysis.trim() || !challengeId) {
      return;
    }
    
    setIsSubmitting(true);
    setShowAiThinking(true);
    
    try {
      // Submit response to API using challenge ID from store
      await submitResponseMutation.mutateAsync({
        challengeId: challengeId,
        response: userAnalysis,
        round: 2
      });
      
      // Save response to game state
      saveRound2Response(userAnalysis);
      
      // Simulate AI thinking time
      setTimeout(() => {
        setShowAiThinking(false);
        // Set game phase to next round
        setGamePhase(GamePhase.ROUND3);
        // Navigate to next round
        router.push('/round3');
      }, 3000);
    } catch (error) {
      console.error('Error submitting analysis:', error);
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
          Loading AI&apos;s response to your challenge...
        </div>
      </div>
    );
  }
  
  // Error state
  if (aiResponseQuery.isError) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 font-medium mb-4">
          Error loading AI response
        </div>
        <Button onClick={loadAIResponse}>
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          Round 2: AI&apos;s Response
        </CardTitle>
        <CardDescription>
          Now let&apos;s see how AI would approach your challenge. Review the AI&apos;s response and consider where your human edge provides advantages.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-3">Your Challenge (Round 1):</h3>
          <div className="border p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 mb-4">
            <p className="text-gray-800 dark:text-gray-200">
              {currentChallenge?.description || responses.round1?.challenge || "Challenge not available"}
            </p>
          </div>
          
          <h3 className="font-semibold text-lg mb-2">Your Response:</h3>
          <div className="border p-4 rounded-lg bg-white dark:bg-gray-800 mb-6">
            <p className="text-gray-800 dark:text-gray-200">
              {responses.round1?.userResponse || "Your response not available"}
            </p>
          </div>
        </div>
        
        <div className="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 dark:bg-gray-800">
          <h3 className="font-semibold text-lg mb-2">AI&apos;s Approach:</h3>
          <p className="text-gray-800 dark:text-gray-200">
            {aiResponse}
          </p>
        </div>
        
        <div className="space-y-3 mt-4">
          <h3 className="font-semibold text-lg">Your Analysis:</h3>
          <Textarea 
            value={userAnalysis}
            onChange={(e) => setUserAnalysis(e.target.value)}
            placeholder="Compare your approach with the AI's. Where do you see your human edge?"
            className="min-h-[150px] resize-y"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Consider how your approach differs from AI&apos;s, and what unique human strengths you bring to the challenge.
          </p>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => router.push('/round1')}
        >
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !userAnalysis.trim() || !challengeId}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
        >
          {isSubmitting ? 'Submitting...' : 'Continue to Round 3'}
        </Button>
      </CardFooter>
    </Card>
    
    {/* AI Thinking Visualization */}
    {showAiThinking && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md w-full text-center">
          <h3 className="text-xl font-bold mb-4">AI is processing your analysis</h3>
          <AIVisualizer />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            The AI is preparing the next challenge based on your comparative analysis.
          </p>
        </div>
      </div>
    )}
    </div>
  );
}
