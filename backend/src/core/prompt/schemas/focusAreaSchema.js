import { z } from "zod";
import { ValidationError } from "#app/core/infra/repositories/BaseRepository.js";
'use strict';
/**
 * User traits schema - defines personality traits and attitudes
 */
const userTraitsSchema = z
    .object({
    traits: z.record(z.number()).optional(),
    attitudes: z.record(z.number()).optional(),
    professional_title: z.string().optional(),
    location: z.string().optional(),
})
    .passthrough();
/**
 * Challenge history schema - defines user's challenge history for context
 */
const challengeHistorySchema = z
    .array(z.object({
    id: z.string().optional(),
    focus_area: z.string().optional(),
    challengeType: z.string().optional(),
    score: z.number().optional(),
    strengths: z.array(z.string()).optional(),
    areasForImprovement: z.array(z.string()).optional(),
}))
    .optional();
/**
 * Progress data schema - defines user's learning progress
 */
const progressDataSchema = z
    .object({
    completedChallenges: z.number().optional(),
    averageScore: z.number().optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    skillLevels: z.record(z.number()).optional(),
    badges: z.array(z.string()).optional(),
    learningGoals: z.array(z.string()).optional(),
})
    .passthrough();
/**
 * Options schema - defines additional focus area generation options
 */
const optionsSchema = z
    .object({
    creativeVariation: z.number().min(0).max(1).optional().default(0.7),
    count: z.number().min(1).max(10).optional().default(3),
    includeRationale: z.boolean().optional().default(true),
    includeStrategies: z.boolean().optional().default(true),
    responseFormat: z.enum(['json', 'markdown']).optional().default('json'),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    threadId: z.string().optional(),
    previousResponseId: z.string().optional(),
})
    .passthrough();
/**
 * Complete focus area prompt parameters schema
 */
const focusAreaPromptSchema = z.object({
    user: userTraitsSchema,
    challengeHistory: challengeHistorySchema.optional(),
    progressData: progressDataSchema.optional(),
    options: optionsSchema.optional(),
});
/**
 * Validate focus area prompt parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validated and potentially transformed parameters
 * @throws {ValidationError} If validation fails
 */
export function validateFocusAreaPromptParams(params) {
    const validationResult = focusAreaPromptSchema.safeParse(params);
    if (!validationResult.success) {
        const formattedErrors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new ValidationError(`Focus area prompt parameter validation failed: ${formattedErrors}`);
    }
    return validationResult.data;
}
export { focusAreaPromptSchema };
export default {
    focusAreaPromptSchema,
    validateFocusAreaPromptParams
};
