import { z } from "zod";
'use strict';
/**
 * Defines valid difficulty levels for challenges and content
 * Used for validation and consistent difficulty representation
 */
const difficultyLevelEnum = z
    .enum(['beginner', 'intermediate', 'advanced', 'expert'], {
    errorMap: () => ({
        message: 'Difficulty level must be one of: beginner, intermediate, advanced, expert',
    }),
})
    .describe('Standard difficulty levels');
/**
 * Main Difficulty schema
 * Comprehensive validation for difficulty settings
 */
const DifficultySchema = z
    .object({
    level: difficultyLevelEnum.default('beginner').describe('Primary difficulty level category'),
    complexity: z
        .number()
        .min(0, 'Complexity must be at least 0')
        .max(1, 'Complexity cannot exceed 1')
        .default(0.5)
        .describe('Complexity factor (0-1 scale)'),
    depth: z
        .number()
        .min(0, 'Depth must be at least 0')
        .max(1, 'Depth cannot exceed 1')
        .default(0.5)
        .describe('Depth of knowledge required (0-1 scale)'),
    timeAllocation: z
        .number()
        .int('Time allocation must be a whole number')
        .min(60, 'Time allocation must be at least 60 seconds')
        .max(1800, 'Time allocation cannot exceed 1800 seconds (30 minutes)')
        .default(300)
        .describe('Recommended time in seconds'),
    adaptiveFactor: z
        .number()
        .min(-1, 'Adaptive factor must be at least -1')
        .max(1, 'Adaptive factor cannot exceed 1')
        .default(0.0)
        .describe('Adjustment factor for adaptive difficulty (-1 to 1)'),
})
    .strict();
/**
 * Schema for difficulty update operations
 * All fields are optional for partial updates
 */
const DifficultyUpdateSchema = DifficultySchema.partial().strict();
/**
 * Schema for personality traits that influence difficulty
 * Used to personalize challenge difficulty
 */
const PersonalityTraitsSchema = z
    .object({
    openness: z
        .number()
        .min(0, 'Openness must be at least 0')
        .max(1, 'Openness cannot exceed 1')
        .optional()
        .describe('Openness to experience (0-1 scale)'),
    conscientiousness: z
        .number()
        .min(0, 'Conscientiousness must be at least 0')
        .max(1, 'Conscientiousness cannot exceed 1')
        .optional()
        .describe('Conscientiousness (0-1 scale)'),
    extraversion: z
        .number()
        .min(0, 'Extraversion must be at least 0')
        .max(1, 'Extraversion cannot exceed 1')
        .optional()
        .describe('Extraversion (0-1 scale)'),
    agreeableness: z
        .number()
        .min(0, 'Agreeableness must be at least 0')
        .max(1, 'Agreeableness cannot exceed 1')
        .optional()
        .describe('Agreeableness (0-1 scale)'),
    neuroticism: z
        .number()
        .min(0, 'Neuroticism must be at least 0')
        .max(1, 'Neuroticism cannot exceed 1')
        .optional()
        .describe('Neuroticism (0-1 scale)'),
})
    .strict();
/**
 * Schema for difficulty history tracking
 * Used to monitor difficulty progression over time
 */
const DifficultyHistorySchema = z
    .object({
    timestamp: z
        .string()
        .datetime('Timestamp must be a valid ISO datetime')
        .describe('When this difficulty setting was used'),
    level: difficultyLevelEnum.describe('Difficulty level applied'),
    complexity: z
        .number()
        .min(0, 'Complexity must be at least 0')
        .max(1, 'Complexity cannot exceed 1')
        .describe('Complexity factor applied'),
    successRate: z
        .number()
        .min(0, 'Success rate must be at least 0')
        .max(1, 'Success rate cannot exceed 1')
        .optional()
        .describe('User success rate at this difficulty'),
    challengeId: z
        .string()
        .uuid('Challenge ID must be a valid UUID format')
        .optional()
        .describe('Associated challenge ID if applicable'),
    adjustmentReason: z
        .string()
        .max(200, 'Adjustment reason cannot exceed 200 characters')
        .optional()
        .describe('Reason for difficulty adjustment'),
})
    .strict();
/**
 * Schema for difficulty calibration parameters
 * Used to fine-tune difficulty based on user performance
 */
const DifficultyCalibrationSchema = z
    .object({
    userId: z
        .string()
        .uuid('User ID must be a valid UUID format')
        .describe('User ID for the calibration'),
    baselineLevel: difficultyLevelEnum.default('beginner').describe('Starting difficulty level'),
    adjustmentFactor: z
        .number()
        .min(0.1, 'Adjustment factor must be at least 0.1')
        .max(2.0, 'Adjustment factor cannot exceed 2.0')
        .default(1.0)
        .describe('How quickly difficulty adjusts (multiplier)'),
    performanceThreshold: z
        .number()
        .min(0.5, 'Performance threshold must be at least 0.5')
        .max(0.95, 'Performance threshold cannot exceed 0.95')
        .default(0.8)
        .describe('Performance level that triggers adjustment'),
    historyWeight: z
        .number()
        .min(0, 'History weight must be at least 0')
        .max(1, 'History weight cannot exceed 1')
        .default(0.7)
        .describe('How much past performance influences adjustments'),
    difficultyHistory: z
        .array(DifficultyHistorySchema)
        .max(50, 'Cannot track more than 50 history entries')
        .default([])
        .describe('Record of difficulty changes over time'),
})
    .strict();
export { DifficultySchema };
export { DifficultyUpdateSchema };
export { PersonalityTraitsSchema };
export { DifficultyHistorySchema };
export { DifficultyCalibrationSchema };
export { difficultyLevelEnum };
export default {
    DifficultySchema,
    DifficultyUpdateSchema,
    PersonalityTraitsSchema,
    DifficultyHistorySchema,
    DifficultyCalibrationSchema,
    difficultyLevelEnum
};
