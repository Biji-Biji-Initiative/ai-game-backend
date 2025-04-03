'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LogOut, FileText, Target, Award, BarChart, Clock, Trophy, Zap, History, CheckCircle, Star, ArrowUpCircle, Medal } from 'lucide-react';
import { useGetProgressSummary, useGetSkillProgress } from '@/services/api/services/progressService';
import { useGetUserJourneyEvents } from '@/services/api/services/userJourneyService';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { AdaptiveRecommendations } from '@/features/dashboard/AdaptiveRecommendations';
import { PersonalitySnippets } from '@/features/dashboard/PersonalitySnippets';
import { BadgeDisplay } from '@/features/dashboard/BadgeDisplay';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, userInfo, profile, focus, logout, userId } = useGameStore(state => ({
    isAuthenticated: state.isAuthenticated,
    userInfo: state.userInfo,
    profile: state.profile,
    focus: state.focus,
    logout: state.logout,
    userId: state.userId
  }));

  // Fetch progress data
  const { data: progressData, isLoading: isLoadingProgress } = useGetProgressSummary(userId);
  const { data: skillData, isLoading: isLoadingSkills } = useGetSkillProgress(userId);

  // Fetch user journey events
  const { 
    data: journeyData, 
    isLoading: isLoadingJourney 
  } = useGetUserJourneyEvents(userId, 5); // Limit to 5 most recent events

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {userInfo.name || 'User'}
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
            {isLoadingProgress ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ) : progressData?.success && progressData.data ? (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm font-medium">{progressData.data.overallProgress}%</span>
                  </div>
                  <Progress value={progressData.data.overallProgress} className="h-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Level</p>
                      <p className="text-xl font-bold">{progressData.data.level}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Challenges Completed</p>
                      <p className="text-xl font-bold">{progressData.data.challengesCompleted}/{progressData.data.totalChallenges}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Day Streak</p>
                      <p className="text-xl font-bold">{progressData.data.streakDays} days</p>
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
          {!isLoadingProgress && progressData?.success && progressData.data && (
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
            {isLoadingSkills ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : skillData?.success && skillData.data ? (
              <div className="space-y-4">
                {skillData.data.skills.map((skill) => (
                  <div key={skill.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{skill.name}</span>
                      <span className="text-sm text-muted-foreground">Level {skill.level}</span>
                    </div>
                    <Progress value={skill.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{skill.progress}% to Level {skill.level + 1}</p>
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
              <p className="font-medium mb-1">{focus?.name || 'Not set'}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {focus?.description || 'Complete the game to discover your focus area'}
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/focus')}
                disabled={!focus}
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
          <AdaptiveRecommendations userId={userId} />
          
          {/* Right column: Personality snippets */}
          <PersonalitySnippets />
        </div>
        
        {/* Badges display section */}
        <div className="mb-8">
          <BadgeDisplay userId={userId} />
        </div>
        
        {/* Recent activity card (existing code) */}
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
            {isLoadingJourney ? (
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
            ) : journeyData?.success && journeyData.data?.events && journeyData.data.events.length > 0 ? (
              <div className="space-y-4">
                {journeyData.data.events.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      {event.type === 'challenge_completed' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {event.type === 'profile_generated' && (
                        <FileText className="h-5 w-5 text-blue-500" />
                      )}
                      {event.type === 'focus_selected' && (
                        <Target className="h-5 w-5 text-indigo-500" />
                      )}
                      {event.type === 'level_up' && (
                        <ArrowUpCircle className="h-5 w-5 text-amber-500" />
                      )}
                      {event.type === 'badge_earned' && (
                        <Medal className="h-5 w-5 text-yellow-500" />
                      )}
                      {event.type === 'assessment_completed' && (
                        <Star className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {event.details.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
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
          {!isLoadingJourney && journeyData?.success && journeyData.data?.events && journeyData.data.events.length > 0 && journeyData.data.hasMore && (
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
