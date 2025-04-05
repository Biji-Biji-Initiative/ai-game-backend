/**
 * Progress Service
 * 
 * Provides hooks for user progress and skill tracking
 */

import { useMutation as _useMutation, useQuery, useQueryClient as _useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';
import { schemas } from '@/lib/api/generated-zodios-client';
import { createApiHook as _createApiHook } from '@/services/api/create-api-hook';
import { ApiServiceProvider as _ApiServiceProvider } from '@/services/api/service-provider';

// Progress keys for React Query
const progressKeys = {
  all: ['progress'] as const,
  summary: (userId: string) => [...progressKeys.all, 'summary', userId] as const,
  skills: (userId: string) => [...progressKeys.all, 'skills', userId] as const,
  journey: (userId: string) => [...progressKeys.all, 'journey', userId] as const,
};

// Progress schemas
const _ProgressSummarySchema = z.object({
  userId: z.string(),
  overall: z.number(),
  level: z.number(),
  totalBadges: z.number(),
  totalChallenges: z.number(),
  challengesCompleted: z.number(),
  streakDays: z.number(),
  skillLevels: z.object({
    'critical-thinking': z.number(),
    'problem-solving': z.number(),
    'ai-collaboration': z.number(),
  }),
  lastActive: z.string(),
  overallProgress: z.number(),
});

const _SkillProgressSchema = z.object({
  progressRecords: z.array(z.object({
    id: z.string(),
    challengeId: z.string(),
    focusArea: z.string(),
    averageScore: z.number(),
    completedAt: z.string(),
  })),
  skills: z.array(z.object({
    id: z.string(),
    name: z.string(),
    level: z.number(),
    progress: z.number(),
  })),
  count: z.number(),
  pagination: z.object({
    total: z.number(),
    perPage: z.number(),
    currentPage: z.number(),
    totalPages: z.number(),
  }),
});

const _JourneyEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  data: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
});

// Import types from schemas
export type Progress = z.infer<typeof schemas.Progress>;
export type UserJourneyEvent = z.infer<typeof schemas.UserJourneyEvent>;

type ProgressSummary = z.infer<typeof _ProgressSummarySchema>;
type SkillProgress = z.infer<typeof _SkillProgressSchema>;
type JourneyEvent = z.infer<typeof _JourneyEventSchema>;

/**
 * Hook to get user progress summary
 */
export const useGetProgressSummary = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: progressKeys.summary(userId),
    queryFn: async (): Promise<ApiResponse<ProgressSummary>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockSummary: ProgressSummary = {
        userId,
        overall: 75,
        level: 4,
        totalBadges: 8,
        totalChallenges: 20,
        challengesCompleted: 15,
        streakDays: 5,
        skillLevels: {
          'critical-thinking': 3,
          'problem-solving': 4,
          'ai-collaboration': 3,
        },
        lastActive: new Date().toISOString(),
        overallProgress: 75,
      };
      
      return {
        success: true,
        status: 200,
        data: mockSummary,
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook to get user skill progress
 */
export const useGetSkillProgress = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: progressKeys.skills(userId),
    queryFn: async (): Promise<ApiResponse<SkillProgress>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockProgress: SkillProgress = {
        progressRecords: [
          {
            id: 'record-1',
            challengeId: 'challenge-1',
            focusArea: 'critical-thinking',
            averageScore: 85,
            completedAt: new Date().toISOString(),
          },
        ],
        skills: [
          {
            id: 'skill-1',
            name: 'Critical Thinking',
            level: 3,
            progress: 75,
          },
          {
            id: 'skill-2',
            name: 'Problem Solving',
            level: 4,
            progress: 85,
          },
          {
            id: 'skill-3',
            name: 'AI Collaboration',
            level: 3,
            progress: 65,
          },
        ],
        count: 1,
        pagination: {
          total: 15,
          perPage: 10,
          currentPage: 1,
          totalPages: 2,
        },
      };
      
      return {
        success: true,
        status: 200,
        data: mockProgress,
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Hook to get user journey events
 */
export const useGetUserJourneyEvents = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: progressKeys.journey(userId),
    queryFn: async (): Promise<ApiResponse<JourneyEvent[]>> => {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const mockEvents: JourneyEvent[] = [
        {
          id: 'event-1',
          userId,
          type: 'CHALLENGE_COMPLETED',
          data: {
            challengeId: 'challenge-1',
            score: 85,
          },
          metadata: {
            difficulty: 'intermediate',
          },
          createdAt: new Date().toISOString(),
        },
      ];
      
      return {
        success: true,
        status: 200,
        data: mockEvents,
      };
    },
    enabled: enabled && !!userId,
  });
};

export type { ProgressSummary, SkillProgress, JourneyEvent }; 