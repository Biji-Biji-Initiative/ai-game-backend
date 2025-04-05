'use strict';

import AIStateManager from "#app/core/ai/ports/AIStateManager.js";

/**
 * Implementation of AIStateManager using OpenAI's thread-based state management
 * @implements {AIStateManager}
 */
class OpenAIThreadManagerAdapter extends AIStateManager {
    /**
     * Create a new OpenAIThreadManagerAdapter
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.openAIStateManager - OpenAI state manager instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ openAIStateManager, logger }) {
        super();
        if (!openAIStateManager) {
            throw new Error('OpenAI state manager is required for OpenAIThreadManagerAdapter');
        }
        this.openAIStateManager = openAIStateManager;
        this.logger = logger;
    }

    /**
     * Find or create a thread for conversation state
     * @param {string} userId - The user ID
     * @param {string} context - The conversation context
     * @param {Object} metadata - Additional metadata for the conversation
     * @returns {Promise<Object>} - The conversation state with thread_id
     */
    async findOrCreateConversationState(userId, context, metadata = {}) {
        this.logger?.debug('Finding or creating thread for conversation', {
            userId,
            context,
            hasMetadata: Object.keys(metadata).length > 0
        });
        
        const state = await this.openAIStateManager.findOrCreateConversationState(userId, context, metadata);
        
        // Log thread creation or retrieval
        if (state.isNew) {
            this.logger?.info('Created new thread for conversation', {
                userId,
                context,
                threadId: state.threadId
            });
        } else {
            this.logger?.debug('Retrieved existing thread for conversation', {
                userId,
                context,
                threadId: state.threadId
            });
        }
        
        return state;
    }

    /**
     * Get the last response ID for a conversation thread
     * @param {string} threadId - The thread ID
     * @returns {Promise<string|null>} - The last response ID or null if none exists
     */
    async getLastResponseId(threadId) {
        this.logger?.debug('Getting last response ID for thread', { threadId });
        const responseId = await this.openAIStateManager.getLastResponseId(threadId);
        return responseId;
    }

    /**
     * Update the last response ID for a conversation thread
     * @param {string} threadId - The thread ID
     * @param {string} responseId - The new response ID
     * @returns {Promise<Object>} - The updated conversation state
     */
    async updateLastResponseId(threadId, responseId) {
        this.logger?.debug('Updating last response ID for thread', {
            threadId,
            hasResponseId: !!responseId
        });
        
        const state = await this.openAIStateManager.updateLastResponseId(threadId, responseId);
        return state;
    }
    
    /**
     * Add a message to a thread
     * @param {string} threadId - The thread ID
     * @param {Object} message - The message to add
     * @returns {Promise<Object>} - The added message
     */
    async addMessageToThread(threadId, message) {
        this.logger?.debug('Adding message to thread', {
            threadId,
            role: message.role,
            contentLength: message.content ? message.content.length : 0
        });
        
        const result = await this.openAIStateManager.addMessageToThread(threadId, message);
        return result;
    }
    
    /**
     * List messages in a thread
     * @param {string} threadId - The thread ID
     * @param {Object} options - Options for listing messages
     * @returns {Promise<Array>} - The messages in the thread
     */
    async listThreadMessages(threadId, options = {}) {
        this.logger?.debug('Listing messages in thread', {
            threadId,
            hasOptions: Object.keys(options).length > 0
        });
        
        const messages = await this.openAIStateManager.listThreadMessages(threadId, options);
        
        this.logger?.debug('Retrieved thread messages', {
            threadId,
            messageCount: messages.length
        });
        
        return messages;
    }
    
    /**
     * Delete a thread
     * @param {string} threadId - The thread ID to delete
     * @returns {Promise<boolean>} - True if deletion was successful
     */
    async deleteThread(threadId) {
        this.logger?.debug('Deleting thread', { threadId });
        
        const success = await this.openAIStateManager.deleteThread(threadId);
        
        if (success) {
            this.logger?.info('Successfully deleted thread', { threadId });
        } else {
            this.logger?.warn('Failed to delete thread', { threadId });
        }
        
        return success;
    }
}

export { OpenAIThreadManagerAdapter };
export default OpenAIThreadManagerAdapter;
