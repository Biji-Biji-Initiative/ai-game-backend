'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore, Trait, GamePhase } from '@/store/useGameStore';
import { useGetTraits, useSaveTraitAssessment } from '@/services/api/services';
import { OnboardingTooltip } from '@/components/ui/onboarding-tooltip';

export default function TraitAssessment() {
  const router = useRouter();
  const [traits, setTraits] = useState<Trait[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get game store actions and user info
  const { saveTraits, userInfo, setGamePhase } = useGameStore(state => ({
    saveTraits: state.saveTraits,
    userInfo: state.userInfo,
    setGamePhase: state.setGamePhase
  }));
  
  // Fetch traits from API
  const { data: traitsData, isLoading, error } = useGetTraits();
  
  // Save trait assessment mutation
  const traitsMutation = useSaveTraitAssessment();
  
  // Initialize traits from API data
  useEffect(() => {
    if (traitsData?.data && Array.isArray(traitsData.data)) {
      setTraits(traitsData.data);
    }
  }, [traitsData]);
  
  // Handle trait value change
  const handleTraitChange = (index: number, value: number[]) => {
    const updatedTraits = [...traits];
    updatedTraits[index].value = value[0];
    setTraits(updatedTraits);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Save traits to API (mock)
      await traitsMutation.mutateAsync({
        userEmail: userInfo.email || 'user@example.com', // Use email from user context
        traits
      });
      
      // Save traits to local state
      saveTraits(traits);
      
      // Set game phase to ATTITUDES
      setGamePhase(GamePhase.ATTITUDES);
      
      // Navigate to AI attitudes assessment
      router.push('/attitudes');
    } catch (error) {
      console.error('Error saving traits:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-lg text-gray-600 dark:text-gray-300">
          Loading trait assessment...
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
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
        {traits.map((trait, index) => (
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
              showDismissButton={index === 0} // Only show dismiss button on first trait
            >
              <div className="w-full">
                <Slider
                  defaultValue={[trait.value]}
                  max={100}
                  step={5}
                  onValueChange={(value) => handleTraitChange(index, value)}
                  className="py-2"
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
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => router.push('/context')}
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
