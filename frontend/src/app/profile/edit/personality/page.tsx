'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useGameStore, Trait, AiAttitude } from '@/store/useGameStore';
import { Loader2, Save, ArrowLeft, Brain, HeartHandshake } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { ApiResponse } from '@/services/api/apiResponse';

export default function EditPersonalityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get personality data from game store
  const { personality, saveTraits, saveAttitudes, isAuthenticated } = useGameStore(state => ({
    personality: state.personality,
    saveTraits: state.saveTraits,
    saveAttitudes: state.saveAttitudes,
    isAuthenticated: state.isAuthenticated
  }));
  
  // Copy personality data to local state for editing
  const [traits, setTraits] = useState<Trait[]>([]);
  const [attitudes, setAttitudes] = useState<AiAttitude[]>([]);
  
  // Initialize form state from store when component mounts
  useEffect(() => {
    if (personality.traits && personality.traits.length > 0) {
      setTraits([...personality.traits]);
    }
    
    if (personality.attitudes && personality.attitudes.length > 0) {
      setAttitudes([...personality.attitudes]);
    }
  }, [personality]);
  
  // Mock mutation for updating traits
  const updateTraitsMutation = useMutation<ApiResponse<Trait[]>, Error, Trait[]>({
    mutationFn: async (updatedTraits) => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        status: 200,
        data: updatedTraits,
        error: undefined
      };
    }
  });
  
  // Mock mutation for updating attitudes
  const updateAttitudesMutation = useMutation<ApiResponse<AiAttitude[]>, Error, AiAttitude[]>({
    mutationFn: async (updatedAttitudes) => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        status: 200,
        data: updatedAttitudes,
        error: undefined
      };
    }
  });
  
  // Check authentication and redirect if needed
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Update traits via mock API
      const traitsResult = await updateTraitsMutation.mutateAsync(traits);
      
      // Update attitudes via mock API
      const attitudesResult = await updateAttitudesMutation.mutateAsync(attitudes);
      
      if (traitsResult.success && attitudesResult.success) {
        // Update game store
        saveTraits(traits);
        saveAttitudes(attitudes);
        
        toast({
          title: "Personality updated",
          description: "Your personality profile has been updated successfully.",
          variant: "default"
        });
        
        // Redirect back to profile
        router.push('/profile');
      } else {
        throw new Error('Failed to update personality profile');
      }
    } catch (error) {
      console.error('Error updating personality profile:', error);
      toast({
        title: "Update failed",
        description: "Could not update your personality profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle trait value change
  const handleTraitChange = (traitId: string, newValue: number) => {
    setTraits(currentTraits => 
      currentTraits.map(trait => 
        trait.id === traitId ? { ...trait, value: newValue } : trait
      )
    );
  };
  
  // Handle attitude strength change
  const handleAttitudeChange = (attitudeId: string, newStrength: number) => {
    setAttitudes(currentAttitudes => 
      currentAttitudes.map(attitude => 
        attitude.id === attitudeId ? { ...attitude, strength: newStrength } : attitude
      )
    );
  };
  
  if (!isAuthenticated) {
    return null; // Don't render anything if not authenticated (will redirect)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/profile')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              Edit Your Personality Profile
            </CardTitle>
            <CardDescription>
              Update your cognitive traits and AI attitudes
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent>
              <Tabs defaultValue="traits" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="traits" className="flex items-center">
                    <Brain className="h-4 w-4 mr-2" />
                    Cognitive Traits
                  </TabsTrigger>
                  <TabsTrigger value="attitudes" className="flex items-center">
                    <HeartHandshake className="h-4 w-4 mr-2" />
                    AI Attitudes
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="traits" className="space-y-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Adjust the sliders to update your cognitive traits. These represent your thinking and processing tendencies.
                  </p>
                  
                  {traits.map(trait => (
                    <div key={trait.id} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label htmlFor={trait.id} className="font-medium">{trait.name}</Label>
                        <span className="font-semibold">{trait.value}%</span>
                      </div>
                      <Slider
                        id={trait.id}
                        value={[trait.value]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(values) => handleTraitChange(trait.id, values[0])}
                      />
                      <p className="text-xs text-muted-foreground">{trait.description}</p>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="attitudes" className="space-y-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Adjust the sliders to update your attitudes toward AI. These represent how you approach and interact with AI systems.
                  </p>
                  
                  {attitudes.map(attitude => (
                    <div key={attitude.id} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label htmlFor={attitude.id} className="font-medium">{attitude.attitude}</Label>
                        <span className="font-semibold">{attitude.strength}%</span>
                      </div>
                      <Slider
                        id={attitude.id}
                        value={[attitude.strength]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(values) => handleAttitudeChange(attitude.id, values[0])}
                      />
                      <p className="text-xs text-muted-foreground">
                        How strongly you exhibit a {attitude.attitude.toLowerCase()} approach to AI
                      </p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => router.push('/profile')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
} 