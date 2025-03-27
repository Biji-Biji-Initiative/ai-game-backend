/**
 * Evaluation Prompt Schema
 * 
 * Defines the schema for validation of evaluation prompt parameters
 * using Zod validation library.
 * 
 * @module evaluationSchema
 * @requires zod
 */

const { z } = require('zod');

/**
 * Challenge schema - subset of fields required for evaluation
 */
const challengeSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  challengeType: z.string().optional(),
  challengeTypeCode: z.string().optional(),
  formatType: z.string().optional(),
  formatTypeCode: z.string().optional(), 
  focusArea: z.string().optional(),
  difficulty: z.string().optional(),
  content: z.union([
    z.string(),
    z.object({
      context: z.string().optional(),
      scenario: z.string().optional(),
      instructions: z.string().optional()
    })
  ]),
  questions: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string(),
      type: z.string().optional()
    })
  ).optional(),
  evaluationCriteria: z.record(
    z.object({
      description: z.string().optional(),
      weight: z.number().optional()
    })
  ).optional(),
  // Allow any additional fields
  typeMetadata: z.record(z.any()).optional(),
  formatMetadata: z.record(z.any()).optional()
}).passthrough();

/**
 * User response schema - allows string or array of structured responses
 */
const userResponseSchema = z.union([
  z.string(),
  z.array(
    z.object({
      questionId: z.string().optional(),
      answer: z.string()
    })
  )
]);

/**
 * User schema - defines user information needed for personalized evaluation
 */
const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().optional(),
  fullName: z.string().optional(),
  professionalTitle: z.string().optional(),
  dominantTraits: z.array(z.string()).optional(),
  focusAreas: z.array(z.string()).optional(),
  skillLevel: z.string().optional(),
  learningGoals: z.array(z.string()).optional(),
  completedChallenges: z.number().optional()
}).passthrough();

/**
 * Evaluation history schema - for growth tracking
 */
const evaluationHistorySchema = z.object({
  previousScore: z.number().optional(),
  previousCategoryScores: z.record(z.number()).optional(),
  consistentStrengths: z.array(z.string()).optional(),
  persistentWeaknesses: z.array(z.string()).optional()
}).passthrough();

/**
 * Options schema - defines additional evaluation options
 */
const optionsSchema = z.object({
  threadId: z.string().optional(),
  previousResponseId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  model: z.string().optional(),
  responseFormat: z.enum(['json', 'text']).optional(),
  challengeTypeName: z.string().optional(),
  formatTypeName: z.string().optional(),
  focusArea: z.string().optional(),
  typeMetadata: z.record(z.any()).optional(),
  formatMetadata: z.record(z.any()).optional()
}).passthrough();

/**
 * Complete evaluation prompt parameters schema
 */
const evaluationPromptSchema = z.object({
  challenge: challengeSchema,
  userResponse: userResponseSchema,
  user: userSchema.optional(),
  evaluationHistory: evaluationHistorySchema.optional(),
  options: optionsSchema.optional()
});

/**
 * Validate evaluation prompt parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validated and potentially transformed parameters
 * @throws {Error} If validation fails
 */
function validateEvaluationPromptParams(params) {
  try {
    return evaluationPromptSchema.parse(params);
  } catch (error) {
    // Transform Zod validation errors to more user-friendly format
    if (error.errors) {
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      
      throw new Error(`Evaluation prompt parameter validation failed: ${formattedErrors}`);
    }
    throw error;
  }
}

module.exports = {
  evaluationPromptSchema,
  validateEvaluationPromptParams
}; 