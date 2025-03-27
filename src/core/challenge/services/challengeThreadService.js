/**
 * Challenge Thread Service
 * 
 * Manages conversation threads for challenge generation and evaluation
 * using OpenAI Responses API
 * 
 * @module challengeThreadService
 * @requires responsesApiClient
 * @requires logger
 */

const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../../core/infra/logging/logger');
const promptBuilder = require('../../prompt/promptBuilder');
const responsesApiClient = require('../../../core/infra/api/responsesApiClient');

/**
 * Create a new thread for challenge generation 
 * @param {string} userId - User identifier 
 * @returns {Promise<Object>} Thread metadata
 */
async function createChallengeThread(userId) {
  try {
    logger.info('Creating new challenge thread', { userId });
    
    // Use responsesApiClient to create a thread with proper context
    const threadMetadata = responsesApiClient.createThread(userId, 'challenge');
    
    logger.info('Successfully created challenge thread', { 
      userId, 
      threadId: threadMetadata.id 
    });
    
    return threadMetadata;
  } catch (error) {
    logger.error('Error creating challenge thread', { 
      error: error.message, 
      userId 
    });
    throw error;
  }
}

/**
 * Create a thread for challenge evaluation
 * @param {string} userId - User identifier
 * @param {string} challengeId - Challenge identifier
 * @returns {Promise<Object>} Thread metadata
 */
async function createEvaluationThread(userId, challengeId) {
  try {
    logger.info('Creating new evaluation thread', { userId, challengeId });
    
    // Use responsesApiClient to create a thread with evaluation context
    const threadMetadata = responsesApiClient.createThread(
      userId, 
      `challenge-evaluation-${challengeId}`
    );
    
    logger.info('Successfully created evaluation thread', { 
      userId, 
      challengeId,
      threadId: threadMetadata.id 
    });
    
    return threadMetadata;
  } catch (error) {
    logger.error('Error creating evaluation thread', { 
      error: error.message, 
      userId,
      challengeId
    });
    throw error;
  }
}

/**
 * Get thread metadata by ID
 * @param {string} threadId - Thread ID
 * @returns {Object|null} Thread metadata or null if not found
 */
function getThreadById(threadId) {
  // In a real implementation, this would retrieve thread metadata from storage
  // For now, we'll create a basic metadata object
  if (!threadId) return null;
  
  return {
    id: threadId,
    createdAt: new Date().toISOString(),
    lastResponseId: null,
    messageCount: 0
  };
}

/**
 * Update thread with a new response ID
 * @param {Object} threadMetadata - Thread metadata object
 * @param {string} responseId - New response ID from the Responses API
 * @returns {Object} Updated thread metadata
 */
function updateThreadWithResponse(threadMetadata, responseId) {
  if (!threadMetadata || !responseId) {
    throw new Error('Thread metadata and response ID are required');
  }
  
  return responsesApiClient.updateThreadWithResponse(threadMetadata, responseId);
}

module.exports = {
  createChallengeThread,
  createEvaluationThread,
  getThreadById,
  updateThreadWithResponse
}; 