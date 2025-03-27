/**
 * Challenge Generation Service
 * 
 * Core business logic for generating personalized challenges using OpenAI Responses API
 * Follows domain-driven design principles and uses the prompt builder facade pattern
 * 
 * @module challengeGenerationService
 * @requires promptBuilder
 * @requires responsesApiClient
 * @requires logger
 */

const { logger } = require('../../../core/infra/logging/logger');
const promptBuilder = require('../../prompt/promptBuilder');
const { formatJson } = require('../../prompt/formatters/jsonFormatter');
const responsesApiClient = require('../../../core/infra/api/responsesApiClient');
const Challenge = require('../models/Challenge');

// Helper function for logging if logger exists
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
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
async function generateChallenge(user, challengeParams, options = {}) {
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
      previousResponseId: options.previousResponseId
    };
    
    // Use the prompt builder to create a challenge prompt
    const prompt = await promptBuilder.buildPrompt('challenge', {
      user,
      challengeParams,
      gameState,
      options: creativeOptions
    });
    
    log('debug', 'Generated challenge prompt using promptBuilder', { 
      promptLength: prompt.length, 
      user: user.id || user.email
    });
    
    // Configure API call options for Responses API
    const apiOptions = {
      model: options.model || 'gpt-4o',
      temperature: options.temperature || 0.7, // Medium temperature for creativity
      responseFormat: 'json',
      previousResponseId: options.previousResponseId
    };
    
    // Create messages for the Responses API
    const messages = [
      {
        role: responsesApiClient.MessageRole.SYSTEM,
        content: `You are an AI challenge designer specializing in creating personalized ${challengeParams.challengeType || 'learning'} challenges.
Always return your challenge as a JSON object with title, content, questions, and evaluation criteria.
Format your response as valid, parsable JSON with no markdown formatting.
This is focused on the ${focusArea} area, so customize your challenge accordingly.`
      },
      {
        role: responsesApiClient.MessageRole.USER,
        content: prompt
      }
    ];
    
    // Call the OpenAI Responses API for challenge generation
    log('debug', 'Calling OpenAI Responses API for challenge generation', { 
      user: user.id || user.email, 
      threadId 
    });
    
    const response = await responsesApiClient.sendJsonMessage(messages, apiOptions);
    
    // Validate and process the response
    if (!response || !response.data) {
      throw new Error('Invalid challenge response format from OpenAI Responses API');
    }
    
    // Format the response using the JSON formatter
    const challengeData = formatJson(response.data);
    
    // Validate the challenge data
    if (!challengeData.title || !challengeData.content) {
      throw new Error('Generated challenge is missing required fields');
    }
    
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
        generationTemperature: apiOptions.temperature,
        responseId: response.responseId,
        threadId: threadId,
        generatedAt: new Date().toISOString()
      }
    });
    
    log('info', 'Successfully generated personalized challenge', {
      challengeId: challenge.id,
      challengeType: challenge.challengeType,
      threadId
    });
    
    return challenge;
  } catch (error) {
    log('error', 'Error in challenge generation service', { 
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
async function generateChallengeVariation(challenge, user, options = {}) {
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
    return await generateChallenge(user, challengeParams, {
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
    log('error', 'Error generating challenge variation', { 
      error: error.message,
      originalChallengeId: challenge?.id
    });
    throw error;
  }
}

module.exports = {
  generateChallenge,
  generateChallengeVariation
}; 