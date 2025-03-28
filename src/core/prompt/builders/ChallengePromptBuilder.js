/**
 * Challenge Prompt Builder
 * 
 * Specialized builder for generating challenge prompts that are
 * adaptive to user skills, preferences, and learning progress.
 * 
 * @module ChallengePromptBuilder
 * @requires logger
 * @requires apiStandards
 * @requires challengeSchema
 */

const { logger } = require('../../../core/infra/logging/logger');
const { 
  appendApiStandards, 
  getStructuredOutputInstructions,
  getResponsesApiInstruction
} = require('../common/apiStandards');
const { validateChallengePromptParams } = require('../schemas/challengeSchema');
const { PromptConstructionError } = require('../common/errors');

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
 * Class responsible for building adaptive challenge prompts
 */
class ChallengePromptBuilder {
  /**
   * Build a challenge prompt based on user profile, parameters, and game state
   * @param {Object} params - Parameters for building the prompt
   * @param {Object} params.user - User profile data
   * @param {Object} params.challengeParams - Challenge type and format parameters
   * @param {Object} [params.personalityProfile] - User's personality profile
   * @param {Object} [params.gameState] - Current game state for adaptive challenge generation
   * @param {Object} [params.options] - Additional prompt options
   * @returns {Object} Generated challenge prompt with system message
   * @throws {PromptConstructionError} If required parameters are missing
   */
  static build(params) {
    try {
      // Validate parameters against schema
      const validatedParams = validateChallengePromptParams(params);
      
      const { 
        user, 
        challengeParams, 
        personalityProfile = {}, 
        gameState = {}, 
        options = {} 
      } = validatedParams;
      
      // Extract key parameters
      const challengeType = challengeParams.challengeType || challengeParams.challengeTypeCode || 'standard';
      const formatType = challengeParams.formatType || challengeParams.formatTypeCode || 'open-ended';
      const difficulty = challengeParams.difficulty || 'intermediate';
      const focusArea = challengeParams.focusArea || 'general';
      const creativeVariation = options.creativeVariation || 0.7;
      
      // Build the challenge prompt
      let prompt = `### CHALLENGE GENERATION TASK\n\n`;
      prompt += `Generate a challenge for the user based on their profile and the specified parameters.\n\n`;
      
      // Add user profile section
      prompt += `### USER PROFILE\n`;
      prompt += `Name: ${user.fullName || 'Anonymous'}\n`;
      prompt += `Professional Title: ${user.professionalTitle || 'Professional'}\n`;
      
      if (user.focusAreas && Array.isArray(user.focusAreas) && user.focusAreas.length > 0) {
        prompt += `Focus Areas: ${user.focusAreas.join(', ')}\n`;
      }
      
      if (user.dominantTraits && Array.isArray(user.dominantTraits) && user.dominantTraits.length > 0) {
        prompt += `Dominant Traits: ${user.dominantTraits.join(', ')}\n`;
      }
      
      if (user.skillLevel) {
        prompt += `Skill Level: ${user.skillLevel}\n`;
      }
      
      if (user.learningGoals && Array.isArray(user.learningGoals) && user.learningGoals.length > 0) {
        prompt += `Learning Goals: ${user.learningGoals.join(', ')}\n`;
      }
      
      prompt += `\n`;
      
      // Add challenge parameters section
      prompt += `### CHALLENGE PARAMETERS\n`;
      prompt += `Type: ${challengeType}\n`;
      prompt += `Format: ${formatType}\n`;
      prompt += `Difficulty: ${difficulty}\n`;
      prompt += `Focus Area: ${focusArea}\n`;
      
      if (challengeParams.topic) {
        prompt += `Topic: ${challengeParams.topic}\n`;
      }
      
      if (challengeParams.keywords && Array.isArray(challengeParams.keywords)) {
        prompt += `Keywords: ${challengeParams.keywords.join(', ')}\n`;
      }
      
      prompt += `\n`;
      
      // Add game state context if available
      if (gameState && Object.keys(gameState).length > 0) {
        prompt += `### GAME STATE CONTEXT\n`;
        
        if (gameState.currentLevel) {
          prompt += `Current Level: ${gameState.currentLevel}\n`;
        }
        
        if (gameState.progress) {
          prompt += `Progress: ${gameState.progress}%\n`;
        }
        
        if (gameState.streakCount) {
          prompt += `Streak Count: ${gameState.streakCount}\n`;
        }
        
        // Add recent challenges if available
        if (gameState.recentChallenges && Array.isArray(gameState.recentChallenges) && gameState.recentChallenges.length > 0) {
          prompt += `\nRecent Challenges:\n`;
          gameState.recentChallenges.forEach((c, idx) => {
            prompt += `${idx + 1}. ${c.title} (${c.challengeType || 'Unknown type'}, ${c.difficulty || 'Not specified'})\n`;
          });
        }
        
        // Add strengths and areas for improvement if available
        if (gameState.strengths && Array.isArray(gameState.strengths) && gameState.strengths.length > 0) {
          prompt += `\nUser Strengths: ${gameState.strengths.join(', ')}\n`;
        }
        
        if (gameState.areasForImprovement && Array.isArray(gameState.areasForImprovement) && gameState.areasForImprovement.length > 0) {
          prompt += `Areas for Improvement: ${gameState.areasForImprovement.join(', ')}\n`;
        }
        
        prompt += `\n`;
      }
      
      // Add creativity guidance
      prompt += `### CREATIVITY GUIDANCE\n`;
      prompt += `- Variation level: ${Math.floor(creativeVariation * 100)}%\n`;
      
      if (creativeVariation > 0.8) {
        prompt += `- Generate a highly creative and unique challenge.\n`;
      } else if (creativeVariation > 0.6) {
        prompt += `- Balance creativity with structured learning.\n`;
      } else {
        prompt += `- Focus on foundational concepts with moderate creativity.\n`;
      }
      
      if (options.allowDynamicTypes) {
        prompt += `- You may create novel challenge types beyond the standard categories when appropriate.\n`;
      }
      
      if (options.suggestNovelTypes) {
        prompt += `- You are encouraged to suggest creative and unique challenge types tailored to this specific user.\n`;
      }
      
      prompt += `\n`;
      
      // Add adaptation guidance based on game state
      if (gameState && Object.keys(gameState).length > 0) {
        prompt += `### ADAPTATION GUIDANCE\n`;
        prompt += `- Create a challenge that builds on the user's strengths while addressing areas for improvement.\n`;
        prompt += `- Avoid repeating challenge types the user has recently encountered.\n`;
        
        if (gameState.streakCount && gameState.streakCount > 2) {
          prompt += `- The user is on a streak of ${gameState.streakCount} successfully completed challenges. Consider increasing difficulty slightly.\n`;
        }
        
        if (gameState.recentChallenges && gameState.recentChallenges.length > 0) {
          const recentFocusAreas = [...new Set(gameState.recentChallenges.map(c => c.focusArea).filter(Boolean))];
          if (recentFocusAreas.length > 0 && !recentFocusAreas.includes(focusArea)) {
            prompt += `- This is a shift to a new focus area (${focusArea}) from previous work in ${recentFocusAreas.join(', ')}. Provide context that bridges these areas.\n`;
          }
        }
        
        prompt += `\n`;
      }
      
      // Add response format instructions
      prompt += `### RESPONSE FORMAT\n`;
      prompt += `Return the challenge as a JSON object with the following structure:\n\n`;
      prompt += `{
  "title": "Challenge title",
  "content": {
    "context": "Background information and context",
    "scenario": "Specific scenario or problem statement",
    "instructions": "What the user needs to do"
  },
  "questions": [
    {
      "id": "q1",
      "text": "Question text",
      "type": "open-ended | multiple-choice | reflection",
      "options": ["Option 1", "Option 2", "Option 3"] // For multiple-choice only
    }
  ],
  "evaluationCriteria": {
    "criteria1": {
      "description": "Description of criteria",
      "weight": 0.5
    }
  },
  "recommendedResources": [
    {
      "title": "Resource title",
      "type": "article | video | book | tutorial",
      "url": "URL if available",
      "description": "Brief description of why this resource is helpful"
    }
  ]
}\n\n`;
      
      // Add Responses API instruction
      prompt += `\n\n${getResponsesApiInstruction()}`;
      
      // Ensure API standards are applied
      prompt = appendApiStandards(prompt);
      
      // Build dynamic system message based on user context
      const systemMessage = this.buildDynamicSystemMessage(
        challengeType,
        formatType,
        difficulty,
        user,
        personalityProfile,
        options
      );
      
      // Return both the prompt content and system message
      return {
        prompt: prompt.trim(),
        systemMessage
      };
    } catch (error) {
      log('error', 'Error building challenge prompt', { 
        error: error.message,
        stack: error.stack
      });
      
      throw new PromptConstructionError(`Failed to build challenge prompt: ${error.message}`, {
        originalError: error
      });
    }
  }
  
  /**
   * Build a dynamic system message based on user context
   * @param {string} challengeType - Type of challenge
   * @param {string} formatType - Format of challenge
   * @param {string} difficulty - Difficulty level
   * @param {Object} user - User profile data
   * @param {Object} personalityProfile - User's personality profile
   * @param {Object} options - Additional options
   * @returns {string} Dynamic system message
   * @private
   */
  static buildDynamicSystemMessage(challengeType, formatType, difficulty, user = {}, personalityProfile = {}, options = {}) {
    try {
      // Start with base system message
      let systemMsg = `You are an AI challenge creator specializing in ${challengeType} challenges `;
      
      // Add difficulty context
      if (difficulty === 'beginner') {
        systemMsg += `that are accessible and instructive for beginners. `;
      } else if (difficulty === 'intermediate') {
        systemMsg += `with moderate complexity appropriate for intermediate learners. `;
      } else if (difficulty === 'advanced' || difficulty === 'expert') {
        systemMsg += `that challenge and stretch advanced learners. `;
      } else {
        systemMsg += `of various difficulty levels. `;
      }
      
      // Add format context
      if (formatType === 'open-ended') {
        systemMsg += `You excel at creating open-ended challenges that promote creative thinking. `;
      } else if (formatType === 'scenario') {
        systemMsg += `You excel at developing rich, realistic scenarios that require thoughtful analysis. `;
      } else if (formatType === 'multiple-choice') {
        systemMsg += `You excel at crafting multiple-choice challenges with well-designed options. `;
      } else {
        systemMsg += `You adapt your challenge format based on learning objectives. `;
      }
      
      // Adjust for user skill level
      if (user.skillLevel) {
        if (user.skillLevel.toLowerCase() === 'beginner') {
          systemMsg += `Create challenges that build confidence while teaching fundamentals. `;
        } else if (user.skillLevel.toLowerCase() === 'intermediate') {
          systemMsg += `Focus on application of concepts and moderate complexity. `;
        } else if (user.skillLevel.toLowerCase() === 'expert' || user.skillLevel.toLowerCase() === 'advanced') {
          systemMsg += `Develop challenges that test nuanced understanding and edge cases. `;
        }
      }
      
      // Adapt to personality traits if available
      if (personalityProfile.traits) {
        const traits = Array.isArray(personalityProfile.traits) 
          ? personalityProfile.traits 
          : Object.keys(personalityProfile.traits || {});
        
        if (traits.includes('analytical') || traits.includes('logical')) {
          systemMsg += `Incorporate logical reasoning components into the challenge. `;
        }
        
        if (traits.includes('creative') || traits.includes('innovative')) {
          systemMsg += `Include opportunities for creative problem-solving. `;
        }
        
        if (traits.includes('detail_oriented') || traits.includes('thorough')) {
          systemMsg += `Include details that reward careful attention. `;
        }
      }
      
      // Adapt to learning style if available
      if (user.learningStyle) {
        if (user.learningStyle === 'visual') {
          systemMsg += `Suggest visual elements or scenarios that can be easily visualized. `;
        } else if (user.learningStyle === 'practical') {
          systemMsg += `Create challenges with clear real-world applications. `;
        } else if (user.learningStyle === 'conceptual') {
          systemMsg += `Incorporate theoretical frameworks and concepts. `;
        }
      }
      
      // Add general instructions
      systemMsg += `\n\nYour challenge should be engaging, clear, and aligned with the user's profile and learning goals. `;
      systemMsg += `Provide enough context for the user to understand the challenge but leave room for them to demonstrate their skills and creativity.`;
      
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
      return 'You are an AI challenge creator. Return your response as JSON according to the format specified in the prompt.';
    }
  }
  
  /**
   * Factory method to create a builder with default settings
   * @returns {Function} Configured build function
   */
  static createBuilder() {
    return ChallengePromptBuilder.build;
  }
}

module.exports = ChallengePromptBuilder; 