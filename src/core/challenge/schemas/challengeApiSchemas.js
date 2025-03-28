/**
 * Challenge API Validation Schemas
 * 
 * Defines input validation schemas for Challenge domain API endpoints.
 */
const { z } = require('zod');

/**
 * Schema for validating challenge generation requests
 */
const generateChallengeSchema = z.object({
  email: z.string().email('Valid email is required'),
  focusArea: z.string().min(1).optional(),
  challengeType: z.string().min(1).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional()
}).strict();

/**
 * Schema for validating challenge response submission
 */
const submitChallengeResponseSchema = z.object({
  userEmail: z.string().email('Valid email is required'),
  response: z.string().min(1, 'Response is required')
}).strict();

/**
 * Schema for validating challenge ID parameter
 */
const challengeIdSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format')
}).strict();

/**
 * Schema for validating user email parameter
 */
const userEmailSchema = z.object({
  email: z.string().email('Valid email is required')
}).strict();

module.exports = {
  generateChallengeSchema,
  submitChallengeResponseSchema,
  challengeIdSchema,
  userEmailSchema
}; 