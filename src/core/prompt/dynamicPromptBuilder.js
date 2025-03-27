/**
 * Dynamic Prompt Builder
 * 
 * Builds context-aware prompts for different types of operations
 * Moved from utils to follow Domain-Driven Design principles
 */

const { logger } = require('../infra/logging/logger');

/**
 * Build a challenge generation prompt based on parameters
 * @param {Object} params - Challenge parameters
 * @returns {string} Complete prompt for challenge generation
 */
const buildChallengePrompt = (params) => {
  try {
    const {
      focusArea = '',
      challengeType = '',
      formatType = '',
      difficulty = 'medium',
      traits = [],
      previousChallenges = []
    } = params || {};
    
    let prompt = `Generate a ${difficulty} difficulty ${challengeType} challenge `;
    prompt += `related to ${focusArea}. `;
    prompt += `Format it as a ${formatType} challenge. `;
    
    if (traits && traits.length > 0) {
      prompt += `The user has the following traits: ${traits.join(', ')}. `;
      prompt += `Tailor the challenge to these traits. `;
    }
    
    if (previousChallenges && previousChallenges.length > 0) {
      prompt += `The user has previously completed challenges on: `;
      prompt += previousChallenges.slice(0, 3).map(c => c.focusArea).join(', ');
      prompt += `. Avoid duplicating these topics. `;
    }
    
    prompt += `\nMake the challenge engaging, clear, and appropriate for the difficulty level.`;
    
    return prompt;
  } catch (error) {
    logger.error('Error building challenge prompt', { error: error.message });
    return 'Generate a medium difficulty challenge on a relevant topic.';
  }
};

/**
 * Build an evaluation prompt based on parameters
 * @param {Object} params - Evaluation parameters
 * @returns {string} Complete prompt for evaluation
 */
const buildEvaluationPrompt = (params) => {
  try {
    const {
      challenge = {},
      response = '',
      rubric = {},
      userTraits = [],
      evaluationType = 'standard'
    } = params || {};
    
    const challengeContent = challenge.content || {};
    const prompt = challengeContent.prompt || '';
    const context = challengeContent.context || '';
    
    let evaluationPrompt = `Evaluate the following response to a ${challenge.challengeType} challenge:\n\n`;
    
    if (prompt) {
      evaluationPrompt += `Challenge Prompt: ${prompt}\n\n`;
    }
    
    if (context) {
      evaluationPrompt += `Context: ${context}\n\n`;
    }
    
    evaluationPrompt += `User Response: ${response}\n\n`;
    
    if (rubric && Object.keys(rubric).length > 0) {
      evaluationPrompt += `Evaluation Criteria:\n`;
      Object.entries(rubric).forEach(([criterion, weight]) => {
        evaluationPrompt += `- ${criterion} (weight: ${weight})\n`;
      });
      evaluationPrompt += `\n`;
    }
    
    if (userTraits && userTraits.length > 0) {
      evaluationPrompt += `Consider the user's traits: ${userTraits.join(', ')}.\n\n`;
    }
    
    if (evaluationType === 'detailed') {
      evaluationPrompt += `Provide a detailed evaluation with specific feedback points, `;
      evaluationPrompt += `strengths, weaknesses, and suggestions for improvement.\n`;
    } else {
      evaluationPrompt += `Provide a standard evaluation with overall feedback and a score out of 10.\n`;
    }
    
    return evaluationPrompt;
  } catch (error) {
    logger.error('Error building evaluation prompt', { error: error.message });
    return 'Evaluate the response provided, giving feedback and a score out of 10.';
  }
};

module.exports = {
  buildChallengePrompt,
  buildEvaluationPrompt
}; 