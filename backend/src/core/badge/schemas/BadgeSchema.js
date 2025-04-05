import { z } from "zod";
'use strict';

/**
 * Schema for badge categories
 * Defines the different types of badges available
 */
const badgeCategoryEnum = z.enum([
  'cognitive',
  'creative',
  'analytical',
  'social',
  'achievement',
  'mastery'
]).describe('Category of the badge');

/**
 * Schema for badge tiers
 * Defines the different levels of badges
 */
const badgeTierEnum = z.enum([
  'bronze',
  'silver',
  'gold',
  'platinum'
]).describe('Tier/level of the badge');

/**
 * Schema for badge unlock condition types
 * Defines the different ways badges can be unlocked
 */
const badgeUnlockConditionTypeEnum = z.enum([
  'score_threshold',
  'completion_count',
  'streak_days',
  'trait_value',
  'rival_victories',
  'perfect_round'
]).describe('Type of condition required to unlock the badge');

/**
 * Schema for badge unlock conditions
 * Defines the specific requirements to earn a badge
 */
const badgeUnlockConditionSchema = z
  .object({
    type: badgeUnlockConditionTypeEnum,
    threshold: z
      .number()
      .int('Threshold must be a whole number')
      .min(1, 'Threshold must be at least 1')
      .describe('Value that must be reached to unlock the badge'),
    metric: z
      .string()
      .min(1, 'Metric is required and cannot be empty')
      .max(100, 'Metric cannot exceed 100 characters')
      .describe('What is being measured for this condition'),
    comparison: z
      .enum(['greater', 'equal', 'less'])
      .describe('How to compare the value with the threshold'),
    context: z
      .record(z.unknown())
      .optional()
      .describe('Additional context for the unlock condition'),
  })
  .strict();

/**
 * Schema for badge unlock events
 * Records when and how badges are unlocked
 */
const badgeUnlockEventSchema = z
  .object({
    badgeId: z
      .string()
      .uuid('Badge ID must be a valid UUID format')
      .describe('ID of the badge that was unlocked'),
    timestamp: z
      .string()
      .datetime('Timestamp must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('When the badge was unlocked'),
    context: z
      .record(z.unknown())
      .optional()
      .describe('Additional context about how the badge was unlocked'),
  })
  .strict();

/**
 * Main Badge schema
 * Comprehensive validation for badge entities
 */
const BadgeSchema = z
  .object({
    id: z
      .string()
      .uuid('Badge ID must be a valid UUID format')
      .describe('Unique identifier for the badge'),
    name: z
      .string()
      .min(1, 'Badge name is required and cannot be empty')
      .max(100, 'Badge name cannot exceed 100 characters')
      .describe('Name of the badge'),
    description: z
      .string()
      .min(1, 'Badge description is required and cannot be empty')
      .max(500, 'Badge description cannot exceed 500 characters')
      .describe('Description of the badge'),
    category: badgeCategoryEnum,
    tier: badgeTierEnum,
    icon: z
      .string()
      .min(1, 'Icon is required and cannot be empty')
      .describe('Icon identifier for the badge'),
    requirement: z
      .string()
      .min(1, 'Requirement is required and cannot be empty')
      .max(200, 'Requirement cannot exceed 200 characters')
      .describe('Human-readable requirement for earning the badge'),
    secret: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, details are hidden until unlocked'),
    unlockConditions: z
      .array(badgeUnlockConditionSchema)
      .min(1, 'At least one unlock condition is required')
      .describe('Conditions required to unlock this badge'),
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
 * Schema for badge collection
 * Tracks a user's badges and progress
 */
const BadgeCollectionSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user who owns this collection'),
    unlockedBadges: z
      .array(
        z.object({
          badge: BadgeSchema,
          unlockedAt: z
            .string()
            .datetime('Unlocked at must be a valid ISO datetime')
            .describe('When the badge was unlocked'),
        })
      )
      .default([])
      .describe('Badges that have been unlocked by the user'),
    inProgressBadges: z
      .array(
        z.object({
          badge: BadgeSchema,
          progress: z
            .number()
            .min(0, 'Progress must be at least 0')
            .max(100, 'Progress cannot exceed 100')
            .describe('Progress towards unlocking the badge (0-100)'),
        })
      )
      .default([])
      .describe('Badges that are in progress but not yet unlocked'),
    totalBadges: z
      .number()
      .int('Total badges must be a whole number')
      .nonnegative('Total badges cannot be negative')
      .describe('Total number of badges available'),
    totalUnlocked: z
      .number()
      .int('Total unlocked must be a whole number')
      .nonnegative('Total unlocked cannot be negative')
      .describe('Number of badges unlocked by the user'),
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
 * Schema for checking badge unlock status
 * Used when checking if new badges have been unlocked
 */
const BadgeCheckSchema = z
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

export { BadgeSchema };
export { BadgeCollectionSchema };
export { BadgeCheckSchema };
export { badgeUnlockConditionSchema };
export { badgeUnlockEventSchema };
export { badgeCategoryEnum };
export { badgeTierEnum };
export { badgeUnlockConditionTypeEnum };
export default {
  BadgeSchema,
  BadgeCollectionSchema,
  BadgeCheckSchema,
  badgeUnlockConditionSchema,
  badgeUnlockEventSchema,
  badgeCategoryEnum,
  badgeTierEnum,
  badgeUnlockConditionTypeEnum
};
