import { z } from "zod";
'use strict';
/**
 * Schema for question options within multiple choice questions
 * Validates structure and content of individual answer options
 */
const questionOptionSchema = z
    .object({
    id: z
        .string()
        .uuid('Option ID must be a valid UUID format')
        .describe('Unique identifier for the question option'),
    text: z
        .string()
        .min(1, 'Option text is required and cannot be empty')
        .max(1000, 'Option text cannot exceed 1000 characters')
        .refine(text => text.trim() === text, 'Option text cannot start or end with whitespace')
        .describe('The text content of the option'),
    isCorrect: z.boolean().describe('Indicates if this is the correct answer'),
    explanation: z
        .string()
        .min(1, 'Option explanation is required and cannot be empty')
        .max(2000, 'Option explanation cannot exceed 2000 characters')
        .refine(text => text.trim() === text, 'Explanation cannot start or end with whitespace')
        .describe('Explanation of why this option is correct or incorrect'),
})
    .strict();
/**
 * Schema for individual questions within a challenge
 * Supports multiple question types and their specific requirements
 */
const questionSchema = z
    .object({
    id: z
        .string()
        .uuid('Question ID must be a valid UUID format')
        .describe('Unique identifier for the question'),
    text: z
        .string()
        .min(1, 'Question text is required and cannot be empty')
        .max(2000, 'Question text cannot exceed 2000 characters')
        .refine(text => text.trim() === text, 'Question text cannot start or end with whitespace')
        .describe('The actual question text'),
    type: z.enum(['multiple-choice', 'open-ended', 'coding']).describe('The type of question'),
    options: z
        .array(questionOptionSchema)
        .min(1, 'At least one option is required')
        .max(10, 'Cannot have more than 10 options')
        .describe('Available options for multiple choice questions'),
    metadata: z
        .object({
        difficulty: z
            .enum(['beginner', 'intermediate', 'advanced', 'expert'])
            .describe('Difficulty level of the question'),
        points: z
            .number()
            .int('Points must be a whole number')
            .min(1, 'Points must be at least 1')
            .max(100, 'Points cannot exceed 100')
            .describe('Points awarded for correct answer'),
        timeLimit: z
            .number()
            .int('Time limit must be a whole number')
            .min(30, 'Time limit must be at least 30 seconds')
            .max(3600, 'Time limit cannot exceed 3600 seconds (1 hour)')
            .describe('Time limit in seconds'),
        tags: z
            .array(z
            .string()
            .min(1, 'Tag cannot be empty')
            .max(50, 'Tag cannot exceed 50 characters')
            .refine(tag => tag.trim() === tag, 'Tags cannot start or end with whitespace'))
            .min(1, 'At least one tag is required')
            .describe('Categorization tags for the question'),
        category: z
            .string()
            .min(1, 'Category is required and cannot be empty')
            .max(100, 'Category cannot exceed 100 characters')
            .refine(cat => cat.trim() === cat, 'Category cannot start or end with whitespace')
            .describe('Primary category of the question'),
    })
        .strict(),
})
    .strict();
/**
 * Schema for learning resources associated with challenges
 * Validates structure and content of supplementary materials
 */
const resourceSchema = z
    .object({
    id: z
        .string()
        .uuid('Resource ID must be a valid UUID format')
        .describe('Unique identifier for the resource'),
    title: z
        .string()
        .min(1, 'Resource title is required and cannot be empty')
        .max(200, 'Resource title cannot exceed 200 characters')
        .refine(title => title.trim() === title, 'Title cannot start or end with whitespace')
        .describe('Title of the resource'),
    url: z
        .string()
        .url('Resource URL must be a valid URL')
        .max(2000, 'Resource URL cannot exceed 2000 characters')
        .describe('URL where the resource can be accessed'),
    description: z
        .string()
        .min(1, 'Resource description is required and cannot be empty')
        .max(1000, 'Resource description cannot exceed 1000 characters')
        .refine(desc => desc.trim() === desc, 'Description cannot start or end with whitespace')
        .describe('Description of the resource content'),
    type: z
        .enum(['article', 'video', 'documentation', 'tutorial', 'other'])
        .describe('Type of resource'),
})
    .strict();
/**
 * Schema for evaluation criteria
 * Defines how challenges should be assessed
 */
const criteriaSchema = z.record(z
    .object({
    description: z
        .string()
        .min(1, 'Criteria description is required and cannot be empty')
        .max(1000, 'Criteria description cannot exceed 1000 characters')
        .refine(desc => desc.trim() === desc, 'Description cannot start or end with whitespace')
        .describe('Description of the evaluation criterion'),
    weight: z
        .number()
        .min(0, 'Weight must be at least 0')
        .max(1, 'Weight cannot exceed 1')
        .describe('Relative importance of this criterion'),
    metrics: z
        .array(z
        .string()
        .min(1, 'Metric cannot be empty')
        .max(100, 'Metric cannot exceed 100 characters')
        .refine(metric => metric.trim() === metric, 'Metrics cannot start or end with whitespace'))
        .min(1, 'At least one metric is required')
        .describe('Specific metrics used to evaluate this criterion'),
})
    .strict());
/**
 * Schema for challenge content
 * Validates the core content and instructions of a challenge
 */
const contentSchema = z
    .object({
    instructions: z
        .string()
        .min(20, 'Instructions must be at least 20 characters')
        .max(5000, 'Instructions cannot exceed 5000 characters')
        .refine(text => text.trim() === text, 'Instructions cannot start or end with whitespace')
        .describe('Detailed instructions for completing the challenge'),
    scenario: z
        .string()
        .min(20, 'Scenario must be at least 20 characters')
        .max(3000, 'Scenario cannot exceed 3000 characters')
        .refine(text => !text || text.trim() === text, 'Scenario cannot start or end with whitespace')
        .optional()
        .describe('Optional context-setting scenario'),
    context: z
        .string()
        .min(10, 'Context must be at least 10 characters')
        .max(2000, 'Context cannot exceed 2000 characters')
        .refine(text => !text || text.trim() === text, 'Context cannot start or end with whitespace')
        .optional()
        .describe('Additional background information'),
    codeSnippet: z
        .string()
        .max(10000, 'Code snippet cannot exceed 10000 characters')
        .optional()
        .describe('Related code snippet if applicable'),
    exampleInput: z
        .string()
        .max(1000, 'Example input cannot exceed 1000 characters')
        .optional()
        .describe('Example input for the challenge'),
    exampleOutput: z
        .string()
        .max(1000, 'Example output cannot exceed 1000 characters')
        .optional()
        .describe('Expected output for the example input'),
    additionalContext: z
        .string()
        .max(2000, 'Additional context cannot exceed 2000 characters')
        .refine(text => !text || text.trim() === text, 'Additional context cannot start or end with whitespace')
        .optional()
        .describe('Any other relevant context'),
})
    .strict()
    .refine(data => data.instructions || (data.scenario && data.context), {
    message: 'Either instructions or both scenario and context must be provided',
});
/**
 * Schema for challenge type metadata
 * Defines specific requirements and characteristics
 */
const typeMetadataSchema = z
    .object({
    timeEstimate: z
        .number()
        .int('Time estimate must be a whole number')
        .min(1, 'Time estimate must be at least 1 minute')
        .max(180, 'Time estimate cannot exceed 180 minutes')
        .describe('Estimated time to complete in minutes'),
    complexity: z
        .number()
        .int('Complexity must be a whole number')
        .min(1, 'Complexity must be at least 1')
        .max(10, 'Complexity cannot exceed 10')
        .describe('Complexity rating from 1-10'),
    skillsRequired: z
        .array(z
        .string()
        .min(1, 'Skill cannot be empty')
        .max(100, 'Skill cannot exceed 100 characters')
        .refine(skill => skill.trim() === skill, 'Skills cannot start or end with whitespace'))
        .min(1, 'At least one skill is required')
        .describe('Required skills for the challenge'),
    isInteractive: z.boolean().describe('Whether the challenge requires user interaction'),
    requiresCode: z.boolean().describe('Whether the challenge requires coding'),
})
    .strict();
/**
 * Schema for challenge format metadata
 * Defines how the challenge should be presented and submitted
 */
const formatMetadataSchema = z
    .object({
    responseFormat: z
        .enum(['text', 'code', 'json', 'markdown', 'multiple-choice'])
        .describe('Required format for challenge responses'),
    wordLimit: z
        .number()
        .int('Word limit must be a whole number')
        .min(10, 'Word limit must be at least 10')
        .max(5000, 'Word limit cannot exceed 5000')
        .optional()
        .describe('Maximum word count for text responses'),
    timeLimit: z
        .number()
        .int('Time limit must be a whole number')
        .min(30, 'Time limit must be at least 30 seconds')
        .max(7200, 'Time limit cannot exceed 7200 seconds (2 hours)')
        .optional()
        .describe('Time limit for challenge completion'),
    allowedResources: z
        .array(z
        .string()
        .min(1, 'Resource cannot be empty')
        .max(200, 'Resource cannot exceed 200 characters')
        .refine(resource => resource.trim() === resource, 'Resources cannot start or end with whitespace'))
        .describe('List of permitted external resources'),
    submissionFormat: z
        .string()
        .min(1, 'Submission format is required and cannot be empty')
        .max(100, 'Submission format cannot exceed 100 characters')
        .refine(format => format.trim() === format, 'Submission format cannot start or end with whitespace')
        .describe('Required format for challenge submissions'),
})
    .strict();
/**
 * Main Challenge schema
 * Comprehensive validation for challenge entities
 */
const ChallengeSchema = z
    .object({
    id: z
        .string()
        .uuid('Challenge ID must be a valid UUID format')
        .describe('Unique identifier for the challenge'),
    title: z
        .string()
        .min(10, 'Title must be at least 10 characters')
        .max(200, 'Title cannot exceed 200 characters')
        .refine(title => title.trim() === title, 'Title cannot start or end with whitespace')
        .describe('Challenge title'),
    description: z
        .string()
        .min(20, 'Description must be at least 20 characters')
        .max(1000, 'Description cannot exceed 1000 characters')
        .refine(desc => desc.trim() === desc, 'Description cannot start or end with whitespace')
        .describe('Brief description of the challenge'),
    content: contentSchema,
    questions: z
        .array(questionSchema)
        .min(1, 'At least one question is required')
        .max(20, 'Cannot have more than 20 questions')
        .describe('Questions included in the challenge'),
    evaluationCriteria: criteriaSchema
        .refine(criteria => Object.keys(criteria).length > 0, {
        message: 'At least one evaluation criterion is required',
    })
        .describe('Criteria for evaluating challenge responses'),
    recommendedResources: z
        .array(resourceSchema)
        .max(10, 'Cannot have more than 10 recommended resources')
        .default([])
        .describe('Supplementary learning resources'),
    challengeType: z
        .string()
        .min(3, 'Challenge type must be at least 3 characters')
        .max(50, 'Challenge type cannot exceed 50 characters')
        .refine(type => type.trim() === type, 'Challenge type cannot start or end with whitespace')
        .describe('Type of challenge'),
    formatType: z
        .string()
        .min(3, 'Format type must be at least 3 characters')
        .max(50, 'Format type cannot exceed 50 characters')
        .refine(type => type.trim() === type, 'Format type cannot start or end with whitespace')
        .describe('Format of the challenge'),
    difficulty: z
        .enum(['beginner', 'intermediate', 'advanced', 'expert'])
        .describe('Difficulty level of the challenge'),
    focusArea: z
        .string()
        .min(3, 'Focus area must be at least 3 characters')
        .max(100, 'Focus area cannot exceed 100 characters')
        .refine(area => area.trim() === area, 'Focus area cannot start or end with whitespace')
        .describe('Primary focus area of the challenge'),
    userId: z
        .string()
        .uuid('User ID must be a valid UUID format')
        .nullable()
        .optional()
        .describe('ID of the user who created the challenge'),
    typeMetadata: typeMetadataSchema,
    formatMetadata: formatMetadataSchema,
    metadata: z.record(z.unknown()).default({}).describe('Additional metadata for the challenge'),
    createdAt: z
        .string()
        .datetime('Created at must be a valid ISO datetime')
        .describe('Creation timestamp'),
    updatedAt: z
        .string()
        .datetime('Updated at must be a valid ISO datetime')
        .describe('Last update timestamp'),
    completedAt: z
        .string()
        .datetime('Completed at must be a valid ISO datetime')
        .nullable()
        .optional()
        .describe('Completion timestamp'),
    responses: z
        .array(z
        .object({
        id: z
            .string()
            .uuid('Response ID must be a valid UUID format')
            .describe('Unique identifier for the response'),
        questionId: z
            .string()
            .uuid('Question ID must be a valid UUID format')
            .describe('ID of the question being answered'),
        response: z
            .string()
            .min(1, 'Response cannot be empty')
            .max(10000, 'Response cannot exceed 10000 characters')
            .describe('User response to a challenge'),
        submittedAt: z
            .string()
            .datetime('Submitted at must be a valid ISO datetime')
            .describe('Submission timestamp'),
        submitted: z.boolean().default(false)
            .describe('Whether the response has been formally submitted'),
    })
        .strict())
        .max(100, 'Cannot have more than 100 responses')
        .optional()
        .default([])
        .describe('Collection of user responses'),
    challengeResponse: z.object({
        userId: z.string().uuid()
            .describe('ID of the user submitting the response'),
        challengeId: z.string().uuid()
            .describe('ID of the challenge being responded to'),
        content: z.union([
            z.string(),
            z.record(z.string(), z.string()),
            z.array(z.string()),
        ])
            .describe('Response content (can be structured based on challenge type)'),
        submitted: z.boolean().default(false)
            .describe('Whether the response has been formally submitted'),
        submittedAt: z.string().datetime().nullable().default(null)
            .describe('Timestamp when the response was submitted'),
    })
        .describe('User response to a challenge'),
})
    .strict();
/**
 * Schema for challenge update operations
 * All fields are optional except those explicitly omitted
 */
const ChallengeUpdateSchema = ChallengeSchema.partial()
    .omit({ id: true, createdAt: true })
    .strict();
/**
 * Schema for challenge search criteria
 * Defines valid search parameters
 */
const ChallengeSearchSchema = z
    .object({
    userId: z
        .string()
        .uuid('Invalid user ID format')
        .optional()
        .describe('Filter by creator user ID'),
    focusArea: z.string().optional().describe('Filter by focus area'),
    difficulty: z
        .enum(['beginner', 'intermediate', 'advanced', 'expert'])
        .optional()
        .describe('Filter by difficulty level'),
    active: z.boolean().optional().describe('Filter by active status'),
    type: z.string().optional().describe('Filter by challenge type'),
    formatType: z.string().optional().describe('Filter by format type'),
    createdAfter: z.string().datetime().optional().describe('Filter by creation date (after)'),
    createdBefore: z.string().datetime().optional().describe('Filter by creation date (before)'),
    completedAt: z
        .union([z.string().datetime(), z.null()])
        .optional()
        .describe('Filter by completion status'),
})
    .strict();
/**
 * Schema for search options
 * Defines pagination and sorting parameters
 */
const SearchOptionsSchema = z
    .object({
    limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .describe('Maximum number of results to return'),
    offset: z.number().int().nonnegative().optional().describe('Number of results to skip'),
    sortBy: z.string().optional().describe('Field to sort by'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    includeResponses: z.boolean().optional().describe('Include response data in results'),
    includeMetadata: z.boolean().optional().describe('Include metadata in results'),
})
    .strict();
export { ChallengeSchema };
export { ChallengeUpdateSchema };
export { ChallengeSearchSchema };
export { SearchOptionsSchema };
export { contentSchema };
export { questionSchema };
export { resourceSchema };
export { criteriaSchema };
export { typeMetadataSchema };
export { formatMetadataSchema };
export { questionOptionSchema };
export default {
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
    questionOptionSchema
};
/**
 * @swagger
 * components:
 *   schemas:
 *     Challenge:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - description
 *         - difficulty
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the challenge
 *         title:
 *           type: string
 *           description: Title of the challenge
 *         description:
 *           type: string
 *           description: Detailed description of the challenge
 *         instructions:
 *           type: string
 *           description: Instructions for completing the challenge
 *         sampleSolution:
 *           type: string
 *           description: Example solution for the challenge
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *           description: Difficulty level of the challenge
 *         type:
 *           type: string
 *           description: Type of challenge (e.g., coding, multiple-choice)
 *         focusArea:
 *           type: string
 *           description: Main focus area of the challenge
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the challenge was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the challenge was last updated
 *         
 *     ChallengeResponse:
 *       type: object
 *       required:
 *         - id
 *         - challengeId
 *         - userId
 *         - response
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the response
 *         challengeId:
 *           type: string
 *           format: uuid
 *           description: ID of the challenge being responded to
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the user submitting the response
 *         response:
 *           type: string
 *           description: User's response to the challenge
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the response was submitted
 */
