import { z } from "zod";
import { logger } from "#app/core/infra/logging/logger.js";
import apiStandards from "#app/core/prompt/common/apiStandards.js";
import messageFormatter from "#app/core/infra/openai/messageFormatter.js";
import AppError from "#app/core/infra/errors/AppError.js";
// import { validatePersonalizedLearningPathParams } from "#app/core/prompt/schemas/learningPathSchema.js"; // Incorrect path - Commented out
'use strict';
const {
  _appendApiInstructions
} = apiStandards;
const {
  formatForResponsesApi
} = messageFormatter;
// Schema definition for personalized learning path prompt parameters
const personalizedLearningPathSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string().optional(),
    skillLevel: z.string().optional(),
    learningPreferences: z.array(z.string()).optional(),
    completedChallenges: z.array(z.object({
      id: z.string(),
      title: z.string(),
      focusArea: z.string(),
      score: z.number().optional(),
      completedAt: z.string().optional()
    })).optional()
  }),
  personalityProfile: z.object({
    dominantTraits: z.array(z.string()).optional(),
    learningStyle: z.string().optional(),
    motivationalFactors: z.array(z.string()).optional()
  }).optional(),
  goals: z.array(z.object({
    id: z.string(),
    description: z.string(),
    priority: z.number().min(1).max(10).optional()
  })),
  availableChallenges: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    focusArea: z.string(),
    difficulty: z.string(),
    prerequisites: z.array(z.string()).optional(),
    estimatedTime: z.number().optional(),
    // in minutes
    concepts: z.array(z.string()).optional()
  })),
  focusAreas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    proficiency: z.number().min(0).max(100).optional(),
    importance: z.number().min(1).max(10).optional()
  })),
  timeConstraints: z.object({
    totalAvailableTime: z.number().optional(),
    // in hours
    maxSessionDuration: z.number().optional(),
    // in minutes
    sessionsPerWeek: z.number().optional()
  }).optional(),
  pathOptions: z.object({
    maxLength: z.number().min(1).default(10),
    includeMilestones: z.boolean().default(true),
    adaptBasedOnPerformance: z.boolean().default(true)
  }).optional()
});
/**
 * Validate the personalized learning path prompt parameters
 * @param {Object} params - Parameters for the prompt
 * @returns {Object} Validated parameters
 * @throws {Error} If parameters are invalid
 */
function validatePersonalizedLearningPathPromptParams(params) {
  // TEMPORARY: Bypass Zod validation
  if (!params || !params.user || !Array.isArray(params.goals) || !Array.isArray(params.availableChallenges) || !Array.isArray(params.focusAreas)) { 
      throw new AppError('Basic validation failed: Missing required fields like user, goals, availableChallenges, or focusAreas', 400, { errorCode: 'VALIDATION_FAILED' });
  }
  return params;
  // Original Zod validation:
  // try {
  //   return personalizedLearningPathSchema.parse(params);
  // } catch (error) {
  //   logger.error('Invalid personalized learning path parameters', {
  //     error: error.message,
  //     params
  //   });
  //   throw new AppError(`Invalid personalized learning path parameters: ${error.message}`, 400, { cause: error, errorCode: 'VALIDATION_FAILED' });
  // }
}
/**
 * Build a personalized learning path prompt
 * @param {Object} params - Parameters for the prompt
 * @returns {string} The constructed prompt
 */
function build(params) {
  try {
    const validatedParams = validatePersonalizedLearningPathPromptParams(params);
    logger.debug('Building personalized learning path prompt', {
      userId: validatedParams.user.id,
      goalCount: validatedParams.goals.length,
      availableChallengeCount: validatedParams.availableChallenges.length
    });
    // Extract key information
    const {
      user,
      personalityProfile,
      goals,
      availableChallenges,
      focusAreas,
      timeConstraints,
      pathOptions
    } = validatedParams;
    // Default path options if not provided
    const options = pathOptions || {
      maxLength: 10,
      includeMilestones: true,
      adaptBasedOnPerformance: true
    };
    // Build the system message
    const systemMessage = `
You are an AI learning path designer specialized in creating personalized learning journeys.
Your task is to create an optimal learning path for a user based on their profile, goals, and available challenges.

USER PROFILE:
- ID: ${user.id}
${user.name ? `- Name: ${user.name}` : ''}
${user.skillLevel ? `- Skill Level: ${user.skillLevel}` : ''}
${user.learningPreferences && user.learningPreferences.length > 0 ? `- Learning Preferences: ${user.learningPreferences.join(', ')}` : ''}

${personalityProfile ? `
PERSONALITY PROFILE:
${personalityProfile.dominantTraits && personalityProfile.dominantTraits.length > 0 ? `- Dominant Traits: ${personalityProfile.dominantTraits.join(', ')}` : ''}
${personalityProfile.learningStyle ? `- Learning Style: ${personalityProfile.learningStyle}` : ''}
${personalityProfile.motivationalFactors && personalityProfile.motivationalFactors.length > 0 ? `- Motivational Factors: ${personalityProfile.motivationalFactors.join(', ')}` : ''}
` : ''}

LEARNING GOALS:
${goals.map((goal, idx) => `${idx + 1}. ${goal.description}${goal.priority ? ` (Priority: ${goal.priority}/10)` : ''}`).join('\n')}

FOCUS AREAS:
${focusAreas.map(area => `- ${area.name}${area.proficiency !== undefined ? ` (Current Proficiency: ${area.proficiency}/100)` : ''}${area.importance ? ` (Importance: ${area.importance}/10)` : ''}`).join('\n')}

${timeConstraints ? `
TIME CONSTRAINTS:
${timeConstraints.totalAvailableTime ? `- Total Available Time: ${timeConstraints.totalAvailableTime} hours` : ''}
${timeConstraints.maxSessionDuration ? `- Max Session Duration: ${timeConstraints.maxSessionDuration} minutes` : ''}
${timeConstraints.sessionsPerWeek ? `- Sessions Per Week: ${timeConstraints.sessionsPerWeek}` : ''}
` : ''}

${user.completedChallenges && user.completedChallenges.length > 0 ? `
COMPLETED CHALLENGES:
${user.completedChallenges.map(challenge => `- ${challenge.title} (Focus Area: ${challenge.focusArea})${challenge.score ? ` (Score: ${challenge.score}/100)` : ''}`).join('\n')}
` : ''}

AVAILABLE CHALLENGES:
${availableChallenges.map(challenge => `
- ID: ${challenge.id}
  Title: ${challenge.title}
  Focus Area: ${challenge.focusArea}
  Difficulty: ${challenge.difficulty}
  ${challenge.prerequisites && challenge.prerequisites.length > 0 ? `Prerequisites: ${challenge.prerequisites.join(', ')}` : ''}
  ${challenge.estimatedTime ? `Estimated Time: ${challenge.estimatedTime} minutes` : ''}
  ${challenge.concepts && challenge.concepts.length > 0 ? `Key Concepts: ${challenge.concepts.join(', ')}` : ''}
  Description: ${challenge.description}
`).join('')}

PATH DESIGN PARAMETERS:
- Maximum Path Length: ${options.maxLength} challenges
- Include Milestones: ${options.includeMilestones ? 'Yes' : 'No'}
- Adapt Based on Performance: ${options.adaptBasedOnPerformance ? 'Yes' : 'No'}

INSTRUCTIONS:
1. Design a personalized learning path that aligns with the user's goals and profile
2. Incorporate challenges that progressively build skills across priority focus areas
3. Consider prerequisites and logical skill progression
4. Balance challenge difficulty to maintain engagement and avoid frustration
5. If milestones are requested, include clear achievement markers
6. Return your learning path in JSON format

YOUR RESPONSE SHOULD BE FORMATTED IN THIS JSON STRUCTURE:
{
  'learningPath': {
    'name': 'Custom path name based on goals',
    'description': 'Brief overview of the path and its purpose',
    'estimatedCompletionTime': 'Total time in hours',
    'challenges': [
      {
        'id': 'challenge-id',
        'title': 'Challenge Title',
        'order': 1,
        'rationale': 'Why this challenge is included at this position',
        'focusArea': 'Primary focus area addressed',
        'difficultyLevel': 'beginner|intermediate|advanced|expert',
        'isMilestone': false
      }
    ],
    'alternatives': [
      {
        'afterChallengeId': 'challenge-id',
        'alternativeChallengeId': 'alternative-challenge-id',
        'alternativeTitle': 'Alternative Challenge Title',
        'whenToUse': 'Condition when to use this alternative (e.g., if struggling)'
      }
    ]
  },
  'focusAreaCoverage': {
    'focusArea1': 40,
    'focusArea2': 60
  },
  'recommendedApproach': 'Overall guidance on how to approach this learning path'
}`;
    // Create a user prompt
    const userPrompt = `Generate a personalized learning path for user ${user.id || 'anonymous'} based on their goals, preferences, and current progress.`;
    // Log success
    logger.debug('Successfully built personalized learning path prompt', {
      userId: user.id
    });
    // Return formatted for Responses API
    return formatForResponsesApi(userPrompt, systemMessage);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      throw error;
    }
    // Re-throw other errors
    logger.error('Unexpected error building personalized learning path prompt', { error: error.message });
    throw error instanceof AppError ? error : new AppError('Failed to build prompt', 500, { cause: error });
  }
}
export { build };
export { validatePersonalizedLearningPathPromptParams };
export default {
  build,
  validatePersonalizedLearningPathPromptParams
};