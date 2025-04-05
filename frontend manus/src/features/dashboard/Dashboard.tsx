'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Removed unused tabs imports
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
// No need to import apiClient anymore

// Mock data for the dashboard
const mockUserProgress = {
  completedRounds: 7,
  totalRounds: 25,
  lastActive: '2025-03-30T14:23:00Z',
  streak: 3,
  level: 3,
  xp: 1250,
  nextLevelXp: 2000,
  recentActivity: [
    { id: '1', type: 'challenge_completed', title: 'Ethical AI Decision Making', date: '2025-03-30T14:23:00Z' },
    { id: '2', type: 'level_up', title: 'Reached Level 3', date: '2025-03-29T09:15:00Z' },
    { id: '3', type: 'badge_earned', title: 'Critical Thinker Badge', date: '2025-03-27T16:45:00Z' },
  ]
};

const mockRecommendedChallenges: RecommendedChallenge[] = [
  {
    id: 'c1',
    title: 'AI Ethics in Healthcare',
    description: 'Explore the ethical implications of AI in medical diagnosis and treatment planning.',
    difficulty: 'intermediate',
    category: 'Ethics',
    estimatedTime: '25 min',
    matchScore: 92,
    tags: ['ethics', 'healthcare', 'decision-making']
  },
  {
    id: 'c2',
    title: 'Creative Collaboration with AI',
    description: 'Learn techniques for effective human-AI collaboration in creative fields.',
    difficulty: 'beginner',
    category: 'Collaboration',
    estimatedTime: '15 min',
    matchScore: 88,
    tags: ['creativity', 'collaboration', 'tools']
  },
  {
    id: 'c3',
    title: 'Critical Analysis of AI-Generated Content',
    description: 'Develop skills to critically evaluate and improve AI-generated content.',
    difficulty: 'advanced',
    category: 'Analysis',
    estimatedTime: '40 min',
    matchScore: 85,
    tags: ['content', 'analysis', 'critical-thinking']
  }
];

// Types for the dashboard components

interface RecommendedChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime: string;
  matchScore: number;
}

// Mock API hooks for the dashboard
import { ApiResponse } from '@/services/api/apiResponse';

// Define the interface for the API response data structure
interface UserProgressData {
  completedRounds: number;
  totalRounds: number;
  lastActive: string;
  streak: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  recentActivity: {
    id: string;
    type: string;
    title: string;
    date: string;
  }[];
}

// Define the interface for the component state - same structure as API data
type DashboardProgress = UserProgressData;

const useGetUserProgress = () => {
  return useQuery<ApiResponse<UserProgressData>, Error>(
    ['userProgress'],
    async () => {
      // Simulate API response using the new apiClient structure
      return {
        data: mockUserProgress as UserProgressData,
        status: 200,
        success: true,
        error: undefined
      };
    }
  );
};

interface RecommendedChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  estimatedTime: string;
  matchScore: number;
  tags: string[];
}

const useGetRecommendedChallenges = () => {
  return useQuery<ApiResponse<RecommendedChallenge[]>, Error>(
    ['recommendedChallenges'],
    async () => {
      // Simulate API response using the new apiClient structure
      return {
        data: mockRecommendedChallenges,
        status: 200,
        success: true,
        error: undefined
      };
    }
  );
};

// Helper function to generate personalized trait insights
const getTraitInsight = (traitName: string, profession: string, index: number): string => {
  const insights: Record<string, string[]> = {
    'Creativity': [
      `Your creative thinking allows you to imagine novel solutions that AI cannot, giving you an edge in ${profession}.`,
      `While AI can generate variations, your creativity brings truly original ideas to ${profession} challenges.`,
      `Your ability to think outside established patterns helps you excel in ${profession} where AI follows learned patterns.`
    ],
    'Critical Thinking': [
      `Your ability to evaluate information from multiple perspectives gives you an advantage over AI in ${profession}.`,
      `In ${profession}, your critical thinking allows you to question assumptions that AI might accept without scrutiny.`,
      `You can identify logical fallacies and weak arguments in ${profession} contexts where AI might miss nuance.`
    ],
    'Emotional Intelligence': [
      `Your emotional intelligence helps you navigate complex interpersonal dynamics in ${profession} that AI cannot fully comprehend.`,
      `In ${profession}, your ability to empathize with others gives you insights that AI algorithms cannot access.`,
      `Your capacity to read emotional cues and respond appropriately is invaluable in ${profession} situations.`
    ],
    'Adaptability': [
      `Your adaptability allows you to navigate uncertainty in ${profession} more effectively than rigid AI systems.`,
      `In rapidly changing ${profession} environments, your flexibility gives you an edge over AI that requires retraining.`,
      `Your ability to quickly adjust to new ${profession} challenges lets you thrive where AI might struggle.`
    ],
    'Ethical Reasoning': [
      `Your nuanced ethical reasoning helps you navigate complex moral dilemmas in ${profession} that AI cannot fully grasp.`,
      `In ${profession}, your ability to weigh competing values gives you an advantage in ethically ambiguous situations.`,
      `Your capacity to consider stakeholder perspectives in ${profession} decisions brings depth that AI recommendations lack.`
    ]
  };
  
  // Default insights for any trait not specifically covered
  const defaultInsights = [
    `Your ${traitName.toLowerCase()} skills provide unique value in ${profession} contexts where AI solutions may be limited.`,
    `In ${profession}, your ${traitName.toLowerCase()} capabilities complement AI tools by adding human judgment.`,
    `Your ${traitName.toLowerCase()} abilities help you excel in ${profession} areas where human expertise remains essential.`
  ];
  
  // Get the relevant insights or use defaults
  const relevantInsights = insights[traitName] || defaultInsights;
  
  // Return the insight at the given index, or the first if index is out of bounds
  return relevantInsights[index % relevantInsights.length];
};

export default function Dashboard() {
  const router = useRouter();
  const { profile, focus, userInfo, personality } = useGameStore(state => ({
    profile: state.profile,
    focus: state.focus,
    userInfo: state.userInfo,
    personality: state.personality
  }));
  
  // Fetch user progress
  const progressQuery = useGetUserProgress();
  const [progress, setProgress] = useState<DashboardProgress | null>(null);
  
  // Fetch recommended challenges
  const challengesQuery = useGetRecommendedChallenges();
  const [recommendedChallenges, setRecommendedChallenges] = useState<RecommendedChallenge[]>([]);
  
  useEffect(() => {
    if (progressQuery.data?.success && progressQuery.data?.data) {
      // Set the progress data directly from the API response
      setProgress(progressQuery.data.data);
    }
  }, [progressQuery.data]);
  
  useEffect(() => {
    if (challengesQuery.data?.success && challengesQuery.data?.data) {
      setRecommendedChallenges(challengesQuery.data.data);
    }
  }, [challengesQuery.data]);
  
  const handleStartChallenge = (challengeId: string) => {
    // In a real implementation, this would set the current challenge in the game store
    // and navigate to the appropriate page
    console.log(`Starting challenge: ${challengeId}`);
    router.push('/round1');
  };
  
  // Format date for better display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile Summary Card */}
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Your human edge assessment</CardDescription>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-4">
                {/* User Info Section */}
                <div className="border-b pb-3">
                  <h3 className="font-medium mb-2">Profile</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p className="font-semibold">{userInfo.name || 'Anonymous User'}</p>
                    {userInfo.professionalTitle && (
                      <p>{userInfo.professionalTitle}</p>
                    )}
                    {userInfo.location && (
                      <p className="text-xs text-gray-500">{userInfo.location}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Focus Area</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {focus?.name || 'Not selected'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {focus?.matchLevel || 0}% match
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Top Traits</h3>
                  <div className="space-y-2">
                    {personality.traits.slice(0, 3).map(trait => (
                      <div key={trait.id} className="flex justify-between items-center">
                        <span className="text-sm">{trait.name}</span>
                        <Progress value={trait.value} className="w-24 h-2" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">AI Attitudes</h3>
                  <div className="space-y-2">
                    {personality.attitudes.slice(0, 3).map(attitude => (
                      <div key={attitude.id} className="flex justify-between items-center">
                        <span className="text-sm truncate max-w-[180px]" title={attitude.attitude}>
                          {attitude.attitude.length > 25 
                            ? `${attitude.attitude.substring(0, 25)}...` 
                            : attitude.attitude}
                        </span>
                        <Progress value={attitude.strength} className="w-24 h-2" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => router.push('/results')}
                  >
                    View Full Profile
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Complete a challenge to see your profile</p>
                <Button onClick={() => router.push('/')}>Start Assessment</Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Progress Card */}
        <Card className="w-full md:w-2/3">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>Track your journey and achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {progress ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {progress.completedRounds}
                    </div>
                    <div className="text-sm text-gray-500">Rounds Completed</div>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {progress.level}
                    </div>
                    <div className="text-sm text-gray-500">Current Level</div>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {progress.xp}
                    </div>
                    <div className="text-sm text-gray-500">Experience Points</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Level Progress</span>
                    <span>{progress.xp} / {progress.nextLevelXp} XP</span>
                  </div>
                  <Progress 
                    value={(progress.xp / progress.nextLevelXp) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Recent Activity</h3>
                  <div className="space-y-2">
                    {progress.recentActivity.map((activity: { id: string; type: string; title: string; date: string }, index: number) => (
                      <div key={index} className="flex p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mr-3 mt-1">
                          {activity.type === 'challenge_completed' && (
                            <span className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {activity.type === 'level_up' && (
                            <span className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </span>
                          )}
                          {activity.type === 'badge_earned' && (
                            <span className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-yellow-600 dark:text-yellow-300">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-sm">{activity.title}</span>
                            <span className="text-xs text-gray-500">
                              {formatDate(activity.date)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {activity.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Complete challenges to track your progress</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Professional Development Insights */}
      <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Professional Development Insights
          </CardTitle>
          <CardDescription>
            Personalized insights for your professional growth based on your human edge profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border">
            <h3 className="font-semibold text-lg mb-3 text-indigo-700 dark:text-indigo-300">
              Your Human Edge in {userInfo.professionalTitle || 'Your Field'}
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Based on your profile, here are key areas where you can leverage your human capabilities alongside AI:
            </p>
            <div className="space-y-2 mb-4">
              {personality.traits.slice(0, 3).map((trait, index) => (
                <div key={trait.id} className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                  <h4 className="font-medium text-indigo-800 dark:text-indigo-200">{trait.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {getTraitInsight(trait.name, userInfo.professionalTitle || 'your field', index)}
                  </p>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => router.push('/results')}>
              View Full Human Edge Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Recommended Challenges
          </CardTitle>
          <CardDescription>
            Challenges tailored to your human edge profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendedChallenges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedChallenges.map(challenge => (
                <div key={challenge.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 p-4 pb-16">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-indigo-800 dark:text-indigo-300">{challenge.title}</h3>
                      <Badge variant={
                        challenge.difficulty === 'beginner' ? 'outline' : 
                        challenge.difficulty === 'intermediate' ? 'secondary' : 
                        challenge.difficulty === 'advanced' ? 'destructive' :
                        'default'
                      }>
                        {challenge.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {challenge.description}
                    </p>
                    <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-xs text-gray-500">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>~{challenge.estimatedTime}</span>
                      </div>
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{challenge.matchScore}% match</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800">
                    <Button 
                      onClick={() => handleStartChallenge(challenge.id)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
                    >
                      Start Challenge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Complete your assessment to get personalized challenge recommendations
              </p>
              <Button onClick={() => router.push('/')}>Start Assessment</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
