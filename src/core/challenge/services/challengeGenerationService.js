'use strict';

/**
 * Challenge Generation Service
 * 
 * Core business logic for generating personalized challenges using OpenAI Responses API
 * Follows domain-driven design principles and uses the prompt builder facade pattern
 * 
 * @module challengeGenerationService
 * @requires promptBuilder
 * @requires logger
 */

// const promptBuilder = require('../../prompt/promptBuilder');
const { formatForResponsesApi } = require('../../../core/infra/openai/messageFormatter');
// const Challenge = require('../models/Challenge');

/**
 * Service for generating personalized challenges
 */
class ChallengeGenerationService {
  /**
   * Create a new ChallengeGenerationService
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.openAIClient - Client for OpenAI API calls
   * @param {Object} dependencies.openAIStateManager - Manager for OpenAI conversation state
   * @param {Object} dependencies.personalityRepository - Repository for personality profiles
   * @param {Object} dependencies.openAIConfig - OpenAI configuration
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ 
    openAIClient, 
    openAIStateManager, 
    personalityRepository, 
    openAIConfig, 
    logger 
  }) {
    if (!logger) {
      throw new Error('Logger is required for ChallengeGenerationService');
    }
    
    this.openAIClient = openAIClient;
    this.openAIStateManager = openAIStateManager;
    this.personalityRepository = personalityRepository;
    this.openAIConfig = openAIConfig;
    this.logger = logger;
  }
  
  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @private
   */
  log(level, message, meta = {}) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](message, meta);
    } else {
      console[level === 'error' ? 'error' : 'log'](message, meta);
    }
  }

  /**
   * Generate a personalized challenge for a user
   * @param {Object} user - User data
   * @param {Object} challengeParams - Challenge parameters
   * @param {Object} options - Additional options
   * @param {string} options.threadId - Thread ID for stateful conversation
   * @param {Object} options.gameState - Current game state
   * @param {number} options.temperature - Temperature for generation
   * @returns {Promise<Challenge>} Generated challenge
   */
  async generateChallenge(user, challengeParams, options = {}) {
    try {
      if (!user) {
        throw new Error('User data is required for challenge generation');
      }
      
      if (!challengeParams) {
        throw new Error('Challenge parameters are required for generation');
      }
      
      const threadId = options.threadId;
      if (!threadId) {
        throw new Error('Thread ID is required for challenge generation');
      }
  
      // Get or create a conversation state for this challenge thread
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        user.id || user.email, 
        `challenge_${threadId}`,
        { createdAt: new Date().toISOString() }
      );
      
      // Get the previous response ID for conversation continuity
      const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
  
      // Get focus area and ensure it's set properly
      const focusArea = challengeParams.focusArea || 'general';
      
      // Prepare game state if available
      const gameState = options.gameState || {};
      
      // Add creative variation options (defaults to 0.7 for balanced creativity)
      const creativeOptions = {
        creativeVariation: options.creativeVariation || 0.7,
        allowDynamicTypes: options.allowDynamicTypes || false,
        suggestNovelTypes: options.suggestNovelTypes || false,
        threadId,
        previousResponseId
      };
      
      // Use the prompt builder to create a challenge prompt with personalization
      this.log('debug', 'Building personalized challenge prompt', { 
        challengeType: challengeParams.challengeType || challengeParams.challengeTypeCode,
        focusArea,
        user: user.id || user.email 
      });
      
      // Get user's personality profile if available
      let personalityProfile = {};
      try {
        if (this.personalityRepository) {
          personalityProfile = await this.personalityRepository.getByUserId(user.id || user.email) || {};
        }
      } catch (error) {
        this.log('warn', 'Error fetching personality profile, continuing without it', {
          error: error.message,
          userId: user.id || user.email
        });
      }
      
      // Build the challenge prompt with dynamic system message
      const { prompt, systemMessage } = await promptBuilder.buildPrompt('challenge', {
        user,
        challengeParams,
        personalityProfile,
        gameState,
        options: {
          creativeVariation: creativeOptions.creativeVariation,
          allowDynamicTypes: creativeOptions.allowDynamicTypes,
          suggestNovelTypes: creativeOptions.suggestNovelTypes
        }
      });
      
      this.log('debug', 'Generated challenge prompt using promptBuilder', { 
        promptLength: prompt.length, 
        user: user.id || user.email
      });
          
      // Format messages for Responses API
      const messages = formatForResponsesApi(
        prompt,
        `You are an AI challenge creator specialized in ${challengeParams.challengeType || 'general'} challenges.
Always return your challenge as a JSON object with title, content, questions, and evaluation criteria.
Format your response as valid, parsable JSON with no markdown formatting.
This is focused on the ${focusArea} area, so customize your challenge accordingly.
${systemMessage || ''}`
      );
      
      // Prepare API options
      const apiOptions = {
        model: this.openAIConfig.model || 'gpt-4o',
        temperature: options.temperature || 0.7,
        responseFormat: 'json',
        previousResponseId
      };
      
      // Call the OpenAI Responses API for challenge generation
      this.log('debug', 'Calling OpenAI Responses API for challenge generation', { 
        user: user.id || user.email, 
        stateId: conversationState.id
      });
      
      const response = await this.openAIClient.sendJsonMessage(messages, apiOptions);
      
      // Update the conversation state with the new response ID
      await this.openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
      
      // Validate the challenge data
      if (!response || !response.data || !response.data.title || !response.data.content) {
        throw new Error('Invalid challenge response format from OpenAI Responses API');
      }
      
      const challengeData = response.data;
      
      // Construct the challenge domain model
      const challenge = new Challenge({
        id: Challenge.createNewId(),
        title: challengeData.title,
        content: challengeData.content,
        questions: challengeData.questions || [],
        evaluationCriteria: challengeData.evaluationCriteria || {},
        recommendedResources: challengeData.recommendedResources || [],
        challengeType: challengeParams.challengeType || challengeParams.challengeTypeCode || 'standard',
        formatType: challengeParams.formatType || challengeParams.formatTypeCode || 'open-ended',
        difficulty: challengeParams.difficulty || 'intermediate',
        focusArea: focusArea,
        userId: user.id || user.email,
        metadata: {
          generationPromptLength: prompt.length,
          responseId: response.responseId,
          threadId: threadId,
          generatedAt: new Date().toISOString()
        }
      });
      
      this.log('info', 'Successfully generated personalized challenge', { 
        challengeId: challenge.id,
        userId: user.id || user.email,
        challengeType: challenge.challengeType
      });
      
      return challenge;
    } catch (error) {
      this.log('error', 'Error generating challenge', { 
        error: error.message,
        stack: error.stack,
        userId: user?.id || user?.email,
        challengeType: challengeParams?.challengeType
      });
      throw new Error(`Failed to generate challenge: ${error.message}`);
    }
  }

  /**
   * Generate a variation of an existing challenge
   * @param {Object} challenge - Existing challenge object
   * @param {Object} user - User data
   * @param {Object} options - Additional options
   * @param {string} options.variationType - Type of variation (harder, easier, creative, etc.)
   * @returns {Promise<Challenge>} Generated challenge variation
   */
  async generateChallengeVariation(challenge, user, options = {}) {
    try {
      if (!challenge) {
        throw new Error('Challenge is required for variation generation');
      }
      
      if (!user) {
        throw new Error('User data is required for variation generation');
      }
      
      const threadId = options.threadId;
      if (!threadId) {
        throw new Error('Thread ID is required for variation generation');
      }
      
      // Get or create a conversation state for this variation thread
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        user.id || user.email, 
        `variation_${threadId}`,
        { createdAt: new Date().toISOString() }
      );
      
      // Get the previous response ID for conversation continuity
      const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
      
      // Get focus area and ensure it's set properly
      const focusArea = challenge.focusArea || 'general';
      
      // Build the variation prompt
      const { prompt, systemMessage } = await promptBuilder.buildPrompt('challenge_variation', {
        challenge,
        user,
        variationType: options.variationType || 'creative',
        gameState: options.gameState || {}
      });
      
      this.log('debug', 'Generated variation prompt using promptBuilder', { 
        promptLength: prompt.length, 
        user: user.id || user.email,
        originalChallengeId: challenge.id
      });
      
      // Format messages for Responses API
      const messages = formatForResponsesApi(
        prompt,
        `You are an AI challenge variation creator specialized in modifying ${challenge.challengeType} challenges.
Always return your variation as a JSON object with title, content, questions, and evaluation criteria.
Format your response as valid, parsable JSON with no markdown formatting.
This is focused on the ${focusArea} area, so customize your variation accordingly.
${systemMessage || ''}`
      );
      
      // Prepare API options
      const apiOptions = {
        model: this.openAIConfig.model || 'gpt-4o',
        temperature: options.temperature || 0.7,
        responseFormat: 'json',
        previousResponseId
      };
      
      // Call the OpenAI Responses API for variation generation
      this.log('debug', 'Calling OpenAI Responses API for challenge variation', { 
        user: user.id || user.email, 
        stateId: conversationState.id,
        originalChallengeId: challenge.id
      });
      
      const response = await this.openAIClient.sendJsonMessage(messages, apiOptions);
      
      // Update the conversation state with the new response ID
      await this.openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
      
      // Validate the variation data
      if (!response || !response.data || !response.data.title || !response.data.content) {
        throw new Error('Invalid variation response format from OpenAI Responses API');
      }
      
      const variationData = response.data;
      
      // Construct the variation domain model
      const variation = new Challenge({
        id: Challenge.createNewId(),
        title: variationData.title,
        content: variationData.content,
        questions: variationData.questions || [],
        evaluationCriteria: variationData.evaluationCriteria || {},
        recommendedResources: variationData.recommendedResources || [],
        challengeType: challenge.challengeType,
        formatType: challenge.formatType,
        difficulty: variationData.difficulty || challenge.difficulty,
        focusArea: focusArea,
        userId: user.id || user.email,
        metadata: {
          generationPromptLength: prompt.length,
          responseId: response.responseId,
          threadId: threadId,
          generatedAt: new Date().toISOString(),
          originalChallengeId: challenge.id,
          variationType: options.variationType
        }
      });
      
      this.log('info', 'Successfully generated challenge variation', { 
        variationId: variation.id,
        userId: user.id || user.email,
        originalChallengeId: challenge.id,
        variationType: options.variationType
      });
      
      return variation;
    } catch (error) {
      this.log('error', 'Error generating challenge variation', { 
        error: error.message,
        stack: error.stack,
        userId: user?.id || user?.email,
        originalChallengeId: challenge?.id,
        variationType: options?.variationType
      });
      throw new Error(`Failed to generate challenge variation: ${error.message}`);
    }
  }
}

module.exports = ChallengeGenerationService;