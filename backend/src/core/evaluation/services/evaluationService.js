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
        
        // Define getEvaluationById method if it doesn't exist (assuming repository has findById)
        if (typeof this.getEvaluationById !== 'function' && this.evaluationRepository) {
             /**
             * Get evaluation by ID (implementation if not already present)
             * @param {string} id - Evaluation ID
             * @returns {Promise<Evaluation|null>} Evaluation object or null if not found
             */
            this.getEvaluationById = async (id) => {
                 if (!this.evaluationRepository) {
                     this.logger.error('EvaluationRepository not available for getEvaluationById');
                     throw new EvaluationProcessingError('Evaluation service is not configured correctly.');
                 }
                 return await this.evaluationRepository.findById(id);
            };
        }
        
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
        
        // Wrap getEvaluationById if it exists (either originally or added above)
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
        
        // Define findById and wrap it, ensuring it calls the (potentially wrapped) getEvaluationById
        if (typeof this.getEvaluationById === 'function') {
             /**
             * Standardized method to get an evaluation by ID
             * @param {string} id - Evaluation ID
             * @returns {Promise<Evaluation|null>} Evaluation object or null if not found
             */
            this.findById = async (id) => {
                // Delegate to the potentially wrapped getEvaluationById
                return await this.getEvaluationById(id); 
            };
            
            this.findById = withServiceErrorHandling(
                this.findById.bind(this), // Bind the newly defined findById
                {
                    methodName: 'findById', 
                    domainName: 'evaluation',
                    logger: this.logger,
                    errorMapper: evaluationServiceErrorMapper
                }
            );
        } else {
             // Fallback if getEvaluationById could not be defined (e.g., no repository)
             this.findById = () => { 
                 this.logger.error('Cannot find evaluation by ID - service not configured correctly.');
                 throw new EvaluationProcessingError('Evaluation service is not configured correctly.'); 
             };        
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
            throw new EvaluationValidationError('Challenge is required for evaluation');
        }
        if (!userResponse) {
            throw new EvaluationValidationError('User response is required for evaluation');
        }
        const threadId = options.threadId;
        if (!threadId) {
            throw new EvaluationValidationError('Thread ID is required for evaluation');
        }
        // Extract user ID from challenge or options
        const userId = challenge.userId || options.user?.id; // Prefer userId if available on challenge
        if (!userId) {
            throw new EvaluationValidationError('User ID is required for evaluation');
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
            // Use ProcessingError for infra/external service issues
            throw new EvaluationProcessingError('Invalid evaluation response format from AI service'); 
        }
        // Extract evaluation data from response
        const evaluationData = response.data;
        // Create and return the evaluation entity
        const evaluation = new Evaluation({
            id: uuidv4(),
            challengeId: challenge.id,
            userId: userId,
            // Use data from the AI response, mapping keys if needed
            score: evaluationData.overallScore || evaluationData.score || 0,
            categoryScores: evaluationData.categoryScores || {},
            overallFeedback: evaluationData.feedback || evaluationData.overallFeedback || '',
            strengths: evaluationData.strengths || [],
            areasForImprovement: evaluationData.improvements || evaluationData.areasForImprovement || [],
            // Add other relevant fields from evaluationData
            strengthAnalysis: evaluationData.strengthAnalysis || [],
            improvementPlans: evaluationData.improvementPlans || [],
            nextSteps: evaluationData.nextSteps || '',
            recommendedResources: evaluationData.recommendedResources || [],
            recommendedChallenges: evaluationData.recommendedChallenges || [],
            userContext: evaluationData.userContext || options.user || {}, // Pass user context used
            challengeContext: evaluationData.challengeContext || { title: challenge.title, type: challenge.challengeType /*...*/ }, // Pass challenge context used
            growthMetrics: evaluationData.growthMetrics || {}, // From AI or calculated later?
            relevantCategories: evaluationData.relevantCategories || [], // From AI or calculated later?
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                promptOptions,
                model: apiOptions.model,
                temperature: apiOptions.temperature,
                responseId: response.responseId,
                conversationId: conversationState.id
            }
        }, { EventTypes: EventTypes }); // Pass EventTypes constant
        
        // Ensure the evaluation object adds the CREATED event within its constructor or a method
        // evaluation.addDomainEvent(EventTypes.EVALUATION_CREATED, { ... });

        // Persist the evaluation using the repository
        // The repository's save method (using withTransaction) will handle event publishing
        this.logger.info('Saving evaluation', { evaluationId: evaluation.id, userId: userId });
        const savedEvaluation = await this.evaluationRepository.save(evaluation);
        this.logger.info('Evaluation saved successfully', { evaluationId: savedEvaluation.id });
        
        // REMOVE direct event publishing
        /*
        if (this.eventBus) {
            this.eventBus.publish('evaluation.created', {
                evaluation,
                challenge,
                userResponse
            });
        }
        */
        
        return savedEvaluation; // Return the saved entity
    }
    /**
     * Stream an evaluation response with real-time updates
     * @param {Object} challenge - Challenge object
     * @param {string|Array} userResponse - User's response to evaluate
     * @param {Object} options - Additional options
     * @param {Function} onChunk - Callback for each chunk of streamed content
     * @param {Function} onComplete - Callback for when streaming is complete
     * @param {Function} onError - Callback for errors during streaming
     * @returns {Promise<void>} - Resolves when streaming completes
     */
    async streamEvaluation(challenge, userResponse, options = {}, callbacks) { 
        // Destructure callbacks for clarity
        const { onChunk, onComplete, onError } = callbacks || {};
        
        if (!challenge) {
            throw new EvaluationValidationError('Challenge is required for evaluation');
        }
        if (!userResponse) {
            throw new EvaluationValidationError('User response is required for evaluation');
        }
        if (typeof onChunk !== 'function') {
            throw new EvaluationValidationError('onChunk callback is required for streaming evaluations');
        }
        // Ensure onComplete and onError are functions if provided
        if (onComplete && typeof onComplete !== 'function') {
            throw new EvaluationValidationError('onComplete callback must be a function if provided');
        }
        if (onError && typeof onError !== 'function') {
            throw new EvaluationValidationError('onError callback must be a function if provided');
        }
        
        const threadId = options.threadId || uuidv4();
        const userId = challenge.userId || options.user?.id;
        if (!userId) {
             throw new EvaluationValidationError('User ID is required for evaluation');
        }

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
                try {
                    if (eventType === 'content') {
                        onChunk(data.content);
                    } else if (eventType === 'error') {
                        this.logger.error('Error streaming evaluation', { error: data });
                        const streamError = new EvaluationProcessingError(data.message || 'Error streaming evaluation', { cause: data });
                        if (onError) {
                            onError(streamError);
                        } else {
                            // If no specific error handler, rethrow to be caught by the main try/catch
                            throw streamError; 
                        }
                    } else if (eventType === 'complete') {
                        // Handle completion if needed (though onComplete callback is preferred)
                    }
                } catch (handlerError) {
                    // Catch errors within the onEvent handlers themselves
                    this.logger.error('Error in stream onEvent handler', { handlerError: handlerError.message });
                    if (onError) onError(handlerError);
                }
            }
        };

        // Start streaming
        this.logger.debug('Starting evaluation stream', { challengeId: challenge.id, threadId });
        try {
            const fullText = await this.aiClient.streamMessage(messages, streamOptions);
            this.logger.debug('Completed evaluation stream', { challengeId: challenge.id, threadId });
            // Call the onComplete handler if provided
            if (onComplete) {
                await onComplete(fullText);
            }
        } catch (streamError) {
             this.logger.error('Error during AI stream execution', { streamError: streamError.message, threadId });
             const processingError = new EvaluationProcessingError('AI stream failed', { cause: streamError });
             if (onError) {
                 onError(processingError);
             } else {
                 throw processingError; // Rethrow if no specific handler
             }
        }
    }
    /**
     * Process evaluation data received from a stream.
     * This method assumes the full JSON evaluation text is available.
     * @param {string} userId - User ID
     * @param {string} challengeId - Challenge ID
     * @param {string} evaluationText - Full JSON string from the stream
     * @param {string} threadId - Conversation thread ID
     * @returns {Promise<Evaluation>} The processed and saved evaluation
     */
    async processStreamedEvaluation(userId, challengeId, evaluationText, threadId) {
        this.logger.debug('Processing streamed evaluation text', { userId, challengeId, threadId });
        let evaluationData;
        try {
            evaluationData = JSON.parse(evaluationText);
        } catch (error) {
            this.logger.error('Failed to parse streamed evaluation JSON', { error: error.message, threadId });
            throw new EvaluationProcessingError('Invalid evaluation format received from stream', { cause: error });
        }

        // Create Evaluation domain object
        const evaluation = new Evaluation({
            id: uuidv4(),
            challengeId: challengeId,
            userId: userId,
            score: evaluationData.overallScore || evaluationData.score || 0,
            categoryScores: evaluationData.categoryScores || {},
            overallFeedback: evaluationData.feedback || evaluationData.overallFeedback || '',
            strengths: evaluationData.strengths || [],
            areasForImprovement: evaluationData.improvements || evaluationData.areasForImprovement || [],
            // Add other relevant fields
            strengthAnalysis: evaluationData.strengthAnalysis || [],
            improvementPlans: evaluationData.improvementPlans || [],
            nextSteps: evaluationData.nextSteps || '',
            recommendedResources: evaluationData.recommendedResources || [],
            recommendedChallenges: evaluationData.recommendedChallenges || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                model: evaluationData.metadata?.model, // Get metadata if provided by AI
                streamed: true,
                threadId: threadId,
            }
        }, { EventTypes: EventTypes });

        // Persist using the repository (which handles event publishing)
        this.logger.info('Saving streamed evaluation', { evaluationId: evaluation.id, userId: userId });
        const savedEvaluation = await this.evaluationRepository.save(evaluation);
        this.logger.info('Streamed evaluation saved successfully', { evaluationId: savedEvaluation.id });
        
        return savedEvaluation;
    }
}
export default EvaluationService;
