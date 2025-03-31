import { v4 as uuidv4 } from "uuid";
import errors from "@/core/infra/openai/errors.js";
'use strict';
const { OpenAIStateManagementError } = errors;
/**
 * Class for managing state persistence for OpenAI Responses API
 */
class OpenAIStateManager {
    /**
     * Create a new OpenAIStateManager
     * @param {object} options - OpenAIStateManager options
     * @param {object} options.openAIClient - OpenAI client for API calls
     * @param {object} options.logger - Logger instance
     * @param {object} [options.redisCache] - Optional Redis cache for state persistence
     */
    /**
     * Method constructor
     */
    constructor({ openAIClient, logger, redisCache }) {
        if (!openAIClient) {
            throw new OpenAIStateManagementError('OpenAI client is required for OpenAIStateManager');
        }
        if (!logger) {
            throw new OpenAIStateManagementError('Logger is required for OpenAIStateManager');
        }
        
        this.client = openAIClient;
        this.cache = redisCache; // Optional, can be null
        this.logger = logger.child({ service: 'OpenAIStateManager' });
    }
    /**
     * Creates a new state record for a conversation.
     * @param {string} userId - The user associated with the conversation.
     * @param {string} context - A string identifying the conversation's purpose (e.g., 'challenge_eval_123', 'focus_area_gen').
     * @param {object} [initialMetadata={}] - Any additional metadata to store.
     * @returns {Promise<object>} The created state record (including its ID).
     */
    /**
     * Method createConversationState
     */
    async createConversationState(userId, context, initialMetadata = {}) {
        if (!userId || !context) {
            throw new OpenAIStateManagementError('UserId and context are required to create conversation state');
        }
        
        const state = {
            id: uuidv4(), // Or generate ID based on userId/context if preferred & unique
            userId,
            context,
            lastResponseId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: initialMetadata,
        };
        
        try {
            // If we have a cache, store the state there
            if (this.cache) {
                const cacheKey = `openai:state:${userId}:${context}`;
                await this.cache.set(cacheKey, JSON.stringify(state), 60 * 60); // 1 hour TTL
            }
            
            this.logger.info('Created new conversation state', { stateId: state.id, userId, context });
            return state;
        }
        catch (error) {
            this.logger.error('Failed to create conversation state', {
                error: error.message, userId, context,
            });
            throw new OpenAIStateManagementError(`Error creating state: ${error.message}`, { userId, context });
        }
    }
    /**
     * Finds an existing conversation state or creates a new one.
     * @param {string} userId - The user associated with the conversation.
     * @param {string} context - A string identifying the conversation's purpose.
     * @param {object} [initialMetadata={}] - Metadata if creating a new state.
     * @returns {Promise<object>} The found or created state record.
     */
    /**
     * Method findOrCreateConversationState
     */
    async findOrCreateConversationState(userId, context, initialMetadata = {}) {
        if (!userId || !context) {
            throw new OpenAIStateManagementError('UserId and context are required');
        }
        
        try {
            // Attempt to find by userId and context
            let state = null;
            
            // If we have a cache, try to get the state from there
            if (this.cache) {
                const cacheKey = `openai:state:${userId}:${context}`;
                const cachedState = await this.cache.get(cacheKey);
                if (cachedState) {
                    state = JSON.parse(cachedState);
                    this.logger.debug('Found existing conversation state in cache', { stateId: state.id, userId, context });
                    return state;
                }
            }
            
            // If not found, create a new one
            this.logger.info('No existing state found, creating new one', { userId, context });
            return await this.createConversationState(userId, context, initialMetadata);
        }
        catch (error) {
            this.logger.error('Error finding/creating conversation state', {
                error: error.message, userId, context,
            });
            throw new OpenAIStateManagementError(`Error finding/creating state: ${error.message}`, { userId, context });
        }
    }
    /**
     * Retrieves the last response ID for a given conversation state.
     * @param {string} stateId - The unique ID of the conversation state record.
     * @returns {Promise<string|null>} The last response ID, or null if none.
     */
    /**
     * Method getLastResponseId
     */
    async getLastResponseId(stateId) {
        if (!stateId) {
            this.logger.warn('getLastResponseId called without stateId');
            return null; // Or throw? Depends on desired strictness.
        }
        
        try {
            // We can't directly get the state by ID without knowing the user/context
            // So we need to implement a workaround if this method is needed
            this.logger.warn('getLastResponseId not fully implemented with cache storage');
            return null;
        }
        catch (error) {
            this.logger.error('Failed to get last response ID', {
                error: error.message, stateId,
            });
            throw new OpenAIStateManagementError(`Error getting state: ${error.message}`, { stateId });
        }
    }
    /**
     * Updates the conversation state with the latest response ID.
     * @param {string} stateId - The unique ID of the conversation state record.
     * @param {string} newResponseId - The ID of the latest response from OpenAI.
     * @param {string} userId - User ID associated with this state
     * @param {string} context - Context associated with this state
     * @returns {Promise<void>}
     */
    /**
     * Method updateLastResponseId
     */
    async updateLastResponseId(stateId, newResponseId, userId, context) {
        if (!stateId || !newResponseId) {
            throw new OpenAIStateManagementError('StateId and newResponseId are required for update');
        }
        
        try {
            if (this.cache && userId && context) {
                const cacheKey = `openai:state:${userId}:${context}`;
                const cachedState = await this.cache.get(cacheKey);
                
                if (cachedState) {
                    const state = JSON.parse(cachedState);
                    state.lastResponseId = newResponseId;
                    state.updatedAt = new Date().toISOString();
                    
                    await this.cache.set(cacheKey, JSON.stringify(state), 60 * 60); // 1 hour TTL
                    this.logger.debug('Updated conversation state with new response ID', { stateId, newResponseId });
                    return;
                }
            }
            
            this.logger.warn('Could not update state (not found in cache or missing user/context)', { stateId });
        }
        catch (error) {
            this.logger.error('Failed to update last response ID', {
                error: error.message, stateId, newResponseId,
            });
            throw new OpenAIStateManagementError(`Error updating state: ${error.message}`, { stateId });
        }
    }
    /**
     * Deletes a conversation state record.
     * @param {string} stateId - The unique ID of the conversation state record.
     * @param {string} userId - User ID associated with this state
     * @param {string} context - Context associated with this state
     * @returns {Promise<boolean>} True if deleted, false otherwise.
     */
    /**
     * Method deleteConversationState
     */
    async deleteConversationState(stateId, userId, context) {
        if (!stateId) {
            throw new OpenAIStateManagementError('StateId is required for deletion');
        }
        
        try {
            if (this.cache && userId && context) {
                const cacheKey = `openai:state:${userId}:${context}`;
                await this.cache.del(cacheKey);
                this.logger.info('Deleted conversation state from cache', { stateId });
                return true;
            }
            
            this.logger.warn('Could not delete state (missing cache or user/context)', { stateId });
            return false;
        }
        catch (error) {
            this.logger.error('Error deleting conversation state', {
                error: error.message, stateId,
            });
            throw new OpenAIStateManagementError(`Error deleting state: ${error.message}`, { stateId });
        }
    }
}
export { OpenAIStateManager };
export default {
    OpenAIStateManager
};
