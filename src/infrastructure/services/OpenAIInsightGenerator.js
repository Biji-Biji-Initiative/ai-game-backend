/**
 * OpenAI Insight Generator
 * 
 * Implements the InsightGenerator port using OpenAI for real insight generation.
 */

const InsightGenerator = require('../../core/personality/ports/InsightGenerator');
const { personalityLogger } = require('../../core/infra/logging/domainLogger');

class OpenAIInsightGenerator extends InsightGenerator {
  /**
   * Creates an OpenAI insight generator
   * @param {Object} openaiClient - The OpenAI client for API access
   * @param {Object} promptBuilder - The prompt builder service
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
  async generateFor(profile) {
    try {
      this.logger.debug('Generating insights with OpenAI', { userId: profile.userId });
      
      // Build prompt for insights generation
      const { prompt, systemMessage } = await this.promptBuilder.buildPrompt('personality', {
        user: {
          fullName: 'User',
          existingTraits: profile.personalityTraits,
          aiAttitudes: profile.aiAttitudes
        }
      });
      
      // Generate insights using OpenAI Responses API
      const response = await this.openaiClient.responses.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemMessage || 'You are an AI personality analyst helping users understand their cognitive profile and AI attitudes. Respond with valid JSON only.'
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });
      
      // Parse and transform the response
      const aiResponse = JSON.parse(response.choices[0].message.content);
      
      // Transform the OpenAI response to match our expected insight format
      const insights = this._transformOpenAIResponse(aiResponse);
      
      this.logger.info('Generated insights with OpenAI', { userId: profile.userId });
      return insights;
    } catch (error) {
      this.logger.error('Error generating insights with OpenAI', { 
        error: error.message,
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
        
        if (aiResponse.communicationStyle.challenges && Array.isArray(aiResponse.communicationStyle.challenges)) {
          focusAreas.push(...aiResponse.communicationStyle.challenges);
        }
      }
      
      // Extract from aiAttitudeProfile if available
      if (aiResponse.aiAttitudeProfile) {
        if (aiResponse.aiAttitudeProfile.preferences && Array.isArray(aiResponse.aiAttitudeProfile.preferences)) {
          strengths.push(...aiResponse.aiAttitudeProfile.preferences.map(p => `Strong preference for ${p}`));
        }
        
        if (aiResponse.aiAttitudeProfile.concerns && Array.isArray(aiResponse.aiAttitudeProfile.concerns)) {
          focusAreas.push(...aiResponse.aiAttitudeProfile.concerns.map(c => `Address concern about ${c}`));
        }
      }
      
      // Build the standard insights format
      return {
        strengths: strengths.slice(0, 5),
        focus_areas: focusAreas.slice(0, 3),
        recommendations: recommendations.slice(0, 5),
        traits: this._extractTraits(aiResponse),
        ai_preferences: {
          communication_style: aiResponse.communicationStyle?.recommendedApproach || "Balanced and informative",
          information_density: "Medium to high",
          interaction_pattern: "Conversational with clear structure"
        }
      };
    } catch (error) {
      this.logger.warn('Error transforming AI response, returning raw response', { 
        error: error.message 
      });
      // If transformation fails, return raw response
      return aiResponse;
    }
  }
  
  /**
   * Extract trait information from OpenAI response
   * @param {Object} aiResponse - Raw response from OpenAI
   * @returns {Object} Extracted traits
   * @private
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