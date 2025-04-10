import { z } from "zod";
'use strict';
// Schema for strength analysis
const strengthAnalysisSchema = z
    .array(z
    .object({
    strength: z
        .string()
        .min(1, 'Strength description is required and cannot be empty')
        .max(500, 'Strength description cannot exceed 500 characters'),
    explanation: z
        .string()
        .min(1, 'Strength explanation is required and cannot be empty')
        .max(1000, 'Strength explanation cannot exceed 1000 characters'),
    score: z.number().min(0, 'Score must be at least 0').max(100, 'Score cannot exceed 100'),
})
    .strict())
    .min(1, 'At least one strength analysis is required');
// Schema for category scores
const categoryScoresSchema = z
    .record(z
    .number()
    .min(0, 'Category score must be at least 0')
    .max(100, 'Category score cannot exceed 100'))
    .refine(scores => Object.keys(scores).length > 0, {
    message: 'At least one category score is required',
});
// Schema for metrics with strict typing
const metricsSchema = z
    .record(z.number().min(0, 'Metric value must be at least 0').max(100, 'Metric value cannot exceed 100'))
    .refine(metrics => Object.keys(metrics).length > 0, {
    message: 'At least one metric is required',
});
// Main Evaluation schema - strict validation without backward compatibility
const EvaluationSchema = z
    .object({
    id: z.string().uuid('Evaluation ID must be a valid UUID'),
    userId: z
        .string()
        .min(1, 'User ID is required and cannot be empty')
        .uuid('User ID must be a valid UUID'),
    challengeId: z
        .string()
        .min(1, 'Challenge ID is required and cannot be empty')
        .uuid('Challenge ID must be a valid UUID'),
    responseId: z
        .string()
        .min(1, 'Response ID is required and cannot be empty')
        .uuid('Response ID must be a valid UUID'),
    score: z
        .number()
        .min(0, 'Overall score must be at least 0')
        .max(100, 'Overall score cannot exceed 100'),
    categoryScores: categoryScoresSchema,
    overallFeedback: z
        .string()
        .min(1, 'Overall feedback is required and cannot be empty')
        .max(2000, 'Overall feedback cannot exceed 2000 characters'),
    strengths: z
        .array(z
        .string()
        .min(1, 'Strength cannot be empty')
        .max(200, 'Strength cannot exceed 200 characters'))
        .min(1, 'At least one strength is required')
        .max(10, 'Cannot have more than 10 strengths'),
    strengthAnalysis: strengthAnalysisSchema,
    areasForImprovement: z
        .array(z
        .string()
        .min(1, 'Area for improvement cannot be empty')
        .max(200, 'Area for improvement cannot exceed 200 characters'))
        .min(1, 'At least one area for improvement is required')
        .max(10, 'Cannot have more than 10 areas for improvement'),
    nextSteps: z
        .array(z
        .string()
        .min(1, 'Next step cannot be empty')
        .max(500, 'Next step cannot exceed 500 characters'))
        .min(1, 'At least one next step is required')
        .max(5, 'Cannot have more than 5 next steps'),
    threadId: z
        .string()
        .min(1, 'Thread ID cannot be empty')
        .max(100, 'Thread ID cannot exceed 100 characters')
        .optional(),
    metrics: metricsSchema,
    metadata: z.record(z.unknown()).default({}),
    createdAt: z.string().datetime('Created at must be a valid ISO datetime'),
    updatedAt: z.string().datetime('Updated at must be a valid ISO datetime'),
})
    .strict();
// Schema for update operations (all fields optional)
const EvaluationUpdateSchema = EvaluationSchema.partial()
    .omit({
    id: true,
    userId: true,
    challengeId: true,
    createdAt: true,
})
    .strict();
// Schema for evaluation search options
const EvaluationSearchOptionsSchema = z
    .object({
    limit: z
        .number()
        .int('Limit must be a whole number')
        .positive('Limit must be a positive number')
        .max(100, 'Limit cannot exceed 100')
        .optional()
        .default(20),
    offset: z
        .number()
        .int('Offset must be a whole number')
        .nonnegative('Offset cannot be negative')
        .optional()
        .default(0),
    challengeId: z.string().uuid('Challenge ID must be a valid UUID').optional(),
    userId: z.string().uuid('User ID must be a valid UUID').optional(),
    startDate: z.string().datetime('Start date must be a valid ISO datetime').optional(),
    endDate: z.string().datetime('End date must be a valid ISO datetime').optional(),
    minScore: z
        .number()
        .min(0, 'Minimum score must be at least 0')
        .max(100, 'Minimum score cannot exceed 100')
        .optional(),
    maxScore: z
        .number()
        .min(0, 'Maximum score must be at least 0')
        .max(100, 'Maximum score cannot exceed 100')
        .optional(),
    includeMetrics: z.boolean().optional().default(false),
})
    .strict()
    .refine(data => {
    if (data.minScore !== undefined && data.maxScore !== undefined) {
        return data.minScore <= data.maxScore;
    }
    return true;
}, { message: 'Minimum score must be less than or equal to maximum score' });
export { EvaluationSchema };
export { EvaluationUpdateSchema };
export { EvaluationSearchOptionsSchema };
export { strengthAnalysisSchema };
export { categoryScoresSchema };
export { metricsSchema };

/**
 * @swagger
 * components:
 *   schemas:
 *     Evaluation:
 *       type: object
 *       required:
 *         - id
 *         - userId
 *         - challengeId
 *         - score
 *         - categoryScores
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the evaluation
 *         userId:
 *           type: string
 *           description: ID of the user who submitted the response
 *         challengeId:
 *           type: string
 *           format: uuid
 *           description: ID of the challenge being evaluated
 *         score:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Overall evaluation score (0-100)
 *         scorePercent:
 *           type: number
 *           description: Score as a percentage of the maximum possible score
 *         categoryScores:
 *           type: object
 *           description: Scores broken down by evaluation category
 *           additionalProperties:
 *             type: number
 *         overallFeedback:
 *           type: string
 *           description: Comprehensive feedback on the response
 *         strengths:
 *           type: array
 *           items:
 *             type: string
 *           description: Identified strengths in the response
 *         areasForImprovement:
 *           type: array
 *           items:
 *             type: string
 *           description: Areas for improvement identified
 *         nextSteps:
 *           type: string
 *           description: Recommended next steps for the user
 *         recommendedResources:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *               url:
 *                 type: string
 *           description: Resources recommended to help the user improve
 *         threadId:
 *           type: string
 *           description: Thread ID for stateful conversations
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the evaluation was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the evaluation was last updated
 *     
 *     EvaluationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Evaluation'
 *     
 *     EvaluationStream:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [chunk, complete, error]
 *           description: Type of stream event
 *         content:
 *           type: string
 *           description: Content chunk for 'chunk' type events
 *         evaluationId:
 *           type: string
 *           format: uuid
 *           description: ID of the completed evaluation (for 'complete' type)
 *         score:
 *           type: number
 *           description: Final score (for 'complete' type)
 *         scorePercentage:
 *           type: number
 *           description: Score as percentage (for 'complete' type)
 *         hasFeedback:
 *           type: boolean
 *           description: Whether detailed feedback is available (for 'complete' type)
 *         message:
 *           type: string
 *           description: Error message (for 'error' type)
 */

// This file is used only for Swagger documentation
const schemas = {};
export { schemas };
