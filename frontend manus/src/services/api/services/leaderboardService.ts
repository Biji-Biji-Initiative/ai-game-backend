/**
 * Leaderboard Service
 * 
 * Provides hooks for leaderboard-related operations.
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';
import { z } from 'zod';

// --- Define types based on Zodios patterns ---

// Define schema for a leaderboard entry
 
const LeaderboardEntrySchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  rank: z.number().int().positive(),
  points: z.number().int(),
  wins: z.number().int().nonnegative().optional(), // Wins might not always be tracked
  challengesCompleted: z.number().int().nonnegative(),
  avatar: z.string().url().optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional()
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

// Define schema for leaderboard filter options
 
const LeaderboardOptionsSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all_time']).optional().default('all_time'),
  category: z.string().optional(), // e.g., 'overall', 'challenge_category', 'skill'
  limit: z.number().int().positive().optional().default(10)
});
export type LeaderboardOptions = z.infer<typeof LeaderboardOptionsSchema>;

// --- React Query Hook ---

/**
 * Hook to get the global leaderboard
 * 
 * @param options Options for filtering the leaderboard
 * @param enabled Whether to enable the query
 * @returns Query result with leaderboard data
 */
export const useGetLeaderboard = (
  options?: LeaderboardOptions, // Make options optional
  enabled: boolean = true
) => {
  // Parse options with defaults handled by the schema
  const parsedOptions = LeaderboardOptionsSchema.parse(options || {});

  return useQuery<ApiResponse<LeaderboardEntry[]>, Error>({
    queryKey: ['leaderboard', parsedOptions],
    queryFn: async (): Promise<ApiResponse<LeaderboardEntry[]>> => {
      // When Zodios client is enabled:
      // const params = { 
      //   limit: parsedOptions.limit,
      //   timeframe: parsedOptions.timeframe,
      //   category: parsedOptions.category 
      // };
      // return apiClient.get<LeaderboardEntry[]>(
      //   '/leaderboard', 
      //   { params } // Assuming API uses query parameters
      // );
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate mock leaderboard data conforming to LeaderboardEntrySchema
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          userId: 'user-101',
          username: 'AIExplorer',
          rank: 1,
          points: 15420,
          wins: 37,
          challengesCompleted: 45,
          tier: 'diamond'
        },
        {
          userId: 'user-102',
          username: 'TechWizard',
          rank: 2,
          points: 13850,
          wins: 32,
          challengesCompleted: 40,
          tier: 'diamond'
        },
        {
          userId: 'user-103',
          username: 'DataNinja',
          rank: 3,
          points: 12150,
          wins: 29,
          challengesCompleted: 35,
          tier: 'platinum'
        },
        {
          userId: 'user-104',
          username: 'CodeMaster',
          rank: 4,
          points: 10890,
          wins: 25,
          challengesCompleted: 33,
          tier: 'platinum'
        },
        {
          userId: 'user-105',
          username: 'QuantumThinker',
          rank: 5,
          points: 9750,
          wins: 22,
          challengesCompleted: 28,
          tier: 'gold'
        },
        {
          userId: 'user-106',
          username: 'DigitalSage',
          rank: 6,
          points: 8450,
          wins: 19,
          challengesCompleted: 24,
          tier: 'gold'
        },
        {
          userId: 'user-107',
          username: 'FutureCrafter',
          rank: 7,
          points: 7320,
          wins: 16,
          challengesCompleted: 20,
          tier: 'silver'
        },
        {
          userId: 'user-108',
          username: 'CyberPioneer',
          rank: 8,
          points: 6100,
          wins: 14,
          challengesCompleted: 17,
          tier: 'silver'
        },
        {
          userId: 'user-109',
          username: 'RoboTrainer',
          rank: 9,
          points: 4950,
          wins: 11,
          challengesCompleted: 15,
          tier: 'bronze'
        },
        {
          userId: 'user-110',
          username: 'AIEnthusiast',
          rank: 10,
          points: 3810,
          wins: 8,
          challengesCompleted: 12,
          tier: 'bronze'
        },
      ];
      
      // Apply filtering based on options (mock version)
      const filteredData = mockLeaderboard.slice(0, parsedOptions.limit);
      
      return {
        success: true,
        status: 200,
        data: z.array(LeaderboardEntrySchema).parse(filteredData) // Validate mock data
      };
    },
    enabled,
  });
}; 