'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore, GamePhase, AiAttitude } from '@/store/useGameStore';
import { useSaveAiAttitudes } from '@/services/api/services/aiAttitudesService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// Sample AI attitude questions
const attitudeQuestions = [
  {
    id: 'trust',
    question: 'How much do you trust AI systems with important tasks?',
    description: 'Your level of confidence in AI\'s reliability and safety.',
    min: 'Highly skeptical',
    max: 'Completely trust'
  },
  {
    id: 'concern',
    question: 'How concerned are you about AI\'s impact on jobs?',
    description: 'Your level of worry about AI replacing human roles.',
    min: 'Not concerned',
    max: 'Extremely concerned'
  },
  {
    id: 'impact',
    question: 'How much do you believe AI will improve humanity\'s future?',
    description: 'Your optimism about AI\'s positive effects on society.',
    min: 'Pessimistic',
    max: 'Very optimistic'
  },
  {
    id: 'collaboration',
    question: 'How comfortable are you working with AI tools?',
    description: 'Your openness to collaborating with AI in your work.',
    min: 'Uncomfortable',
    max: 'Very comfortable'
  },
  {
    id: 'autonomy',
    question: 'How much autonomy should AI systems have?',
    description: 'Your view on AI\'s independence in decision-making.',
    min: 'Always human oversight',
    max: 'Full autonomy when appropriate'
  }
];

export default function AIAttitudeAssessment() {
  const router = useRouter();
  const { setGamePhase, saveAttitudes, userInfo } = useGameStore();
  
  // Initialize state with each attitude having a default value
  const [attitudes, setAttitudes] = useState<Record<string, number>>(
    attitudeQuestions.reduce((acc, q) => ({ ...acc, [q.id]: 50 }), {})
  );
  
  // Initialize mutation for saving attitudes
  const attitudesMutation = useSaveAiAttitudes();
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSliderChange = (questionId: string, value: number[]) => {
    setAttitudes(prev => ({
      ...prev,
      [questionId]: value[0]
    }));
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Convert attitudes object to array of AiAttitude objects
      const attitudesArray: AiAttitude[] = Object.entries(attitudes).map(([id, strength]) => ({
        id,
        attitude: attitudeQuestions.find(q => q.id === id)?.question || id,
        strength
      }));
      
      // Save attitudes to backend (mock)
      const userId = userInfo.email || 'user@example.com';
      await attitudesMutation.mutateAsync({
        userId,
        attitudes: attitudesArray
      });
      
      // Save all attitudes to the store at once
      saveAttitudes(attitudesArray);
      
      // Progress to the focus selection phase
      setGamePhase(GamePhase.FOCUS);
      
      // Navigate to the focus page
      router.push('/focus');
    } catch (error) {
      console.error('Error saving AI attitudes:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Your Attitudes Toward AI</CardTitle>
        <CardDescription className="text-center">
          Help us understand your perspective on artificial intelligence
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-8">
        {attitudeQuestions.map((q) => (
          <div key={q.id} className="space-y-4">
            <div>
              <h3 className="font-medium text-lg">{q.question}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{q.description}</p>
            </div>
            
            <div className="space-y-3">
              <Slider
                value={[attitudes[q.id]]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => handleSliderChange(q.id, value)}
                className="w-full"
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>{q.min}</span>
                <span>{q.max}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => router.push('/traits')}
        >
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </Button>
      </CardFooter>
    </Card>
  );
}
