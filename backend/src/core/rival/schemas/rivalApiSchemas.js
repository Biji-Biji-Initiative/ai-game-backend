import { z } from "zod";
'use strict';

/**
 * Schema for API endpoints related to rivals
 */

/**
 * Schema for generating a new rival
 */
const generateRivalSchema = z
  .object({
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to generate a rival for'),
    userTraits: z
      .array(
        z.object({
          name: z.string().min(1, 'Trait name is required'),
          value: z.number().min(0).max(100),
        })
      )
      .optional()
      .describe('User traits to base the rival on'),
    focusArea: z
      .string()
      .optional()
      .describe('Focus area for the rival'),
    difficultyLevel: z
      .enum(['easy', 'medium', 'hard'])
      .optional()
      .default('medium')
      .describe('Difficulty level of the rival'),
  })
  .strict();

/**
 * Schema for retrieving a rival by ID
 */
const getRivalByIdSchema = z
  .object({
    rivalId: z
      .string()
      .uuid('Rival ID must be a valid UUID format')
      .describe('ID of the rival to retrieve'),
  })
  .strict();

/**
 * Schema for updating rival performance
 */
const updateRivalPerformanceSchema = z
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
    userScore: z
      .number()
      .min(0, 'User score must be at least 0')
      .max(100, 'User score cannot exceed 100')
      .describe('User\'s score for the round'),
  })
  .strict();

/**
 * Schema for comparing user and rival performance
 */
const compareWithRivalSchema = z
  .object({
    rivalId: z
      .string()
      .uuid('Rival ID must be a valid UUID format')
      .describe('ID of the rival to compare with'),
    userId: z
      .string()
      .uuid('User ID must be a valid UUID format')
      .describe('ID of the user to compare'),
    includeDetails: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include detailed comparison'),
  })
  .strict();

export { generateRivalSchema };
export { getRivalByIdSchema };
export { updateRivalPerformanceSchema };
export { compareWithRivalSchema };
export default {
  generateRivalSchema,
  getRivalByIdSchema,
  updateRivalPerformanceSchema,
  compareWithRivalSchema
};
