import { z } from "zod";
'use strict';

/**
 * Schema for leaderboard entry types
 * Defines the different types of leaderboards available
 */
const leaderboardTypeEnum = z.enum([
  'global',      // All users
  'similar',     // Users with similar traits
  'friends',     // User's friends
  'focus',       // Specific focus area
  'challenge'    // Specific challenge
]).describe('Type of leaderboard');

/**
 * Schema for leaderboard timeframes
 * Defines the different time periods for leaderboards
 */
const leaderboardTimeframeEnum = z.enum([
  'all_time',
  'monthly',
  'weekly',
  'daily'
]).describe('Time period for the leaderboard');

/**
 * Schema for individual leaderboard entries
 * Represents a single user's position on a leaderboard
 */
const leaderboardEntrySchema = z
  .object({
    id: z
      .string()
      .uuid('Entry ID must be a valid UUID format')
      .describe('Unique identifier for the leaderboard entry'),
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user this entry belongs to'),
    username: z
      .string()
      .min(1, 'Username is required and cannot be empty')
      .max(100, 'Username cannot exceed 100 characters')
      .describe('Display name of the user'),
    avatarUrl: z
      .string()
      .url('Avatar URL must be a valid URL')
      .optional()
      .describe('URL for the user\'s avatar image'),
    score: z
      .number()
      .nonnegative('Score cannot be negative')
      .describe('User\'s score for this leaderboard entry'),
    completedAt: z
      .string()
      .datetime('Completed at must be a valid ISO datetime')
      .describe('When the challenge was completed'),
    focusArea: z
      .string()
      .optional()
      .describe('Focus area for this entry if applicable'),
    rank: z
      .number()
      .int('Rank must be a whole number')
      .positive('Rank must be positive')
      .optional()
      .describe('User\'s position on the leaderboard'),
    isCurrentUser: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether this entry belongs to the current user'),
    challengeId: z
      .string()
      .uuid('Challenge ID must be a valid UUID format')
      .optional()
      .describe('ID of the related challenge if applicable'),
    metadata: z
      .record(z.unknown())
      .optional()
      .describe('Additional metadata for this entry'),
  })
  .strict();

/**
 * Main Leaderboard schema
 * Comprehensive validation for leaderboard entities
 */
const LeaderboardSchema = z
  .object({
    id: z
      .string()
      .uuid('Leaderboard ID must be a valid UUID format')
      .describe('Unique identifier for the leaderboard'),
    title: z
      .string()
      .min(1, 'Title is required and cannot be empty')
      .max(200, 'Title cannot exceed 200 characters')
      .describe('Title of the leaderboard'),
    description: z
      .string()
      .min(1, 'Description is required and cannot be empty')
      .max(500, 'Description cannot exceed 500 characters')
      .describe('Description of the leaderboard'),
    entries: z
      .array(leaderboardEntrySchema)
      .default([])
      .describe('Entries on this leaderboard'),
    totalEntries: z
      .number()
      .int('Total entries must be a whole number')
      .nonnegative('Total entries cannot be negative')
      .describe('Total number of entries on this leaderboard'),
    lastUpdated: z
      .string()
      .datetime('Last updated must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('When the leaderboard was last updated'),
    type: leaderboardTypeEnum,
    timeframe: leaderboardTimeframeEnum,
    focusAreaId: z
      .string()
      .uuid('Focus area ID must be a valid UUID format')
      .optional()
      .describe('ID of the focus area if this is a focus leaderboard'),
    challengeId: z
      .string()
      .uuid('Challenge ID must be a valid UUID format')
      .optional()
      .describe('ID of the challenge if this is a challenge leaderboard'),
    createdAt: z
      .string()
      .datetime('Created at must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('Creation timestamp'),
    updatedAt: z
      .string()
      .datetime('Updated at must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('Last update timestamp'),
  })
  .strict();

/**
 * Schema for leaderboard filters
 * Used when querying leaderboards with specific criteria
 */
const leaderboardFilterSchema = z
  .object({
    type: leaderboardTypeEnum.optional()
      .describe('Type of leaderboard to filter by'),
    timeframe: leaderboardTimeframeEnum.optional()
      .describe('Time period to filter by'),
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
 * Schema for submitting scores to a leaderboard
 * Used when adding new entries to a leaderboard
 */
const leaderboardScoreSubmissionSchema = z
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

export { LeaderboardSchema };
export { leaderboardEntrySchema };
export { leaderboardFilterSchema };
export { leaderboardScoreSubmissionSchema };
export { leaderboardTypeEnum };
export { leaderboardTimeframeEnum };
export default {
  LeaderboardSchema,
  leaderboardEntrySchema,
  leaderboardFilterSchema,
  leaderboardScoreSubmissionSchema,
  leaderboardTypeEnum,
  leaderboardTimeframeEnum
};
