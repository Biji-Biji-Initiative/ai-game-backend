/**
 * Zod Schema for UserJourneyEvent Model
 * 
 * Defines validation schemas for UserJourneyEvent entities.
 * Used for data validation in repositories and services.
 * 
 * @module UserJourneyEventSchema
 * @requires zod
 */

const { z } = require('zod');

// Common event types
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
  'recommendation_received'
];

// Main UserJourneyEvent schema
const UserJourneyEventSchema = z.object({
  id: z.string().uuid('Invalid event ID format').optional(),
  userEmail: z.string().email('Valid email is required'),
  eventType: z.string().min(1, 'Event type is required'),
  eventData: z.record(z.any()).default({}),
  challengeId: z.string().nullable().optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString())
});

// Schema for event creation (without ID)
const UserJourneyEventCreateSchema = UserJourneyEventSchema.omit({ id: true });

// Schema for database format (with snake_case keys)
const UserJourneyEventDatabaseSchema = z.object({
  id: z.string().uuid('Invalid event ID format').optional(),
  user_email: z.string().email('Valid email is required'),
  event_type: z.string().min(1, 'Event type is required'),
  event_data: z.record(z.any()).default({}),
  challenge_id: z.string().nullable().optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString())
});

// Schema for querying events
const UserJourneyEventQuerySchema = z.object({
  userEmail: z.string().email().optional(),
  eventType: z.string().optional(),
  challengeId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().optional()
});

module.exports = {
  UserJourneyEventSchema,
  UserJourneyEventCreateSchema,
  UserJourneyEventDatabaseSchema,
  UserJourneyEventQuerySchema,
  eventTypes
}; 