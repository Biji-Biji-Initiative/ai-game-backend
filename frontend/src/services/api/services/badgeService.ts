/**
 * Badge Service
 * 
 * Provides hooks for user badges data.
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';

// Define schema for badge progress
const BadgeProgressSchema = z.object({
  current: z.number(),
  target: z.number(),
  percentage: z.number().gte(0).lte(100)
});

// Define schema for badge
const BadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(), // Icon name (for display)
  category: z.enum(['achievement', 'skill', 'milestone', 'special']),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  earnedAt: z.string().datetime({ offset: true }),
  progress: BadgeProgressSchema.optional()
});

export type Badge = z.infer<typeof BadgeSchema>;

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
      // When Zodios client is enabled:
      // return apiClient.get<Badge[]>(
      //   '/badges/user/' + userId,
      //   { alias: 'getUserBadges' }
      // );
      
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
            earnedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() // 12 days ago
          },
          {
            id: 'badge-3',
            name: 'Consistent Contributor',
            description: 'Maintained a 7-day activity streak',
            icon: 'flame',
            category: 'milestone',
            rarity: 'common',
            earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            progress: {
              current: 7,
              target: 7,
              percentage: 100
            }
          }
        ]
      };
    },
    enabled: enabled && !!userId,
  });
};

/**
 * Get a badge by ID (typically used for fetching a single badge detail)
 */
export const useGetBadgeById = (badgeId?: string, enabled: boolean = true) => {
  return useQuery<ApiResponse<Badge>, Error>({
    queryKey: ['badge', badgeId],
    queryFn: async (): Promise<ApiResponse<Badge>> => {
      // When Zodios client is enabled:
      // return apiClient.get<Badge>(
      //   '/badges/' + badgeId,
      //   { alias: 'getBadgeById' }
      // );
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock badge data
      return {
        success: true,
        status: 200,
        data: {
          id: badgeId || 'badge-1',
          name: 'Fast Learner',
          description: 'Completed 5 challenges within the first week',
          icon: 'zap',
          category: 'achievement',
          rarity: 'uncommon',
          earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        }
      };
    },
    enabled: enabled && !!badgeId,
  });
}; 