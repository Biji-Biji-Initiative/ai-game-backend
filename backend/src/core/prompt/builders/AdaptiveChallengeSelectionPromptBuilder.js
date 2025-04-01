import { z } from "zod";
import { logger } from "#app/core/infra/logging/logger.js";
import apiStandards from "#app/core/prompt/common/apiStandards.js";
import messageFormatter from "#app/core/infra/openai/messageFormatter.js";
'use strict';
const {
  _appendApiInstructions
} = apiStandards;
const {
  formatForResponsesApi
} = messageFormatter;
// Schema definition for adaptive challenge selection prompt parameters
const adaptiveChallengeSelectionSchema = z.object({
  user: z.object({
    id: z.string(),
    skillLevel: z.string().optional(),
    learningPreferences: z.array(z.string()).optional(),
    difficultyPreference: z.string().optional(),
    recentChallenges: z.array(z.object({
      id: z.string(),
      title: z.string(),
      difficultyLevel: z.string(),
      completedAt: z.string(),
      score: z.number().optional()
    })).optional()
  }),
  focusAreas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    proficiency: z.number().optional()
  })).optional(),
  personalityProfile: z.object({
    dominantTraits: z.array(z.string()).optional(),
    aiAttitudes: z.record(z.number()).optional()
  }).optional(),
  preferences: z.object({
    subjectMatter: z.array(z.string()).optional(),
    challengeTypes: z.array(z.string()).optional(),
    excludedTopics: z.array(z.string()).optional()
  }).optional(),
  progressMetrics: z.object({
    completionRate: z.number().optional(),
    averageScore: z.number().optional(),
    improvementRate: z.number().optional(),
    strengthAreas: z.array(z.string()).optional(),
    weaknessAreas: z.array(z.string()).optional()
  }).optional(),
  count: z.number().min(1).max(10).default(3)
});
/**
 * Validate the adaptive challenge selection prompt parameters
 * @param {Object} params - Parameters for the prompt
 * @returns {Object} Validated parameters
 * @throws {Error} If parameters are invalid
 */
function validateAdaptiveChallengeSelectionPromptParams(params) {
  try {
    return adaptiveChallengeSelectionSchema.parse(params);
  } catch (error) {
    logger.error('Invalid adaptive challenge selection parameters', {
      error: error.message,
      params
    });
    throw new Error(`Invalid adaptive challenge selection parameters: ${error.message}`);
  }
}
/**
 * Build an adaptive challenge selection prompt
 * @param {Object} params - Parameters for the prompt
 * @returns {string} The constructed prompt
 */
function build(params) {
  // Validate parameters
  const validatedParams = validateAdaptiveChallengeSelectionPromptParams(params);
  logger.debug('Building adaptive challenge selection prompt', {
    userId: validatedParams.user.id,
    requestedCount: validatedParams.count
  });
  // Extract key user information
  const {
    user,
    focusAreas,
    personalityProfile,
    preferences,
    progressMetrics,
    count
  } = validatedParams;
  // Build the system message
  const systemMessage = `
You are an adaptive learning algorithm specialized in selecting personalized challenges for AI and LLM conceptual understanding.
Your task is to select the most appropriate challenges for a user based on their profile, performance history, and learning preferences.

CONTEXT:
- User ID: ${user.id}
${user.skillLevel ? `- Skill Level: ${user.skillLevel}` : ''}
${user.learningPreferences ? `- Learning Preferences: ${user.learningPreferences.join(', ')}` : ''}
${user.difficultyPreference ? `- Difficulty Preference: ${user.difficultyPreference}` : ''}

${focusAreas && focusAreas.length > 0 ? `FOCUS AREAS:\n${focusAreas.map(area => `- ${area.name}${area.proficiency ? ` (Proficiency: ${area.proficiency}/100)` : ''}`).join('\n')}` : ''}

${personalityProfile ? `PERSONALITY PROFILE:
${personalityProfile.dominantTraits && personalityProfile.dominantTraits.length > 0 ? `- Dominant Traits: ${personalityProfile.dominantTraits.join(', ')}` : ''}
${personalityProfile.aiAttitudes ? `- AI Attitudes: ${Object.entries(personalityProfile.aiAttitudes).map(([key, value]) => `${key}: ${value}`).join(', ')}` : ''}` : ''}

${preferences ? `PREFERENCES:
${preferences.subjectMatter && preferences.subjectMatter.length > 0 ? `- Subject Matter Interests: ${preferences.subjectMatter.join(', ')}` : ''}
${preferences.challengeTypes && preferences.challengeTypes.length > 0 ? `- Preferred Challenge Types: ${preferences.challengeTypes.join(', ')}` : ''}
${preferences.excludedTopics && preferences.excludedTopics.length > 0 ? `- Excluded Topics: ${preferences.excludedTopics.join(', ')}` : ''}` : ''}

${progressMetrics ? `PROGRESS METRICS:
${typeof progressMetrics.completionRate === 'number' ? `- Completion Rate: ${progressMetrics.completionRate}%` : ''}
${typeof progressMetrics.averageScore === 'number' ? `- Average Score: ${progressMetrics.averageScore}/100` : ''}
${typeof progressMetrics.improvementRate === 'number' ? `- Improvement Rate: ${progressMetrics.improvementRate}%` : ''}
${progressMetrics.strengthAreas && progressMetrics.strengthAreas.length > 0 ? `- Strength Areas: ${progressMetrics.strengthAreas.join(', ')}` : ''}
${progressMetrics.weaknessAreas && progressMetrics.weaknessAreas.length > 0 ? `- Weakness Areas: ${progressMetrics.weaknessAreas.join(', ')}` : ''}` : ''}

${user.recentChallenges && user.recentChallenges.length > 0 ? `RECENTLY COMPLETED CHALLENGES:
${user.recentChallenges.map(challenge => `- ${challenge.title} (Difficulty: ${challenge.difficultyLevel}, Completed: ${challenge.completedAt}${challenge.score ? `, Score: ${challenge.score}/100` : ''})`).join('\n')}` : ''}

INSTRUCTIONS:
1. Select ${count} unique challenges that would be most beneficial for this user's growth
2. Focus on addressing their weak areas while building on their strengths
3. Consider their preferences, personality traits, and learning style
4. Ensure an appropriate difficulty progression
5. Vary challenge types to maintain engagement
6. Return your selections in JSON format

YOUR RESPONSE SHOULD BE FORMATTED IN THIS JSON STRUCTURE:
{
  'selectedChallenges': [
    {
      'title': 'Challenge Title',
      'description': 'Brief description of the challenge',
      'difficulty': 'beginner|intermediate|advanced|expert',
      'topicsAddressed': ['topic1', 'topic2'],
      'expectedLearningOutcomes': ['outcome1', 'outcome2'],
      'recommendationReason': 'Explanation of why this challenge was selected for the user',
      'estimatedCompletionTime': 'Time in minutes'
    }
  ],
  'adaptationStrategy': 'Brief explanation of overall adaptation strategy for this user',
  'recommendedFocusAreas': ['area1', 'area2']
}`;
  // Create a user prompt
  const userPrompt = `Select the most appropriate challenges for user ${user.id || 'anonymous'} based on their profile and history.`;
  // Log success
  logger.debug('Successfully built adaptive challenge selection prompt', {
    userId: user.id
  });
  // Return formatted for Responses API
  return formatForResponsesApi(userPrompt, systemMessage);
}
export { build };
export { validateAdaptiveChallengeSelectionPromptParams };
export default {
  build,
  validateAdaptiveChallengeSelectionPromptParams
};