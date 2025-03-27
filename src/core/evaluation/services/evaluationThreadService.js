/**
 * Evaluation Thread Service
 * 
 * Manages conversation threads for evaluation using OpenAI Responses API
 * 
 * @module evaluationThreadService
 * @requires responsesApiClient
 * @requires logger
 */

const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../../core/infra/logging/logger');
const responsesApiClient = require('../../../core/infra/api/responsesApiClient');

// Helper function for logging if logger exists
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
    logger[level](message, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](message, meta);
  }
}

/**
 * Create a new thread for evaluations
 * @param {string} userId - User identifier 
 * @returns {Promise<Object>} Thread metadata
 */
async function createEvaluationThread(userId) {
  try {
    log('info', 'Creating new evaluation thread', { userId });
    
    // Use responsesApiClient to create a thread with proper context
    const threadMetadata = responsesApiClient.createThread(userId, 'evaluation');
    
    log('info', 'Successfully created evaluation thread', { 
      userId, 
      threadId: threadMetadata.id 
    });
    
    return threadMetadata;
  } catch (error) {
    log('error', 'Error creating evaluation thread', { 
      error: error.message, 
      userId 
    });
    throw error;
  }
}

/**
 * Create a thread for specific challenge evaluation
 * @param {string} userId - User identifier
 * @param {string} challengeId - Challenge identifier
 * @returns {Promise<Object>} Thread metadata
 */
async function createChallengeEvaluationThread(userId, challengeId) {
  try {
    log('info', 'Creating new challenge-specific evaluation thread', { userId, challengeId });
    
    // Use responsesApiClient to create a thread with evaluation context
    const threadMetadata = responsesApiClient.createThread(
      userId, 
      `challenge-evaluation-${challengeId}`
    );
    
    log('info', 'Successfully created challenge evaluation thread', { 
      userId, 
      challengeId,
      threadId: threadMetadata.id 
    });
    
    return threadMetadata;
  } catch (error) {
    log('error', 'Error creating challenge evaluation thread', { 
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
  createEvaluationThread,
  createChallengeEvaluationThread,
  getThreadById,
  updateThreadWithResponse
}; 