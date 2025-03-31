import { z } from "zod";
'use strict';
/**
 * Schema for challenge completion statistics
 */
const completionStatsSchema = z.object({
    totalAttempts: z.number().min(0).describe('Total number of attempts on this challenge'),
    successRate: z.number().min(0).max(100).describe('Percentage of successful completions'),
    averageScore: z.number().min(0).max(100).optional().describe('Average score achieved (0-100)'),
    averageTimeToComplete: z
        .number()
        .min(0)
        .optional()
        .describe('Average time to complete in minutes'),
});
/**
 * Schema for challenge data
 */
const challengeSchema = z.object({
    id: z.string().describe('Unique identifier for the challenge'),
    title: z.string().describe('Title of the challenge'),
    description: z.string().describe('Description of what the challenge involves'),
    currentDifficulty: z.string().describe('Current difficulty rating'),
    completionStats: completionStatsSchema
        .optional()
        .describe('Statistics about challenge completion'),
});
/**
 * Schema for skill level data
 */
const skillLevelSchema = z.object({
    level: z.string().describe('Name of the skill level'),
    description: z.string().describe('Description of what this skill level means'),
    expectedSuccessRate: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Expected success rate for this skill level'),
});
/**
 * Schema for target audience data
 */
const targetAudienceSchema = z.object({
    skillLevel: z.string().describe('Overall skill level of the target audience'),
    technicalBackground: z
        .array(z.string())
        .optional()
        .describe('Technical backgrounds of the audience'),
    priorKnowledge: z
        .array(z.string())
        .optional()
        .describe('Prior knowledge expected from the audience'),
});
/**
 * Schema for difficulty level data
 */
const difficultyLevelSchema = z.object({
    level: z.string().describe('Name of the difficulty level'),
    description: z.string().describe('Description of what this difficulty level means'),
    targetSuccessRate: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Target success rate for this difficulty'),
});
/**
 * Schema for calibration goals
 */
const calibrationGoalsSchema = z.object({
    ensureProgression: z.boolean().default(true).describe('Ensure clear progression path'),
    normalizeRatings: z
        .boolean()
        .default(true)
        .describe('Normalize difficulty ratings across challenges'),
    balanceSuccessRates: z.boolean().default(true).describe('Balance success rates to meet targets'),
});
/**
 * Main schema for difficulty calibration prompt parameters
 */
const difficultyCalibratonSchema = z.object({
    challenges: z.array(challengeSchema).min(1).describe('List of challenges to calibrate'),
    skillLevels: z.array(skillLevelSchema).optional().describe('Defined skill levels'),
    targetAudience: targetAudienceSchema.optional().describe('Target audience information'),
    difficultyLevels: z.array(difficultyLevelSchema).min(1).describe('Defined difficulty levels'),
    calibrationGoals: calibrationGoalsSchema.optional().describe('Goals for the calibration process'),
});
export const validateDifficultyCalibratonParams = params => {
    return difficultyCalibratonSchema.parse(params);
};
export { difficultyCalibratonSchema };
export default {
    difficultyCalibratonSchema,
    validateDifficultyCalibratonParams
};
