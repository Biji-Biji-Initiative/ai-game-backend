import { z } from "zod";
import { ValidationError } from "#app/core/infra/repositories/BaseRepository.js";
'use strict';
/**
 * User schema for personality assessment
 */
const userSchema = z
    .object({
    id: z.string().optional(),
    email: z.string().optional(),
    fullName: z.string().optional(),
    age: z.number().min(13).max(120).optional(),
    professionalTitle: z.string().optional(),
    location: z.string().optional(),
    interests: z.array(z.string()).optional(),
    skillLevel: z.string().optional(),
    existingTraits: z.record(z.number().min(1).max(10)).optional(),
    aiAttitudes: z.record(z.number().min(1).max(10)).optional(),
    communicationStyle: z.string().optional(),
    learningGoals: z.array(z.string()).optional(),
})
    .passthrough();
/**
 * User interaction history schema
 */
const interactionHistorySchema = z
    .array(z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    content: z.string().optional(),
    timestamp: z.string().optional(),
    score: z.number().optional(),
    sentimentScore: z.number().min(-1).max(1).optional(),
    complexity: z.number().min(1).max(10).optional(),
    length: z.number().optional(),
}))
    .optional();
/**
 * Options schema - defines additional personality assessment options
 */
const optionsSchema = z
    .object({
    traitCategories: z.array(z.string()).optional(),
    detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('detailed'),
    includeRationale: z.boolean().optional().default(true),
    includeRecommendations: z.boolean().optional().default(true),
    responseFormat: z.enum(['json', 'markdown']).optional().default('json'),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional().default(0.5),
})
    .passthrough();
/**
 * Complete personality prompt parameters schema
 */
const personalityPromptSchema = z.object({
    user: userSchema,
    interactionHistory: interactionHistorySchema.optional(),
    options: optionsSchema.optional(),
});
/**
 * Validate personality prompt parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validated and potentially transformed parameters
 * @throws {ValidationError} If validation fails
 */
export function validatePersonalityPromptParams(params) {
    const validationResult = personalityPromptSchema.safeParse(params);
    if (!validationResult.success) {
        const formattedErrors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new ValidationError(`Personality prompt parameter validation failed: ${formattedErrors}`);
    }
    return validationResult.data;
}
export { personalityPromptSchema };
export default {
    personalityPromptSchema,
    validatePersonalityPromptParams
};
