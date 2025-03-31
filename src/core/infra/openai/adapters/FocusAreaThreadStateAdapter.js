import FocusAreaThreadStatePort from "@/core/focusArea/ports/FocusAreaThreadStatePort.js";
import { focusAreaLogger } from "@/core/infra/logging/domainLogger.js";
import { FocusAreaError } from "@/core/focusArea/errors/focusAreaErrors.js";
'use strict';

// Define a constant for the context prefix
const FOCUS_AREA_CONTEXT_PREFIX = 'focus_area_';

/**
 * Adapter implementation of FocusAreaThreadStatePort using OpenAIStateManager
 * @implements {FocusAreaThreadStatePort}
 */
class FocusAreaThreadStateAdapter extends FocusAreaThreadStatePort {
    /**
     * Create a new FocusAreaThreadStateAdapter
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.openAIStateManager - OpenAI state manager instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ openAIStateManager, logger }) {
        super();
        
        if (!openAIStateManager) {
            throw new Error('OpenAIStateManager is required for FocusAreaThreadStateAdapter');
        }
        
        this.openAIStateManager = openAIStateManager;
        this.logger = logger || focusAreaLogger.child('threadAdapter');
    }

    /**
     * Generate a unique context identifier for a focus area thread
     * @param {string} userId - User ID to generate context for
     * @returns {string} Unique context identifier
     */
    generateContextId(userId) {
        return `${FOCUS_AREA_CONTEXT_PREFIX}${userId}`;
    }

    /**
     * Create a new thread for focus area generation
     * @param {string} userId - User ID for whom to create the thread
     * @param {Object} metadata - Additional metadata for the thread
     * @returns {Promise<string>} Thread/State ID
     */
    async createThread(userId, metadata = {}) {
        if (!userId) {
            throw new FocusAreaError('User ID is required to create a focus area thread');
        }

        this.logger.info('Creating new focus area conversation state', {
            userId
        });

        // Create a unique context identifier
        const context = this.generateContextId(userId);

        // Create thread metadata for storage
        const threadMetadata = {
            type: 'focus-area',
            purpose: 'Generate personalized focus areas for user',
            ...metadata
        };

        // Create persistent conversation state
        const state = await this.openAIStateManager.createConversationState(userId, context, threadMetadata);
        const threadId = state.id;

        if (!threadId) {
            throw new FocusAreaError('Failed to create conversation state for focus area generation');
        }

        this.logger.info('Successfully created focus area conversation state', {
            userId,
            threadId,
            context
        });

        return threadId;
    }

    /**
     * Get an existing thread for a user or create a new one
     * @param {string} userId - User ID for whom to find or create a thread
     * @param {Object} metadata - Additional metadata for the thread
     * @returns {Promise<string>} Thread/State ID
     */
    async findOrCreateThread(userId, metadata = {}) {
        if (!userId) {
            throw new FocusAreaError('User ID is required');
        }

        this.logger.info('Finding or creating focus area conversation state', {
            userId
        });

        // Generate context from userId
        const context = this.generateContextId(userId);

        // Create thread metadata for storage
        const threadMetadata = {
            type: 'focus-area',
            purpose: 'Generate personalized focus areas for user',
            ...metadata
        };

        // Find or create persistent conversation state
        const state = await this.openAIStateManager.findOrCreateConversationState(userId, context, threadMetadata);
        return state.id;
    }

    /**
     * Get the last response ID from a thread
     * @param {string} threadId - Thread ID to get last response from
     * @returns {Promise<string|null>} Last response ID or null
     */
    async getLastResponseId(threadId) {
        if (!threadId) {
            throw new FocusAreaError('Thread ID is required');
        }

        try {
            return await this.openAIStateManager.getLastResponseId(threadId);
        } catch (error) {
            this.logger.warn('Error retrieving last response ID', {
                error: error.message,
                threadId
            });
            return null;
        }
    }

    /**
     * Update thread with new response ID
     * @param {string} threadId - Thread ID to update
     * @param {string} responseId - Response ID to associate with the thread
     * @returns {Promise<boolean>} Success status
     */
    async updateWithResponseId(threadId, responseId) {
        if (!threadId || !responseId) {
            return false;
        }

        await this.openAIStateManager.updateLastResponseId(threadId, responseId);
        
        this.logger.debug('Updated conversation state with response ID', {
            threadId,
            responseId
        });
        
        return true;
    }
}

export default FocusAreaThreadStateAdapter; 