/**
 * Zod Schema for Evaluation Model
 * 
 * Defines validation schemas for Evaluation entities.
 * Used for data validation in repositories and services.
 * 
 * @module EvaluationSchema
 * @requires zod
 */

const { z } = require('zod');

// Schema for strength analysis
const strengthAnalysisSchema = z.array(
  z.object({
    strength: z.string().min(1, 'Strength is required'),
    explanation: z.string().optional(),
    score: z.number().min(0).max(100).optional()
  })
);

// Schema for category scores
const categoryScoresSchema = z.record(z.number().min(0).max(100));

// Schema for metrics
const metricsSchema = z.record(z.any());

// Main Evaluation schema
const EvaluationSchema = z.object({
  id: z.string().uuid('Invalid evaluation ID format').optional(),
  userId: z.string().min(1, 'User ID is required'),
  challengeId: z.string().min(1, 'Challenge ID is required'),
  responseId: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  categoryScores: categoryScoresSchema.optional().default({}),
  overallFeedback: z.string().optional(),
  strengths: z.array(z.string()).optional().default([]),
  strengthAnalysis: strengthAnalysisSchema.optional().default([]),
  areasForImprovement: z.array(z.string()).optional().default([]),
  nextSteps: z.array(z.string()).optional().default([]),
  threadId: z.string().optional(),
  metrics: metricsSchema.optional().default({}),
  metadata: z.record(z.any()).optional().default({}),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

// Schema for evaluation update operations (all fields optional)
const EvaluationUpdateSchema = EvaluationSchema.partial().omit({ id: true, userId: true, challengeId: true, createdAt: true });

// Schema for evaluation search options
const EvaluationSearchOptionsSchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  challengeId: z.string().optional()
});

module.exports = {
  EvaluationSchema,
  EvaluationUpdateSchema,
  EvaluationSearchOptionsSchema
}; 