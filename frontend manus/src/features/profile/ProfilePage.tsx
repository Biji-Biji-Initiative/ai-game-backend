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
import { useGetUserBadges } from '@/services/api/services/badgeService';
import { User, ArrowLeft, Brain, Users, Target, BarChart2, HeartHandshake, Share2, Award, Mail } from 'lucide-react';
import TraitRadarChart from '@/components/ui/trait-radar-chart';
import AttitudeBarChart from '@/components/ui/attitude-bar-chart';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

// Define a schema for user information with the fields we need
const ProfileUserSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  professionalTitle: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  bio: z.string().optional().nullable()
});

type SafeProfileUser = z.infer<typeof ProfileUserSchema>;

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
  
  // Validate and safely access user info
  const safeUserInfo: SafeProfileUser = userInfo ? 
    ProfileUserSchema.parse(userInfo) : 
    { fullName: 'User', email: '', professionalTitle: 'Professional' };
  
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
    if (!userId) {
      toast({
        title: 'Cannot share profile',
        description: 'User ID is missing, please try again later',
        variant: 'destructive'
      });
      return;
    }
    
    // Generate a shareable URL using only /profile/[id] route
    const shareUrl = `${window.location.origin}/profile/${userId}`;
    
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
  
  // Safely get the first letter of the user's name for the avatar
  const userInitial = safeUserInfo.fullName && safeUserInfo.fullName.length > 0 ? 
    safeUserInfo.fullName[0].toUpperCase() : 
    'U';
  
  return (
    <>
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
                {userInitial}
              </div>
              <Button variant="ghost" size="icon" onClick={handleShareProfile}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{safeUserInfo.fullName || 'User'}</h2>
              <p className="text-muted-foreground">{safeUserInfo.professionalTitle || 'Professional'}</p>
              {safeUserInfo.location && (
                <p className="text-sm text-muted-foreground">{safeUserInfo.location}</p>
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
                {safeUserInfo.email || 'user@example.com'}
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
                        <Progress value={trait.value} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No trait data available. Complete the assessment to see your traits.
                  </p>
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
                How you approach and interact with AI systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {personality?.attitudes?.length > 0 ? (
                <>
                  <div className="md:w-2/3 md:mx-auto pb-6">
                    <AttitudeBarChart attitudes={personality.attitudes} />
                  </div>
                  
                  <div className="space-y-4">
                    {personality.attitudes.map(attitude => (
                      <div key={attitude.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{attitude.attitude}</span>
                            <p className="text-xs text-muted-foreground">{attitude.description}</p>
                          </div>
                          <span className="font-semibold">{attitude.strength}%</span>
                        </div>
                        <Progress value={attitude.strength} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No attitude data available. Complete the assessment to see your AI attitudes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Strengths Content */}
        <TabsContent value="strengths">
          <Card>
            <CardHeader>
              <CardTitle>Strengths & Skills</CardTitle>
              <CardDescription>
                Areas where you have the strongest human edge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {personality?.strengths && personality.strengths.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personality.strengths.map((strength, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">{formatStrengthForDisplay(strength, index)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {personality.strengthDescriptions?.[index] || "This represents a core area where you have unique capabilities compared to AI systems."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No strength data available. Complete the assessment to see your human edge strengths.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analysis Content */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Interpersonal Analysis</CardTitle>
              <CardDescription>
                Insights into your collaboration and communication styles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {personality?.interpersonalInsights ? (
                <div className="space-y-4">
                  <p>{personality.interpersonalInsights}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Collaboration Style</h3>
                      <p className="text-sm text-muted-foreground">
                        {personality.collaborationStyle || "Your collaboration style is still being analyzed."}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Communication Preference</h3>
                      <p className="text-sm text-muted-foreground">
                        {personality.communicationPreference || "Your communication preference is still being analyzed."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    Interpersonal analysis not yet available. Continue using the platform to generate these insights.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

// Helper function to format strength for display
function formatStrengthForDisplay(strength: string, _index: number) {
  // Convert camelCase or snake_case to Title Case with spaces
  return strength
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first character
}