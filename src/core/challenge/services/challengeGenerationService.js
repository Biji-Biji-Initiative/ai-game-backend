'use strict';

/**
 * Challenge Generation Service
 * 
 * Domain service that handles the generation of challenges using AI.
 * Updated to use the AIClient and AIStateManager ports instead of direct
 * OpenAI infrastructure dependencies to follow clean architecture principles.
 */

// Update imports to use AI ports instead of concrete implementations
import promptBuilder from "../../prompt/promptBuilder.js";
import { formatForResponsesApi } from "../../../core/infra/openai/messageFormatter.js";
import { ChallengeGenerationError } from "../errors/ChallengeErrors.js";
import Challenge from "../models/Challenge.js";

/**
 * Service for generating challenges
 */
class ChallengeGenerationService {
  /**
   * Create a new ChallengeGenerationService
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.aiClient - AI client port interface
   * @param {Object} dependencies.aiStateManager - AI state manager port interface
   * @param {Object} dependencies.openAIConfig - Configuration for OpenAI
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies = {}) {
    const { aiClient, aiStateManager, openAIConfig, logger } = dependencies;
    
    if (!aiClient) {
      throw new Error('aiClient is required for ChallengeGenerationService');
    }
    
    if (!aiStateManager) {
      throw new Error('aiStateManager is required for ChallengeGenerationService');
    }
    
    this.aiClient = aiClient;
    this.aiStateManager = aiStateManager;
    this.openAIConfig = openAIConfig || {};
    this.logger = logger || console;
  }

  /**
   * Log messages with consistent format
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Log context
   * @private
   */
  log(level, message, context = {}) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](message, { 
        service: 'ChallengeGenerationService', 
        ...context 
      });
    }
  }
  
  /**
   * Generate a personalized challenge for a user
   * @param {Object} user - User data
   * @param {Object} challengeParams - Challenge parameters
   * @param {Array} recentChallenges - Recent challenges for context
   * @param {Object} options - Additional options
   * @returns {Promise<Challenge>} Generated challenge
   */
  async generateChallenge(user, challengeParams, recentChallenges = [], options = {}) {
    try {
      // Validate required parameters
      if (!user) {
        throw new ChallengeGenerationError('User data is required for challenge generation');
      }
      
      if (!challengeParams) {
        throw new ChallengeGenerationError('Challenge parameters are required for generation');
      }
      
      // Get or create conversation state using aiStateManager instead of openAIStateManager
      const userId = user.id || user.email;
      const conversationState = await this.aiStateManager.findOrCreateConversationState(
        userId, 
        options.conversationContext || `challenge_gen_${userId}`,
        { createdAt: new Date().toISOString() }
      );
      
      // Get the previous response ID for conversation continuity
      const previousResponseId = await this.aiStateManager.getLastResponseId(conversationState.id);
      
      this.log('debug', 'Retrieved conversation state for challenge generation', { 
        stateId: conversationState.id,
        userId,
        hasLastResponseId: !!previousResponseId
      });
      
      // Get focus area and ensure it's set properly
      const focusArea = challengeParams.focusArea || 'general';
      
      // Build the generation prompt using the prompt builder
      const { prompt, systemMessage } = await promptBuilder.buildPrompt('challenge', {
        user,
        focusArea,
        challengeParams,
        recentChallenges,
        options: {
          difficultyLevel: challengeParams.difficulty,
          challengeType: challengeParams.challengeTypeCode,
          formatType: challengeParams.formatTypeCode,
          allowDynamicTypes: options.allowDynamicTypes || false,
          includeEvaluationCriteria: true
        }
      });
      
      this.log('debug', 'Generated challenge prompt using promptBuilder', { 
        promptLength: prompt.length, 
        userId,
        focusArea
      });
      
      // Format messages for AI service
      const messages = formatForResponsesApi(
        prompt,
        systemMessage || `You are an expert challenge creator specializing in ${focusArea} challenges.`
      );
      
      // Prepare API options
      const apiOptions = {
        model: this.openAIConfig.model || 'gpt-4o',
        temperature: options.temperature || 0.7,
        responseFormat: 'json',
        previousResponseId
      };
      
      // Call the AI service for challenge generation using aiClient instead of openAIClient
      this.log('debug', 'Calling AI service for challenge generation', { 
        userId, 
        stateId: conversationState.id
      });
      
      const response = await this.aiClient.sendJsonMessage(messages, apiOptions);
      
      // Update the conversation state with the new response ID
      await this.aiStateManager.updateLastResponseId(conversationState.id, response.responseId);
      
      // Validate and return the challenge data
      if (!response || !response.data || !response.data.title) {
        throw new ChallengeGenerationError('Invalid challenge response format from AI service');
      }
      
      // Enhance the response with additional metadata
      const result = {
        ...response.data,
        responseId: response.responseId,
        stateId: conversationState.id,
        title: response.data.title || `New ${focusArea} Challenge`
      };
      
      this.log('info', 'Successfully generated challenge', { 
        userId,
        focusArea,
        responseId: response.responseId
      });
      
      return result;
    } catch (error) {
      this.log('error', 'Error generating challenge', { 
        error: error.message, 
        stack: error.stack,
        userId: user?.id || user?.email
      });
      
      throw new ChallengeGenerationError(`Failed to generate challenge: ${error.message}`, { cause: error });
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
      const conversationState = await this.aiStateManager.findOrCreateConversationState(
        user.id || user.email, 
        `variation_${threadId}`,
        { createdAt: new Date().toISOString() }
      );
      
      // Get the previous response ID for conversation continuity
      const previousResponseId = await this.aiStateManager.getLastResponseId(conversationState.id);
      
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
      
      const response = await this.aiClient.sendJsonMessage(messages, apiOptions);
      
      // Update the conversation state with the new response ID
      await this.aiStateManager.updateLastResponseId(conversationState.id, response.responseId);
      
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

export default ChallengeGenerationService;