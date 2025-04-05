/**
 * User Journey Service
 * 
 * Provides hooks for user journey/activity history operations.
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { schemas } from '../../../lib/api/generated-zodios-client';
import { z } from 'zod';

// Types
export type UserJourneyEvent = z.infer<typeof schemas.UserJourneyEvent>;

export interface UserJourneyEventsResponse {
  events: UserJourneyEvent[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Hook to get user journey events
 * 
 * @param userId The user ID to get events for
 * @param limit Maximum number of events to return
 * @param page Page number for pagination
 * @param enabled Whether the query should execute automatically
 * @returns Query result with user journey events
 */
export const useGetUserJourneyEvents = (
  userId?: string, 
  limit: number = 10, 
  page: number = 1, 
  enabled: boolean = true
) => {
  return useQuery<ApiResponse<UserJourneyEventsResponse>, Error>({
    queryKey: ['userJourneyEvents', userId, limit, page],
    queryFn: async (): Promise<ApiResponse<UserJourneyEventsResponse>> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Generate mock events matching the UserJourneyEvent schema
      const mockEvents: UserJourneyEvent[] = [
        {
          id: 'event-1',
          userId: userId || 'user-123',
          type: 'challenge_completed',
          data: {
            challengeId: 'challenge-1',
            challengeTitle: 'AI Ethics Brainstorm',
            description: 'Completed the AI Ethics challenge with a high score!'
          },
          createdAt: new Date(Date.now() - 3600000).toISOString() // Use createdAt field
        },
        {
          id: 'event-5',
          userId: userId || 'user-123',
          type: 'challenge_completed',
          data: {
            challengeId: 'challenge-3',
            challengeTitle: 'Critical Content Analysis',
            description: 'Completed the Critical Content Analysis challenge'
          },
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'event-6',
          userId: userId || 'user-123',
          type: 'badge_earned',
          data: {
            badgeId: 'badge-1',
            badgeName: 'Fast Learner',
            description: 'Earned the Fast Learner badge'
          },
          createdAt: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: 'event-7',
          userId: userId || 'user-123',
          type: 'level_up',
          data: {
            levelNumber: 3,
            description: 'Reached Level 3!'
          },
          createdAt: new Date(Date.now() - 259200000).toISOString()
        }
      ];
      
      // Paginate events
      const startIndex = (page - 1) * limit;
      const paginatedEvents = mockEvents.slice(startIndex, startIndex + limit);
      
      return {
        success: true,
        status: 200,
        data: {
          events: paginatedEvents,
          totalCount: mockEvents.length,
          hasMore: startIndex + limit < mockEvents.length
        }
      };
    },
    enabled: enabled && !!userId,
  });
}; 