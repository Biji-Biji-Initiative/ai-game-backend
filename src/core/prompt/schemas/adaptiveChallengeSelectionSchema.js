import { z } from "zod";
'use strict';
/**
 * Schema for recent challenge data
 */
const recentChallengeSchema = z.object({
    id: z.string().describe('Unique identifier for the challenge'),
    title: z.string().describe('Title of the challenge'),
    difficultyLevel: z.string().describe('Difficulty level of the challenge'),
    completedAt: z.string().describe('ISO timestamp when the challenge was completed'),
    score: z.number().min(0).max(100).optional().describe('Score achieved (0-100)'),
});
/**
 * Schema for focus area data
 */
const focusAreaSchema = z.object({
    id: z.string().describe('Unique identifier for the focus area'),
    name: z.string().describe('Name of the focus area'),
    proficiency: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('User proficiency in this area (0-100)'),
});
/**
 * Schema for personality profile data
 */
const personalityProfileSchema = z.object({
    dominantTraits: z.array(z.string()).optional().describe('List of dominant personality traits'),
    aiAttitudes: z.record(z.number()).optional().describe('Map of AI attitude dimensions to scores'),
});
/**
 * Schema for user preferences
 */
const preferencesSchema = z.object({
    subjectMatter: z.array(z.string()).optional().describe('Preferred subject matters'),
    challengeTypes: z.array(z.string()).optional().describe('Preferred types of challenges'),
    excludedTopics: z.array(z.string()).optional().describe('Topics the user wants to exclude'),
});
/**
 * Schema for progress metrics
 */
const progressMetricsSchema = z.object({
    completionRate: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Percentage of challenges completed'),
    averageScore: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Average score across all challenges'),
    improvementRate: z.number().optional().describe('Rate of improvement over time'),
    strengthAreas: z.array(z.string()).optional().describe('Areas where the user shows strength'),
    weaknessAreas: z.array(z.string()).optional().describe('Areas where the user shows weakness'),
});
/**
 * Schema for user data
 */
const userSchema = z.object({
    id: z.string().describe('Unique identifier for the user'),
    skillLevel: z.string().optional().describe('Overall skill level assessment'),
    learningPreferences: z.array(z.string()).optional().describe('User learning style preferences'),
    difficultyPreference: z.string().optional().describe('Preferred difficulty level'),
    recentChallenges: z
        .array(recentChallengeSchema)
        .optional()
        .describe('Recently completed challenges'),
});
/**
 * Main schema for adaptive challenge selection prompt parameters
 */
const adaptiveChallengeSelectionSchema = z.object({
    user: userSchema.describe('User information'),
    focusAreas: z.array(focusAreaSchema).optional().describe('User focus areas'),
    personalityProfile: personalityProfileSchema.optional().describe('User personality profile'),
    preferences: preferencesSchema.optional().describe('User preferences'),
    progressMetrics: progressMetricsSchema.optional().describe('User progress metrics'),
    count: z.number().min(1).max(10).default(3).describe('Number of challenges to select (1-10)'),
});
export const validateAdaptiveChallengeSelectionParams = params => {
    return adaptiveChallengeSelectionSchema.parse(params);
};
export { adaptiveChallengeSelectionSchema };
export default {
    adaptiveChallengeSelectionSchema,
    validateAdaptiveChallengeSelectionParams
};
