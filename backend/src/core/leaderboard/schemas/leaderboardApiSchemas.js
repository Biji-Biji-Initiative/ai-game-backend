import { z } from "zod";
'use strict';

/**
 * Schema for API endpoints related to leaderboards
 */

/**
 * Schema for retrieving leaderboard data with filtering
 */
const getLeaderboardSchema = z
  .object({
    type: z
      .enum(['global', 'similar', 'friends', 'focus', 'challenge'])
      .optional()
      .describe('Type of leaderboard to retrieve'),
    timeframe: z
      .enum(['all_time', 'monthly', 'weekly', 'daily'])
      .optional()
      .default('all_time')
      .describe('Time period for the leaderboard'),
    focusArea: z
      .string()
      .optional()
      .describe('Focus area to filter by'),
    challengeId: z
      .string()
      .uuid('Challenge ID must be a valid UUID format')
      .optional()
      .describe('Challenge to filter by'),
    limit: z
      .number()
      .int('Limit must be a whole number')
      .positive('Limit must be positive')
      .max(100, 'Limit cannot exceed 100')
      .optional()
      .default(20)
      .describe('Maximum number of entries to return'),
    offset: z
      .number()
      .int('Offset must be a whole number')
      .nonnegative('Offset cannot be negative')
      .optional()
      .default(0)
      .describe('Number of entries to skip'),
  })
  .strict();

/**
 * Schema for submitting a score to a leaderboard
 */
const submitLeaderboardScoreSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user submitting the score'),
    username: z
      .string()
      .min(1, 'Username is required and cannot be empty')
      .max(100, 'Username cannot exceed 100 characters')
      .describe('Display name of the user'),
    score: z
      .number()
      .nonnegative('Score cannot be negative')
      .describe('Score to submit to the leaderboard'),
    challengeId: z
      .string()
      .uuid('Challenge ID must be a valid UUID format')
      .optional()
      .describe('ID of the related challenge if applicable'),
    focusArea: z
      .string()
      .optional()
      .describe('Focus area for this submission if applicable'),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe('Additional metadata for this submission'),
  })
  .strict();

/**
 * Schema for retrieving a user's position on a leaderboard
 */
const getUserLeaderboardPositionSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to get position for'),
    type: z
      .enum(['global', 'similar', 'friends', 'focus', 'challenge'])
      .optional()
      .default('global')
      .describe('Type of leaderboard to check'),
    timeframe: z
      .enum(['all_time', 'monthly', 'weekly', 'daily'])
      .optional()
      .default('all_time')
      .describe('Time period for the leaderboard'),
    challengeId: z
      .string()
      .uuid('Challenge ID must be a valid UUID format')
      .optional()
      .describe('Challenge ID if checking a challenge leaderboard'),
    focusArea: z
      .string()
      .optional()
      .describe('Focus area if checking a focus leaderboard'),
    includeNeighbors: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include entries above and below the user'),
    neighborCount: z
      .number()
      .int('Neighbor count must be a whole number')
      .positive('Neighbor count must be positive')
      .max(10, 'Neighbor count cannot exceed 10')
      .optional()
      .default(3)
      .describe('Number of entries to include above and below the user'),
  })
  .strict();

export { getLeaderboardSchema };
export { submitLeaderboardScoreSchema };
export { getUserLeaderboardPositionSchema };
export default {
  getLeaderboardSchema,
  submitLeaderboardScoreSchema,
  getUserLeaderboardPositionSchema
};
