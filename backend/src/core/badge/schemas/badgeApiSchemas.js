import { z } from "zod";
'use strict';

/**
 * Schema for API endpoints related to badges
 */

/**
 * Schema for retrieving a user's badge collection
 */
const getBadgeCollectionSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to get badges for'),
  })
  .strict();

/**
 * Schema for checking for newly unlocked badges
 */
const checkBadgesSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to check badges for'),
    eventType: z
      .string()
      .min(1, 'Event type is required and cannot be empty')
      .describe('Type of event that triggered the check'),
    eventData: z
      .record(z.unknown())
      .default({})
      .describe('Data associated with the triggering event'),
  })
  .strict();

/**
 * Schema for updating badge progress
 */
const updateBadgeProgressSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to update badge progress for'),
    badgeId: z
      .string()
      .uuid('Badge ID must be a valid UUID format')
      .describe('ID of the badge to update progress for'),
    progress: z
      .number()
      .min(0, 'Progress must be at least 0')
      .max(100, 'Progress cannot exceed 100')
      .describe('New progress value (0-100)'),
    eventContext: z
      .record(z.unknown())
      .optional()
      .describe('Additional context about the progress update'),
  })
  .strict();

/**
 * Schema for retrieving all available badges
 */
const getAllBadgesSchema = z
  .object({
    includeSecret: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to include secret badges'),
    category: z
      .string()
      .optional()
      .describe('Filter badges by category'),
    tier: z
      .string()
      .optional()
      .describe('Filter badges by tier'),
  })
  .strict();

export { getBadgeCollectionSchema };
export { checkBadgesSchema };
export { updateBadgeProgressSchema };
export { getAllBadgesSchema };
export default {
  getBadgeCollectionSchema,
  checkBadgesSchema,
  updateBadgeProgressSchema,
  getAllBadgesSchema
};
