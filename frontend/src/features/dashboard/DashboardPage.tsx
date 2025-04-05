'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { shallow } from 'zustand/shallow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LogOut, FileText, Target, Award, BarChart, Clock, Trophy, Zap, History, CheckCircle, Star, ArrowUpCircle, Medal } from 'lucide-react';
import { useGetProgressSummary, useGetSkillProgress, useGetUserJourneyEvents } from '@/services/api/services';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { AdaptiveRecommendations } from '@/features/dashboard/AdaptiveRecommendations';
import { PersonalitySnippets } from '@/features/dashboard/PersonalitySnippets';
import { BadgeDisplay } from '@/features/dashboard/BadgeDisplay';
import ApiError from '@/components/ui/api-error';
import { useRenderTracker } from '@/hooks/use-render-tracker';
import { useSelectorDebug } from '@/hooks/use-selector-debug';
import { debugBreakIf, countExecution } from '@/hooks/use-debug';

// Define default progress for when data is loading
const DEFAULT_PROGRESS = {
  userId: 'default',
  overall: 0,
  level: 1,
  totalBadges: 0,
  totalChallenges: 10,
  challengesCompleted: 0,
  streakDays: 0,
  skillLevels: {
    'critical-thinking': 1,
    'problem-solving': 1,
    'ai-collaboration': 1,
  },
  lastActive: new Date().toISOString(),
  overallProgress: 0,
};

// Define interfaces for each data type
interface ProgressData {
  userId: string;
  overall: number;
  level: number;
  totalBadges: number;
  totalChallenges: number;
  challengesCompleted: number;
  streakDays: number;
  skillLevels: {
    'critical-thinking': number;
    'problem-solving': number;
    'ai-collaboration': number;
  };
  lastActive: string;
  overallProgress: number;
}

interface SkillData {
  progressRecords: {
    id: string;
    challengeId: string;
    focusArea: string;
    averageScore: number;
    completedAt: string;
  }[];
  skills: {
    id: string;
    name: string;
    level: number;
    progress: number;
  }[];
  count: number;
  pagination: {
    total: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
  };
}

interface JourneyEvent {
  id: string;
  userId?: string;
  type: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  timestamp?: string;
  details?: {
    description?: string;
    [key: string]: unknown;
  };
}

// Define the props interface for the component
interface DashboardPageProps {
  initialProgressData?: ProgressData | null;
  initialSkillData?: SkillData | null;
  initialJourneyData?: JourneyEvent[] | null;
}

export default function DashboardPage({
  initialProgressData = null,
  initialSkillData = null,
  initialJourneyData = null,
}: DashboardPageProps) {
  // Track component renders
  const renderCount = useRenderTracker('DashboardPage', { initialProgressData, initialSkillData, initialJourneyData });
  
  const router = useRouter();
  
  // Create a stable selector function with useCallback
  const gameStateSelector = useCallback((state) => ({
    isAuthenticated: state.isAuthenticated,
    userInfo: state.userInfo,
    profile: state.profile,
    focus: state.focus,
    logout: state.logout,
    userId: state.userId
  }), []);

  // Use debug selector with stable selector function
  const { isAuthenticated, userInfo, profile, focus, logout, userId } = useSelectorDebug(
    'DashboardPage',
    useGameStore,
    gameStateSelector,
    shallow
  );

  // Get progress data with a default ID if userId is undefined
  const progressId = userId || 'default-user-id';

  // Fetch user progress data - disabled if we have initial data from the server
  const { 
    data: progressData, 
    isLoading: isLoadingProgress,
    isError: isProgressError,
    error: progressError,
    refetch: refetchProgress
  } = useGetProgressSummary(progressId, !initialProgressData);
  
  // Fetch skills progress - disabled if we have initial data from the server
  const { 
    data: skillData, 
    isLoading: isLoadingSkills,
    isError: isSkillsError,
    error: skillsError,
    refetch: refetchSkills
  } = useGetSkillProgress(progressId, !initialSkillData);

  // Fetch user journey events - disabled if we have initial data from the server
  const { 
    data: journeyData, 
    isLoading: isLoadingJourney,
    isError: isJourneyError,
    error: journeyError,
    refetch: refetchJourney
  } = useGetUserJourneyEvents(progressId, !initialJourneyData);

  // Redirect to home if not authenticated
  useEffect(() => {
    // Count how many times this effect runs and break if it exceeds a reasonable limit
    const count = countExecution('DashboardPage.authEffect', 10);
    
    console.log(`DashboardPage: Authentication effect run #${count}, isAuthenticated=${isAuthenticated}`);
    
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Handle logout
  const handleLogout = () => {
    console.log('DashboardPage: Logout button clicked');
    logout();
    router.push('/');
  };

  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  // Use initial data or data from the hooks
  const progressResult = initialProgressData 
    ? { success: true, data: initialProgressData } 
    : progressData;
  
  const skillResult = initialSkillData
    ? { success: true, data: initialSkillData }
    : skillData;
  
  const journeyResult = initialJourneyData
    ? { success: true, data: initialJourneyData }
    : journeyData;

  // Extract progress data safely
  const progress = progressResult?.data || DEFAULT_PROGRESS;
  
  // Extract skills data safely
  const skills = skillResult?.data?.skills || [];
  
  // Extract journey events safely
  const journeyEvents = journeyResult?.data || [];

  // Safely extract focus properties
  const focusName = typeof focus === 'object' && focus ? focus.name : 'Not set';
  const focusDescription = typeof focus === 'object' && focus ? focus.description : 'Complete the game to discover your focus area';
  const isFocusDisabled = !focus || typeof focus === 'function';

  // Break if we detect too many renders
  debugBreakIf(renderCount > 20, 'DashboardPage has rendered more than 20 times - potential infinite loop');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 right-0 bg-red-500 text-white px-2 py-1 text-xs z-50">
          Render: {renderCount}
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {userInfo?.name || 'User'}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>

        {/* Progress Summary Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5 text-indigo-500" />
              Your Progress
            </CardTitle>
            <CardDescription>
              Track your journey and skill development
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!initialProgressData && isLoadingProgress) ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ) : isProgressError ? (
              <ApiError 
                error={progressError} 
                retry={refetchProgress}
                title="Failed to load progress data"
              />
            ) : progressResult?.success && progressResult.data ? (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm font-medium">{progress.overallProgress}%</span>
                  </div>
                  <Progress value={progress.overallProgress} className="h-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Level</p>
                      <p className="text-xl font-bold">{progress.level}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Challenges Completed</p>
                      <p className="text-xl font-bold">{progress.challengesCompleted}/{progress.totalChallenges}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Day Streak</p>
                      <p className="text-xl font-bold">{progress.streakDays} days</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                No progress data available. Start taking challenges to build your profile!
              </p>
            )}
          </CardContent>
          {!isLoadingProgress && progressResult?.success && progressResult.data && (
            <CardFooter className="border-t px-6 py-4">
              <Button variant="outline" className="w-full" onClick={() => router.push('/challenges')}>
                Take a New Challenge
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Skill Progress Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Skill Development</CardTitle>
            <CardDescription>
              Your progress across key skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!initialSkillData && isLoadingSkills) ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : isSkillsError ? (
              <ApiError 
                error={skillsError} 
                retry={refetchSkills}
                title="Failed to load skill data"
              />
            ) : skillResult?.success && skillResult.data ? (
              <div className="space-y-4">
                {skills.map((skill) => (
                  <div key={skill.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-sm px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        Level {skill.level}
                      </span>
                    </div>
                    <Progress value={skill.progress} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                No skill data available yet. Complete challenges to build your skills!
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-500" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {profile?.insights || 'Complete the game to generate your full profile'}
              </p>
              <Button 
                variant="default" 
                className="w-full" 
                onClick={() => router.push('/profile')}
                disabled={!profile}
              >
                View Profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Target className="mr-2 h-5 w-5 text-green-500" />
                Focus Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium mb-1">{focusName}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {focusDescription}
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/focus')}
                disabled={isFocusDisabled}
              >
                Explore Focus
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Award className="mr-2 h-5 w-5 text-amber-500" />
                Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tackle personalized challenges to improve your skills
              </p>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => router.push('/challenges')}
              >
                Browse Challenges
              </Button>
            </CardContent>
          </Card>

          {/* Add Leaderboard card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-indigo-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                See how you stack up against other users and climb the ranks
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/leaderboard')}
              >
                View Leaderboard
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Add the adaptive recommendations section before the recent activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left column: Adaptive recommendations */}
          <AdaptiveRecommendations userId={userId || 'default-user-id'} />
          
          {/* Right column: Personality snippets */}
          <PersonalitySnippets />
        </div>
        
        {/* Badges display section */}
        <div className="mb-8">
          <BadgeDisplay userId={userId || 'default-user-id'} isAuthenticated={!!isAuthenticated} />
        </div>
        
        {/* Recent activity card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5 text-purple-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your recent interactions and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!initialJourneyData && isLoadingJourney) ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isJourneyError ? (
              <ApiError 
                error={journeyError} 
                retry={refetchJourney}
                title="Failed to load activity data"
              />
            ) : journeyResult?.success && journeyEvents.length > 0 ? (
              <div className="space-y-4">
                {journeyEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      {event.type === 'CHALLENGE_COMPLETED' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {event.type === 'PROFILE_GENERATED' && (
                        <FileText className="h-5 w-5 text-blue-500" />
                      )}
                      {event.type === 'FOCUS_SELECTED' && (
                        <Target className="h-5 w-5 text-indigo-500" />
                      )}
                      {event.type === 'LEVEL_UP' && (
                        <ArrowUpCircle className="h-5 w-5 text-amber-500" />
                      )}
                      {event.type === 'BADGE_EARNED' && (
                        <Medal className="h-5 w-5 text-yellow-500" />
                      )}
                      {event.type === 'ASSESSMENT_COMPLETED' && (
                        <Star className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {(event.data as Record<string, string>)?.description || 
                         'Event details'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(
                          new Date(event.createdAt || ''), 
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No recent activity to display. Start by exploring your profile or taking on a challenge!
              </p>
            )}
          </CardContent>
          {(!initialJourneyData && !isLoadingJourney) && journeyResult?.success && journeyEvents.length > 5 && (
            <CardFooter className="border-t px-6 py-4">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View All Activity
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
} 