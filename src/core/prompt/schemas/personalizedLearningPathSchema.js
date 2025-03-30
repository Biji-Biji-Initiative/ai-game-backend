import { z } from "zod";
'use strict';
/**
 * Schema for completed challenge data
 */
const completedChallengeSchema = z.object({
    id: z.string().describe('Unique identifier for the challenge'),
    title: z.string().describe('Title of the challenge'),
    focusArea: z.string().describe('Focus area of the challenge'),
    score: z.number().min(0).max(100).optional().describe('Score achieved (0-100)'),
    completedAt: z.string().optional().describe('ISO timestamp when the challenge was completed'),
});
/**
 * Schema for personality profile data
 */
const personalityProfileSchema = z.object({
    dominantTraits: z.array(z.string()).optional().describe('List of dominant personality traits'),
    learningStyle: z.string().optional().describe('Preferred learning style'),
    motivationalFactors: z.array(z.string()).optional().describe('Factors that motivate the user'),
});
/**
 * Schema for learning goal data
 */
const goalSchema = z.object({
    id: z.string().describe('Unique identifier for the goal'),
    description: z.string().describe('Description of the learning goal'),
    priority: z.number().min(1).max(10).optional().describe('Priority level (1-10)'),
});
/**
 * Schema for available challenge data
 */
const availableChallengeSchema = z.object({
    id: z.string().describe('Unique identifier for the challenge'),
    title: z.string().describe('Title of the challenge'),
    description: z.string().describe('Description of what the challenge involves'),
    focusArea: z.string().describe('Primary focus area of the challenge'),
    difficulty: z.string().describe('Difficulty level of the challenge'),
    prerequisites: z.array(z.string()).optional().describe('Prerequisites for the challenge'),
    estimatedTime: z.number().min(0).optional().describe('Estimated time to complete in minutes'),
    concepts: z.array(z.string()).optional().describe('Key concepts covered by the challenge'),
});
/**
 * Schema for focus area data
 */
const focusAreaSchema = z.object({
    id: z.string().describe('Unique identifier for the focus area'),
    name: z.string().describe('Name of the focus area'),
    proficiency: z.number().min(0).max(100).optional().describe('Current proficiency level (0-100)'),
    importance: z.number().min(1).max(10).optional().describe('Importance level (1-10)'),
});
/**
 * Schema for time constraints
 */
const timeConstraintsSchema = z.object({
    totalAvailableTime: z.number().min(0).optional().describe('Total available time in hours'),
    maxSessionDuration: z.number().min(0).optional().describe('Maximum session duration in minutes'),
    sessionsPerWeek: z.number().min(0).optional().describe('Number of sessions per week'),
});
/**
 * Schema for path design options
 */
const pathOptionsSchema = z.object({
    maxLength: z.number().min(1).default(10).describe('Maximum number of challenges in the path'),
    includeMilestones: z.boolean().default(true).describe('Whether to include milestone challenges'),
    adaptBasedOnPerformance: z
        .boolean()
        .default(true)
        .describe('Whether to adapt based on performance'),
});
/**
 * Schema for user data
 */
const userSchema = z.object({
    id: z.string().describe('Unique identifier for the user'),
    name: z.string().optional().describe('Name of the user'),
    skillLevel: z.string().optional().describe('Overall skill level assessment'),
    learningPreferences: z.array(z.string()).optional().describe('User learning style preferences'),
    completedChallenges: z
        .array(completedChallengeSchema)
        .optional()
        .describe('Challenges completed by the user'),
});
/**
 * Main schema for personalized learning path prompt parameters
 */
const personalizedLearningPathSchema = z.object({
    user: userSchema.describe('User information'),
    personalityProfile: personalityProfileSchema.optional().describe('User personality profile'),
    goals: z.array(goalSchema).min(1).describe('User learning goals'),
    availableChallenges: z.array(availableChallengeSchema).min(1).describe('Available challenges'),
    focusAreas: z.array(focusAreaSchema).min(1).describe('Focus areas'),
    timeConstraints: timeConstraintsSchema.optional().describe('User time constraints'),
    pathOptions: pathOptionsSchema.optional().describe('Path design options'),
});
export const validatePersonalizedLearningPathParams = params => {
    return personalizedLearningPathSchema.parse(params);
};
export { personalizedLearningPathSchema };
export default {
    personalizedLearningPathSchema,
    validatePersonalizedLearningPathParams
};
