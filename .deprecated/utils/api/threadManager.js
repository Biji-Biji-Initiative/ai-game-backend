/**
 * Thread Manager for OpenAI Responses API
 * 
 * Provides centralized management of conversation threads for the Responses API.
 * Handles the creation, retrieval, and updating of thread metadata, including
 * tracking response IDs which are essential for stateful conversations.
 * 
 * IMPORTANT: The Responses API maintains conversation state through previous_response_id
 * rather than thread IDs like the Assistants API.
 * 
 * @module threadManager
 * @requires logger
 */

const { logger } = require('../logger');
const { v4: uuidv4 } = require('uuid');

// In-memory store for threads (in production, this would be a database)
const threadStore = new Map();

/**
 * Creates a new conversation thread for the Responses API
 * @param {string} userId - User ID to associate with the thread
 * @param {string} [context='general'] - Context or purpose of the conversation
 * @param {Object} [metadata={}] - Additional metadata to store with the thread
 * @returns {Object} Thread metadata object
 */
const createThread = (userId, context = 'general', metadata = {}) => {
  if (!userId) {
    throw new Error('User ID is required to create a thread');
  }
  
  // Generate a unique thread identifier for our application
  const threadId = `resp_${userId}_${context}_${Date.now()}`;
  
  // Create thread metadata
  const threadMetadata = {
    id: threadId,
    userId,
    context,
    createdAt: new Date().toISOString(),
    lastResponseId: null, // Will store the most recent response ID
    messageCount: 0,
    metadata: { ...metadata }
  };
  
  // Store thread metadata
  threadStore.set(threadId, threadMetadata);
  
  logger.info('Created new thread for Responses API stateful conversation', { 
    threadId, 
    userId, 
    context 
  });
  
  return threadMetadata;
};

/**
 * Retrieves thread metadata by ID
 * @param {string} threadId - Thread ID to retrieve
 * @returns {Object|null} Thread metadata or null if not found
 * @throws {Error} If threadId is not provided
 */
const getThread = (threadId) => {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }
  
  const thread = threadStore.get(threadId);
  
  if (!thread) {
    logger.warn('Thread not found', { threadId });
    return null;
  }
  
  return thread;
};

/**
 * Updates a thread with the latest response ID from the Responses API
 * This is critical for maintaining conversation state
 * 
 * @param {string} threadId - Thread ID to update
 * @param {string} responseId - Response ID from the Responses API
 * @param {Object} [additionalData={}] - Additional data to store with the thread
 * @returns {Object} Updated thread metadata
 * @throws {Error} If thread not found or required parameters not provided
 */
const updateThreadWithResponse = (threadId, responseId, additionalData = {}) => {
  if (!threadId || !responseId) {
    throw new Error('Thread ID and response ID are required');
  }
  
  const thread = threadStore.get(threadId);
  
  if (!thread) {
    throw new Error(`Thread not found: ${threadId}`);
  }
  
  // Update the thread metadata
  const updatedMetadata = {
    ...thread,
    lastResponseId: responseId,
    messageCount: thread.messageCount + 1,
    lastUpdated: new Date().toISOString(),
    metadata: { ...thread.metadata, ...additionalData }
  };
  
  // Store updated metadata
  threadStore.set(threadId, updatedMetadata);
  
  logger.debug('Updated thread with new response ID', {
    threadId,
    responseId,
    messageCount: updatedMetadata.messageCount
  });
  
  return updatedMetadata;
};

/**
 * Gets all threads for a specific user
 * @param {string} userId - User ID to find threads for
 * @returns {Array<Object>} Array of thread metadata objects
 */
const getUserThreads = (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  const userThreads = [];
  
  // Find all threads for this user
  for (const thread of threadStore.values()) {
    if (thread.userId === userId) {
      userThreads.push(thread);
    }
  }
  
  return userThreads;
};

/**
 * Deletes a thread by ID
 * @param {string} threadId - Thread ID to delete
 * @returns {boolean} True if thread was deleted, false if not found
 */
const deleteThread = (threadId) => {
  if (!threadId) {
    throw new Error('Thread ID is required');
  }
  
  const deleted = threadStore.delete(threadId);
  
  if (deleted) {
    logger.info('Deleted thread', { threadId });
  } else {
    logger.warn('Failed to delete thread: not found', { threadId });
  }
  
  return deleted;
};

module.exports = {
  createThread,
  getThread,
  updateThreadWithResponse,
  getUserThreads,
  deleteThread
};
