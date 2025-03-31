import { z } from "zod";
'use strict';
/**
 * User schema - subset of fields required for challenge generation
 */
const userSchema = z
    .object({
    id: z.string().optional(),
    email: z.string().optional(),
    fullName: z.string().optional(),
    professionalTitle: z.string().optional(),
    dominantTraits: z.array(z.string()).optional(),
    focusAreas: z.array(z.string()).optional(),
    skillLevel: z.string().optional(),
    learningGoals: z.array(z.string()).optional(),
    completedChallenges: z.array(z.string()).or(z.number()).optional(),
})
    .passthrough();
/**
 * Challenge parameters schema - defines parameters for challenge generation
 */
const challengeParamsSchema = z
    .object({
    challengeType: z.string().optional(),
    challengeTypeCode: z.string().optional(),
    formatType: z.string().optional(),
    formatTypeCode: z.string().optional(),
    difficulty: z.string().optional().default('intermediate'),
    focusArea: z.string().optional(),
    topic: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    maxLength: z.number().optional(),
    includeContextualExamples: z.boolean().optional(),
    typeMetadata: z.record(z.any()).optional(),
    formatMetadata: z.record(z.any()).optional(),
})
    .passthrough();
/**
 * Game state schema - defines current game state for adaptive challenge generation
 */
const gameStateSchema = z
    .object({
    currentLevel: z.number().optional(),
    progress: z.number().optional(),
    streakCount: z.number().optional(),
    recentChallenges: z
        .array(z.object({
        id: z.string().optional(),
        title: z.string(),
        challengeType: z.string().optional(),
        focusArea: z.string().optional(),
        difficulty: z.string().optional(),
        score: z.number().optional(),
    }))
        .optional(),
    completedChallengeTypes: z.array(z.string()).optional(),
    strengths: z.array(z.string()).optional(),
    areasForImprovement: z.array(z.string()).optional(),
})
    .passthrough();
/**
 * Options schema - defines additional challenge generation options
 */
const optionsSchema = z
    .object({
    creativeVariation: z.number().min(0).max(1).optional().default(0.7),
    allowDynamicTypes: z.boolean().optional().default(false),
    suggestNovelTypes: z.boolean().optional().default(false),
    responseFormat: z.enum(['json', 'markdown']).optional().default('json'),
    language: z.string().optional().default('en'),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    requireFeedbackRubric: z.boolean().optional().default(true),
    includeRecommendedResources: z.boolean().optional().default(false),
})
    .passthrough();
/**
 * Complete challenge prompt parameters schema
 */
const challengePromptSchema = z.object({
    user: userSchema,
    challengeParams: challengeParamsSchema,
    gameState: gameStateSchema.optional(),
    options: optionsSchema.optional(),
});
/**
 * Validate challenge prompt parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validated and potentially transformed parameters
 * @throws {Error} If validation fails
 */
function validateChallengePromptParams(params) {
    try {
        return challengePromptSchema.parse(params);
    }
    catch (error) {
        // Transform Zod validation errors to more user-friendly format
        if (error.errors) {
            const formattedErrors = error.errors
                .map(err => `${err.path.join('.')}: ${err.message}`)
                .join('; ');
            throw new Error(`Challenge prompt parameter validation failed: ${formattedErrors}`);
        }
        throw error;
    }
}
export { challengePromptSchema };
export { validateChallengePromptParams };
export default {
    challengePromptSchema,
    validateChallengePromptParams
};
