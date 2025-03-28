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
    explanation: z.string(),
    score: z.number().min(0).max(100)
  })
);

// Schema for category scores
const categoryScoresSchema = z.record(z.number().min(0).max(100));

// Schema for metrics with strict typing
const metricsSchema = z.record(z.number().min(0).max(100));

// Main Evaluation schema - strict validation without backward compatibility
const EvaluationSchema = z.object({
  id: z.string().uuid('Invalid evaluation ID format'),
  userId: z.string().min(1, 'User ID is required'),
  challengeId: z.string().min(1, 'Challenge ID is required'),
  responseId: z.string(),
  score: z.number().min(0).max(100),
  categoryScores: categoryScoresSchema,
  overallFeedback: z.string(),
  strengths: z.array(z.string()),
  strengthAnalysis: strengthAnalysisSchema,
  areasForImprovement: z.array(z.string()),
  nextSteps: z.array(z.string()),
  threadId: z.string().optional(),
  metrics: metricsSchema,
  metadata: z.record(z.any()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict();

// Schema for update operations (all fields optional)
const EvaluationUpdateSchema = EvaluationSchema.partial().omit({
  id: true,
  userId: true,
  challengeId: true,
  createdAt: true
});

// Schema for evaluation search options
const EvaluationSearchOptionsSchema = z.object({
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  challengeId: z.string(),
  userId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
  includeMetrics: z.boolean()
}).partial().strict();

module.exports = {
  EvaluationSchema,
  EvaluationUpdateSchema,
  EvaluationSearchOptionsSchema,
  metricsSchema,
  categoryScoresSchema,
  strengthAnalysisSchema
}; 