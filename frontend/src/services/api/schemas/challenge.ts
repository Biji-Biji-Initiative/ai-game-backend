import { z } from 'zod';

/**
 * Zod schema for Challenge data
 */
export const ChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: z.string(),
  category: z.string(),
  estimatedTime: z.string(),
  matchScore: z.number().optional(),
  tags: z.array(z.string())
});

/**
 * Challenge schema type
 */
export type ChallengeSchemaType = z.infer<typeof ChallengeSchema>;

/**
 * Schema for response submission results
 */
export const ResponseSubmissionResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  message: z.string()
});

export type ResponseSubmissionResultType = z.infer<typeof ResponseSubmissionResultSchema>;

/**
 * Schema for AI response data
 */
export const AIResponseSchema = z.object({
  response: z.string(),
  analysis: z.string().optional(),
  insights: z.array(z.string()).optional()
});

export type AIResponseType = z.infer<typeof AIResponseSchema>; 