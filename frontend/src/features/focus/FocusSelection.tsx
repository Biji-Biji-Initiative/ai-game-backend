'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore, FocusArea, Trait } from '@/store/useGameStore';
import { useRecommendFocusAreas, useSaveFocusAreaSelection } from '@/services/api/services';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { OnboardingTooltip } from '@/components/ui/onboarding-tooltip';

// Helper component to display trait-to-focus relationship
const TraitMatchIndicator = ({ trait }: { trait: Trait }) => {
  // This would ideally come from the API, but for now we'll simulate it
  const getMatchStrength = () => {
    // Simple random match strength between 1-5 for demo purposes
    // In a real implementation, this would be calculated based on actual data
    return Math.floor(Math.random() * 5) + 1;
  };
  
  const matchStrength = getMatchStrength();
  
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-32 text-sm font-medium truncate" title={trait.name}>
        {trait.name}
      </div>
      <div className="flex-1">
        <Progress value={matchStrength * 20} className="h-2" />
      </div>
      <div className="text-xs font-medium">
        {matchStrength > 3 ? (
          <span className="text-green-600 dark:text-green-400">Strong</span>
        ) : matchStrength > 1 ? (
          <span className="text-yellow-600 dark:text-yellow-400">Moderate</span>
        ) : (
          <span className="text-gray-500">Weak</span>
        )}
      </div>
    </div>
  );
};

export default function FocusSelection() {
  const router = useRouter();
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('grid');
  
  // Get game store values and actions
  const { personality, userInfo, saveFocus } = useGameStore(state => ({
    personality: state.personality,
    userInfo: state.userInfo,
    saveFocus: state.saveFocus
  }));
  
  // Recommend focus areas mutation
  const recommendMutation = useRecommendFocusAreas();
  
  // Save focus selection mutation
  const saveFocusMutation = useSaveFocusAreaSelection();
  
  // Load recommended focus areas based on traits
  const loadRecommendedFocusAreas = useCallback(async () => {
    try {
      // Send full user context to the API
      const result = await recommendMutation.mutateAsync({
        traits: personality.traits,
        attitudes: personality.attitudes,
        professionalContext: {
          title: userInfo.professionalTitle,
          location: userInfo.location
        }
      });
      
      if (result.success && result.data) {
        // Now result.data is properly typed as FocusArea[]
        setFocusAreas(result.data);
      }
    } catch (error) {
      console.error('Error fetching focus areas:', error);
    }
  }, [recommendMutation, personality, userInfo]);
  
  // Fetch recommended focus areas on component mount if traits are available
  useEffect(() => {
    if (personality.traits.length > 0) {
      loadRecommendedFocusAreas();
    }
  }, [personality.traits, loadRecommendedFocusAreas]);
  
  // Handle focus area selection
  const handleSelectFocus = (focusId: string) => {
    setSelectedFocusId(focusId);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedFocusId) return;
    
    setIsSubmitting(true);
    
    try {
      // Find the selected focus area
      const selectedFocus = focusAreas.find(focus => focus.id === selectedFocusId);
      
      if (!selectedFocus) {
        throw new Error('Selected focus area not found');
      }
      
      // Save focus selection to API with full user context
      await saveFocusMutation.mutateAsync({
        focusAreaId: selectedFocusId,
        personalityContext: {
          traits: personality.traits,
          attitudes: personality.attitudes
        },
        professionalContext: {
          title: userInfo.professionalTitle,
          location: userInfo.location
        }
      });
      
      // Save focus to local state
      saveFocus(selectedFocus);
      
      // Navigate to next screen
      router.push('/round1');
    } catch (error) {
      console.error('Error saving focus selection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Generate insights for a focus area based on traits
  const generateInsights = () => {
    // These would ideally come from the API, but for demo purposes we'll generate them
    const insights = [
      `Your ${personality.traits[0]?.name || 'creativity'} aligns well with this focus area.`,
      `This area leverages your strong ${personality.traits[1]?.name || 'problem-solving'} skills.`,
      `Your ${personality.traits[2]?.name || 'adaptability'} gives you an edge in this domain.`
    ];
    
    return insights;
  };
  
  // Loading state
  if (recommendMutation.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-lg text-gray-600 dark:text-gray-300">
          Analyzing traits and generating recommendations...
        </div>
      </div>
    );
  }
  
  // Error state
  if (recommendMutation.isError) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 font-medium mb-4">
          Error generating focus recommendations
        </div>
        <Button onClick={() => loadRecommendedFocusAreas()}>
          Try Again
        </Button>
      </div>
    );
  }
  
  // Get the selected focus area
  const selectedFocus = focusAreas.find(focus => focus.id === selectedFocusId);
  
  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          Focus Selection
        </CardTitle>
        <CardDescription>
          <OnboardingTooltip
            id="focus-selection-intro"
            content={
              <div>
                <p className="font-medium mb-2">Choose Your Human Edge Focus Area</p>
                <p>Based on your personality traits and AI attitudes, we&apos;ve identified areas where you may have a competitive edge over AI.</p>
                <p className="mt-2">Each focus area leverages different aspects of your human capabilities that are difficult for AI to replicate.</p>
              </div>
            }
            side="bottom"
            width="wide"
          >
            <span>
              Based on your traits, we&apos;ve identified areas where you may have a competitive edge over AI.
              Select an area to focus on for your challenge.
            </span>
          </OnboardingTooltip>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="grid" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="detail">Detail View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {focusAreas.map((focus) => (
                <OnboardingTooltip
                  key={focus.id}
                  id={`focus-area-${focus.id}`}
                  content={
                    <div>
                      <p>Click on a focus area to select it.</p>
                      <p className="mt-2">The match percentage indicates how well this focus area aligns with your traits and attitudes.</p>
                      <p className="mt-2">You&apos;ll excel in challenges that leverage this particular human edge!</p>
                    </div>
                  }
                  side="right"
                  showDismissButton={focus.id === focusAreas[0]?.id} // Only show on first focus area
                >
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFocusId === focus.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleSelectFocus(focus.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{focus.name}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        {focus.matchLevel}% match
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {focus.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {personality.traits.slice(0, 3).map((trait: Trait) => (
                        <Badge key={trait.id} variant="outline" className="text-xs">
                          {trait.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </OnboardingTooltip>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="detail" className="mt-4">
            {selectedFocusId ? (
              <div className="border rounded-lg p-6">
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl">{selectedFocus?.name}</h3>
                    <span className="text-sm px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      {selectedFocus?.matchLevel}% match
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {selectedFocus?.description}
                  </p>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">Why This Focus Area Matches Your Profile:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {generateInsights().map((insight, index) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300">{insight}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Trait Alignment:</h4>
                    <div className="space-y-2 mt-3">
                      {personality.traits.map((trait: Trait) => (
                        <TraitMatchIndicator key={trait.id} trait={trait} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border rounded-lg">
                <p className="text-gray-500">Select a focus area to see detailed information</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
              {focusAreas.map((focus) => (
                <div
                  key={focus.id}
                  className={`border rounded p-2 cursor-pointer text-center ${
                    selectedFocusId === focus.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleSelectFocus(focus.id)}
                >
                  <div className="font-medium text-sm truncate">{focus.name}</div>
                  <div className="text-xs text-gray-500">{focus.matchLevel}% match</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => router.push('/attitudes')}
        >
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedFocusId}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </Button>
      </CardFooter>
    </Card>
  );
}
