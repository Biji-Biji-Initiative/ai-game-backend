'use strict';
/**
 * AIStateManager Port
 *
 * This interface defines the contract for managing AI conversation state.
 * It follows the port/adapter pattern to keep infrastructure details out of the domain.
 */
/**
 * @interface AIStateManager
 */
class AIStateManager {
    /**
     * Find or create a conversation state
     * @param {string} userId - The user ID
     * @param {string} context - The conversation context
     * @param {Object} _metadata - Additional metadata for the conversation
     * @returns {Promise<Object>} - The conversation state
     */
    findOrCreateConversationState(userId, context, _metadata = {}) {
        throw new Error('Method not implemented');
    }
    /**
     * Get the last response ID for a conversation
     * @param {string} _stateId - The conversation state ID
     * @returns {Promise<string|null>} - The last response ID or null if none exists
     */
    getLastResponseId(_stateId) {
        throw new Error('Method not implemented');
    }
    /**
     * Update the last response ID for a conversation
     * @param {string} _stateId - The conversation state ID
     * @param {string} _responseId - The new response ID
     * @returns {Promise<Object>} - The updated conversation state
     */
    updateLastResponseId(_stateId, _responseId) {
        throw new Error('Method not implemented');
    }
}
export default AIStateManager;
