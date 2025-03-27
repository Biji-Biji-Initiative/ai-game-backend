/**
 * Common Prompt Formatting Utilities
 * Provides shared helper functions for formatting prompt data
 * 
 * @module formatters
 * @requires logger
 * @requires MissingParameterError
 */

const { logger } = require('../../../core/infra/logging/logger');
const { MissingParameterError } = require('../../../core/infra/errors/MissingParameterError');

/**
 * Format user profile data for inclusion in prompts
 * @param {Object} user - User object containing profile information
 * @returns {string} Formatted user profile text
 */
const formatUserProfile = (user) => {
  if (!user) return 'No user profile available.';
  
  const parts = [];
  
  parts.push('### USER PROFILE');
  
  // Add name if available
  if (user.name) {
    parts.push(`Name: ${user.name}`);
  }
  
  // Add professional title if available
  if (user.professional_title || user.profession) {
    parts.push(`Profession: ${user.professional_title || user.profession}`);
  }
  
  // Add location if available
  if (user.location) {
    parts.push(`Location: ${user.location}`);
  }
  
  // Format personality traits
  if (user.personality_traits || user.traits) {
    const traits = user.personality_traits || user.traits;
    
    if (Object.keys(traits).length > 0) {
      parts.push('\n#### PERSONALITY TRAITS');
      
      Object.entries(traits).forEach(([trait, value]) => {
        // Format the trait name for better readability
        const formattedTrait = trait
          .replace(/([A-Z])/g, ' $1') // Add space before capital letters
          .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
          .trim();
        
        // Convert numeric values to descriptive text
        let description;
        if (typeof value === 'number') {
          if (value >= 0.8) description = 'Very High';
          else if (value >= 0.6) description = 'High';
          else if (value >= 0.4) description = 'Moderate';
          else if (value >= 0.2) description = 'Low';
          else description = 'Very Low';
          
          parts.push(`${formattedTrait}: ${description} (${Math.round(value * 100)}%)`);
        } else {
          parts.push(`${formattedTrait}: ${value}`);
        }
      });
    }
  }
  
  // Format AI attitudes
  if (user.ai_attitudes || user.attitudes) {
    const attitudes = user.ai_attitudes || user.attitudes;
    
    if (Object.keys(attitudes).length > 0) {
      parts.push('\n#### AI ATTITUDES');
      
      Object.entries(attitudes).forEach(([attitude, value]) => {
        // Format the attitude name for better readability
        const formattedAttitude = attitude
          .replace(/([A-Z])/g, ' $1') // Add space before capital letters
          .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
          .trim();
        
        // Convert numeric values to descriptive text
        let description;
        if (typeof value === 'number') {
          if (value >= 0.8) description = 'Very High';
          else if (value >= 0.6) description = 'High';
          else if (value >= 0.4) description = 'Moderate';
          else if (value >= 0.2) description = 'Low';
          else description = 'Very Low';
          
          parts.push(`${formattedAttitude}: ${description} (${Math.round(value * 100)}%)`);
        } else {
          parts.push(`${formattedAttitude}: ${value}`);
        }
      });
    }
  }
  
  return parts.join('\n');
};

/**
 * Format challenge parameters for inclusion in prompts
 * @param {Object} challenge - Challenge object containing parameters
 * @returns {string} Formatted challenge parameters text
 */
const formatChallengeParameters = (challenge) => {
  try {
    if (!challenge) {
      throw new MissingParameterError('challenge', 'formatChallengeParameters');
    }

    const { type, difficulty, topic, constraints = [], objectives = [] } = challenge;
    
    let parametersText = `CHALLENGE PARAMETERS:\n`;
    parametersText += `Type: ${type || 'General'}\n`;
    parametersText += `Difficulty: ${difficulty || 'Medium'}\n`;
    
    if (topic) {
      parametersText += `Topic: ${topic}\n`;
    }
    
    if (constraints && constraints.length > 0) {
      parametersText += `\nConstraints:\n`;
      constraints.forEach((constraint, index) => {
        parametersText += `${index + 1}. ${constraint}\n`;
      });
    }
    
    if (objectives && objectives.length > 0) {
      parametersText += `\nObjectives:\n`;
      objectives.forEach((objective, index) => {
        parametersText += `${index + 1}. ${objective}\n`;
      });
    }
    
    return parametersText;
  } catch (error) {
    logger.error('Error formatting challenge parameters', { error: error.message });
    throw error;
  }
};

/**
 * Format evaluation criteria for inclusion in prompts
 * @param {Object} criteria - Evaluation criteria object
 * @returns {string} Formatted evaluation criteria text
 */
const formatEvaluationCriteria = (criteria) => {
  try {
    if (!criteria) {
      throw new MissingParameterError('criteria', 'formatEvaluationCriteria');
    }

    const { aspects = [], scoring = {}, emphasis = [] } = criteria;
    
    let criteriaText = `EVALUATION CRITERIA:\n`;
    
    if (aspects && aspects.length > 0) {
      criteriaText += `Aspects to Evaluate:\n`;
      aspects.forEach((aspect, index) => {
        criteriaText += `${index + 1}. ${aspect}\n`;
      });
    }
    
    if (scoring && Object.keys(scoring).length > 0) {
      criteriaText += `\nScoring Guidelines:\n`;
      Object.entries(scoring).forEach(([key, value]) => {
        criteriaText += `- ${key}: ${value}\n`;
      });
    }
    
    if (emphasis && emphasis.length > 0) {
      criteriaText += `\nEmphasis Points:\n`;
      emphasis.forEach((point, index) => {
        criteriaText += `${index + 1}. ${point}\n`;
      });
    }
    
    return criteriaText;
  } catch (error) {
    logger.error('Error formatting evaluation criteria', { error: error.message });
    throw error;
  }
};

/**
 * Format challenge data for prompts
 * @param {Object} challenge - Challenge data
 * @returns {string} Formatted challenge text
 */
const formatChallenge = (challenge) => {
  if (!challenge) return 'No challenge data available.';
  
  const parts = [];
  
  parts.push('### CHALLENGE');
  
  if (challenge.title) {
    parts.push(`Title: ${challenge.title}`);
  }
  
  if (challenge.description) {
    parts.push(`\nDescription: ${challenge.description}`);
  }
  
  if (challenge.difficulty) {
    parts.push(`\nDifficulty: ${challenge.difficulty}`);
  }
  
  if (challenge.type) {
    parts.push(`Type: ${challenge.type}`);
  }
  
  return parts.join('\n');
};

/**
 * Format user response for prompts
 * @param {string|Object} response - User's response
 * @returns {string} Formatted response text
 */
const formatUserResponse = (response) => {
  if (!response) return 'No response provided.';
  
  if (typeof response === 'string') {
    return `### USER RESPONSE\n\n${response}`;
  }
  
  if (typeof response === 'object') {
    return `### USER RESPONSE\n\n${JSON.stringify(response, null, 2)}`;
  }
  
  return `### USER RESPONSE\n\n${String(response)}`;
};

module.exports = {
  formatUserProfile,
  formatChallengeParameters,
  formatEvaluationCriteria,
  formatChallenge,
  formatUserResponse
};
