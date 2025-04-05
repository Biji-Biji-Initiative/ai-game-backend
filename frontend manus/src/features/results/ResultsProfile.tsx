'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useGameStore, Profile } from '@/store/useGameStore';
import { useGetSharedProfile, useGenerateProfile } from '@/services/api/services';
import { ShareIcon, Download, Twitter, Linkedin, Facebook, CheckIcon, AlertCircle, BarChart3Icon, RadarIcon, ActivityIcon, CheckCircle2, ListChecks, BrainCircuit, Users, Target, Zap, ChevronRight } from 'lucide-react';
import TraitRadarChart from '@/components/ui/trait-radar-chart';
import TraitBarChart from '@/components/ui/trait-bar-chart';
import AttitudeBarChart from '@/components/ui/attitude-bar-chart';
import EvaluationBreakdown from './EvaluationBreakdown';
import { useGeneratePersonalityInsights } from '@/services/api/services/personalityService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function isValidProfile(data: unknown): data is Profile {
  return (
    typeof data === 'object' && 
    data !== null && 
    'id' in data && 
    typeof (data as unknown as Profile).id === 'string' &&
    'traits' in data &&
    Array.isArray((data as unknown as Profile).traits) &&
    'insights' in data &&
    typeof (data as unknown as Profile).insights === 'string'
  );
}

// Add these interfaces after the isValidProfile function
interface PersonalityInsights {
  overallSummary: string;
  communicationStyle: {
    primary: string;
    secondary: string;
    description: string;
  };
  aiCollaborationStrategy: {
    title: string;
    description: string;
    tips: string[];
  };
  workStyle: {
    strengths: string[];
    challenges: string[];
    recommendations: string[];
  };
  keyTraitInsights: string[];
  keyAttitudeInsights: string[];
}

function isValidInsights(data: unknown): data is PersonalityInsights {
  return (
    typeof data === 'object' && 
    data !== null &&
    'overallSummary' in data &&
    'communicationStyle' in data &&
    'aiCollaborationStrategy' in data &&
    'workStyle' in data &&
    'keyTraitInsights' in data &&
    'keyAttitudeInsights' in data
  );
}

export default function ResultsProfile({ profileId }: { profileId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [traitVisualization, setTraitVisualization] = useState<'radar' | 'bar'>('radar');
  
  // If profileId is provided, we're viewing a shared profile
  // Otherwise, use the profile from the game store or generate one
  const isShared = !!profileId;
  
  // Get game store state and actions
  const { 
    profile: gameProfile, 
    personality, 
    userInfo, 
    focus, 
    saveProfile,
    isAuthenticated
  } = useGameStore(state => ({
    profile: state.profile,
    personality: state.personality,
    userInfo: state.userInfo,
    focus: state.focus,
    saveProfile: state.saveProfile,
    isAuthenticated: state.isAuthenticated
  }));
  
  // Extract round responses from the game store
  const { round1, round2, round3 } = useGameStore(state => ({
    round1: state.responses.round1,
    round2: state.responses.round2,
    round3: state.responses.round3
  }));
  
  // Get shared profile if profileId is provided
  const { data: sharedProfileData, isLoading: isLoadingShared } = useGetSharedProfile(
    profileId || ''
  );
  
  // Profile generation mutation
  const generateProfileMutation = useGenerateProfile();
  
  // Generate a profile based on the user's data
  const generateUserProfile = useCallback(async () => {
    if (!focus) {
      setGenerationError('Missing focus area data');
      return;
    }
    
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      const result = await generateProfileMutation.mutateAsync({
        userEmail: userInfo.email,
        personalityContext: {
          traits: personality.traits,
          attitudes: personality.attitudes
        },
        professionalContext: {
          title: userInfo.professionalTitle,
          location: userInfo.location
        },
        focus: focus.id, // Convert FocusArea to string by using the id
        responses: {
          round1: round1,
          round2: round2,
          round3: round3
        }
      });
      
      if (result.success && result.data) {
        // Validate profile data before using it
        if (isValidProfile(result.data)) {
          // Save to game store
          saveProfile(result.data);
          setProfile(result.data);
          
          // Generate share URL
          const baseUrl = window.location.origin;
          setShareUrl(`${baseUrl}/profile/${result.data.id}`);
          
          toast({
            title: "Profile generated successfully",
            description: "Your Human Edge Profile is ready",
            variant: "default"
          });
        } else {
          throw new Error('Invalid profile data structure received');
        }
      } else {
        throw new Error('Failed to generate profile');
      }
    } catch (error) {
      console.error('Error generating profile:', error);
      setGenerationError('Failed to generate your profile. Please try again.');
      toast({
        title: "Error",
        description: "Could not generate profile",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [focus, personality, userInfo, round1, round2, round3, saveProfile, generateProfileMutation, toast]);
  
  // Initialize profile based on source
  useEffect(() => {
    if (isShared) {
      if (sharedProfileData?.success && sharedProfileData?.data) {
        // Validate profile data before using it
        if (isValidProfile(sharedProfileData.data)) {
          setProfile(sharedProfileData.data);
        } else {
          console.error('Shared profile data has invalid structure');
          setGenerationError('Invalid profile data received. Please try again.');
        }
      }
    } else if (gameProfile) {
      // If we already have a profile in the game store, use it
      setProfile(gameProfile);
      
      // Generate share URL for the user's own profile
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/profile/${gameProfile.id}`);
    } else if (focus) {
      // Generate a new profile if we don't have one but have the required data
      void generateUserProfile();
    }
  }, [isShared, sharedProfileData, gameProfile, focus, generateUserProfile]);
  
  // Handle copy share link
  const handleCopyLink = () => {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Handle start new game
  const handleStartNewGame = () => {
    if (!isShared) {
      useGameStore.getState().resetGame();
    }
    router.push('/');
  };
  
  // --- Fetch Personality Insights ---
  const { data: insightsResponse, isLoading: isLoadingInsights, error: insightsError } = 
    useGeneratePersonalityInsights(profile?.id || '');
  
  // Loading state
  if (isLoadingShared || isGenerating || (!profile && !generationError)) {
    return (
      <Card className="w-full max-w-5xl mx-auto shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <Skeleton className="h-6 w-1/4 mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div>
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex justify-center w-full">
            <div className="animate-pulse text-center text-gray-600 dark:text-gray-300">
              {isGenerating ? "Generating your Human Edge Profile..." : "Loading profile..."}
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  }
  
  // Error state
  if (generationError) {
    return (
      <Card className="w-full max-w-5xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle size={24} />
            Error
          </CardTitle>
          <CardDescription>
            We encountered a problem while generating your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-red-800 dark:text-red-300">{generationError}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={generateUserProfile}
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-5xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                Your Human Edge Profile
              </CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800">
                <CheckIcon size={12} className="mr-1" />
                Complete
              </Badge>
            </div>
            <CardDescription className="mt-1">
              Based on your responses, we&apos;ve identified your unique human strengths in the age of AI.
            </CardDescription>
          </div>
          {!isShared && isAuthenticated && (
            <div className="flex gap-2">
              <Button 
                onClick={handleCopyLink}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
                size="sm"
              >
                <ShareIcon size={16} />
                {copied ? 'Copied!' : 'Share'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="traits">Traits & Attitudes</TabsTrigger>
            <TabsTrigger value="insights">Insights & Next Steps</TabsTrigger>
            <TabsTrigger value="evaluation">
              <span className="flex items-center">
                <ActivityIcon className="w-4 h-4 mr-1" />
                Evaluation
              </span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-8">
        {/* Focus Area Section */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Your Focus Area</h3>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-lg text-indigo-700 dark:text-indigo-300">
              {profile?.focus.name}
            </h4>
            <p className="mt-2 text-gray-700 dark:text-gray-300">
              {profile?.focus.description}
            </p>
          </div>
        </div>
        
        {/* Human Strengths Section */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Your Human Strengths</h3>
          <ul className="space-y-3">
            {profile?.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 h-6 w-6 flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Insights Section */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Key Insights</h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-700 dark:text-gray-300">
            <p>{profile?.insights}</p>
          </div>
        </div>
        
        {/* Recommendations Section */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Recommended Next Steps</h3>
          <ul className="space-y-3">
            {profile?.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 h-6 w-6 flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
          </TabsContent>
          
          <TabsContent value="traits" className="mt-6 space-y-8">
            {/* Trait Visualization */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold">Your Traits vs. AI Capabilities</h3>
                <ToggleGroup type="single" value={traitVisualization} onValueChange={(value: string | undefined) => value && setTraitVisualization(value as 'radar' | 'bar')}>
                  <ToggleGroupItem value="radar" aria-label="Radar View">
                    <RadarIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="bar" aria-label="Bar Chart View">
                    <BarChart3Icon className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This visualization shows your human traits compared to estimated AI capabilities.
                Areas where your traits exceed AI capabilities represent your potential human edge.
              </p>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                {profile?.traits && traitVisualization === 'radar' && (
                  <TraitRadarChart traits={profile.traits} />
                )}
                {profile?.traits && traitVisualization === 'bar' && (
                  <TraitBarChart traits={profile.traits} />
                )}
              </div>
            </div>
            
            {/* Detailed Traits */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Your Key Traits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile?.traits.map((trait) => (
                  <div key={trait.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{trait.name}</h4>
                      <span className="text-sm px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        {trait.value}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {trait.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* AI Attitudes */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Your AI Attitudes</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your attitudes toward AI influence how you can leverage your human edge effectively.
              </p>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                {profile?.aiAttitudes && profile.aiAttitudes.length > 0 ? (
                  <AttitudeBarChart attitudes={profile.aiAttitudes} />
                ) : (
                  <p className="text-center py-8 text-gray-500">No AI attitude data available</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="insights" className="mt-6 space-y-8">
             {/* Display Personality Insights here */}
             {isLoadingInsights && (
               <div className="space-y-6">
                 <Skeleton className="h-8 w-1/2 mb-4" />
                 <Skeleton className="h-20 w-full" />
                 <Skeleton className="h-6 w-1/3 mb-2" />
                 <Skeleton className="h-16 w-full" />
                 <Skeleton className="h-6 w-1/3 mb-2" />
                 <Skeleton className="h-24 w-full" />
               </div>
             )}

             {insightsError && (
               <Alert variant="destructive">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Error Loading Insights</AlertTitle>
                 <AlertDescription>
                   We couldn&apos;t load the detailed personality insights. Please try again later.
                 </AlertDescription>
               </Alert>
             )}

             {insightsResponse?.success && insightsResponse.data && (
               <div className="space-y-8">
                 {/* Overall Summary */}
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-xl flex items-center gap-2">
                       <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/>
                       Overall Personality Summary
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <p className="text-muted-foreground">
                       {isValidInsights(insightsResponse?.data) ? insightsResponse.data.overallSummary : 'Summary not available'}
                     </p>
                   </CardContent>
                 </Card>

                 <div className="grid md:grid-cols-2 gap-6">
                   {/* Communication Style */}
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg flex items-center gap-2">
                         <Users className="w-5 h-5 text-blue-600 dark:text-blue-400"/>
                         Communication Style
                       </CardTitle>
                       <CardDescription>
                         {isValidInsights(insightsResponse?.data) 
                           ? `Primary: ${insightsResponse.data.communicationStyle.primary} | Secondary: ${insightsResponse.data.communicationStyle.secondary}`
                           : 'Communication style not available'}
                       </CardDescription>
                     </CardHeader>
                     <CardContent>
                       <p className="text-sm text-muted-foreground">
                         {isValidInsights(insightsResponse?.data) 
                           ? insightsResponse.data.communicationStyle.description 
                           : 'Description not available'}
                       </p>
                     </CardContent>
                   </Card>

                   {/* AI Collaboration Strategy */}
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg flex items-center gap-2">
                         <BrainCircuit className="w-5 h-5 text-teal-600 dark:text-teal-400"/>
                         AI Collaboration Strategy
                       </CardTitle>
                       <CardDescription>
                         {isValidInsights(insightsResponse?.data) 
                           ? insightsResponse.data.aiCollaborationStrategy.title 
                           : 'Strategy not available'}
                       </CardDescription>
                     </CardHeader>
                     <CardContent>
                       <p className="text-sm text-muted-foreground mb-3">
                         {isValidInsights(insightsResponse?.data) 
                           ? insightsResponse.data.aiCollaborationStrategy.description 
                           : 'Description not available'}
                       </p>
                       <h4 className="font-medium text-sm mb-1">Tips:</h4>
                       <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                         {isValidInsights(insightsResponse?.data) 
                           ? insightsResponse.data.aiCollaborationStrategy.tips.map((tip: string, index: number) => (
                               <li key={index}>{tip}</li>
                             ))
                           : <li>No tips available</li>
                         }
                       </ul>
                     </CardContent>
                   </Card>
                 </div>


                 {/* Work Style */}
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2">
                       <ListChecks className="w-5 h-5 text-green-600 dark:text-green-400"/>
                       Work Style Analysis
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="grid md:grid-cols-3 gap-4">
                     <div>
                       <h4 className="font-medium mb-2 text-sm text-green-700 dark:text-green-300">Strengths</h4>
                       <ul className="list-none space-y-1 text-sm text-muted-foreground">
                         {isValidInsights(insightsResponse?.data) 
                           ? insightsResponse.data.workStyle.strengths.map((s: string, i: number) => (
                               <li key={i} className="flex items-start gap-1.5">
                                 <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-500 flex-shrink-0"/>
                                 <span>{s}</span>
                               </li>
                             ))
                           : <li>No strengths data available</li>
                         }
                       </ul>
                     </div>
                     <div>
                       <h4 className="font-medium mb-2 text-sm text-amber-700 dark:text-amber-300">Potential Challenges</h4>
                       <ul className="list-none space-y-1 text-sm text-muted-foreground">
                         {isValidInsights(insightsResponse?.data) 
                           ? insightsResponse.data.workStyle.challenges.map((c: string, i: number) => (
                               <li key={i} className="flex items-start gap-1.5">
                                 <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0"/>
                                 <span>{c}</span>
                               </li>
                             ))
                           : <li>No challenges data available</li>
                         }
                       </ul>
                     </div>
                     <div>
                       <h4 className="font-medium mb-2 text-sm text-blue-700 dark:text-blue-300">Recommendations</h4>
                       <ul className="list-none space-y-1 text-sm text-muted-foreground">
                         {isValidInsights(insightsResponse?.data) 
                           ? insightsResponse.data.workStyle.recommendations.map((r: string, i: number) => (
                               <li key={i} className="flex items-start gap-1.5">
                                 <Zap className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0"/>
                                 <span>{r}</span>
                               </li>
                             ))
                           : <li>No recommendations available</li>
                         }
                       </ul>
                     </div>
                   </CardContent>
                 </Card>


                 {/* Key Trait/Attitude Insights */}
                 <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                       <CardHeader>
                         <CardTitle className="text-lg">Key Trait Insights</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            {isValidInsights(insightsResponse?.data) 
                              ? insightsResponse.data.keyTraitInsights.map((insight: string, index: number) => (
                                  <li key={index}>{insight}</li>
                                ))
                              : <li>No trait insights available</li>
                            }
                         </ul>
                       </CardContent>
                    </Card>
                     <Card>
                       <CardHeader>
                         <CardTitle className="text-lg">Key Attitude Insights</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            {isValidInsights(insightsResponse?.data) 
                              ? insightsResponse.data.keyAttitudeInsights.map((insight: string, index: number) => (
                                  <li key={index}>{insight}</li>
                                ))
                              : <li>No attitude insights available</li>
                            }
                         </ul>
                       </CardContent>
                     </Card>
                 </div>
               </div>
             )}
          </TabsContent>
          
          {/* Evaluation Tab Content */}
          <TabsContent value="evaluation" className="mt-6">
            <EvaluationBreakdown />
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex-col sm:flex-row gap-4">
        {!isShared && isAuthenticated && (
          <div className="flex gap-2 mb-4 sm:mb-0">
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my Human Edge Profile! ${shareUrl}`)}`, '_blank')}>
              <Twitter size={16} />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')}>
              <Linkedin size={16} />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')}>
              <Facebook size={16} />
            </Button>
          </div>
        )}
        {!isShared && isAuthenticated && profile && (
          <Button 
            className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white"
            onClick={() => router.push('/challenges/adaptive')}
          >
            Take Your Next Personalized Challenge
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={handleStartNewGame}
          className="w-full sm:w-auto"
        >
          {isShared ? 'Create Your Own Profile' : 'Start a New Game'}
        </Button>
      </CardFooter>
    </Card>
  );
}
