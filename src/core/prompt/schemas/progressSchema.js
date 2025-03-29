'use strict';

/**
 * Progress Prompt Schema
 *
 * Defines the schema for validation of user progress assessment parameters
 * using Zod validation library.
 *
 * @module progressSchema
 * @requires zod
 */

const { z } = require('zod');

/**
 * User schema - core user information for progress assessment
 */
const userSchema = z
  .object({
    id: z.string().optional(),
    email: z.string().optional(),
    fullName: z.string().optional(),
    skillLevel: z.string().optional(),
    personalityTraits: z.record(z.number().min(1).max(10)).optional(),
    learningStyle: z.string().optional(),
    focusAreas: z.array(z.string()).optional(),
    learningGoals: z.array(z.string()).optional(),
    startDate: z.string().optional(),
  })
  .passthrough();

/**
 * Challenge attempt schema - results of individual challenge attempts
 */
const challengeAttemptSchema = z.object({
  id: z.string().optional(),
  challengeId: z.string().optional(),
  title: z.string().optional(),
  focusArea: z.string().optional(),
  type: z.string().optional(),
  difficulty: z.number().min(1).max(10).optional(),
  completedAt: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  feedback: z.string().optional(),
  timeSpent: z.number().optional(), // in seconds
});

/**
 * Skill progress schema - progress in specific skills
 */
const skillProgressSchema = z
  .record(
    z.object({
      name: z.string(),
      level: z.number().min(1).max(10).optional(),
      history: z
        .array(
          z.object({
            date: z.string(),
            level: z.number().min(1).max(10),
          })
        )
        .optional(),
    })
  )
  .optional();

/**
 * Options schema - settings for progress assessment
 */
const optionsSchema = z
  .object({
    timeRange: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional().default('all'),
    focusAreas: z.array(z.string()).optional(),
    includePredictions: z.boolean().optional().default(true),
    includeRecommendations: z.boolean().optional().default(true),
    detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('detailed'),
    responseFormat: z.enum(['json', 'markdown']).optional().default('json'),
  })
  .passthrough();

/**
 * Complete progress prompt parameters schema
 */
const progressPromptSchema = z.object({
  user: userSchema,
  challengeAttempts: z.array(challengeAttemptSchema).optional().default([]),
  skillProgress: skillProgressSchema.optional(),
  options: optionsSchema.optional().default({}),
});

/**
 * Validate progress prompt parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validated and potentially transformed parameters
 * @throws {Error} If validation fails
 */
function validateProgressPromptParams(params) {
  try {
    return progressPromptSchema.parse(params);
  } catch (error) {
    // Transform Zod validation errors to more user-friendly format
    if (error.errors) {
      const formattedErrors = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ');

      throw new Error(`Progress prompt parameter validation failed: ${formattedErrors}`);
    }
    throw error;
  }
}

module.exports = {
  progressPromptSchema,
  validateProgressPromptParams,
};
