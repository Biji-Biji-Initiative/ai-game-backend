/**
 * User Journey Service
 * 
 * Provides hooks for user journey/activity history operations.
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';

// Types
export interface UserJourneyEvent {
  id: string;
  userId: string;
  type: 'challenge_completed' | 'profile_generated' | 'focus_selected' | 'level_up' | 'badge_earned' | 'assessment_completed';
  details: {
    title?: string;
    description?: string;
    challengeId?: string;
    challengeTitle?: string;
    focusId?: string;
    focusName?: string;
    levelNumber?: number;
    badgeId?: string;
    badgeName?: string;
    [key: string]: unknown;
  };
  timestamp: string;
}

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
      
      // Generate mock events
      const mockEvents: UserJourneyEvent[] = [
        {
          id: 'event-1',
          userId: userId || 'user-123',
          type: 'challenge_completed',
          details: {
            challengeId: 'challenge-1',
            challengeTitle: 'AI Ethics Brainstorm',
            description: 'Completed the AI Ethics challenge with a high score!'
          },
          timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
          id: 'event-2',
          userId: userId || 'user-123',
          type: 'focus_selected',
          details: {
            focusId: 'focus-3',
            focusName: 'Creative Collaboration',
            description: 'Selected Creative Collaboration as your focus area'
          },
          timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        },
        {
          id: 'event-3',
          userId: userId || 'user-123',
          type: 'profile_generated',
          details: {
            description: 'Generated your Human Edge Profile'
          },
          timestamp: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
        },
        {
          id: 'event-4',
          userId: userId || 'user-123',
          type: 'assessment_completed',
          details: {
            description: 'Completed the Human Traits assessment'
          },
          timestamp: new Date(Date.now() - 14400000).toISOString() // 4 hours ago
        },
        {
          id: 'event-5',
          userId: userId || 'user-123',
          type: 'challenge_completed',
          details: {
            challengeId: 'challenge-3',
            challengeTitle: 'Critical Content Analysis',
            description: 'Completed the Critical Content Analysis challenge'
          },
          timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        },
        {
          id: 'event-6',
          userId: userId || 'user-123',
          type: 'badge_earned',
          details: {
            badgeId: 'badge-1',
            badgeName: 'Fast Learner',
            description: 'Earned the Fast Learner badge'
          },
          timestamp: new Date(Date.now() - 172800000).toISOString() // 2 days ago
        },
        {
          id: 'event-7',
          userId: userId || 'user-123',
          type: 'level_up',
          details: {
            levelNumber: 3,
            description: 'Reached Level 3!'
          },
          timestamp: new Date(Date.now() - 259200000).toISOString() // 3 days ago
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