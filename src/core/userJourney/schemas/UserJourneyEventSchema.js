'use strict';

/**
 * UserJourneyEvent Schema Definitions using Zod
 *
 * Defines comprehensive validation schemas for UserJourneyEvent entities.
 * Used for tracking user interactions and progress through the system.
 *
 * Key Features:
 * - Strict validation for all schemas
 * - Comprehensive error messages
 * - Proper handling of optional fields
 * - Type safety for all fields
 *
 * @module UserJourneyEventSchema
 * @requires zod
 */

const { z } = require('zod');

/**
 * Standard event types for user journey tracking
 * Used for consistent event categorization
 */
const eventTypes = [
  'challenge_started',
  'challenge_completed',
  'challenge_abandoned',
  'evaluation_received',
  'profile_updated',
  'login',
  'logout',
  'registration',
  'focus_area_selected',
  'recommendation_received',
  'feedback_submitted',
  'resource_accessed',
  'achievement_unlocked',
  'goal_created',
  'goal_completed',
];

/**
 * Main UserJourneyEvent schema
 * Comprehensive validation for user journey events
 */
const UserJourneyEventSchema = z
  .object({
    id: z
      .string()
      .uuid('Event ID must be a valid UUID format')
      .optional()
      .describe('Unique identifier for the event'),
    userEmail: z
      .string()
      .email('Valid email address is required')
      .min(5, 'Email must be at least 5 characters')
      .max(254, 'Email cannot exceed 254 characters')
      .describe('Email address of the user'),
    eventType: z
      .string()
      .min(1, 'Event type is required and cannot be empty')
      .max(50, 'Event type cannot exceed 50 characters')
      .refine(eventType => eventTypes.includes(eventType) || eventType.startsWith('custom_'), {
        message: `Event type must be one of the standard types or start with 'custom_'. Standard types: ${eventTypes.join(', ')}`,
      })
      .describe('Type of event that occurred'),
    eventData: z
      .record(z.unknown())
      .default({})
      .describe('Additional data associated with the event'),
    challengeId: z
      .string()
      .uuid('Challenge ID must be a valid UUID format')
      .nullable()
      .optional()
      .describe('ID of the related challenge if applicable'),
    timestamp: z
      .string()
      .datetime('Timestamp must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('When the event occurred'),
  })
  .strict();

/**
 * Schema for event creation (without ID)
 * Used when creating new events
 */
const UserJourneyEventCreateSchema = UserJourneyEventSchema.omit({ id: true }).strict();

/**
 * Schema for database format (with snake_case keys)
 * Used for database operations
 */
const UserJourneyEventDatabaseSchema = z
  .object({
    id: z
      .string()
      .uuid('Event ID must be a valid UUID format')
      .optional()
      .describe('Unique identifier for the event'),
    user_email: z
      .string()
      .email('Valid email address is required')
      .min(5, 'Email must be at least 5 characters')
      .max(254, 'Email cannot exceed 254 characters')
      .describe('Email address of the user'),
    event_type: z
      .string()
      .min(1, 'Event type is required and cannot be empty')
      .max(50, 'Event type cannot exceed 50 characters')
      .refine(eventType => eventTypes.includes(eventType) || eventType.startsWith('custom_'), {
        message: `Event type must be one of the standard types or start with 'custom_'. Standard types: ${eventTypes.join(', ')}`,
      })
      .describe('Type of event that occurred'),
    event_data: z
      .record(z.unknown())
      .default({})
      .describe('Additional data associated with the event'),
    challenge_id: z
      .string()
      .uuid('Challenge ID must be a valid UUID format')
      .nullable()
      .optional()
      .describe('ID of the related challenge if applicable'),
    timestamp: z
      .string()
      .datetime('Timestamp must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('When the event occurred'),
  })
  .strict();

/**
 * Schema for querying events
 * Defines search parameters for retrieving events
 */
const UserJourneyEventQuerySchema = z
  .object({
    userEmail: z.string().email('Invalid email format').optional().describe('Filter by user email'),
    eventType: z
      .string()
      .min(1, 'Event type cannot be empty if provided')
      .optional()
      .describe('Filter by event type'),
    challengeId: z
      .string()
      .uuid('Challenge ID must be a valid UUID format')
      .optional()
      .describe('Filter by challenge ID'),
    startDate: z
      .string()
      .datetime('Start date must be a valid ISO datetime')
      .optional()
      .describe('Filter events after this date'),
    endDate: z
      .string()
      .datetime('End date must be a valid ISO datetime')
      .optional()
      .describe('Filter events before this date'),
    limit: z
      .number()
      .int('Limit must be a whole number')
      .positive('Limit must be a positive number')
      .max(1000, 'Limit cannot exceed 1000')
      .optional()
      .default(100)
      .describe('Maximum number of events to return'),
    offset: z
      .number()
      .int('Offset must be a whole number')
      .nonnegative('Offset cannot be negative')
      .optional()
      .default(0)
      .describe('Number of events to skip'),
  })
  .strict()
  .refine(
    data => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: 'Start date must be before or equal to end date' }
  );

/**
 * Schema for event analytics
 * Used for calculating statistics and trends
 */
const UserJourneyEventAnalyticsSchema = z
  .object({
    userEmail: z
      .string()
      .email('Valid email address is required')
      .describe('User email for the analytics'),
    timeFrame: z
      .enum(['day', 'week', 'month', 'quarter', 'year', 'all'])
      .default('month')
      .describe('Time period for the analytics'),
    eventTypes: z
      .array(z.string())
      .min(1, 'At least one event type is required')
      .optional()
      .describe('Event types to include in analytics'),
    groupBy: z
      .enum(['eventType', 'day', 'week', 'month', 'none'])
      .default('eventType')
      .describe('How to group the analytics results'),
    includeMetadata: z
      .boolean()
      .default(false)
      .describe('Whether to include event metadata in results'),
  })
  .strict();

module.exports = {
  UserJourneyEventSchema,
  UserJourneyEventCreateSchema,
  UserJourneyEventDatabaseSchema,
  UserJourneyEventQuerySchema,
  UserJourneyEventAnalyticsSchema,
  eventTypes,
};
