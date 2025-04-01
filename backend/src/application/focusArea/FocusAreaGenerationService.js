import { focusAreaLogger } from "#app/core/infra/logging/domainLogger.js";
import { FocusAreaGenerationError } from "#app/core/focusArea/errors/focusAreaErrors.js";
import { withServiceErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
import { formatJson } from "#app/core/infra/openai/responseHandler.js";
import FocusArea from "#app/core/focusArea/models/FocusArea.js";
import promptBuilder from "#app/core/prompt/promptBuilder.js";
'use strict';

/**
 * Focus Area Generation Service
 *
 * Application service for generating personalized focus areas based on user data.
 * This service orchestrates between multiple domains (user, challenge, progress)
 * and coordinates with external AI services.
 */

// Create an error mapper for the focus area generation service
const focusAreaGenerationErrorMapper = createErrorMapper({
    'FocusAreaGenerationError': FocusAreaGenerationError
}, FocusAreaGenerationError);

/**
 * Service that generates personalized focus areas for users
 */
class FocusAreaGenerationService {
    /**
     * Create a new FocusAreaGenerationService
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.openAIClient - OpenAI client for AI operations
     * @param {Object} dependencies.promptBuilder - Prompt builder for generating prompts
     * @param {Object} dependencies.MessageRole - Message roles constants
     * @param {Object} dependencies.openAIStateManager - OpenAI state manager for managing conversation state
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ 
        openAIClient, 
        promptBuilder: customPromptBuilder = promptBuilder, 
        formatJson: customFormatJson = formatJson, 
        FocusArea: CustomFocusArea = FocusArea, 
        MessageRole, 
        openAIStateManager, 
        logger 
    }) {
        // Validate critical dependencies
        if (!openAIClient) {
            throw new Error('openAIClient is required for FocusAreaGenerationService');
        }
        if (!openAIStateManager) {
            throw new Error('openAIStateManager is required for FocusAreaGenerationService');
        }
        if (!MessageRole) {
            throw new Error('MessageRole is required for FocusAreaGenerationService');
        }

        // Store dependencies
        this.openAIClient = openAIClient;
        this.promptBuilder = customPromptBuilder;
        this.formatJson = customFormatJson;
        this.FocusArea = CustomFocusArea;
        this.MessageRole = MessageRole;
        this.openAIStateManager = openAIStateManager;
        this.logger = logger || focusAreaLogger.child({ service: 'FocusAreaGenerationService' });

        // Apply standardized error handling to methods
        this.generateFocusAreas = withServiceErrorHandling(this.generateFocusAreas.bind(this), {
            methodName: 'generateFocusAreas',
            domainName: 'focusArea',
            logger: this.logger,
            errorMapper: focusAreaGenerationErrorMapper
        });
    }

    /**
     * Generate personalized focus areas based on user profile and history
     * @param {Object} userData - User profile and data
     * @param {Array} challengeHistory - User's challenge history
     * @param {Object} progressData - User's progression data
     * @param {Object} options - Additional options
     * @param {string} options.threadId - Thread ID for stateful conversation
     * @param {string} options.previousResponseId - Previous response ID for context
     * @param {number} options.temperature - Temperature for generation
     * @param {number} options.count - Number of focus areas to generate
     * @returns {Promise<Array<FocusArea>>} Generated focus areas
     * @throws {FocusAreaGenerationError} If there's an issue with the generation
     */
    async generateFocusAreas(userData, challengeHistory = [], progressData = {}, options = {}) {
        // Extract user data
        const userId = userData.id || userData.email;
        if (!userId) {
            throw new FocusAreaGenerationError('User ID or email is required for focus area generation');
        }
        const threadId = options.threadId;
        if (!threadId) {
            throw new FocusAreaGenerationError('Thread ID is required for focus area generation');
        }

        this.logger.info('Generating focus areas', {
            userId,
            threadId,
            hasTraits: Object.keys(userData.personality_traits || {}).length > 0
        });

        // Get or create a conversation state for this focus area thread
        const conversationState = await this.openAIStateManager.findOrCreateConversationState(
            userId, 
            `focus_area_${threadId}`, 
            { createdAt: new Date().toISOString() }
        );

        // Get the previous response ID for conversation continuity
        const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);

        // Extract user traits data
        const userTraits = {
            traits: userData.personality_traits || {},
            attitudes: userData.ai_attitudes || {},
            professional_title: userData.professional_title || '',
            location: userData.location || ''
        };

        // Configure additional options
        const promptOptions = {
            count: options.count || 3,
            creativeVariation: options.creativeVariation || 0.7,
            includeRationale: options.includeRationale !== false,
            includeStrategies: options.includeStrategies !== false,
            threadId,
            previousResponseId: previousResponseId
        };

        // Use the prompt builder to create a focus area prompt
        const { prompt, systemMessage } = await this.promptBuilder.buildPrompt('focus-area', {
            user: userTraits,
            challengeHistory,
            progressData,
            options: promptOptions
        });

        this.logger.debug('Generated focus area prompt', {
            promptLength: prompt.length,
            hasSystemMessage: !!systemMessage,
            userId
        });

        // Configure API call options for Responses API
        const apiOptions = {
            model: options.model || 'gpt-4o',
            temperature: options.temperature || 0.8,
            responseFormat: 'json',
            previousResponseId: previousResponseId
        };

        // Create messages for the Responses API
        const messages = [
            {
                role: this.MessageRole.SYSTEM,
                content: systemMessage || `You are an AI communication coach specializing in personalized focus area generation. 
Always return your response as a JSON object with a 'focusAreas' array containing the focus areas. 
Each focus area should have name, description, priorityLevel, rationale, and improvementStrategies.
Format your entire response as valid, parsable JSON with no markdown formatting.`
            },
            {
                role: this.MessageRole.USER,
                content: prompt
            }
        ];

        // Call the OpenAI Responses API for focus area generation
        this.logger.debug('Calling OpenAI Responses API', {
            userId,
            threadId
        });

        // Send the request to the OpenAI client
        const response = await this.openAIClient.sendJsonMessage(messages, apiOptions);

        // Update the conversation state with the new response ID
        await this.openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);

        // Validate and process the response
        if (!response || !response.data) {
            throw new FocusAreaGenerationError('Invalid response format from OpenAI API');
        }

        // Format the response using the JSON formatter
        const responseData = this.formatJson(response.data);

        // Validate the focus areas data
        if (!responseData.focusAreas || !Array.isArray(responseData.focusAreas)) {
            throw new FocusAreaGenerationError('Generated focus areas missing required fields');
        }

        const focusAreas = responseData.focusAreas;

        // Convert to domain objects
        const result = focusAreas.map((area) => {
            // Create priorityLevel from 1-3 based on high/medium/low
            const priorityLevel = area.priorityLevel === 'high' ? 1 :
                area.priorityLevel === 'medium' ? 2 : 3;

            // Create domain model instance
            return new this.FocusArea({
                userId,
                name: area.name,
                description: area.description || '',
                priority: priorityLevel,
                metadata: {
                    responseId: response.responseId,
                    rationale: area.rationale,
                    improvementStrategies: area.improvementStrategies || [],
                    recommendedChallengeTypes: area.recommendedChallengeTypes || []
                }
            });
        });

        this.logger.info('Successfully generated personalized focus areas', {
            count: result.length,
            userId
        });

        return result;
    }
}

export default FocusAreaGenerationService; 