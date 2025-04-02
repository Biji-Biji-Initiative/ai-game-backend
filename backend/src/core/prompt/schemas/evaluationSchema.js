import { z } from "zod";
import { ValidationError } from "#app/core/infra/repositories/BaseRepository.js";
'use strict';
/**
 * Type metadata schema with specific types
 */
const typeMetadataSchema = z
    .object({
    timeEstimate: z.number().int().positive(),
    complexity: z.number().int().min(1).max(10),
    skillsRequired: z.array(z.string()).min(1),
    isInteractive: z.boolean(),
    requiresCode: z.boolean(),
    additionalParams: z
        .record(z.union([z.string(), z.number().int(), z.boolean(), z.array(z.string())]))
        .optional(),
})
    .strict();
/**
 * Format metadata schema with specific types
 */
const formatMetadataSchema = z
    .object({
    responseFormat: z.enum(['text', 'code', 'json', 'markdown', 'multiple-choice']),
    wordLimit: z.number().int().positive().optional(),
    timeLimit: z.number().int().positive().optional(),
    allowedResources: z.array(z.string()),
    submissionFormat: z.string(),
    additionalParams: z
        .record(z.union([z.string(), z.number().int(), z.boolean(), z.array(z.string())]))
        .optional(),
})
    .strict();
/**
 * Content schema with strict object structure
 */
const contentSchema = z
    .object({
    context: z.string(),
    scenario: z.string(),
    instructions: z.string(),
})
    .strict();
/**
 * Challenge schema with required fields
 */
const challengeSchema = z
    .object({
    id: z.string(),
    title: z.string().min(1),
    challengeType: z.string(),
    challengeTypeCode: z.string().optional(),
    formatType: z.string(),
    formatTypeCode: z.string().optional(),
    focusArea: z.string(),
    difficulty: z.string(),
    content: contentSchema,
    questions: z.array(z
        .object({
        id: z.string(),
        text: z.string().min(1),
        type: z.string(),
    })
        .strict()),
    evaluationCriteria: z.record(z
        .object({
        description: z.string(),
        weight: z.number(),
    })
        .strict()),
    typeMetadata: typeMetadataSchema,
    formatMetadata: formatMetadataSchema,
})
    .strict();
/**
 * User response schema with strict typing
 */
const userResponseSchema = z.union([
    z.string(),
    z.array(z
        .object({
        questionId: z.string(),
        answer: z.string(),
    })
        .strict()),
]);
/**
 * User schema with required fields
 */
const userSchema = z
    .object({
    id: z.string(),
    email: z.string().email(),
    fullName: z.string(),
    professionalTitle: z.string().optional(),
    dominantTraits: z.array(z.string()),
    focusAreas: z.array(z.string()),
    skillLevel: z.string(),
    learningGoals: z.array(z.string()),
    completedChallenges: z.number().int().nonnegative(),
})
    .strict();
/**
 * Evaluation history schema with required fields
 */
const evaluationHistorySchema = z
    .object({
    previousScore: z.number().min(0).max(100),
    previousCategoryScores: z.record(z.number().min(0).max(100)),
    consistentStrengths: z.array(z.string()),
    persistentWeaknesses: z.array(z.string()),
    evaluationCount: z.number().int().nonnegative(),
    improvementTrend: z.enum(['improving', 'stable', 'declining', 'mixed', 'insufficient_data']),
})
    .strict();
/**
 * Options schema with required fields
 */
const optionsSchema = z
    .object({
    threadId: z.string().optional(),
    previousResponseId: z.string().optional(),
    temperature: z.number().min(0).max(2),
    model: z.string().optional(),
    responseFormat: z.enum(['json', 'text']),
    challengeTypeName: z.string().optional(),
    formatTypeName: z.string().optional(),
    focusArea: z.string().optional(),
    typeMetadata: typeMetadataSchema.optional(),
    formatMetadata: formatMetadataSchema.optional(),
    includeDetailedFeedback: z.boolean(),
    strictScoring: z.boolean(),
    feedbackLanguage: z.string(),
})
    .strict();
/**
 * Complete evaluation prompt parameters schema with strict validation
 */
const evaluationPromptSchema = z
    .object({
    challenge: challengeSchema,
    userResponse: userResponseSchema,
    user: userSchema,
    evaluationHistory: evaluationHistorySchema.optional(),
    options: optionsSchema,
})
    .strict();
/**
 * Scoring metrics schema for evaluation results
 */
const scoringMetricsSchema = z
    .object({
    accuracy: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    creativity: z.number().min(0).max(100).optional(),
    technicalCorrectness: z.number().min(0).max(100).optional(),
    communication: z.number().min(0).max(100).optional(),
    problemSolving: z.number().min(0).max(100).optional(),
})
    .strict();
/**
 * Evaluation result schema
 */
const evaluationResultSchema = z
    .object({
    score: z.number().min(0).max(100),
    categoryScores: z.record(z.number().min(0).max(100)),
    overallFeedback: z.string().min(20),
    strengths: z.array(z.string()).min(1),
    areasForImprovement: z.array(z.string()).min(1),
    metrics: scoringMetricsSchema,
    nextSteps: z.array(z.string()).min(1),
    code: z.string().optional(),
    timestamp: z.string().datetime(),
})
    .strict();
/**
 * Validate evaluation prompt parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validated parameters
 * @throws {ValidationError} If validation fails
 */
export function validateEvaluationPromptParams(params) {
    const validationResult = evaluationPromptSchema.safeParse(params);
    if (!validationResult.success) {
        const formattedErrors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new ValidationError(`Evaluation prompt parameter validation failed: ${formattedErrors}`);
    }
    return validationResult.data;
}
export { evaluationPromptSchema };
export { evaluationResultSchema };
export { typeMetadataSchema };
export { formatMetadataSchema };
export { challengeSchema };
export { userResponseSchema };
export { userSchema };
export { evaluationHistorySchema };
export { optionsSchema };
export { scoringMetricsSchema };
export { contentSchema };
export default {
    evaluationPromptSchema,
    validateEvaluationPromptParams,
    evaluationResultSchema,
    typeMetadataSchema,
    formatMetadataSchema,
    challengeSchema,
    userResponseSchema,
    userSchema,
    evaluationHistorySchema,
    optionsSchema,
    scoringMetricsSchema,
    contentSchema
};
