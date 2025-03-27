/**
 * Focus Area Thread Service
 * 
 * Manages conversation threads for focus area generation
 * Follows domain-driven design principles for separation of concerns
 * 
 * @module focusAreaThreadService
 * @requires responsesApiClient
 * @requires logger
 */

const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../../core/infra/logging/logger');
const promptBuilder = require('../../prompt/promptBuilder');
const responsesApiClient = require('../../../core/infra/api/responsesApiClient');

// In-memory store for threads (in production, this would be in the database)
const threadStore = new Map();

/**
 * Create a new thread for focus area generation
 * @param {string} userId User ID
 * @param {Object} metadata Additional metadata for the thread
 * @returns {Promise<string>} Thread ID
 */
async function createThread(userId, metadata = {}) {
  if (!userId) {
    throw new Error('User ID is required to create a focus area thread');
  }

  logger.info('Creating new focus area thread', { userId });

  try {
    // Create thread metadata using Responses API client
    const threadMetadata = responsesApiClient.createThread(userId, 'focus-area');
    
    // Add custom metadata
    threadMetadata.metadata = {
      type: 'focus-area',
      purpose: 'Generate personalized focus areas for user',
      ...metadata
    };
    
    // Store the thread metadata
    threadStore.set(threadMetadata.id, threadMetadata);

    const threadId = threadMetadata.id;
    
    if (!threadId) {
      throw new Error('Failed to create thread for focus area generation');
    }

    logger.info('Successfully created focus area thread', { userId, threadId });
    return threadId;
  } catch (error) {
    logger.error('Error creating focus area thread', {
      error: error.message,
      userId
    });
    throw error;
  }
}

/**
 * Get the last response ID from a thread
 * @param {string} threadId Thread ID
 * @returns {Promise<string|null>} Last response ID or null
 */
async function getLastResponseId(threadId) {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }

  try {
    // Get thread metadata from store
    const threadMetadata = threadStore.get(threadId);
    
    if (!threadMetadata) {
      logger.warn('Thread not found', { threadId });
      return null;
    }
    
    return threadMetadata.lastResponseId || null;
  } catch (error) {
    logger.warn('Error retrieving last response ID', {
      error: error.message,
      threadId
    });
    return null;
  }
}

/**
 * Update thread with new response ID
 * @param {string} threadId Thread ID
 * @param {string} responseId Response ID
 * @returns {Promise<boolean>} Success status
 */
async function updateWithResponseId(threadId, responseId) {
  if (!threadId || !responseId) {
    return false;
  }

  try {
    // Get thread metadata from store
    const threadMetadata = threadStore.get(threadId);
    
    if (!threadMetadata) {
      logger.warn('Thread not found for update', { threadId });
      return false;
    }
    
    // Update thread metadata using Responses API client
    const updatedMetadata = responsesApiClient.updateThreadWithResponse(threadMetadata, responseId);
    
    // Store updated metadata
    threadStore.set(threadId, updatedMetadata);
    
    logger.debug('Updated thread with response ID', { threadId, responseId });
    return true;
  } catch (error) {
    logger.warn('Error updating thread with response ID', {
      error: error.message,
      threadId
    });
    return false;
  }
}

/**
 * Get all focus area threads for a user
 * @param {string} userId User ID
 * @returns {Promise<Array>} List of thread metadata
 */
async function getUserThreads(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userThreads = [];
    
    // Find all threads for this user
    for (const thread of threadStore.values()) {
      if (thread.userId === userId && 
          (thread.context === 'focus-area' || thread.metadata?.type === 'focus-area')) {
        userThreads.push(thread);
      }
    }
    
    logger.info('Retrieved user focus area threads', { userId, count: userThreads.length });
    
    return userThreads;
  } catch (error) {
    logger.error('Error retrieving user focus area threads', {
      error: error.message,
      userId
    });
    return [];
  }
}

module.exports = {
  createThread,
  getLastResponseId,
  updateWithResponseId,
  getUserThreads
}; 