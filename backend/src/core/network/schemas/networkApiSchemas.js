import { z } from "zod";
'use strict';

/**
 * Schema for API endpoints related to neural networks
 */

/**
 * Schema for retrieving a user's neural network
 */
const getUserNetworkSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to get network for'),
  })
  .strict();

/**
 * Schema for updating a user's neural network after game results
 */
const updateUserNetworkSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user whose network to update'),
    challengeResults: z
      .object({
        challengeId: z
          .string()
          .uuid('Challenge ID must be a valid UUID format')
          .describe('ID of the completed challenge'),
        score: z
          .number()
          .min(0, 'Score must be at least 0')
          .max(100, 'Score cannot exceed 100')
          .describe('Overall score for the challenge'),
        domainScores: z
          .record(z.number().min(0).max(100))
          .describe('Scores for each cognitive domain'),
        completionTime: z
          .number()
          .positive('Completion time must be positive')
          .describe('Time taken to complete the challenge in seconds'),
      })
      .describe('Results from the completed challenge'),
  })
  .strict();

/**
 * Schema for retrieving neural network statistics
 */
const getNetworkStatsSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to get network stats for'),
    includeHistory: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to include historical stats'),
    timeframe: z
      .enum(['all_time', 'year', 'month', 'week'])
      .optional()
      .default('all_time')
      .describe('Time period for historical stats'),
  })
  .strict();

/**
 * Schema for retrieving neural network progress
 */
const getNetworkProgressSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to get network progress for'),
    limit: z
      .number()
      .int('Limit must be a whole number')
      .positive('Limit must be positive')
      .max(50, 'Limit cannot exceed 50')
      .optional()
      .default(10)
      .describe('Maximum number of progress records to return'),
  })
  .strict();

export { getUserNetworkSchema };
export { updateUserNetworkSchema };
export { getNetworkStatsSchema };
export { getNetworkProgressSchema };
export default {
  getUserNetworkSchema,
  updateUserNetworkSchema,
  getNetworkStatsSchema,
  getNetworkProgressSchema
};
