import { z } from "zod";
'use strict';

/**
 * Schema for rival traits
 * Defines the characteristics and comparison metrics for rival traits
 */
const rivalTraitSchema = z
  .object({
    id: z
      .string()
      .uuid('Trait ID must be a valid UUID format')
      .describe('Unique identifier for the trait'),
    name: z
      .string()
      .min(1, 'Trait name is required and cannot be empty')
      .max(100, 'Trait name cannot exceed 100 characters')
      .describe('Name of the trait'),
    description: z
      .string()
      .min(1, 'Trait description is required and cannot be empty')
      .max(500, 'Trait description cannot exceed 500 characters')
      .describe('Description of the trait'),
    value: z
      .number()
      .min(0, 'Trait value must be at least 0')
      .max(100, 'Trait value cannot exceed 100')
      .describe('Numerical value of the trait (0-100)'),
    comparison: z
      .enum(['stronger', 'weaker', 'equal'])
      .describe('How this trait compares to the user\'s trait'),
    manifestation: z
      .string()
      .min(1, 'Manifestation is required and cannot be empty')
      .max(500, 'Manifestation cannot exceed 500 characters')
      .describe('Explanation of how this trait manifests in the rival'),
  })
  .strict();

/**
 * Schema for rival performance in game rounds
 * Tracks predictions and actual performance
 */
const performanceSchema = z
  .object({
    round1: z
      .number()
      .min(0, 'Score must be at least 0')
      .max(100, 'Score cannot exceed 100')
      .optional()
      .describe('Score for round 1'),
    round2: z
      .number()
      .min(0, 'Score must be at least 0')
      .max(100, 'Score cannot exceed 100')
      .optional()
      .describe('Score for round 2'),
    round3: z
      .number()
      .min(0, 'Score must be at least 0')
      .max(100, 'Score cannot exceed 100')
      .optional()
      .describe('Score for round 3'),
  })
  .strict();

/**
 * Schema for overall comparison between user and rival
 * Provides metrics for relative performance
 */
const overallComparisonSchema = z
  .object({
    userScore: z
      .number()
      .min(0, 'User score must be at least 0')
      .max(100, 'User score cannot exceed 100')
      .describe('Overall score for the user'),
    rivalScore: z
      .number()
      .min(0, 'Rival score must be at least 0')
      .max(100, 'Rival score cannot exceed 100')
      .describe('Overall score for the rival'),
    difference: z
      .number()
      .describe('Difference between user and rival scores'),
    userAdvantageAreas: z
      .array(z.string())
      .describe('Areas where the user has an advantage'),
    rivalAdvantageAreas: z
      .array(z.string())
      .describe('Areas where the rival has an advantage'),
  })
  .strict();

/**
 * Main Rival schema
 * Comprehensive validation for rival entities
 */
const RivalSchema = z
  .object({
    id: z
      .string()
      .uuid('Rival ID must be a valid UUID format')
      .describe('Unique identifier for the rival'),
    name: z
      .string()
      .min(1, 'Rival name is required and cannot be empty')
      .max(100, 'Rival name cannot exceed 100 characters')
      .describe('Name of the rival'),
    avatarUrl: z
      .string()
      .url('Avatar URL must be a valid URL')
      .optional()
      .describe('URL for the rival\'s avatar image'),
    personalityType: z
      .string()
      .min(1, 'Personality type is required and cannot be empty')
      .max(100, 'Personality type cannot exceed 100 characters')
      .describe('Personality type of the rival'),
    description: z
      .string()
      .min(1, 'Description is required and cannot be empty')
      .max(1000, 'Description cannot exceed 1000 characters')
      .describe('Description of the rival'),
    traits: z
      .array(rivalTraitSchema)
      .min(1, 'At least one trait is required')
      .describe('Traits of the rival'),
    attitudes: z
      .array(z.string())
      .optional()
      .describe('AI attitudes of the rival'),
    strengths: z
      .array(z.string())
      .min(1, 'At least one strength is required')
      .describe('Strengths of the rival'),
    weaknesses: z
      .array(z.string())
      .min(1, 'At least one weakness is required')
      .describe('Weaknesses of the rival'),
    predictions: performanceSchema
      .describe('Performance predictions for each round'),
    performance: performanceSchema
      .describe('Actual performance in each round'),
    overallComparison: overallComparisonSchema
      .optional()
      .describe('Overall comparison to user'),
    rivalryIntensity: z
      .enum(['friendly', 'competitive', 'intense'])
      .describe('Intensity of the rivalry'),
    tauntMessages: z
      .array(z.string())
      .describe('Taunt messages that appear during challenges'),
    encouragementMessages: z
      .array(z.string())
      .describe('Encouragement messages that appear during challenges'),
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user this rival is associated with'),
    createdAt: z
      .string()
      .datetime('Created at must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('Creation timestamp'),
    updatedAt: z
      .string()
      .datetime('Updated at must be a valid ISO datetime')
      .default(() => new Date().toISOString())
      .describe('Last update timestamp'),
  })
  .strict();

/**
 * Schema for rival generation parameters
 * Defines the inputs needed to generate a personalized rival
 */
const RivalGenerationParamsSchema = z
  .object({
    userTraits: z
      .array(
        z.object({
          id: z.string().uuid('Trait ID must be a valid UUID format'),
          name: z.string().min(1, 'Trait name is required'),
          description: z.string().optional(),
          value: z.number().min(0).max(100),
        })
      )
      .min(1, 'At least one user trait is required')
      .describe('User traits to base the rival on'),
    userAttitudes: z
      .array(z.string())
      .optional()
      .describe('User AI attitudes'),
    focusArea: z
      .string()
      .optional()
      .describe('Focus area for the rival'),
    difficultyLevel: z
      .enum(['easy', 'medium', 'hard'])
      .default('medium')
      .describe('Difficulty level of the rival'),
    rivalryStyle: z
      .enum(['friendly', 'competitive', 'intense'])
      .default('competitive')
      .describe('Style of rivalry to generate'),
  })
  .strict();

/**
 * Schema for updating rival performance
 * Used when updating performance after rounds
 */
const RivalPerformanceUpdateSchema = z
  .object({
    rivalId: z
      .string()
      .uuid('Rival ID must be a valid UUID format')
      .describe('ID of the rival to update'),
    roundKey: z
      .enum(['round1', 'round2', 'round3'])
      .describe('Round to update performance for'),
    score: z
      .number()
      .min(0, 'Score must be at least 0')
      .max(100, 'Score cannot exceed 100')
      .describe('Score for the round'),
  })
  .strict();

export { RivalSchema };
export { RivalGenerationParamsSchema };
export { RivalPerformanceUpdateSchema };
export { rivalTraitSchema };
export { performanceSchema };
export { overallComparisonSchema };
export default {
  RivalSchema,
  RivalGenerationParamsSchema,
  RivalPerformanceUpdateSchema,
  rivalTraitSchema,
  performanceSchema,
  overallComparisonSchema
};
