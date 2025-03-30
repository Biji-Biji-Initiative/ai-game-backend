import { z } from "zod";
'use strict';
/**
 * Schema for learning resources associated with recommendations
 * Validates structure and content of learning materials
 */
const learningResourceSchema = z
    .object({
    title: z
        .string()
        .min(1, 'Resource title is required and cannot be empty')
        .max(200, 'Resource title cannot exceed 200 characters')
        .refine(title => title.trim() === title, 'Title cannot start or end with whitespace')
        .describe('Title of the learning resource'),
    url: z
        .string()
        .url('Resource URL must be a valid URL')
        .max(2000, 'Resource URL cannot exceed 2000 characters')
        .optional()
        .describe('URL where the resource can be accessed'),
    description: z
        .string()
        .min(1, 'Resource description is required and cannot be empty')
        .max(1000, 'Resource description cannot exceed 1000 characters')
        .refine(desc => desc.trim() === desc, 'Description cannot start or end with whitespace')
        .optional()
        .describe('Description of the resource content'),
    type: z
        .string()
        .min(1, 'Resource type is required and cannot be empty')
        .max(50, 'Resource type cannot exceed 50 characters')
        .refine(type => type.trim() === type, 'Resource type cannot start or end with whitespace')
        .optional()
        .describe('Type of learning resource'),
    relevanceScore: z
        .number()
        .min(0, 'Relevance score must be at least 0')
        .max(100, 'Relevance score cannot exceed 100')
        .optional()
        .describe('Relevance score from 0-100'),
})
    .strict();
/**
 * Schema for challenge parameters
 * Defines customization options for challenges
 */
const challengeParametersSchema = z
    .object({
    difficulty: z
        .string()
        .min(1, 'Difficulty is required and cannot be empty')
        .max(50, 'Difficulty cannot exceed 50 characters')
        .refine(diff => diff.trim() === diff, 'Difficulty cannot start or end with whitespace')
        .optional()
        .describe('Difficulty level for the challenge'),
    focusArea: z
        .string()
        .min(1, 'Focus area is required and cannot be empty')
        .max(100, 'Focus area cannot exceed 100 characters')
        .refine(area => area.trim() === area, 'Focus area cannot start or end with whitespace')
        .optional()
        .describe('The focus area for the challenge'),
    challengeType: z
        .string()
        .min(1, 'Challenge type is required and cannot be empty')
        .max(50, 'Challenge type cannot exceed 50 characters')
        .refine(type => type.trim() === type, 'Challenge type cannot start or end with whitespace')
        .optional()
        .describe('Type of challenge'),
    formatType: z
        .string()
        .min(1, 'Format type is required and cannot be empty')
        .max(50, 'Format type cannot exceed 50 characters')
        .refine(format => format.trim() === format, 'Format type cannot start or end with whitespace')
        .optional()
        .describe('Format of the challenge'),
    timeLimit: z
        .number()
        .int('Time limit must be a whole number')
        .min(60, 'Time limit must be at least 60 seconds')
        .max(3600, 'Time limit cannot exceed 3600 seconds (1 hour)')
        .optional()
        .describe('Time limit in seconds'),
    customInstructions: z
        .string()
        .min(1, 'Custom instructions cannot be empty if provided')
        .max(2000, 'Custom instructions cannot exceed 2000 characters')
        .refine(instr => !instr || instr.trim() === instr, 'Custom instructions cannot start or end with whitespace')
        .optional()
        .describe('Custom instructions for the challenge'),
    options: z
        .record(z.unknown())
        .optional()
        .default({})
        .describe('Additional options for the challenge'),
})
    .strict();
/**
 * Main Recommendation schema
 * Comprehensive validation for recommendation entities
 */
const RecommendationSchema = z
    .object({
    id: z
        .string()
        .uuid('Recommendation ID must be a valid UUID format')
        .optional()
        .describe('Unique identifier for the recommendation'),
    userId: z
        .string()
        .min(1, 'User ID is required and cannot be empty')
        .uuid('User ID must be a valid UUID format')
        .describe('ID of the user receiving the recommendation'),
    createdAt: z
        .string()
        .datetime('Created at must be a valid ISO datetime')
        .optional()
        .describe('Creation timestamp'),
    recommendedFocusAreas: z
        .array(z
        .string()
        .min(1, 'Focus area cannot be empty')
        .max(100, 'Focus area cannot exceed 100 characters')
        .refine(area => area.trim() === area, 'Focus area cannot start or end with whitespace'))
        .default([])
        .describe('List of recommended focus areas'),
    recommendedChallengeTypes: z
        .array(z
        .string()
        .min(1, 'Challenge type cannot be empty')
        .max(50, 'Challenge type cannot exceed 50 characters')
        .refine(type => type.trim() === type, 'Challenge type cannot start or end with whitespace'))
        .default([])
        .describe('List of recommended challenge types'),
    suggestedLearningResources: z
        .array(learningResourceSchema)
        .max(10, 'Cannot have more than 10 learning resources')
        .default([])
        .describe('Collection of suggested learning resources'),
    challengeParameters: challengeParametersSchema
        .nullable()
        .optional()
        .describe('Parameters for generating recommended challenges'),
    strengths: z
        .array(z
        .string()
        .min(1, 'Strength cannot be empty')
        .max(100, 'Strength cannot exceed 100 characters')
        .refine(str => str.trim() === str, 'Strength cannot start or end with whitespace'))
        .default([])
        .describe('Identified user strengths'),
    weaknesses: z
        .array(z
        .string()
        .min(1, 'Weakness cannot be empty')
        .max(100, 'Weakness cannot exceed 100 characters')
        .refine(weak => weak.trim() === weak, 'Weakness cannot start or end with whitespace'))
        .default([])
        .describe('Identified user weaknesses'),
    metadata: z
        .record(z.unknown())
        .optional()
        .default({})
        .describe('Additional metadata for the recommendation'),
})
    .strict();
/**
 * Schema for recommendation update operations
 * All fields are optional except those explicitly omitted
 */
const RecommendationUpdateSchema = RecommendationSchema.partial()
    .omit({ id: true, createdAt: true })
    .strict();
/**
 * Schema for database format (with snake_case keys)
 * Used for validating data before/after database operations
 */
const RecommendationDatabaseSchema = z
    .object({
    id: z
        .string()
        .uuid('Recommendation ID must be a valid UUID format')
        .optional()
        .describe('Unique identifier for the recommendation'),
    user_id: z
        .string()
        .min(1, 'User ID is required and cannot be empty')
        .uuid('User ID must be a valid UUID format')
        .describe('ID of the user receiving the recommendation'),
    created_at: z
        .string()
        .datetime('Created at must be a valid ISO datetime')
        .optional()
        .describe('Creation timestamp'),
    recommended_focus_areas: z
        .array(z
        .string()
        .min(1, 'Focus area cannot be empty')
        .max(100, 'Focus area cannot exceed 100 characters')
        .refine(area => area.trim() === area, 'Focus area cannot start or end with whitespace'))
        .default([])
        .describe('List of recommended focus areas'),
    recommended_challenge_types: z
        .array(z
        .string()
        .min(1, 'Challenge type cannot be empty')
        .max(50, 'Challenge type cannot exceed 50 characters')
        .refine(type => type.trim() === type, 'Challenge type cannot start or end with whitespace'))
        .default([])
        .describe('List of recommended challenge types'),
    suggested_learning_resources: z
        .array(learningResourceSchema)
        .max(10, 'Cannot have more than 10 learning resources')
        .default([])
        .describe('Collection of suggested learning resources'),
    challenge_parameters: challengeParametersSchema
        .nullable()
        .optional()
        .describe('Parameters for generating recommended challenges'),
    strengths: z
        .array(z
        .string()
        .min(1, 'Strength cannot be empty')
        .max(100, 'Strength cannot exceed 100 characters')
        .refine(str => str.trim() === str, 'Strength cannot start or end with whitespace'))
        .default([])
        .describe('Identified user strengths'),
    weaknesses: z
        .array(z
        .string()
        .min(1, 'Weakness cannot be empty')
        .max(100, 'Weakness cannot exceed 100 characters')
        .refine(weak => weak.trim() === weak, 'Weakness cannot start or end with whitespace'))
        .default([])
        .describe('Identified user weaknesses'),
    metadata: z
        .record(z.unknown())
        .optional()
        .default({})
        .describe('Additional metadata for the recommendation'),
})
    .strict();
/**
 * Schema for search/query options
 * Defines parameters for searching recommendations
 */
const RecommendationSearchOptionsSchema = z
    .object({
    userId: z
        .string()
        .uuid('User ID must be a valid UUID format')
        .optional()
        .describe('Filter by user ID'),
    limit: z
        .number()
        .int('Limit must be a whole number')
        .positive('Limit must be a positive number')
        .max(100, 'Limit cannot exceed 100')
        .optional()
        .default(20)
        .describe('Maximum number of results to return'),
    offset: z
        .number()
        .int('Offset must be a whole number')
        .nonnegative('Offset cannot be negative')
        .optional()
        .default(0)
        .describe('Number of results to skip'),
    includeResources: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include learning resources'),
    sortBy: z
        .enum(['createdAt', 'relevance'])
        .optional()
        .default('createdAt')
        .describe('Field to sort by'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order'),
    startDate: z
        .string()
        .datetime('Start date must be a valid ISO datetime')
        .optional()
        .describe('Filter by start date'),
    endDate: z
        .string()
        .datetime('End date must be a valid ISO datetime')
        .optional()
        .describe('Filter by end date'),
})
    .strict()
    .refine(data => {
    if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
}, { message: 'Start date must be before or equal to end date' });
export { RecommendationSchema };
export { RecommendationUpdateSchema };
export { RecommendationDatabaseSchema };
export { RecommendationSearchOptionsSchema };
export { learningResourceSchema };
export { challengeParametersSchema };
export default {
    RecommendationSchema,
    RecommendationUpdateSchema,
    RecommendationDatabaseSchema,
    RecommendationSearchOptionsSchema,
    learningResourceSchema,
    challengeParametersSchema
};
