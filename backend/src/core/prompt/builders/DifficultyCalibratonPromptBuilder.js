import { z } from "zod";
import { logger } from "#app/core/infra/logging/logger.js";
import apiStandards from "#app/core/prompt/common/apiStandards.js";
import messageFormatter from "#app/core/infra/openai/messageFormatter.js";
import AppError from "#app/core/infra/errors/AppError.js";
// import { validateDifficultyCalibrationParams } from "#app/core/prompt/schemas/calibrationSchema.js"; // Incorrect path - Commented out
'use strict';
const {
  _appendApiInstructions
} = apiStandards;
const {
  formatForResponsesApi
} = messageFormatter;
// Schema definition for difficulty calibration prompt parameters
const difficultyCalibratonSchema = z.object({
  challenges: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    currentDifficulty: z.string(),
    completionStats: z.object({
      totalAttempts: z.number(),
      successRate: z.number(),
      averageScore: z.number().optional(),
      averageTimeToComplete: z.number().optional()
    }).optional()
  })),
  skillLevels: z.array(z.object({
    level: z.string(),
    description: z.string(),
    expectedSuccessRate: z.number().optional()
  })).optional(),
  targetAudience: z.object({
    skillLevel: z.string(),
    technicalBackground: z.array(z.string()).optional(),
    priorKnowledge: z.array(z.string()).optional()
  }).optional(),
  difficultyLevels: z.array(z.object({
    level: z.string(),
    description: z.string(),
    targetSuccessRate: z.number().optional()
  })),
  calibrationGoals: z.object({
    ensureProgression: z.boolean().default(true),
    normalizeRatings: z.boolean().default(true),
    balanceSuccessRates: z.boolean().default(true)
  }).optional()
});
/**
 * Validate the difficulty calibration prompt parameters
 * @param {Object} params - Parameters for the prompt
 * @returns {Object} Validated parameters
 * @throws {Error} If parameters are invalid
 */
function validateDifficultyCalibratonPromptParams(params) {
  // TEMPORARY: Bypass Zod validation
  if (!params || !Array.isArray(params.challenges) || !Array.isArray(params.difficultyLevels)) { 
      throw new AppError('Basic validation failed: Missing challenges or difficultyLevels', 400, { errorCode: 'VALIDATION_FAILED' });
  }
  return params;
  // Original Zod validation:
  // try {
  //   return difficultyCalibratonSchema.parse(params);
  // } catch (error) {
  //   logger.error('Invalid difficulty calibration parameters', {
  //     error: error.message,
  //     params
  //   });
  //   throw new AppError(`Invalid difficulty calibration parameters: ${error.message}`, 400, { cause: error, errorCode: 'VALIDATION_FAILED' }); // Use AppError
  // }
}
/**
 * Build a difficulty calibration prompt
 * @param {Object} params - Parameters for the prompt
 * @returns {string} The constructed prompt
 */
function build(params) {
  try {
    const validatedParams = validateDifficultyCalibratonPromptParams(params);
    logger.debug('Building difficulty calibration prompt', {
      challengeCount: validatedParams.challenges.length
    });
    // Extract key information
    const {
      challenges,
      skillLevels,
      targetAudience,
      difficultyLevels,
      calibrationGoals
    } = validatedParams;
    // Default calibration goals if not provided
    const goals = calibrationGoals || {
      ensureProgression: true,
      normalizeRatings: true,
      balanceSuccessRates: true
    };
    // Build the system message
    const systemMessage = `
You are a learning difficulty calibration system specialized in ensuring appropriate and consistent challenge difficulty levels.
Your task is to evaluate and calibrate the difficulty ratings of a set of challenges to ensure proper progression paths.

CURRENT CHALLENGES:
${challenges.map(challenge => `
- ID: ${challenge.id}
  Title: ${challenge.title}
  Current Difficulty: ${challenge.currentDifficulty}
  ${challenge.completionStats ? `
  Stats:
    Total Attempts: ${challenge.completionStats.totalAttempts}
    Success Rate: ${challenge.completionStats.successRate}%
    ${challenge.completionStats.averageScore ? `Average Score: ${challenge.completionStats.averageScore}/100` : ''}
    ${challenge.completionStats.averageTimeToComplete ? `Average Completion Time: ${challenge.completionStats.averageTimeToComplete} minutes` : ''}
  ` : ''}
  Description: ${challenge.description}
`).join('')}

DIFFICULTY LEVELS:
${difficultyLevels.map(level => `
- Level: ${level.level}
  Description: ${level.description}
  ${level.targetSuccessRate ? `Target Success Rate: ${level.targetSuccessRate}%` : ''}
`).join('')}

${skillLevels ? `
SKILL LEVELS:
${skillLevels.map(skill => `
- Level: ${skill.level}
  Description: ${skill.description}
  ${skill.expectedSuccessRate ? `Expected Success Rate: ${skill.expectedSuccessRate}%` : ''}
`).join('')}
` : ''}

${targetAudience ? `
TARGET AUDIENCE:
- Skill Level: ${targetAudience.skillLevel}
${targetAudience.technicalBackground ? `- Technical Background: ${targetAudience.technicalBackground.join(', ')}` : ''}
${targetAudience.priorKnowledge ? `- Prior Knowledge: ${targetAudience.priorKnowledge.join(', ')}` : ''}
` : ''}

CALIBRATION GOALS:
${goals.ensureProgression ? '- Ensure clear progression path from easier to harder challenges' : ''}
${goals.normalizeRatings ? '- Normalize difficulty ratings across all challenges' : ''}
${goals.balanceSuccessRates ? '- Balance success rates to meet targets for each difficulty level' : ''}

INSTRUCTIONS:
1. Review each challenge's current difficulty level
2. Analyze completion statistics (if available)
3. Consider the challenge description and required knowledge
4. Recommend adjusted difficulty levels as needed
5. Provide justification for any changes
6. Return your analysis in JSON format

YOUR RESPONSE SHOULD BE FORMATTED IN THIS JSON STRUCTURE:
{
  'calibratedChallenges': [
    {
      'id': 'challenge-id',
      'currentDifficulty': 'current-level',
      'recommendedDifficulty': 'recommended-level',
      'justification': 'Reason for the recommendation',
      'expectedSuccessRate': 75
    }
  ],
  'difficultyDistribution': {
    'beginner': 30,
    'intermediate': 40,
    'advanced': 20,
    'expert': 10
  },
  'progressionPaths': [
    {
      'name': 'Path name (e.g., 'Core Concepts')',
      'challengeSequence': ['challenge-id-1', 'challenge-id-2']
    }
  ],
  'calibrationSummary': 'Overall assessment of the difficulty distribution'
}`;
    // Create a user prompt summarizing the request
    const userPrompt = `Please calibrate the difficulty levels for ${challenges.length} challenges according to the specified difficulty levels and goals. Ensure consistent progression and appropriate challenge levels based on the provided statistics and descriptions.`;
    // Log success
    logger.debug('Successfully built difficulty calibration prompt', {
      challengeCount: challenges.length
    });
    // Return formatted for Responses API
    return formatForResponsesApi(userPrompt, systemMessage);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 400) {
      throw error;
    }
    // Re-throw other errors
    logger.error('Unexpected error building difficulty calibration prompt', { error: error.message });
    throw error instanceof AppError ? error : new AppError('Failed to build prompt', 500, { cause: error });
  }
}
export { build };
export { validateDifficultyCalibratonPromptParams };
export default {
  build,
  validateDifficultyCalibratonPromptParams
};