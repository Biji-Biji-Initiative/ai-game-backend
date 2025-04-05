'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useGameStore, Trait, AiAttitude } from '@/store/useGameStore';
import { ArrowLeft, Brain, HeartHandshake } from 'lucide-react';

export default function EditPersonalityPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Get data from game store
  const { 
    isAuthenticated, 
    personality,
    updatePersonality
  } = useGameStore(state => ({
    isAuthenticated: state.isAuthenticated,
    personality: state.personality,
    updatePersonality: state.updatePersonality || (() => {})
  }));
  
  // Local state for traits and attitudes
  const [traits, setTraits] = useState<Trait[]>([]);
  const [attitudes, setAttitudes] = useState<AiAttitude[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check authentication and initialize form
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    } else {
      // Initialize traits and attitudes from store
      if (personality) {
        if (personality.traits) {
          setTraits([...personality.traits]);
        }
        if (personality.attitudes) {
          setAttitudes([...personality.attitudes]);
        }
      }
    }
  }, [isAuthenticated, personality, router]);
  
  // Handle trait value change
  const handleTraitChange = (id: string, value: number) => {
    setTraits(prev => 
      prev.map(trait => 
        trait.id === id ? { ...trait, value } : trait
      )
    );
  };
  
  // Handle attitude strength change
  const handleAttitudeChange = (id: string, strength: number) => {
    setAttitudes(prev => 
      prev.map(attitude => 
        attitude.id === id ? { ...attitude, strength } : attitude
      )
    );
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Update traits via mock API (would be a real API call in production)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update store with new personality data
      updatePersonality({
        personality: {
          ...personality,
          traits,
          attitudes
        }
      });
      
      toast({
        title: 'Personality profile updated',
        description: 'Your personality profile has been saved.',
        variant: 'default',
      });
      
      // Navigate back to profile page
      router.push('/profile');
    } catch (error) {
      console.error('Failed to update personality profile:', error);
      toast({
        title: 'Update failed',
        description: 'There was an error updating your personality profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <>
      <Button 
        variant="ghost" 
        onClick={() => router.push('/profile')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>
      
      <Card className="max-w-3xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Edit Personality Profile</CardTitle>
          <CardDescription>
            Adjust your personality traits and AI attitudes to better reflect your preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="traits" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="traits" className="flex items-center">
                  <Brain className="h-4 w-4 mr-2" />
                  Cognitive Traits
                </TabsTrigger>
                <TabsTrigger value="attitudes" className="flex items-center">
                  <HeartHandshake className="h-4 w-4 mr-2" />
                  AI Attitudes
                </TabsTrigger>
              </TabsList>
              
              {/* Traits Content */}
              <TabsContent value="traits">
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    These traits represent your cognitive tendencies and information processing style.
                    Adjust the sliders to better reflect how you think and work.
                  </p>
                  
                  {traits.length > 0 ? (
                    <div className="space-y-8">
                      {traits.map(trait => (
                        <div key={trait.id} className="space-y-3">
                          <div className="flex justify-between items-baseline">
                            <div>
                              <h3 className="font-medium">{trait.name}</h3>
                              <p className="text-xs text-muted-foreground">{trait.description}</p>
                            </div>
                            <span className="font-semibold">{trait.value}%</span>
                          </div>
                          <Slider
                            defaultValue={[trait.value]}
                            min={0}
                            max={100}
                            step={5}
                            onValueChange={([value]) => handleTraitChange(trait.id, value)}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{trait.lowLabel || 'Low'}</span>
                            <span>{trait.highLabel || 'High'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-muted-foreground">
                        No trait data available. Complete the assessment first.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Attitudes Content */}
              <TabsContent value="attitudes">
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    These attitudes reflect how you approach and interact with AI systems.
                    Adjust the sliders to better reflect your feelings and preferences about AI.
                  </p>
                  
                  {attitudes.length > 0 ? (
                    <div className="space-y-8">
                      {attitudes.map(attitude => (
                        <div key={attitude.id} className="space-y-3">
                          <div className="flex justify-between items-baseline">
                            <div>
                              <h3 className="font-medium">{attitude.attitude}</h3>
                              <p className="text-xs text-muted-foreground">{attitude.description}</p>
                            </div>
                            <span className="font-semibold">{attitude.strength}%</span>
                          </div>
                          <Slider
                            defaultValue={[attitude.strength]}
                            min={0}
                            max={100}
                            step={5}
                            onValueChange={([value]) => handleAttitudeChange(attitude.id, value)}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{attitude.lowLabel || 'Low'}</span>
                            <span>{attitude.highLabel || 'High'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-muted-foreground">
                        No attitude data available. Complete the assessment first.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-4 mt-8">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/profile')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
} 