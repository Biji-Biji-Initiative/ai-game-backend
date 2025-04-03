/**
 * Leaderboard Service
 * 
 * Provides hooks for leaderboard-related operations.
 */

import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../apiResponse';

/**
 * Leaderboard entry interface
 */
export interface LeaderboardEntry {
  userId: string;
  username: string;
  rank: number;
  points: number;
  wins: number;
  challengesCompleted: number;
  avatar?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

/**
 * Leaderboard filter options
 */
export interface LeaderboardOptions {
  timeframe?: 'day' | 'week' | 'month' | 'all_time';
  category?: string;
  limit?: number;
}

/**
 * Hook to get the global leaderboard
 * 
 * @param options Options for filtering the leaderboard
 * @param enabled Whether to enable the query
 * @returns Query result with leaderboard data
 */
export const useGetLeaderboard = (
  options: LeaderboardOptions = { timeframe: 'all_time', limit: 10 },
  enabled: boolean = true
) => {
  return useQuery<ApiResponse<LeaderboardEntry[]>, Error>({
    queryKey: ['leaderboard', options],
    queryFn: async (): Promise<ApiResponse<LeaderboardEntry[]>> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate mock leaderboard data
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
      
      // Apply filtering based on options if needed
      // This is just a mock, so we're not actually filtering
      
      return {
        success: true,
        status: 200,
        data: mockLeaderboard.slice(0, options.limit || 10)
      };
    },
    enabled,
  });
}; 