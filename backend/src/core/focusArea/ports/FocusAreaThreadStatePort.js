'use strict';
/**
 * FocusAreaThreadStatePort
 *
 * This interface defines the contract for managing focus area thread state.
 * It follows the port/adapter pattern to keep infrastructure details out of the domain.
 */
/**
 * @interface FocusAreaThreadStatePort
 */
class FocusAreaThreadStatePort {
    /**
     * Generate a unique context identifier for a focus area thread
     * @param {string} userId - User ID to generate context for
     * @returns {string} Unique context identifier
     */
    generateContextId(userId) {
        throw new Error('Method not implemented');
    }

    /**
     * Create a new thread for focus area generation
     * @param {string} userId - User ID for whom to create the thread
     * @param {Object} metadata - Additional metadata for the thread
     * @returns {Promise<string>} Thread/State ID
     */
    async createThread(userId, metadata = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get an existing thread for a user or create a new one
     * @param {string} userId - User ID for whom to find or create a thread
     * @param {Object} metadata - Additional metadata for the thread
     * @returns {Promise<string>} Thread/State ID
     */
    async findOrCreateThread(userId, metadata = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get the last response ID from a thread
     * @param {string} threadId - Thread ID to get last response from
     * @returns {Promise<string|null>} Last response ID or null
     */
    async getLastResponseId(threadId) {
        throw new Error('Method not implemented');
    }

    /**
     * Update thread with new response ID
     * @param {string} threadId - Thread ID to update
     * @param {string} responseId - Response ID to associate with the thread
     * @returns {Promise<boolean>} Success status
     */
    async updateWithResponseId(threadId, responseId) {
        throw new Error('Method not implemented');
    }
}

export default FocusAreaThreadStatePort; 