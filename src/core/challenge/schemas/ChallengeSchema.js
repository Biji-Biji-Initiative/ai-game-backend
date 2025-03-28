/**
 * Zod Schema for Challenge Model
 * 
 * Defines validation schemas for Challenge entities.
 * Used for data validation in repositories and services.
 * 
 * @module ChallengeSchema
 * @requires zod
 */

const { z } = require('zod');

// Schema for question options
const questionOptionSchema = z.object({
  id: z.string().uuid('Invalid option ID format'),
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean(),
  explanation: z.string()
});

// Schema for question objects within a challenge
const questionSchema = z.object({
  id: z.string().uuid('Invalid question ID format'),
  text: z.string().min(1, 'Question text is required'),
  type: z.string(),
  options: z.array(questionOptionSchema),
  metadata: z.object({
    difficulty: z.string(),
    points: z.number(),
    timeLimit: z.number(),
    tags: z.array(z.string()),
    category: z.string()
  })
});

// Schema for resource objects
const resourceSchema = z.object({
  id: z.string().uuid('Invalid resource ID format'),
  title: z.string().min(1, 'Resource title is required'),
  url: z.string(),
  description: z.string(),
  type: z.string()
});

// Schema for criteria objects
const criteriaSchema = z.record(
  z.object({
    description: z.string().min(1, 'Criteria description is required'),
    weight: z.number(),
    metrics: z.array(z.string())
  })
);

// Challenge content schema with strict object structure
const contentSchema = z.object({
  instructions: z.string().min(20, 'Instructions are required and must be detailed'),
  scenario: z.string().min(20, 'Scenario must be properly described').optional(),
  context: z.string().min(10, 'Context must provide sufficient information').optional(),
  codeSnippet: z.string().optional(),
  exampleInput: z.string().optional(),
  exampleOutput: z.string().optional(),
  additionalContext: z.string().optional()
}).refine(
  (data) => data.instructions || (data.scenario && data.context),
  { message: 'Either instructions or both scenario and context must be provided' }
);

// Type metadata schema
const typeMetadataSchema = z.object({
  timeEstimate: z.number(),
  skillsRequired: z.array(z.string()),
  complexityLevel: z.number(),
  interactivity: z.boolean(),
  prerequisites: z.array(z.string()),
  additionalParameters: z.record(z.union([
    z.string(), z.number(), z.boolean(), z.array(z.any())
  ]))
});

// Format metadata schema
const formatMetadataSchema = z.object({
  responseFormat: z.string(),
  wordLimit: z.number().optional(),
  allowedTools: z.array(z.string()),
  structuredResponseFields: z.array(z.string()),
  mediaSupport: z.boolean(),
  additionalParameters: z.record(z.union([
    z.string(), z.number(), z.boolean(), z.array(z.any())
  ]))
});

// Metadata schema
const metadataSchema = z.object({
  createdBy: z.string().optional(),
  source: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()),
  isTemplate: z.boolean(),
  difficulty: z.object({
    value: z.number().min(1).max(10),
    label: z.string()
  }),
  additionalAttributes: z.record(z.any())
});

// Main Challenge schema with strict validation
const ChallengeSchema = z.object({
  id: z.string().uuid('Invalid challenge ID format'),
  title: z.string().min(10, 'Title is required and must be at least 10 characters'),
  description: z.string().min(20, 'Description is required and must be at least 20 characters'),
  content: contentSchema,
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
  evaluationCriteria: criteriaSchema.refine(
    (criteria) => Object.keys(criteria).length > 0,
    { message: 'At least one evaluation criterion is required' }
  ),
  recommendedResources: z.array(resourceSchema),
  challengeType: z.string().min(3, 'Challenge type is required'),
  formatType: z.string().min(3, 'Format type is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  focusArea: z.string().min(3, 'Focus area is required'),
  userId: z.string().uuid('Invalid user ID format').optional().nullable(),
  typeMetadata: typeMetadataSchema,
  formatMetadata: formatMetadataSchema,
  metadata: metadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional().nullable(),
  responses: z.array(
    z.object({
      id: z.string().uuid('Invalid response ID format'),
      questionId: z.string().uuid('Invalid question ID format'),
      response: z.string(),
      submittedAt: z.string().datetime()
    })
  ).optional()
}).strict();

// Schema for challenge update operations (all fields optional)
const ChallengeUpdateSchema = ChallengeSchema.partial().omit({ id: true, createdAt: true });

// Schema for challenge search criteria
const ChallengeSearchSchema = z.object({
  userId: z.string().uuid('Invalid user ID format').optional(),
  focusArea: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  active: z.boolean().optional(),
  type: z.string().optional(),
  formatType: z.string().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  completedAt: z.union([z.string().datetime(), z.null()]).optional()
}).strict();

// Schema for search options
const SearchOptionsSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeResponses: z.boolean().optional(),
  includeMetadata: z.boolean().optional()
}).strict();

module.exports = {
  ChallengeSchema,
  ChallengeUpdateSchema,
  ChallengeSearchSchema,
  SearchOptionsSchema,
  contentSchema,
  questionSchema,
  resourceSchema,
  criteriaSchema,
  typeMetadataSchema,
  formatMetadataSchema,
  metadataSchema,
  questionOptionSchema
}; 