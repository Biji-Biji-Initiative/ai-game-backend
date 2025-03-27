/**
 * Personality Prompt Builder
 * 
 * Specialized builder for generating personality assessment prompts that analyze
 * user traits, communication style, and attitudes toward AI.
 * 
 * @module PersonalityPromptBuilder
 * @requires logger
 * @requires apiStandards
 * @requires personalitySchema
 */

const { logger } = require('../../../core/infra/logging/logger');
const { 
  appendApiStandards, 
  getStructuredOutputInstructions,
  getResponsesApiInstruction
} = require('../common/apiStandards');
const { validatePersonalityPromptParams } = require('../schemas/personalitySchema');

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
 * Class responsible for building personality assessment prompts
 */
class PersonalityPromptBuilder {
  /**
   * Build a personality assessment prompt based on user data and history
   * @param {Object} params - Parameters for building the prompt
   * @param {Object} params.user - User data and any existing traits
   * @param {Array} [params.interactionHistory] - History of user interactions
   * @param {Object} [params.options] - Additional prompt options
   * @returns {string} Generated personality assessment prompt
   * @throws {Error} If required parameters are missing
   */
  static build(params) {
    try {
      // Validate parameters against schema
      const validatedParams = validatePersonalityPromptParams(params);
      
      const { user, interactionHistory = [], options = {} } = validatedParams;
      
      // Extract key user information
      const fullName = user.fullName || 'the user';
      const professionalTitle = user.professionalTitle || '';
      const existingTraits = user.existingTraits || {};
      const aiAttitudes = user.aiAttitudes || {};
      const communicationStyle = user.communicationStyle || '';
      const learningGoals = user.learningGoals || [];
      
      // Extract options
      const detailLevel = options.detailLevel || 'detailed';
      const traitCategories = options.traitCategories || [
        'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism',
        'adaptability', 'creativity', 'curiosity', 'persistence', 'analytical'
      ];
      
      // Build the personality assessment prompt
      let prompt = `### PERSONALITY ASSESSMENT TASK\n\n`;
      prompt += `Analyze the provided user information to create a detailed personality profile focusing on communication style and traits that affect AI interaction.\n\n`;
      
      // Add user profile section
      prompt += `### USER INFORMATION\n`;
      
      if (user.fullName) {
        prompt += `Name: ${user.fullName}\n`;
      }
      
      if (professionalTitle) {
        prompt += `Professional Title: ${professionalTitle}\n`;
      }
      
      if (user.location) {
        prompt += `Location: ${user.location}\n`;
      }
      
      if (user.interests && user.interests.length > 0) {
        prompt += `Interests: ${user.interests.join(', ')}\n`;
      }
      
      if (communicationStyle) {
        prompt += `Self-described communication style: ${communicationStyle}\n`;
      }
      
      if (learningGoals.length > 0) {
        prompt += `Learning goals: ${learningGoals.join(', ')}\n`;
      }
      
      // Add existing traits if available
      if (Object.keys(existingTraits).length > 0) {
        prompt += `\n### EXISTING TRAIT RATINGS (1-10 scale)\n`;
        Object.entries(existingTraits).forEach(([trait, score]) => {
          prompt += `- ${trait}: ${score}\n`;
        });
      }
      
      // Add AI attitudes if available
      if (Object.keys(aiAttitudes).length > 0) {
        prompt += `\n### AI ATTITUDE RATINGS (1-10 scale)\n`;
        Object.entries(aiAttitudes).forEach(([attitude, score]) => {
          prompt += `- ${attitude}: ${score}\n`;
        });
      }
      
      // Add interaction history if available
      if (interactionHistory && interactionHistory.length > 0) {
        prompt += `\n### INTERACTION HISTORY\n`;
        prompt += `The user has ${interactionHistory.length} recorded interactions with AI systems.\n\n`;
        
        // Calculate some basic statistics for the interaction history
        const sentimentScores = interactionHistory
          .filter(interaction => interaction.sentimentScore !== undefined)
          .map(interaction => interaction.sentimentScore);
        
        const complexityScores = interactionHistory
          .filter(interaction => interaction.complexity !== undefined)
          .map(interaction => interaction.complexity);
        
        if (sentimentScores.length > 0) {
          const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
          prompt += `Average sentiment score: ${avgSentiment.toFixed(2)} (range -1 to 1)\n`;
        }
        
        if (complexityScores.length > 0) {
          const avgComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
          prompt += `Average complexity score: ${avgComplexity.toFixed(2)} (scale 1-10)\n`;
        }
        
        // Add sample interactions (up to 5)
        const sampleCount = Math.min(interactionHistory.length, 5);
        prompt += `\nSample interactions:\n`;
        
        for (let i = 0; i < sampleCount; i++) {
          const interaction = interactionHistory[i];
          prompt += `\nInteraction ${i + 1}:\n`;
          prompt += `- Type: ${interaction.type || 'Unknown'}\n`;
          
          if (interaction.content) {
            const contentPreview = interaction.content.length > 100 
              ? `${interaction.content.substring(0, 100)}...` 
              : interaction.content;
            prompt += `- Content preview: "${contentPreview}"\n`;
          }
          
          if (interaction.score !== undefined) {
            prompt += `- Score: ${interaction.score}\n`;
          }
          
          if (interaction.sentimentScore !== undefined) {
            prompt += `- Sentiment: ${interaction.sentimentScore}\n`;
          }
          
          if (interaction.complexity !== undefined) {
            prompt += `- Complexity: ${interaction.complexity}\n`;
          }
        }
      }
      
      // Add analysis guidelines based on detail level
      prompt += `\n### ANALYSIS GUIDELINES\n`;
      
      if (detailLevel === 'comprehensive') {
        prompt += `Perform a comprehensive personality analysis focusing on the following categories:\n`;
      } else if (detailLevel === 'detailed') {
        prompt += `Perform a detailed personality analysis focusing on the following categories:\n`;
      } else {
        prompt += `Perform a basic personality analysis focusing on the following categories:\n`;
      }
      
      // Add trait categories to analyze
      traitCategories.forEach(category => {
        prompt += `- ${category}\n`;
      });
      
      // Add analysis focus on AI interaction
      prompt += `\nFocus your analysis on how these traits impact the user's communication with AI systems. Consider:\n`;
      prompt += `- How the user's personality affects their approach to AI interaction\n`;
      prompt += `- Communication patterns that might emerge based on these traits\n`;
      prompt += `- Strengths and potential areas for improvement in AI communication\n`;
      prompt += `- How to adapt AI responses to better match the user's personality\n`;
      
      // Add detail level specific instructions
      if (detailLevel === 'comprehensive') {
        prompt += `\nFor each trait category:\n`;
        prompt += `- Provide a detailed score on a 1-10 scale\n`;
        prompt += `- Include thorough rationale for each score\n`;
        prompt += `- Analyze how the trait manifests in AI interactions\n`;
        prompt += `- Offer 3-5 specific recommendations based on the trait\n`;
      } else if (detailLevel === 'detailed') {
        prompt += `\nFor each trait category:\n`;
        prompt += `- Provide a score on a 1-10 scale\n`;
        prompt += `- Include brief rationale for each score\n`;
        prompt += `- Offer 2-3 specific recommendations based on the trait\n`;
      } else {
        prompt += `\nFor each trait category:\n`;
        prompt += `- Provide a score on a 1-10 scale\n`;
        prompt += `- Include a short explanation\n`;
        prompt += `- Offer 1 key recommendation based on the trait\n`;
      }
      
      // Add response format instructions
      prompt += `\n### RESPONSE FORMAT\n`;
      prompt += `Return your analysis as a JSON object with the following structure:\n\n`;
      prompt += `{
  "traits": {
    "trait_name": {
      "score": 7,
      "description": "Description of how this trait manifests for the user",
      "rationale": "Explanation of why this score was assigned",
      "aiInteractionImpact": "How this trait affects AI interactions",
      "recommendations": [
        "Recommendation 1 for effective communication",
        "Recommendation 2 for effective communication"
      ]
    }
    // Additional traits...
  },
  "communicationStyle": {
    "summary": "Brief summary of the user's overall communication style",
    "strengths": ["Strength 1", "Strength 2"],
    "challenges": ["Challenge 1", "Challenge 2"],
    "recommendedApproach": "Recommended approach for AI communication"
  },
  "aiAttitudeProfile": {
    "overall": "Overall attitude toward AI (e.g., enthusiastic, cautious)",
    "preferences": ["Preference 1", "Preference 2"],
    "concerns": ["Concern 1", "Concern 2"]
  }
}\n\n`;
      
      // Add responses API instruction
      prompt += `\n\n${getResponsesApiInstruction()}`;
      
      // Apply API standards
      prompt = appendApiStandards(prompt);
      
      return prompt.trim();
    } catch (error) {
      log('error', 'Error building personality assessment prompt', { 
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
    return PersonalityPromptBuilder.build;
  }
}

module.exports = PersonalityPromptBuilder; 