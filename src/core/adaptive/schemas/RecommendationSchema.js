/**
 * Zod Schema for Recommendation Model
 * 
 * Defines validation schemas for Recommendation entities.
 * Used for data validation in repositories and services.
 * 
 * @module RecommendationSchema
 * @requires zod
 */

const { z } = require('zod');

// Schema for learning resource
const learningResourceSchema = z.object({
  title: z.string().min(1, 'Resource title is required'),
  url: z.string().url().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  relevanceScore: z.number().min(0).max(100).optional()
});

// Schema for challenge parameters
const challengeParametersSchema = z.object({
  difficulty: z.string().optional(),
  focusArea: z.string().optional(),
  challengeType: z.string().optional(),
  formatType: z.string().optional(),
  timeLimit: z.number().int().min(60).max(3600).optional(),
  customInstructions: z.string().optional(),
  options: z.record(z.any()).optional()
});

// Main Recommendation schema
const RecommendationSchema = z.object({
  id: z.string().uuid('Invalid recommendation ID format').optional(),
  userId: z.string().min(1, 'User ID is required'),
  createdAt: z.string().datetime().optional(),
  recommendedFocusAreas: z.array(z.string()).default([]),
  recommendedChallengeTypes: z.array(z.string()).default([]),
  suggestedLearningResources: z.array(learningResourceSchema).default([]),
  challengeParameters: challengeParametersSchema.nullable().optional(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional().default({})
});

// Schema for recommendation update operations (all fields optional)
const RecommendationUpdateSchema = RecommendationSchema.partial().omit({ id: true, createdAt: true });

// Schema for database format (with snake_case keys)
const RecommendationDatabaseSchema = z.object({
  id: z.string().uuid('Invalid recommendation ID format').optional(),
  user_id: z.string().min(1, 'User ID is required'),
  created_at: z.string().datetime().optional(),
  recommended_focus_areas: z.array(z.string()).default([]),
  recommended_challenge_types: z.array(z.string()).default([]),
  suggested_learning_resources: z.array(learningResourceSchema).default([]),
  challenge_parameters: challengeParametersSchema.nullable().optional(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional().default({})
});

module.exports = {
  RecommendationSchema,
  RecommendationUpdateSchema,
  RecommendationDatabaseSchema,
  learningResourceSchema,
  challengeParametersSchema
}; 