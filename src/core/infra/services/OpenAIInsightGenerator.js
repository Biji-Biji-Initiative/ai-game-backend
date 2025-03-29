'use strict';

/**
 * OpenAI Insight Generator
 * 
 * Implements the InsightGenerator port using OpenAI for real insight generation.
 */

// const InsightGenerator = require('../../core/personality/ports/InsightGenerator');
const { personalityLogger } = require('../../core/infra/logging/domainLogger');
const { formatForResponsesApi } = require(../../core/infra/openai/messageFormatter');

/**
 * Class for generating insights using OpenAI's Responses API
 */
class OpenAIInsightGenerator extends InsightGenerator {
  /**
   * Creates an OpenAI insight generator
   * @param {Object} openaiClient - The OpenAI client for API access
   * @param {Object} promptBuilder - The prompt builder service
   */
  /**
   * Method constructor
   */
  constructor(openaiClient, promptBuilder) {
    super();
    this.openaiClient = openaiClient;
    this.promptBuilder = promptBuilder;
    this.logger = personalityLogger.child('openaiInsightGenerator');
  }
  
  /**
   * Generate insights using OpenAI based on a personality profile
   * @param {import('../../core/personality/models/Personality')} profile - The personality profile
   * @returns {Promise<Object>} Generated insights
   */
  /**
   * Method generateFor
   */
  generateFor(profile) {
    try {
      this.logger.debug('Generating insights with OpenAI Responses API', { userId: profile.userId });
      
      // Build prompt for insights generation
      const { prompt, systemMessage } = await this.promptBuilder.buildPrompt('personality', {
        user: {
          fullName: 'User',
          existingTraits: profile.personalityTraits,
          aiAttitudes: profile.aiAttitudes
        }
      });
      
      // Format messages for Responses API
      const messages = formatForResponsesApi(prompt, systemMessage);
      
      // Generate insights using OpenAI Responses API
      const response = await this.openaiClient.sendMessage(messages, {
        model: 'gpt-4o',
        responseFormat: 'json',
        temperature: 0.7
      });
      
      // Parse and transform the response
      const aiResponse = await this.openaiClient.responseHandler.formatJson(response);
      
      // Transform the OpenAI response to match our expected insight format
      const insights = this._transformOpenAIResponse(aiResponse);
      
      this.logger.info('Successfully generated insights with OpenAI', { 
        userId: profile.userId,
        insightsCount: Object.keys(insights).length
      });
      
      return insights;
    } catch (error) {
      this.logger.error('Error generating insights with OpenAI', { 
        error: error.message,
        stack: error.stack,
        userId: profile.userId
      });
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }
  
  /**
   * Transform OpenAI response to standard insight format
   * @param {Object} aiResponse - Raw response from OpenAI
   * @returns {Object} Transformed insights
   * @private
   */
  /**
   * Method _transformOpenAIResponse
   */
  _transformOpenAIResponse(aiResponse) {
    try {
      // Extract strengths and recommendations
      const strengths = [];
      const recommendations = [];
      const focusAreas = [];
      
      // Extract from traits if available
      if (aiResponse.traits) {
        Object.values(aiResponse.traits).forEach(trait => {
          if (trait.recommendations && Array.isArray(trait.recommendations)) {
            recommendations.push(...trait.recommendations);
          }
        });
      }
      
      // Extract from communicationStyle if available
      if (aiResponse.communicationStyle) {
        if (aiResponse.communicationStyle.strengths && Array.isArray(aiResponse.communicationStyle.strengths)) {
          strengths.push(...aiResponse.communicationStyle.strengths);
        }
        if (aiResponse.communicationStyle.recommendations && Array.isArray(aiResponse.communicationStyle.recommendations)) {
          recommendations.push(...aiResponse.communicationStyle.recommendations);
        }
      }
      
      // Extract focus areas
      if (aiResponse.focusAreas && Array.isArray(aiResponse.focusAreas)) {
        focusAreas.push(...aiResponse.focusAreas);
      }
      
      return {
        strengths: strengths.slice(0, 5),
        focus_areas: focusAreas.slice(0, 3),
        recommendations: recommendations.slice(0, 5),
        traits: this._extractTraits(aiResponse),
        ai_preferences: {
          communication_style: aiResponse.communicationStyle?.recommendedApproach || 'Balanced and informative',
          information_density: 'Medium to high',
          interaction_pattern: 'Conversational with clear structure'
        }
      };
    } catch (error) {
      this.logger.error('Error transforming OpenAI response', { 
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to transform OpenAI response: ${error.message}`);
    }
  }
  
  /**
   * Extract trait information from OpenAI response
   * @param {Object} aiResponse - Raw response from OpenAI
   * @returns {Object} Extracted traits
   * @private
   */
  /**
   * Method _extractTraits
   */
  _extractTraits(aiResponse) {
    const traits = {};
    
    if (aiResponse.traits) {
      Object.entries(aiResponse.traits).forEach(([name, data]) => {
        traits[name] = {
          score: data.score || 50,
          description: data.description || `Level of ${name}`,
          impact: data.aiInteractionImpact || `Affects how AI should interact regarding ${name}`
        };
      });
    }
    
    return traits;
  }
}

module.exports = OpenAIInsightGenerator;