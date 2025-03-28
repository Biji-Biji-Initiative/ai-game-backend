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

const { logger } = require('../../../core/infra/logging/logger');
const promptBuilder = require('../../prompt/promptBuilder');
const { formatJson } = require('../../../infra/openai/responseHandler');
const Challenge = require('../models/Challenge');

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
    this.openAIClient = openAIClient;
    this.openAIStateManager = openAIStateManager;
    this.personalityRepository = personalityRepository;
    this.MessageRole = openAIConfig.OpenAITypes.MessageRole;
    this.logger = logger || logger;
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
    } else if (logger && typeof logger[level] === 'function') {
      logger[level](message, meta);
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
          
      // Create system and user messages
      const messages = [
        {
          role: this.MessageRole.SYSTEM,
          content: systemMessage || `You are an AI challenge creator specialized in ${challengeParams.challengeType || 'general'} challenges.
  Always return your challenge as a JSON object with title, content, questions, and evaluation criteria.
  Format your response as valid, parsable JSON with no markdown formatting.
  This is focused on the ${focusArea} area, so customize your challenge accordingly.`
        },
        {
          role: this.MessageRole.USER,
          content: prompt
        }
      ];
      
      // Call the OpenAI Responses API for challenge generation
      this.log('debug', 'Calling OpenAI Responses API for challenge generation', { 
        user: user.id || user.email, 
        stateId: conversationState.id
      });
      
      // Send the JSON message with the 'CHALLENGE_GENERATION' use case 
      const response = await this.openAIClient.sendJsonMessage(messages, 'CHALLENGE_GENERATION', {
        previous_response_id: previousResponseId
      });
      
      // Update the conversation state with the new response ID
      await this.openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
      
      // Validate the challenge data
      if (!response.data || !response.data.title || !response.data.content) {
        throw new Error('Generated challenge is missing required fields');
      }
      
      const challengeData = response.data;
      
      // Construct the challenge domain model
      const challenge = new Challenge({
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
        challengeType: challenge.challengeType,
        threadId
      });
      
      return challenge;
    } catch (error) {
      this.log('error', 'Error in challenge generation service', { 
        error: error.message,
        user: user?.id || user?.email
      });
      throw error;
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
        throw new Error('Original challenge is required for variation generation');
      }
      
      if (!user) {
        throw new Error('User data is required for challenge variation');
      }
      
      const threadId = options.threadId;
      if (!threadId) {
        throw new Error('Thread ID is required for challenge variation');
      }
      
      // Prepare challenge params based on the original challenge
      const challengeParams = {
        challengeType: challenge.challengeType,
        formatType: challenge.formatType,
        difficulty: challenge.difficulty,
        focusArea: challenge.focusArea,
        // Add variation-specific parameters
        variationType: options.variationType || 'creative',
        originalChallengeId: challenge.id,
        // Preserve any existing metadata
        typeMetadata: challenge.typeMetadata || {},
        formatMetadata: challenge.formatMetadata || {}
      };
      
      // Set creative variation based on variationType
      let creativeVariation = 0.7; // Default
      if (options.variationType === 'creative') {
        creativeVariation = 0.9; // High creativity
      } else if (options.variationType === 'structured') {
        creativeVariation = 0.4; // More structured
      }
      
      // Generate the challenge variation
      return await this.generateChallenge(user, challengeParams, {
        ...options,
        creativeVariation,
        // Include original challenge in game state for context
        gameState: {
          ...options.gameState,
          originalChallenge: {
            id: challenge.id,
            title: challenge.title,
            challengeType: challenge.challengeType,
            difficulty: challenge.difficulty,
            content: challenge.content
          }
        }
      });
    } catch (error) {
      this.log('error', 'Error generating challenge variation', { 
        error: error.message,
        originalChallengeId: challenge?.id
      });
      throw error;
    }
  }
}

module.exports = ChallengeGenerationService; 