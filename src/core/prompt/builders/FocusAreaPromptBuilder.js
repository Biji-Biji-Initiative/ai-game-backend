/**
 * Focus Area Prompt Builder
 * 
 * Specialized builder for generating focus area prompts that provide
 * personalized learning recommendations based on a user's profile and progress.
 * 
 * @module FocusAreaPromptBuilder
 * @requires logger
 * @requires apiStandards
 * @requires focusAreaSchema
 */

const { logger } = require('../../../core/infra/logging/logger');
const { 
  appendApiStandards, 
  getStructuredOutputInstructions,
  getResponsesApiInstruction
} = require('../common/apiStandards');
const { validateFocusAreaPromptParams } = require('../schemas/focusAreaSchema');

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
   * @param {Object} [params.options] - Additional prompt options
   * @returns {string} Generated focus area prompt
   * @throws {Error} If required parameters are missing
   */
  static build(params) {
    try {
      // Validate parameters against schema
      const validatedParams = validateFocusAreaPromptParams(params);
      
      const { user, challengeHistory = [], progressData = {}, options = {} } = validatedParams;
      
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
  "focusAreas": [
    {
      "name": "Focus area name",
      "description": "Detailed description of the focus area",
      "priorityLevel": "high | medium | low",
      "rationale": "Explanation of why this focus area is important for this user",
      "improvementStrategies": [
        "Strategy 1 to improve in this focus area",
        "Strategy 2 to improve in this focus area"
      ],
      "recommendedChallengeTypes": [
        "challenge type 1",
        "challenge type 2"
      ]
    }
  ]
}\n\n`;
      
      // Add Responses API instruction
      prompt += `\n\n${getResponsesApiInstruction()}`;
      
      // Ensure API standards are applied
      prompt = appendApiStandards(prompt);
      
      return prompt.trim();
    } catch (error) {
      log('error', 'Error building focus area prompt', { 
        error: error.message,
        stack: error.stack
      });
      throw error;
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

module.exports = FocusAreaPromptBuilder;
