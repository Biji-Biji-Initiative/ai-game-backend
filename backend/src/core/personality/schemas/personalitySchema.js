import { z } from "zod";
'use strict';
// Define trait score validation
const traitScoreSchema = z
    .number()
    .min(0, 'Trait score must be at least 0')
    .max(100, 'Trait score cannot exceed 100');
// Define attitude score validation
const attitudeScoreSchema = z
    .number()
    .min(0, 'Attitude score must be at least 0')
    .max(100, 'Attitude score cannot exceed 100');
// Define valid personality traits
const validTraits = [
    'openness',
    'conscientiousness',
    'extraversion',
    'agreeableness',
    'neuroticism',
    'adaptability',
    'resilience',
    'creativity',
    'analytical',
    'leadership',
];
// Define valid AI attitudes
const validAttitudes = [
    'trust',
    'skepticism',
    'curiosity',
    'comfort',
    'resistance',
    'engagement',
    'understanding',
    'concern',
    'optimism',
    'pragmatism',
];
// Define the basic personality schema
const personalitySchema = z
    .object({
    // Required fields
    id: z.string().uuid('Personality ID must be a valid UUID'),
    userId: z.string().uuid('User ID must be a valid UUID'),
    // Optional fields with defaults
    personalityTraits: z
        .record(traitScoreSchema)
        .refine(traits => Object.keys(traits).every(trait => validTraits.includes(trait)), {
        message: `Personality traits must be one of: ${validTraits.join(', ')}`,
    })
        .default({}),
    aiAttitudes: z
        .record(attitudeScoreSchema)
        .refine(attitudes => Object.keys(attitudes).every(attitude => validAttitudes.includes(attitude)), { message: `AI attitudes must be one of: ${validAttitudes.join(', ')}` })
        .default({}),
    dominantTraits: z
        .array(z.enum(validTraits))
        .max(5, 'Cannot have more than 5 dominant traits')
        .default([]),
    traitClusters: z.record(z.array(z.enum(validTraits))).default({}),
    aiAttitudeProfile: z.record(z.unknown()).default({}),
    insights: z.record(z.unknown()).default({}),
    threadId: z
        .string()
        .min(1, 'Thread ID cannot be empty')
        .max(100, 'Thread ID cannot exceed 100 characters')
        .nullable()
        .optional(),
    createdAt: z.string().datetime('Created at must be a valid ISO datetime').optional(),
    updatedAt: z.string().datetime('Updated at must be a valid ISO datetime').optional(),
})
    .strict();
// Schema for creating a new personality profile
const createPersonalitySchema = personalitySchema
    .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
})
    .extend({
    userId: z.string().uuid('User ID must be a valid UUID'),
})
    .strict();
// Schema for updating an existing personality profile
const updatePersonalitySchema = personalitySchema
    .partial()
    .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
})
    .strict();
// Schema for trait updates
const traitUpdateSchema = z
    .object({})
    .catchall(traitScoreSchema)
    .refine(traits => Object.keys(traits).length > 0, {
    message: 'At least one trait must be provided',
})
    .refine(traits => Object.keys(traits).every(trait => validTraits.includes(trait)), {
    message: `Traits must be one of: ${validTraits.join(', ')}`,
});
// Schema for attitude updates
const attitudeUpdateSchema = z
    .object({})
    .catchall(attitudeScoreSchema)
    .refine(attitudes => Object.keys(attitudes).length > 0, {
    message: 'At least one attitude must be provided',
})
    .refine(attitudes => Object.keys(attitudes).every(attitude => validAttitudes.includes(attitude)), { message: `Attitudes must be one of: ${validAttitudes.join(', ')}` });
// Schema for personality search options
const personalitySearchOptionsSchema = z
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
    trait: z.enum(validTraits).optional(),
    minTraitScore: z
        .number()
        .min(0, 'Minimum trait score must be at least 0')
        .max(100, 'Minimum trait score cannot exceed 100')
        .optional(),
    maxTraitScore: z
        .number()
        .min(0, 'Maximum trait score must be at least 0')
        .max(100, 'Maximum trait score cannot exceed 100')
        .optional(),
    attitude: z.enum(validAttitudes).optional(),
    minAttitudeScore: z
        .number()
        .min(0, 'Minimum attitude score must be at least 0')
        .max(100, 'Maximum attitude score cannot exceed 100')
        .optional(),
    maxAttitudeScore: z
        .number()
        .min(0, 'Maximum attitude score must be at least 0')
        .max(100, 'Maximum attitude score cannot exceed 100')
        .optional(),
    startDate: z.string().datetime('Start date must be a valid ISO datetime').optional(),
    endDate: z.string().datetime('End date must be a valid ISO datetime').optional(),
})
    .strict()
    .refine(data => {
    if (data.minTraitScore !== undefined && data.maxTraitScore !== undefined) {
        return data.minTraitScore <= data.maxTraitScore;
    }
    return true;
}, { message: 'Minimum trait score must be less than or equal to maximum trait score' })
    .refine(data => {
    if (data.minAttitudeScore !== undefined && data.maxAttitudeScore !== undefined) {
        return data.minAttitudeScore <= data.maxAttitudeScore;
    }
    return true;
}, { message: 'Minimum attitude score must be less than or equal to maximum attitude score' })
    .refine(data => {
    if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
}, { message: 'Start date must be before or equal to end date' });
// Schema for database representation (snake_case keys)
const personalityDatabaseSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    personality_traits: z.record(z.number().min(0).max(100)).default({}),
    ai_attitudes: z.record(z.number().min(0).max(100)).default({}),
    dominant_traits: z.array(z.string()).default([]),
    trait_clusters: z.record(z.array(z.string())).default({}),
    ai_attitude_profile: z.record(z.any()).default({}),
    insights: z.record(z.any()).default({}),
    thread_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
// Convert from database format to domain model format
/**
 * Converts a personality record from database format to domain model format
 * @param {Object} dbPersonality - Personality record in database format
 * @returns {Object} - Personality record in domain model format
 */
function fromDatabase(dbPersonality) {
    return {
        id: dbPersonality.id,
        userId: dbPersonality.user_id,
        personalityTraits: dbPersonality.personality_traits,
        aiAttitudes: dbPersonality.ai_attitudes,
        dominantTraits: dbPersonality.dominant_traits,
        traitClusters: dbPersonality.trait_clusters,
        aiAttitudeProfile: dbPersonality.ai_attitude_profile,
        insights: dbPersonality.insights,
        threadId: dbPersonality.thread_id,
        createdAt: dbPersonality.created_at,
        updatedAt: dbPersonality.updated_at,
    };
}
// Convert from domain model format to database format
/**
 * Converts a personality record from domain model format to database format
 * @param {Object} personality - Personality record in domain model format
 * @returns {Object} - Personality record in database format
 */
function toDatabase(personality) {
    return {
        id: personality.id,
        user_id: personality.userId,
        personality_traits: personality.personalityTraits,
        ai_attitudes: personality.aiAttitudes,
        dominant_traits: personality.dominantTraits,
        trait_clusters: personality.traitClusters,
        ai_attitude_profile: personality.aiAttitudeProfile,
        insights: personality.insights,
        thread_id: personality.threadId,
        created_at: personality.createdAt,
        updated_at: personality.updatedAt,
    };
}
export { personalitySchema };
export { createPersonalitySchema };
export { updatePersonalitySchema };
export { traitUpdateSchema };
export { attitudeUpdateSchema };
export { personalitySearchOptionsSchema };
export { validTraits };
export { validAttitudes };
export { personalityDatabaseSchema };
export { fromDatabase };
export { toDatabase };
export default {
    personalitySchema,
    createPersonalitySchema,
    updatePersonalitySchema,
    traitUpdateSchema,
    attitudeUpdateSchema,
    personalitySearchOptionsSchema,
    validTraits,
    validAttitudes,
    personalityDatabaseSchema,
    fromDatabase,
    toDatabase
};
