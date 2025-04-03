'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useGameStore } from '@/store/useGameStore';
import { useGetUserBadges } from '@/services/api/services/progressService';
import { User, ArrowLeft, Brain, Users, Target, BarChart2, HeartHandshake, Share2, Award, Mail } from 'lucide-react';
import TraitRadarChart from '@/components/ui/trait-radar-chart';
import AttitudeBarChart from '@/components/ui/attitude-bar-chart';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Get data from game store
  const { 
    isAuthenticated, 
    userInfo, 
    profile, 
    focus, 
    personality, 
    userId 
  } = useGameStore(state => ({
    isAuthenticated: state.isAuthenticated,
    userInfo: state.userInfo,
    profile: state.profile,
    focus: state.focus,
    personality: state.personality,
    userId: state.userId
  }));
  
  // Get user badges
  const { data: badgesData, isLoading: isLoadingBadges } = useGetUserBadges(userId, isAuthenticated);
  
  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);
  
  // Handle share profile
  const handleShareProfile = () => {
    // Generate a shareable URL
    const shareUrl = `${window.location.origin}/shared/${userId || 'user-123'}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast({
          title: 'Profile link copied!',
          description: 'Share this link with others to view your profile',
          variant: 'default'
        });
      })
      .catch(err => {
        console.error('Failed to copy profile link:', err);
        toast({
          title: 'Copy failed',
          description: 'Please try again or copy the URL manually',
          variant: 'destructive'
        });
      });
  };
  
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <Card className="w-full md:w-1/3">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-xl font-bold">
                  {userInfo.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <Button variant="ghost" size="icon" onClick={handleShareProfile}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{userInfo.name || 'User'}</h2>
                <p className="text-muted-foreground">{userInfo.professionalTitle || 'Professional'}</p>
                {userInfo.location && (
                  <p className="text-sm text-muted-foreground">{userInfo.location}</p>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push('/profile/edit')}
              >
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              
              <hr className="my-2" />
              
              <div className="space-y-2">
                <h3 className="font-medium">Contact</h3>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Mail className="mr-2 h-4 w-4" />
                  {userInfo.email || 'user@example.com'}
                </Button>
              </div>
              
              {/* Badges Section */}
              <div className="space-y-2">
                <h3 className="font-medium">Recent Badges</h3>
                {isLoadingBadges ? (
                  <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-8 w-8 rounded-full" />
                    ))}
                  </div>
                ) : badgesData?.success && badgesData.data && badgesData.data.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {badgesData.data.slice(0, 3).map(badge => (
                      <Badge key={badge.id} variant="outline" className="rounded-full py-1 px-2">
                        <Award className="h-3.5 w-3.5 mr-1" />
                        {badge.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No badges earned yet. Complete challenges to earn badges!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Profile Summary */}
          <Card className="w-full md:w-2/3">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                Your Personality Profile
              </CardTitle>
              <CardDescription>
                Based on your assessment results and interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile?.insights ? (
                <p className="mb-6">{profile.insights}</p>
              ) : (
                <Skeleton className="h-24 w-full mb-6" />
              )}
              
              {focus ? (
                <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold flex items-center mb-2">
                    <Target className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                    Focus Area: {focus.name}
                  </h3>
                  <p className="text-sm">{focus.description}</p>
                </div>
              ) : (
                <Skeleton className="h-32 w-full mb-6" />
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Detailed Personality Analytics */}
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
            <TabsTrigger value="strengths" className="flex items-center">
              <BarChart2 className="h-4 w-4 mr-2" />
              Strengths & Skills
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Interpersonal Analysis
            </TabsTrigger>
          </TabsList>
          
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/profile/edit/personality')}
              className="text-xs"
            >
              Edit Personality Profile
            </Button>
          </div>
          
          {/* Traits Content */}
          <TabsContent value="traits">
            <Card>
              <CardHeader>
                <CardTitle>Cognitive Traits</CardTitle>
                <CardDescription>
                  Traits represent your thinking and processing tendencies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {personality?.traits?.length > 0 ? (
                  <>
                    <div className="md:w-2/3 md:mx-auto">
                      <TraitRadarChart traits={personality.traits} />
                    </div>
                    
                    <div className="space-y-4">
                      {personality.traits.map(trait => (
                        <div key={trait.id} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{trait.name}</span>
                              <p className="text-xs text-muted-foreground">{trait.description}</p>
                            </div>
                            <span className="font-semibold">{trait.value}%</span>
                          </div>
                          <Progress value={trait.value} className="h-2" />
                          <p className="text-sm mt-1">
                            {trait.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Attitudes Content */}
          <TabsContent value="attitudes">
            <Card>
              <CardHeader>
                <CardTitle>AI Attitudes</CardTitle>
                <CardDescription>
                  How you tend to approach and interact with AI systems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {personality?.attitudes?.length > 0 ? (
                  <>
                    <div className="md:w-2/3 md:mx-auto">
                      <AttitudeBarChart attitudes={personality.attitudes} />
                    </div>
                    
                    <div className="space-y-4">
                      {personality.attitudes.map(attitude => (
                        <div key={attitude.id} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{attitude.attitude}</span>
                              <p className="text-xs text-muted-foreground">
                                How you approach AI in this way
                              </p>
                            </div>
                            <span className="font-semibold">{attitude.strength}%</span>
                          </div>
                          <Progress value={attitude.strength} className="h-2" />
                          <p className="text-sm mt-1">
                            Shows in how you interact with AI systems
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-4 mt-4">
                      <h3 className="font-semibold mb-2">Your AI Interaction Style</h3>
                      <p>
                        Your attitude assessment suggests you tend to approach AI with a 
                        {personality.attitudes.find(a => a.strength > 70)?.attitude || 'balanced'} 
                        mindset. This influences how you collaborate with AI systems and may affect your 
                        performance on certain types of challenges.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Strengths Content */}
          <TabsContent value="strengths">
            <Card>
              <CardHeader>
                <CardTitle>Human Edge Strengths</CardTitle>
                <CardDescription>
                  Areas where you show the strongest human advantage over AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.strengths ? (
                  <div className="space-y-6">
                    {profile.strengths.map((strengthText: string, index: number) => {
                      // Format the strength text into a structured display object
                      const strengthDisplay = formatStrengthForDisplay(strengthText, index);
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold">{strengthDisplay.name}</h3>
                            <div className="flex items-center">
                              <span className="text-sm font-medium mr-2">
                                {strengthDisplay.score}/10
                              </span>
                              {/* Star rating */}
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Award 
                                    key={i} 
                                    className={`h-4 w-4 ${
                                      i < Math.round(strengthDisplay.score / 2) 
                                        ? 'text-amber-500 fill-amber-500' 
                                        : 'text-gray-300'
                                    }`} 
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <Progress value={strengthDisplay.score * 10} className="h-2" />
                          <p className="text-sm">{strengthDisplay.description}</p>
                        </div>
                      );
                    })}
                    
                    <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg mt-6">
                      <h3 className="font-semibold mb-2">Your Competitive Advantage</h3>
                      <p>
                        Your strongest human edge areas represent your most effective capabilities 
                        when working alongside or competing with AI systems. Focus on leveraging 
                        these strengths for maximum impact.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Analysis Content */}
          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Interpersonal & Collaboration Analysis</CardTitle>
                <CardDescription>
                  How you might work with others and AI systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.insights ? (
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg">
                      <h3 className="font-semibold mb-3">Communication Style</h3>
                      <p>
                        Based on your profile, you likely communicate in a 
                        {personality?.traits?.find(t => t.name === 'Analytical Thinking')?.value || 0 > 70 ? ' precise and logical ' : ' nuanced and context-aware '}
                        manner. When working with others, you tend to 
                        {personality?.traits?.find(t => t.name === 'Adaptability')?.value || 0 > 70 ? ' adjust your approach based on the situation' : ' maintain a consistent communication style'}.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg">
                      <h3 className="font-semibold mb-3">Team Dynamics</h3>
                      <p>
                        In team settings, you likely 
                        {personality?.traits?.find(t => t.name === 'Creativity')?.value || 0 > 70 ? ' bring innovative ideas and perspectives' : ' provide structure and organization'}. 
                        Your approach to 
                        {personality?.traits?.find(t => t.name === 'Leadership')?.value || 0 > 70 ? ' taking initiative and guiding others' : ' supporting team efforts and collaborating'}
                        creates value in group scenarios.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg">
                      <h3 className="font-semibold mb-3">Human-AI Collaboration</h3>
                      <p>
                        When working with AI systems, your 
                        {personality?.attitudes?.find(a => a.attitude === 'Critical')?.strength || 0 > 70 ? ' careful evaluation of AI outputs' : ' willingness to explore AI capabilities'}
                        enables 
                        {personality?.attitudes?.find(a => a.attitude === 'Collaborative')?.strength || 0 > 70 ? ' effective partnerships where AI augments your strengths' : ' you to maintain control while leveraging AI assistance'}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper function to format strength string into display object
function formatStrengthForDisplay(strength: string, index: number) {
  // Extract a name from the strength string
  const strengthParts = strength.split(' that ');
  const name = strengthParts[0].replace(/^Strong |^Capacity to leverage |^Advanced /, '');
  
  // Generate a score between 7-10 based on the index (first strengths are strongest)
  const score = 10 - index * 0.5;
  
  // Use the full string as description
  const description = strength;
  
  return {
    name,
    score,
    description
  };
} 