/**
 * Zod Schema for Challenge Model
 * 
 * Defines validation schemas for Challenge entities.
 * Used for data validation in repositories and services.
 * 
 * @module ChallengeSchema
 * @requires zod
 */

const { z } = require('zod');

// Schema for question objects within a challenge
const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Question text is required'),
  type: z.string().optional().default('open'),
  options: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// Schema for resource objects
const resourceSchema = z.object({
  title: z.string().min(1, 'Resource title is required'),
  url: z.string().url().optional(),
  description: z.string().optional(),
  type: z.string().optional()
});

// Schema for criteria objects
const criteriaSchema = z.record(
  z.object({
    description: z.string().min(1, 'Criteria description is required'),
    weight: z.number().optional(),
    metrics: z.array(z.string()).optional()
  })
);

// Main Challenge schema
const ChallengeSchema = z.object({
  id: z.string().uuid('Invalid challenge ID format').optional(),
  title: z.string().min(1, 'Title is required'),
  content: z.record(z.any()),
  questions: z.array(questionSchema).default([]),
  evaluationCriteria: criteriaSchema.optional().default({}),
  recommendedResources: z.array(resourceSchema).default([]),
  challengeType: z.string().default('standard'),
  formatType: z.string().default('open-ended'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  focusArea: z.string().default('general'),
  userId: z.string().optional().nullable(),
  typeMetadata: z.record(z.any()).optional().default({}),
  formatMetadata: z.record(z.any()).optional().default({}),
  metadata: z.record(z.any()).optional().default({}),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

// Schema for challenge update operations (all fields optional)
const ChallengeUpdateSchema = ChallengeSchema.partial().omit({ id: true, createdAt: true });

// Schema for challenge search criteria
const ChallengeSearchSchema = z.object({
  userId: z.string().optional(),
  focusArea: z.string().optional(),
  difficulty: z.string().optional(),
  active: z.boolean().optional(),
  type: z.string().optional()
});

// Schema for search options
const SearchOptionsSchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

module.exports = {
  ChallengeSchema,
  ChallengeUpdateSchema,
  ChallengeSearchSchema,
  SearchOptionsSchema
}; 