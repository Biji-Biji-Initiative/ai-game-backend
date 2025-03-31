import { z } from "zod";
'use strict';
/**
 * Schema for dropoff point data
 */
const dropoffPointSchema = z.object({
    challengeId: z.string().describe('Unique identifier for the challenge'),
    title: z.string().describe('Title of the challenge'),
    dropoffRate: z
        .number()
        .min(0)
        .max(100)
        .describe('Percentage of users who drop off at this point'),
});
/**
 * Schema for engagement metrics
 */
const engagementMetricsSchema = z.object({
    sessionsCompleted: z.number().min(0).optional().describe('Number of completed sessions'),
    averageSessionLength: z.number().min(0).optional().describe('Average session length in minutes'),
    completionRate: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Percentage of challenges completed'),
    challengeAttempts: z.number().min(0).optional().describe('Total number of challenge attempts'),
    lastActive: z.string().optional().describe('ISO timestamp of last activity'),
    activeStreak: z.number().min(0).optional().describe('Current active streak in days'),
    dropoffPoints: z
        .array(dropoffPointSchema)
        .optional()
        .describe('Points where users tend to drop off'),
    engagementTrend: z
        .enum(['increasing', 'decreasing', 'stable', 'fluctuating'])
        .optional()
        .describe('Trend in engagement over time'),
});
/**
 * Schema for personality profile
 */
const personalityProfileSchema = z.object({
    dominantTraits: z.array(z.string()).optional().describe('List of dominant personality traits'),
    motivationalFactors: z.array(z.string()).optional().describe('Factors that motivate the user'),
    engagementPreferences: z
        .record(z.number())
        .optional()
        .describe('Map of engagement preferences to scores'),
    communicationStyle: z.string().optional().describe('Preferred communication style'),
});
/**
 * Schema for learning preferences
 */
const learningPreferencesSchema = z.object({
    preferredChallengeTypes: z.array(z.string()).optional().describe('Types of challenges preferred'),
    preferredDifficulty: z.string().optional().describe('Preferred difficulty level'),
    preferredTopics: z.array(z.string()).optional().describe('Preferred topics'),
    learningStyle: z.string().optional().describe('Preferred learning style'),
    preferredFeedbackStyle: z.string().optional().describe('Preferred feedback style'),
});
/**
 * Schema for user feedback
 */
const userFeedbackSchema = z.object({
    category: z.string().describe('Category of the feedback'),
    sentiment: z.enum(['positive', 'neutral', 'negative']).describe('Sentiment of the feedback'),
    content: z.string().describe('Content of the feedback'),
    timestamp: z.string().describe('ISO timestamp when the feedback was provided'),
});
/**
 * Schema for system goals
 */
const systemGoalsSchema = z.object({
    primaryGoal: z
        .enum([
        'increaseCompletionRate',
        'extendSessionLength',
        'improveStreak',
        'reduceDropoff',
        'increaseChallengeDiversity',
        'improveOverallSatisfaction',
    ])
        .describe('Primary goal for engagement optimization'),
    secondaryGoals: z
        .array(z.string())
        .optional()
        .describe('Secondary goals for engagement optimization'),
    constraintsToConsider: z
        .array(z.string())
        .optional()
        .describe('Constraints to consider during optimization'),
});
/**
 * Schema for available engagement strategies
 */
const engagementStrategySchema = z.object({
    id: z.string().describe('Unique identifier for the strategy'),
    name: z.string().describe('Name of the strategy'),
    description: z.string().describe('Description of the strategy'),
    applicableUserTypes: z
        .array(z.string())
        .optional()
        .describe('Types of users the strategy applies to'),
});
/**
 * Schema for user data
 */
const userSchema = z.object({
    id: z.string().describe('Unique identifier for the user'),
    name: z.string().optional().describe('Name of the user'),
    role: z.string().optional().describe('Role of the user'),
    joinedAt: z.string().optional().describe('ISO timestamp when the user joined'),
    skillLevel: z.string().optional().describe('Overall skill level assessment'),
});
/**
 * Main schema for engagement optimization prompt parameters
 */
const engagementOptimizationSchema = z.object({
    user: userSchema.describe('User information'),
    engagementMetrics: engagementMetricsSchema.describe('Metrics related to user engagement'),
    personalityProfile: personalityProfileSchema.optional().describe('User personality profile'),
    learningPreferences: learningPreferencesSchema.optional().describe('User learning preferences'),
    userFeedback: z.array(userFeedbackSchema).optional().describe('Feedback provided by the user'),
    systemGoals: systemGoalsSchema.describe('Goals for the engagement optimization'),
    availableEngagementStrategies: z
        .array(engagementStrategySchema)
        .optional()
        .describe('Available engagement strategies'),
});
export const validateEngagementOptimizationParams = params => {
    return engagementOptimizationSchema.parse(params);
};
export { engagementOptimizationSchema };
export default {
    engagementOptimizationSchema,
    validateEngagementOptimizationParams
};
