import { v4 as uuidv4 } from "uuid";
import promptBuilder from "#app/core/prompt/promptBuilder.js";
import { PROMPT_TYPES } from "#app/core/prompt/promptTypes.js";
import Evaluation from "#app/core/evaluation/models/Evaluation.js";
import messageFormatter from "#app/core/infra/openai/messageFormatter.js";
import { EvaluationError, EvaluationNotFoundError, EvaluationValidationError, EvaluationProcessingError } from "#app/core/evaluation/errors/EvaluationErrors.js";
import { createErrorMapper, withServiceErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";
'use strict';
const { formatForResponsesApi } = messageFormatter;
// Create an error mapper for services
const evaluationServiceErrorMapper = createErrorMapper({
    EvaluationNotFoundError: EvaluationNotFoundError,
    EvaluationValidationError: EvaluationValidationError,
    EvaluationProcessingError: EvaluationProcessingError,
    Error: EvaluationError,
}, EvaluationError);
/**
 * Service for generating and processing evaluations
 */
class EvaluationService {
    /**
     * Create a new EvaluationService
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.aiClient - AI client port interface
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.evaluationRepository - Repository for evaluations
     * @param {Object} dependencies.evaluationCategoryRepository - Repository for evaluation categories
     * @param {Object} dependencies.aiStateManager - AI state manager port interface
     * @param {Object} dependencies.evaluationDomainService - Domain service for evaluations
     * @param {Object} dependencies.eventBus - Event bus for publishing domain events
     */
    constructor({ aiClient, logger, evaluationRepository, evaluationCategoryRepository, aiStateManager, evaluationDomainService, eventBus }) {
        if (!aiClient) {
            if (process.env.NODE_ENV === 'production') {
                throw new ConfigurationError('aiClient is required for EvaluationService in production mode', {
                    serviceName: 'EvaluationService',
                    dependencyName: 'aiClient'
                });
            } else {
                throw new Error('aiClient is required for EvaluationService');
            }
        }
        
        if (process.env.NODE_ENV === 'production') {
            // Check for other required dependencies in production
            if (!evaluationRepository) {
                throw new ConfigurationError('evaluationRepository is required for EvaluationService in production mode', {
                    serviceName: 'EvaluationService',
                    dependencyName: 'evaluationRepository'
                });
            }
            
            if (!aiStateManager) {
                throw new ConfigurationError('aiStateManager is required for EvaluationService in production mode', {
                    serviceName: 'EvaluationService',
                    dependencyName: 'aiStateManager'
                });
            }
        }
        
        this.aiClient = aiClient;
        this.logger = logger;
        this.evaluationRepository = evaluationRepository;
        this.evaluationCategoryRepository = evaluationCategoryRepository;
        this.aiStateManager = aiStateManager;
        this.evaluationDomainService = evaluationDomainService;
        this.eventBus = eventBus;
        
        // Apply standardized error handling to all public methods
        this.evaluateResponse = withServiceErrorHandling(
            this.evaluateResponse.bind(this),
            {
                methodName: 'evaluateResponse',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationServiceErrorMapper
            }
        );
        
        this.streamEvaluation = withServiceErrorHandling(
            this.streamEvaluation.bind(this),
            {
                methodName: 'streamEvaluation',
                domainName: 'evaluation',
                logger: this.logger,
                errorMapper: evaluationServiceErrorMapper
            }
        );
        
        // Add error handling for other public methods that may exist
        if (typeof this.getEvaluationById === 'function') {
            this.getEvaluationById = withServiceErrorHandling(
                this.getEvaluationById.bind(this),
                {
                    methodName: 'getEvaluationById',
                    domainName: 'evaluation',
                    logger: this.logger,
                    errorMapper: evaluationServiceErrorMapper
                }
            );
        }
        
        if (typeof this.getEvaluationsForUser === 'function') {
            this.getEvaluationsForUser = withServiceErrorHandling(
                this.getEvaluationsForUser.bind(this),
                {
                    methodName: 'getEvaluationsForUser',
                    domainName: 'evaluation',
                    logger: this.logger,
                    errorMapper: evaluationServiceErrorMapper
                }
            );
        }
        
        if (typeof this.getEvaluationsForChallenge === 'function') {
            this.getEvaluationsForChallenge = withServiceErrorHandling(
                this.getEvaluationsForChallenge.bind(this),
                {
                    methodName: 'getEvaluationsForChallenge',
                    domainName: 'evaluation',
                    logger: this.logger,
                    errorMapper: evaluationServiceErrorMapper
                }
            );
        }
        
        if (typeof this.processStreamedEvaluation === 'function') {
            this.processStreamedEvaluation = withServiceErrorHandling(
                this.processStreamedEvaluation.bind(this),
                {
                    methodName: 'processStreamedEvaluation',
                    domainName: 'evaluation',
                    logger: this.logger,
                    errorMapper: evaluationServiceErrorMapper
                }
            );
        }
    }
    /**
     * Evaluate a user's response to a challenge with deep personalization
     * @param {Object} challenge - Challenge object
     * @param {string|Array} userResponse - User's response (string or array of responses)
     * @param {Object} options - Additional options
     * @param {string} options.threadId - Thread ID for stateful conversation
     * @param {string} options.previousResponseId - Previous response ID for context
     * @param {number} options.temperature - Temperature for generation
     * @param {Object} options.user - User profile data for personalization
     * @param {Object} options.evaluationHistory - Previous evaluation data
     * @returns {Promise<Evaluation>} Personalized evaluation results
     */
    async evaluateResponse(challenge, userResponse, options = {}) {
        if (!challenge) {
            throw new Error('Challenge is required for evaluation');
        }
        if (!userResponse) {
            throw new Error('User response is required for evaluation');
        }
        const threadId = options.threadId;
        if (!threadId) {
            throw new Error('Thread ID is required for evaluation');
        }
        // Extract user ID from challenge or options
        const userId = challenge.userEmail || challenge.userId || options.user?.email || options.user?.id;
        if (!userId) {
            throw new Error('User ID or email is required for evaluation');
        }
        // Get or create a conversation state for this evaluation thread
        const conversationState = await this.aiStateManager.findOrCreateConversationState(userId, `evaluation_${threadId}`, { createdAt: new Date().toISOString() });
        // Get the previous response ID for conversation continuity
        const previousResponseId = await this.aiStateManager.getLastResponseId(conversationState.id);
        // Gather user and history data for personalization
        const user = options.user || { email: userId };
        const evaluationHistory = options.evaluationHistory || {};
        // Get challenge type name for more accurate evaluation
        const challengeTypeName = challenge.getChallengeTypeName ?
            challenge.getChallengeTypeName() :
            (challenge.typeMetadata?.name || challenge.challengeTypeCode || challenge.challengeType || 'standard');
        // Get format type name for more accurate evaluation
        const formatTypeName = challenge.getFormatTypeName ?
            challenge.getFormatTypeName() :
            (challenge.formatMetadata?.name || challenge.formatTypeCode || challenge.formatType || 'standard');
        // Get focus area for more accurate evaluation
        const focusArea = challenge.focusArea || options.focusArea || 'general';
        // Add type information to prompt options
        const promptOptions = {
            challengeTypeName,
            formatTypeName,
            focusArea,
            typeMetadata: challenge.typeMetadata || {},
            formatMetadata: challenge.formatMetadata || {},
            evaluationHistory,
            threadId,
            previousResponseId: previousResponseId
        };
        // Use the prompt builder to create a personalized evaluation prompt
        this.logger.debug('Generating personalized evaluation prompt', { challengeId: challenge.id });
        const { prompt } = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
            challenge,
            userResponse,
            user,
            evaluationHistory,
            options: promptOptions
        });
        this.logger.debug('Generated personalized evaluation prompt', {
            promptLength: prompt.length,
            challengeId: challenge.id,
            hasUserContext: !!options.user,
            hasEvaluationHistory: !!options.evaluationHistory
        });
        // Format messages for OpenAI API
        const messages = formatForResponsesApi(prompt, `You are an AI evaluation expert specializing in providing personalized feedback on ${challengeTypeName} challenges.
Always return your evaluation as a JSON object with category scores, overall score, detailed feedback, strengths with analysis, and personalized insights.
Format your response as valid, parsable JSON with no markdown formatting.
This is a ${formatTypeName} type challenge in the ${focusArea} focus area, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`);
        // Configure API call options for OpenAI API
        const apiOptions = {
            model: options.model || 'gpt-4o',
            temperature: options.temperature || 0.4, // Lower temperature for more consistent evaluations
            responseFormat: 'json',
            previousResponseId: previousResponseId
        };
        // Call the AI service for evaluation
        this.logger.debug('Calling AI service for personalized evaluation', {
            challengeId: challenge.id,
            threadId
        });
        const response = await this.aiClient.sendJsonMessage(messages, apiOptions);
        // Update the conversation state with the new response ID
        await this.aiStateManager.updateLastResponseId(conversationState.id, response.responseId);
        // Validate and process the response
        if (!response || !response.data) {
            throw new Error('Invalid evaluation response format from AI service');
        }
        // Extract evaluation data from response
        const evaluationData = response.data;
        // Create and return the evaluation entity
        const evaluation = new Evaluation({
            id: uuidv4(),
            challengeId: challenge.id,
            userId: userId,
            overallScore: evaluationData.overallScore || evaluationData.score,
            feedback: evaluationData.feedback,
            strengths: evaluationData.strengths,
            improvements: evaluationData.improvements,
            categoryScores: evaluationData.categoryScores,
            insights: evaluationData.insights,
            createdAt: new Date().toISOString(),
            metadata: {
                promptOptions,
                model: apiOptions.model,
                temperature: apiOptions.temperature,
                responseId: response.responseId,
                conversationId: conversationState.id
            }
        });
        // Publish evaluation created event
        if (this.eventBus) {
            this.eventBus.publish('evaluation.created', {
                evaluation,
                challenge,
                userResponse
            });
        }
        return evaluation;
    }
    /**
     * Stream an evaluation response with real-time updates
     * @param {Object} challenge - Challenge object
     * @param {string|Array} userResponse - User's response to evaluate
     * @param {Object} options - Additional options
     * @param {Function} onChunk - Callback for each chunk of streamed content
     * @returns {Promise<void>} - Resolves when streaming completes
     */
    async streamEvaluation(challenge, userResponse, options = {}, onChunk) {
        if (!challenge) {
            throw new Error('Challenge is required for evaluation');
        }
        if (!userResponse) {
            throw new Error('User response is required for evaluation');
        }
        if (typeof onChunk !== 'function') {
            throw new Error('onChunk callback is required for streaming evaluations');
        }
        const threadId = options.threadId || uuidv4();
        // Prepare messages similarly to evaluateResponse
        const promptOptions = {
            challengeTypeName: challenge.challengeTypeCode || 'standard',
            formatTypeName: challenge.formatTypeCode || 'standard',
            focusArea: challenge.focusArea || 'general'
        };
        const { prompt } = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
            challenge,
            userResponse,
            user: options.user,
            options: promptOptions
        });
        const messages = formatForResponsesApi(prompt, `You are an AI evaluation expert specializing in providing personalized feedback.`);
        // Configure streaming options
        const streamOptions = {
            model: options.model || 'gpt-4o',
            temperature: options.temperature || 0.4,
            onEvent: (eventType, data) => {
                if (eventType === 'content') {
                    onChunk(data.content);
                }
                else if (eventType === 'error') {
                    this.logger.error('Error streaming evaluation', { error: data });
                    throw new Error(data.message || 'Error streaming evaluation');
                }
            }
        };
        // Start streaming
        this.logger.debug('Starting evaluation stream', {
            challengeId: challenge.id,
            threadId
        });
        await this.aiClient.streamMessage(messages, streamOptions);
        this.logger.debug('Completed evaluation stream', {
            challengeId: challenge.id,
            threadId
        });
    }
}
export default EvaluationService;
