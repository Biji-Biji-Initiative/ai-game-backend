"../../../ai/ports/AIStateManager.js;
'use strict';
/**
 * Implementation of AIStateManager using OpenAI's state manager
 * @implements {AIStateManager}
 */
class OpenAIStateManagerAdapter extends AIStateManager {
    /**
     * Create a new OpenAIStateManagerAdapter
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.openAIStateManager - OpenAI state manager instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ openAIStateManager, logger }) {
        super();
        if (!openAIStateManager) {
            throw new Error('OpenAI state manager is required for OpenAIStateManagerAdapter');
        }
        this.openAIStateManager = openAIStateManager;
        this.logger = logger;
    }
    /**
     * Find or create a conversation state
     * @param {string} userId - The user ID
     * @param {string} context - The conversation context
     * @param {Object} metadata - Additional metadata for the conversation
     * @returns {Promise<Object>} - The conversation state
     */
    async findOrCreateConversationState(userId, context, metadata = {}) {
        this.logger?.debug('Finding or creating conversation state', {
            userId,
            context,
            hasMetadata: Object.keys(metadata).length > 0
        });
        const state = await this.openAIStateManager.findOrCreateConversationState(userId, context, metadata);
        return state;
    }
    /**
     * Get the last response ID for a conversation
     * @param {string} stateId - The conversation state ID
     * @returns {Promise<string|null>} - The last response ID or null if none exists
     */
    async getLastResponseId(stateId) {
        this.logger?.debug('Getting last response ID', { stateId });
        const responseId = await this.openAIStateManager.getLastResponseId(stateId);
        return responseId;
    }
    /**
     * Update the last response ID for a conversation
     * @param {string} stateId - The conversation state ID
     * @param {string} responseId - The new response ID
     * @returns {Promise<Object>} - The updated conversation state
     */
    async updateLastResponseId(stateId, responseId) {
        this.logger?.debug('Updating last response ID', {
            stateId,
            hasResponseId: !!responseId
        });
        const state = await this.openAIStateManager.updateLastResponseId(stateId, responseId);
        return state;
    }
}
export default OpenAIStateManagerAdapter;
"