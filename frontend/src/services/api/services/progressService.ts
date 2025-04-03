/**
 * Progress Service
 * 
 * Provides hooks for user progress data.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../apiClient';
import { ApiResponse } from '../apiResponse';

// Types
export interface ProgressSummary {
  userId: string;
  overallProgress: number; // percentage
  level: number;
  rank: string; // e.g. "Novice", "Expert"
  xpToNextLevel: number;
  challengesCompleted: number;
  totalChallenges: number;
  streakDays: number;
  lastActivityDate: string;
}

export interface SkillProgress {
  userId: string;
  skills: {
    id: string;
    name: string;
    level: number; // 1-10
    progress: number; // percentage to next level
  }[];
  lastUpdated: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name (for display)
  category: 'achievement' | 'skill' | 'milestone' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  earnedAt: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

/**
 * Hook to get a user's progress summary
 * 
 * @param userId The user ID to get progress for
 * @param enabled Whether the query should execute automatically
 * @returns Query result with progress summary data
 */
export const useGetProgressSummary = (userId?: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<ProgressSummary>, Error>({
    queryKey: ['progressSummary', userId],
    queryFn: async (): Promise<ApiResponse<ProgressSummary>> => {
      // In a real app, this would use apiClient to fetch from the API
      // apiClient.get<ProgressSummary>(`/users/${userId}/progress`)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data
      return {
        success: true,
        status: 200,
        data: {
          userId: userId || 'user-123',
          overallProgress: 42,
          level: 3,
          rank: 'Edge Explorer',
          xpToNextLevel: 150,
          challengesCompleted: 7,
          totalChallenges: 25,
          streakDays: 5,
          lastActivityDate: new Date().toISOString()
        }
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook to get a user's skill progress
 * 
 * @param userId The user ID to get skill progress for
 * @param enabled Whether the query should execute automatically
 * @returns Query result with skill progress data
 */
export const useGetSkillProgress = (userId?: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<SkillProgress>, Error>({
    queryKey: ['skillProgress', userId],
    queryFn: async (): Promise<ApiResponse<SkillProgress>> => {
      // In a real app, this would use apiClient to fetch from the API
      // apiClient.get<SkillProgress>(`/users/${userId}/skills`)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      return {
        success: true,
        status: 200,
        data: {
          userId: userId || 'user-123',
          skills: [
            { id: 'skill-1', name: 'Creative Thinking', level: 4, progress: 65 },
            { id: 'skill-2', name: 'Critical Analysis', level: 5, progress: 30 },
            { id: 'skill-3', name: 'Emotional Intelligence', level: 3, progress: 85 },
            { id: 'skill-4', name: 'Adaptability', level: 6, progress: 10 },
            { id: 'skill-5', name: 'Communication', level: 4, progress: 50 }
          ],
          lastUpdated: new Date().toISOString()
        }
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook to get a user's earned badges
 * 
 * @param userId The user ID to get badges for
 * @param enabled Whether the query should execute automatically
 * @returns Query result with badges data
 */
export const useGetUserBadges = (userId?: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<Badge[]>, Error>({
    queryKey: ['userBadges', userId],
    queryFn: async (): Promise<ApiResponse<Badge[]>> => {
      // In a real app, this would use apiClient to fetch from the API
      // apiClient.get<Badge[]>(`/users/${userId}/badges`)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Mock badges data
      return {
        success: true,
        status: 200,
        data: [
          {
            id: 'badge-1',
            name: 'Fast Learner',
            description: 'Completed 5 challenges within the first week',
            icon: 'zap',
            category: 'achievement',
            rarity: 'uncommon',
            earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
          },
          {
            id: 'badge-2',
            name: 'Creative Genius',
            description: 'Scored over 90% on a creativity-focused challenge',
            icon: 'brain',
            category: 'skill',
            rarity: 'rare',
            earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
          },
          {
            id: 'badge-3',
            name: 'Empathy Master',
            description: 'Demonstrated exceptional emotional intelligence',
            icon: 'heart',
            category: 'skill',
            rarity: 'epic',
            earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
          },
          {
            id: 'badge-4',
            name: 'Early Adopter',
            description: 'One of the first 100 users to join the platform',
            icon: 'star',
            category: 'special',
            rarity: 'legendary',
            earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
          },
          {
            id: 'badge-5',
            name: 'Level 3 Explorer',
            description: 'Reached Level 3',
            icon: 'award',
            category: 'milestone',
            rarity: 'common',
            earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
          }
        ]
      };
    },
    enabled: enabled && !!userId,
  });
}; 