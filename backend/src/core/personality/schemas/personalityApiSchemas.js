import { z } from "zod";
'use strict';
/**
 * Validate that trait/attitude values are between 0 and 100
 */
const scoreValue = z.number().int().min(0).max(100);
/**
 * Schema for validating personality traits update requests
 */
const updatePersonalityTraitsSchema = z
    .object({
    personalityTraits: z.record(scoreValue).refine(traits => Object.keys(traits).length > 0, {
        message: 'At least one personality trait is required',
    }),
})
    .strict();
/**
 * Schema for validating AI attitudes update requests
 */
const updateAIAttitudesSchema = z
    .object({
    aiAttitudes: z.record(scoreValue).refine(attitudes => Object.keys(attitudes).length > 0, {
        message: 'At least one AI attitude is required',
    }),
})
    .strict();
/**
 * Schema for validating assessment submissions
 */
const submitAssessmentSchema = z
    .object({
    answers: z
        .array(z.object({
        questionId: z.string(),
        answer: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    }))
        .min(1, { message: 'At least one answer is required' }),
})
    .strict();
/**
 * Schema for validating user ID parameter
 */
const userIdSchema = z
    .object({
    userId: z.string().uuid(),
})
    .strict();
/**
 * Schema for validating personality profile parameters
 */
const profileQuerySchema = z
    .object({
    includeInsights: z
        .union([z.boolean(), z.enum(['true', 'false']).transform(val => val === 'true')])
        .optional()
        .default(true),
    includeTraits: z
        .union([z.boolean(), z.enum(['true', 'false']).transform(val => val === 'true')])
        .optional()
        .default(true),
    includeAttitudes: z
        .union([z.boolean(), z.enum(['true', 'false']).transform(val => val === 'true')])
        .optional()
        .default(true),
})
    .strict();
export { updatePersonalityTraitsSchema };
export { updateAIAttitudesSchema };
export { userIdSchema };
export { profileQuerySchema };
export { submitAssessmentSchema };
export default {
    updatePersonalityTraitsSchema,
    updateAIAttitudesSchema,
    userIdSchema,
    profileQuerySchema,
    submitAssessmentSchema
};
