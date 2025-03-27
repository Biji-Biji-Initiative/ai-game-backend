/**
 * Focus Area Generation Service
 * 
 * Core business logic for generating personalized focus areas based on user data
 * Follows domain-driven design principles and uses the prompt builder facade pattern
 * 
 * @module focusAreaGenerationService
 * @requires promptBuilder
 * @requires responsesApiClient
 * @requires logger
 */

const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../../core/infra/logging/logger');
const promptBuilder = require('../../prompt/promptBuilder');
const { formatJson } = require('../../prompt/formatters/jsonFormatter');
const responsesApiClient = require('../../../core/infra/api/responsesApiClient');
const FocusArea = require('../models/FocusArea');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper function for logging if logger exists
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
    logger[level](message, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](message, meta);
  }
}

/**
 * Generate personalized focus areas based on user profile and history
 * @param {Object} userData - User profile and data
 * @param {Array} challengeHistory - User's challenge history
 * @param {Object} progressData - User's progression data
 * @param {Object} options - Additional options
 * @param {string} options.threadId - Thread ID for stateful conversation
 * @param {string} options.previousResponseId - Previous response ID for context
 * @param {number} options.temperature - Temperature for generation
 * @param {number} options.count - Number of focus areas to generate
 * @param {boolean} options.forceRefresh - Force refresh the cache
 * @returns {Promise<Array<FocusArea>>} Generated focus areas
 */
async function generateFocusAreas(userData, challengeHistory = [], progressData = {}, options = {}) {
  try {
    // Extract user data
    const userId = userData.id || userData.email;
    if (!userId) {
      throw new Error('User ID or email is required for focus area generation');
    }
    
    const threadId = options.threadId;
    if (!threadId) {
      throw new Error('Thread ID is required for focus area generation');
    }

    // Check cache if not forcing refresh
    if (!options.forceRefresh) {
      const cacheKey = userId;
      const cachedItem = cache.get(cacheKey);
      
      if (cachedItem && Date.now() < cachedItem.expiresAt) {
        log('info', 'Returning cached focus areas', { 
          userId, 
          cachedAt: new Date(cachedItem.cachedAt).toISOString()
        });
        return cachedItem.data;
      }
    }

    log('info', 'Generating focus areas with core service', { 
      userId,
      threadId, 
      hasTraits: Object.keys(userData.personality_traits || {}).length > 0
    });

    // Extract user traits data
    const userTraits = {
      traits: userData.personality_traits || {},
      attitudes: userData.ai_attitudes || {},
      professional_title: userData.professional_title || '',
      location: userData.location || ''
    };
    
    // Configure additional options
    const promptOptions = {
      count: options.count || 3,
      creativeVariation: options.creativeVariation || 0.7,
      includeRationale: options.includeRationale !== false,
      includeStrategies: options.includeStrategies !== false,
      threadId,
      previousResponseId: options.previousResponseId
    };
    
    // Use the prompt builder to create a focus area prompt
    const prompt = await promptBuilder.buildPrompt('focus-area', {
      user: userTraits,
      challengeHistory,
      progressData,
      options: promptOptions
    });
    
    log('debug', 'Generated focus area prompt using promptBuilder', { 
      promptLength: prompt.length, 
      userId
    });
    
    // Configure API call options for Responses API
    const apiOptions = {
      model: options.model || 'gpt-4o',
      temperature: options.temperature || 0.8, // Higher temperature for more creative responses
      responseFormat: 'json',
      previousResponseId: options.previousResponseId
    };
    
    // Create messages for the Responses API
    const messages = [
      {
        role: responsesApiClient.MessageRole.SYSTEM,
        content: `You are an AI communication coach specializing in personalized focus area generation. 
Always return your response as a JSON object with a "focusAreas" array containing the focus areas. 
Each focus area should have name, description, priorityLevel, rationale, and improvementStrategies.
Format your entire response as valid, parsable JSON with no markdown formatting.`
      },
      {
        role: responsesApiClient.MessageRole.USER,
        content: prompt
      }
    ];
    
    // Call the OpenAI Responses API for focus area generation
    log('debug', 'Calling OpenAI Responses API for focus area generation', { 
      userId, 
      threadId 
    });
    
    const response = await responsesApiClient.sendJsonMessage(messages, apiOptions);
    
    // Validate and process the response
    if (!response || !response.data) {
      throw new Error('Invalid focus area response format from OpenAI Responses API');
    }
    
    // Format the response using the JSON formatter
    const responseData = formatJson(response.data);
    
    // Validate the focus areas data
    if (!responseData.focusAreas || !Array.isArray(responseData.focusAreas)) {
      throw new Error('Generated focus areas missing required fields');
    }
    
    const focusAreas = responseData.focusAreas;
    
    // Convert to domain objects
    const result = focusAreas.map((area, index) => {
      // Create priorityLevel from 1-3 based on high/medium/low
      const priorityLevel = area.priorityLevel === 'high' ? 1 : 
                          area.priorityLevel === 'medium' ? 2 : 3;
      
      // Create domain model instance
      return new FocusArea({
        userId,
        name: area.name,
        description: area.description || '',
        priority: priorityLevel,
        metadata: {
          responseId: response.responseId,
          rationale: area.rationale,
          improvementStrategies: area.improvementStrategies || [],
          recommendedChallengeTypes: area.recommendedChallengeTypes || []
        }
      });
    });
    
    log('info', 'Successfully generated personalized focus areas', {
      count: result.length,
      userId
    });
    
    // Cache the result
    cache.set(userId, {
      data: result,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL
    });

    return result;
  } catch (error) {
    log('error', 'Error in focus area generation service', { 
      error: error.message,
      userId: userData?.id || userData?.email
    });
    throw error;
  }
}

/**
 * Processes and saves focus areas from AI generation
 * @param {string} userId - User ID
 * @param {Array<FocusArea>} focusAreas - Generated focus areas
 * @param {Function} saveFunction - Repository function to save focus areas
 * @returns {Promise<Array<FocusArea>>} Saved focus areas
 */
async function processFocusAreas(userId, focusAreas, saveFunction) {
  if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
    throw new Error('No valid focus areas to process');
  }

  // Filter out any invalid focus areas
  const validFocusAreas = focusAreas.filter(area => 
    area instanceof FocusArea || 
    (typeof area === 'object' && area.name)
  );

  if (validFocusAreas.length === 0) {
    throw new Error('No valid focus areas after filtering');
  }

  // Convert any plain objects to FocusArea instances
  const focusAreaInstances = validFocusAreas.map(area => 
    area instanceof FocusArea ? area : new FocusArea({
      userId,
      name: typeof area === 'string' ? area : area.name,
      description: area.description || '',
      priority: area.priority || 1,
      metadata: area.metadata || {}
    })
  );

  // Save using the provided repository function
  if (typeof saveFunction === 'function') {
    return await saveFunction(userId, focusAreaInstances);
  }

  return focusAreaInstances;
}

/**
 * Clear cache for a specific user or all users
 * @param {string} [userId] - User ID (clears all if not provided)
 */
function clearCache(userId) {
  if (userId) {
    cache.delete(userId);
    log('debug', 'Cleared focus area cache for user', { userId });
  } else {
    cache.clear();
    log('debug', 'Cleared all focus area caches');
  }
}

module.exports = {
  generateFocusAreas,
  processFocusAreas,
  clearCache
}; 