import { logger } from "#app/core/infra/logging/logger.js";
import { appendApiStandards, getStructuredOutputInstructions, getResponsesApiInstruction } from "#app/core/prompt/common/apiStandards.js";
import { validateFocusAreaPromptParams } from "#app/core/prompt/schemas/focusAreaSchema.js";
import { PromptConstructionError } from "#app/core/prompt/common/errors.js";
import messageFormatter from "#app/core/infra/openai/messageFormatter.js";
'use strict';
const {
  formatForResponsesApi
} = messageFormatter;
/**
 * Helper function for logging if logger exists
 */
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
    logger[level](message, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](message, meta);
  }
}
/**
 * Class responsible for building personalized focus area prompts
 */
class FocusAreaPromptBuilder {
  /**
   * Build a focus area prompt based on user traits, challenge history, and progress data
   * @param {Object} params - Parameters for building the prompt
   * @param {Object} params.user - User traits and profile data
   * @param {Array} [params.challengeHistory] - User's challenge history
   * @param {Object} [params.progressData] - User's learning progress data
   * @param {Object} [params.personalityProfile] - User's personality profile
   * @param {Object} [params.options] - Additional prompt options
   * @returns {Object} Formatted input and instructions for Responses API
   * @throws {PromptConstructionError} If required parameters are missing
   */
  static build(params) {
    try {
      // Validate parameters against schema
      const validatedParams = validateFocusAreaPromptParams(params);
      const {
        user,
        challengeHistory = [],
        progressData = {},
        personalityProfile = {},
        options = {}
      } = validatedParams;
      // Extract key parameters
      const traits = user.traits || {};
      const attitudes = user.attitudes || {};
      const professionalTitle = user.professional_title || '';
      const location = user.location || '';
      const creativeVariation = options.creativeVariation || 0.7;
      const focusAreaCount = options.count || 3;
      // Build the focus area prompt
      let prompt = `### FOCUS AREA GENERATION TASK\n\n`;
      prompt += `Generate ${focusAreaCount} personalized focus areas for effective AI communication based on the user's profile and history. Each focus area should represent a specific skill or topic the user should concentrate on to improve their interaction with AI systems.\n\n`;
      // Add user profile section
      prompt += `### USER PROFILE\n`;
      if (professionalTitle) {
        prompt += `Professional Title: ${professionalTitle}\n`;
      }
      if (location) {
        prompt += `Location: ${location}\n`;
      }
      // Add personality traits if available
      if (Object.keys(traits).length > 0) {
        prompt += `\nPersonality Traits (scale 1-10):\n`;
        Object.entries(traits).forEach(([trait, score]) => {
          prompt += `- ${trait}: ${score}\n`;
        });
      }
      // Add attitudes toward AI if available
      if (Object.keys(attitudes).length > 0) {
        prompt += `\nAttitudes Toward AI (scale 1-10):\n`;
        Object.entries(attitudes).forEach(([attitude, score]) => {
          prompt += `- ${attitude}: ${score}\n`;
        });
      }
      prompt += `\n`;
      // Add challenge history if available
      if (challengeHistory && challengeHistory.length > 0) {
        prompt += `### CHALLENGE HISTORY\n`;
        challengeHistory.forEach((challenge, index) => {
          prompt += `Challenge ${index + 1}:\n`;
          if (challenge.focus_area) {
            prompt += `- Focus Area: ${challenge.focus_area}\n`;
          }
          if (challenge.challengeType) {
            prompt += `- Type: ${challenge.challengeType}\n`;
          }
          if (challenge.score !== undefined) {
            prompt += `- Score: ${challenge.score}\n`;
          }
          if (challenge.strengths && challenge.strengths.length > 0) {
            prompt += `- Strengths: ${challenge.strengths.join(', ')}\n`;
          }
          if (challenge.areasForImprovement && challenge.areasForImprovement.length > 0) {
            prompt += `- Areas for Improvement: ${challenge.areasForImprovement.join(', ')}\n`;
          }
          prompt += `\n`;
        });
      }
      // Add progress data if available
      if (progressData && Object.keys(progressData).length > 0) {
        prompt += `### LEARNING PROGRESS\n`;
        if (progressData.completedChallenges) {
          prompt += `Completed Challenges: ${progressData.completedChallenges}\n`;
        }
        if (progressData.averageScore !== undefined) {
          prompt += `Average Score: ${progressData.averageScore}\n`;
        }
        if (progressData.strengths && progressData.strengths.length > 0) {
          prompt += `Strengths: ${progressData.strengths.join(', ')}\n`;
        }
        if (progressData.weaknesses && progressData.weaknesses.length > 0) {
          prompt += `Areas Needing Improvement: ${progressData.weaknesses.join(', ')}\n`;
        }
        if (progressData.skillLevels && Object.keys(progressData.skillLevels).length > 0) {
          prompt += `\nSkill Levels (scale 1-10):\n`;
          Object.entries(progressData.skillLevels).forEach(([skill, level]) => {
            prompt += `- ${skill}: ${level}\n`;
          });
        }
        if (progressData.learningGoals && progressData.learningGoals.length > 0) {
          prompt += `\nLearning Goals: ${progressData.learningGoals.join(', ')}\n`;
        }
        prompt += `\n`;
      }
      // Add creativity guidance
      prompt += `### CREATIVITY GUIDANCE\n`;
      prompt += `- Variation level: ${Math.floor(creativeVariation * 100)}%\n`;
      if (creativeVariation > 0.8) {
        prompt += `- Generate highly creative and unique focus areas beyond standard communication skills.\n`;
      } else if (creativeVariation > 0.6) {
        prompt += `- Balance creativity with practical communication skills.\n`;
      } else {
        prompt += `- Focus on foundational communication skills with moderate creativity.\n`;
      }
      prompt += `\n`;
      // Add personalization guidance
      prompt += `### PERSONALIZATION GUIDANCE\n`;
      prompt += `- Focus areas should be tailored specifically to this user's profile, traits, and history.\n`;
      prompt += `- Consider the user's professional context when suggesting focus areas.\n`;
      prompt += `- Include both strengths to leverage and areas that need improvement.\n`;
      prompt += `- Ensure the focus areas are diverse and cover different aspects of AI communication.\n`;
      if (challengeHistory && challengeHistory.length > 0) {
        prompt += `- Reference patterns from the user's challenge history when relevant.\n`;
      }
      if (progressData && progressData.learningGoals && progressData.learningGoals.length > 0) {
        prompt += `- Align focus areas with the user's stated learning goals where appropriate.\n`;
      }
      prompt += `\n`;
      // Add response format instructions
      prompt += `### RESPONSE FORMAT\n`;
      prompt += `Return the focus areas as a JSON object with the following structure:\n\n`;
      prompt += `{
  'focusAreas': [
    {
      'name': 'Focus area name',
      'description': 'Detailed description of the focus area',
      'priorityLevel': 'high | medium | low',
      'rationale': 'Explanation of why this focus area is important for this user',
      'improvementStrategies': [
        'Strategy 1 to improve in this focus area',
        'Strategy 2 to improve in this focus area'
      ],
      'recommendedChallengeTypes': [
        'challenge type 1',
        'challenge type 2'
      ]
    }
  ]
}\n\n`;
      // Add Responses API instruction
      prompt += `\n\n${getResponsesApiInstruction()}`;
      // Ensure API standards are applied
      prompt = appendApiStandards(prompt);
      // Build dynamic system message based on user context
      const systemMessage = FocusAreaPromptBuilder.buildDynamicSystemMessage(user, progressData, personalityProfile, options);
      // Format for the Responses API and return
      return formatForResponsesApi(prompt.trim(), systemMessage);
    } catch (error) {
      log('error', 'Error building focus area prompt', {
        error: error.message,
        stack: error.stack
      });
      throw new PromptConstructionError(`Failed to build focus area prompt: ${error.message}`, {
        originalError: error
      });
    }
  }
  /**
   * Build a dynamic system message based on user context
   * @param {Object} user - User profile data
   * @param {Object} progressData - User's progress data
   * @param {Object} personalityProfile - User's personality profile
   * @param {Object} options - Additional options
   * @returns {string} Dynamic system message
   * @private
   */
  static buildDynamicSystemMessage(user = {}, progressData = {}, personalityProfile = {}, options = {}) {
    try {
      // Start with base system message
      let systemMsg = `You are an AI learning strategist specializing in personalized focus area recommendations `;
      // Add professional context if available
      if (user.professional_title) {
        systemMsg += `for ${user.professional_title}s. `;
      } else {
        systemMsg += `for AI communication skills. `;
      }
      // Add progress-based context
      if (progressData.completedChallenges && progressData.completedChallenges > 0) {
        if (progressData.averageScore !== undefined) {
          if (progressData.averageScore > 80) {
            systemMsg += `The user has demonstrated strong performance (${progressData.averageScore}% average) across ${progressData.completedChallenges} challenges. Focus on advanced skill development. `;
          } else if (progressData.averageScore > 60) {
            systemMsg += `The user has shown moderate performance (${progressData.averageScore}% average) across ${progressData.completedChallenges} challenges. Recommend areas for skill refinement. `;
          } else {
            systemMsg += `The user has completed ${progressData.completedChallenges} challenges with room for improvement (${progressData.averageScore}% average). Prioritize foundational skill development. `;
          }
        } else {
          systemMsg += `The user has completed ${progressData.completedChallenges} challenges. `;
        }
      } else {
        systemMsg += `The user is at the beginning of their learning journey. Recommend foundational focus areas. `;
      }
      // Add trait-based adaptations
      if (user.traits) {
        const traits = Object.entries(user.traits || {});
        // Check for high analytical traits
        const analyticalTraits = traits.filter(([trait, score]) => ['analytical', 'logical', 'systematic'].includes(trait.toLowerCase()) && score > 7);
        if (analyticalTraits.length > 0) {
          systemMsg += `Emphasize structured, systematic approaches in your recommendations. `;
        }
        // Check for high creative traits
        const creativeTraits = traits.filter(([trait, score]) => ['creative', 'innovative', 'imaginative'].includes(trait.toLowerCase()) && score > 7);
        if (creativeTraits.length > 0) {
          systemMsg += `Include creative problem-solving and innovative approaches. `;
        }
      }
      // Adapt to personality profile if available
      if (personalityProfile.communicationStyle) {
        if (personalityProfile.communicationStyle === 'direct') {
          systemMsg += `Present focus areas in a direct, straightforward manner. `;
        } else if (personalityProfile.communicationStyle === 'collaborative') {
          systemMsg += `Frame focus areas in terms of collaborative learning opportunities. `;
        } else if (personalityProfile.communicationStyle === 'exploratory') {
          systemMsg += `Suggest focus areas that encourage exploration and discovery. `;
        }
      }
      // Add general focus area guidance
      systemMsg += `\n\nYour focus area recommendations should be specific, actionable, and personalized to the user's context, learning history, and goals. `;
      systemMsg += `Include a clear rationale for each focus area and practical strategies for improvement.`;
      // Add output format instructions
      systemMsg += `\n\nYour response MUST follow the exact JSON structure specified in the prompt. `;
      systemMsg += `Ensure all required fields are included and properly formatted.`;
      return systemMsg;
    } catch (error) {
      log('error', 'Error building dynamic system message', {
        error: error.message,
        stack: error.stack
      });
      // Return a basic system message as fallback
      return 'You are an AI learning strategist providing personalized focus area recommendations. Return your response as JSON according to the format specified in the prompt.';
    }
  }
  /**
   * Factory method to create a builder with default settings
   * @returns {Function} Configured build function
   */
  static createBuilder() {
    return FocusAreaPromptBuilder.build;
  }
}
export default FocusAreaPromptBuilder;