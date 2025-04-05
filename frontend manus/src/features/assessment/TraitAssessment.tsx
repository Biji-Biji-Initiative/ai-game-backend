'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore, GamePhase } from '@/store/useGameStore';
import { useGetTraits, useSaveTraitAssessment } from '@/services/api/services';
import { OnboardingTooltip } from '@/components/ui/onboarding-tooltip';
import { Trait } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';

// Define a store trait type for compatibility with the game store
type StoreTrait = {
  id: string;
  name: string;
  description: string;
  value: number;
};

// Constants for configuration
const TRAIT_CONFIG = {
  DEFAULT_SCORE: 50,
  MAX_SCORE: 100,
  STEP_SIZE: 5,
  CATEGORY: 'personality' as const
} as const;

// Error messages
const ERROR_MESSAGES = {
  NO_USER: 'Please log in to save your assessment.',
  LOAD_ERROR: 'Unable to load trait assessment.',
  SAVE_ERROR: 'Failed to save your assessment. Please try again.',
  NO_DESCRIPTION: 'No description available'
} as const;

// Interface for component props
interface TraitAssessmentProps {
  initialTraits?: Trait[];
}

export default function TraitAssessment({ initialTraits = [] }: TraitAssessmentProps) {
  const router = useRouter();
  const [traits, setTraits] = useState<StoreTrait[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Get game store actions and user info
  const { saveTraits, userInfo, setGamePhase } = useGameStore(state => ({
    saveTraits: state.saveTraits,
    userInfo: state.userInfo,
    setGamePhase: state.setGamePhase
  }));
  
  // Fetch traits from API (for refreshing or when initialTraits is empty)
  const { data: traitsData, isLoading, error } = useGetTraits();
  
  // Save trait assessment mutation
  const traitsMutation = useSaveTraitAssessment();
  
  // Initialize traits from server-side props or from API response
  useEffect(() => {
    // If initialTraits are provided (from server), use them
    if (initialTraits && initialTraits.length > 0) {
      const mappedTraits: StoreTrait[] = initialTraits.map(trait => ({
        id: trait.id,
        name: trait.name,
        description: trait.description || ERROR_MESSAGES.NO_DESCRIPTION,
        value: trait.score || TRAIT_CONFIG.DEFAULT_SCORE
      }));
      setTraits(mappedTraits);
    }
    // Otherwise, fallback to client-side fetched data
    else if (traitsData?.data && Array.isArray(traitsData.data)) {
      const mappedTraits: StoreTrait[] = traitsData.data.map(trait => ({
        id: trait.id,
        name: trait.name,
        description: trait.description || ERROR_MESSAGES.NO_DESCRIPTION,
        value: trait.score || TRAIT_CONFIG.DEFAULT_SCORE
      }));
      setTraits(mappedTraits);
    }
  }, [traitsData, initialTraits]);
  
  // Handle trait value change
  const handleTraitChange = (index: number, value: number[]) => {
    const updatedTraits = [...traits];
    updatedTraits[index].value = value[0];
    setTraits(updatedTraits);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    if (!userInfo?.email) {
      console.error('No user email found');
      toast({
        title: "Error",
        description: ERROR_MESSAGES.NO_USER,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const apiTraits: Trait[] = traits.map(trait => ({
        id: trait.id,
        name: trait.name,
        description: trait.description,
        score: trait.value,
        category: TRAIT_CONFIG.CATEGORY
      }));
      
      await traitsMutation.mutateAsync({
        userEmail: userInfo.email,
        traits: apiTraits
      });
      
      saveTraits(traits);
      setGamePhase(GamePhase.ATTITUDES);
      router.push('/attitudes');
    } catch (error) {
      console.error('Error saving traits:', error);
      toast({
        title: "Error",
        description: ERROR_MESSAGES.SAVE_ERROR,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Only show loading state if we have no initial traits AND are loading from API
  if (isLoading && initialTraits.length === 0 && traits.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-lg text-gray-600 dark:text-gray-300">
          Loading trait assessment...
        </div>
      </div>
    );
  }
  
  // Error state - only if we have no initial traits
  if (error && initialTraits.length === 0 && traits.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 font-medium mb-4">
          Error loading traits
        </div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          Trait Assessment
        </CardTitle>
        <CardDescription>
          <OnboardingTooltip
            id="trait-assessment-intro"
            content={
              <div>
                <p className="font-medium mb-2">Welcome to the Trait Assessment!</p>
                <p>This assessment helps identify your unique human strengths in comparison to AI.</p>
                <p className="mt-2">Adjust the sliders to reflect how strongly each trait describes you. Your selections will help tailor your human edge profile.</p>
              </div>
            }
            side="bottom"
            width="wide"
          >
            <span>
              Rate yourself on each trait to help identify your human competitive edge.
              Move the sliders to reflect how strongly each trait describes you.
            </span>
          </OnboardingTooltip>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {traits.map((trait: StoreTrait, index: number) => (
          <div key={trait.id} className="space-y-3">
            <div className="flex justify-between">
              <h3 className="font-medium text-lg">{trait.name}</h3>
              <span className="text-sm text-gray-500">{trait.value}%</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {trait.description}
            </p>
            <OnboardingTooltip
              id={`trait-slider-${index}`}
              content={
                <div>
                  <p>Drag the slider to indicate how strongly you identify with this trait.</p>
                  <p className="mt-2">Higher values indicate this trait is more pronounced in your personality and thinking style.</p>
                </div>
              }
              side="right"
              showDismissButton={index === 0}
            >
              <div className="w-full">
                <Slider
                  defaultValue={[trait.value]}
                  max={TRAIT_CONFIG.MAX_SCORE}
                  step={TRAIT_CONFIG.STEP_SIZE}
                  onValueChange={(value: number[]) => handleTraitChange(index, value)}
                  className="py-2"
                  aria-label={`${trait.name} rating`}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            </OnboardingTooltip>
          </div>
        ))}
      </CardContent>
      
      <CardFooter className="flex justify-end">
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