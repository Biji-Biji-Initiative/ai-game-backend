/**
 * Challenge Evaluation Service
 * 
 * Application service that handles the evaluation of challenge responses.
 * Orchestrates between challenge domain, evaluation criteria, and AI services.
 * Provides functionality to evaluate responses and stream evaluation results.
 * 
 * As an application service, it:
 * 1. Coordinates between challenge and evaluation domains
 * 2. Manages external AI infrastructure for evaluation
 * 3. Handles conversation state and streaming capabilities
 * 4. Implements the application-level workflow for evaluations
 */

'use strict';

import { createErrorMapper, withServiceErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { ChallengeError } from "#app/core/challenge/errors/ChallengeErrors.js";
import promptBuilder from "#app/core/prompt/promptBuilder.js";
import { PROMPT_TYPES } from "#app/core/prompt/promptTypes.js";
import messageFormatter from "#app/core/infra/openai/messageFormatter.js";
import { MissingParameterError } from "#app/core/infra/errors/MissingParameterError.js";
import { challengeLogger } from "#app/core/infra/logging/domainLogger.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import Evaluation from "#app/core/evaluation/models/Evaluation.js";
import AppError from "#app/core/infra/errors/AppError.js";
import { logger as appLogger } from "#app/core/infra/logging/logger.js";

/**
 * Application service for handling challenge response evaluations
 */
class ChallengeEvaluationService {
  /**
   * Create a new ChallengeEvaluationService
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.aiClient - AI client port interface
   * @param {Object} dependencies.aiStateManager - AI state manager port interface
   * @param {Object} dependencies.openAIConfig - Configuration for OpenAI
   * @param {Object} dependencies.logger - Logger instance
   * @throws {MissingParameterError} When required dependencies are missing
   */
  constructor(dependencies = {}) {
    const { aiClient, aiStateManager, openAIConfig, logger } = dependencies;
    
    if (!aiClient) {
      throw new MissingParameterError('aiClient', 'ChallengeEvaluationService.constructor');
    }
    
    if (!aiStateManager) {
      throw new MissingParameterError('aiStateManager', 'ChallengeEvaluationService.constructor');
    }
    
    this.aiClient = aiClient;
    this.aiStateManager = aiStateManager;
    this.openAIConfig = openAIConfig || {};
    this.logger = logger || challengeLogger.child({ service: 'ChallengeEvaluationService' });
    this.MessageRole = {
      SYSTEM: 'system',
      USER: 'user',
      ASSISTANT: 'assistant'
    };
    
    // Create error mapper for standardized error handling
    const errorMapper = createErrorMapper(
      {
        'Error': ChallengeError
      },
      ChallengeError
    );
    
    // Apply standardized error handling to methods
    this.evaluateResponses = withServiceErrorHandling(
      this.evaluateResponses.bind(this),
      { methodName: 'evaluateResponses', domainName: 'challenge', logger: this.logger, errorMapper }
    );
    
    this.streamEvaluation = withServiceErrorHandling(
      this.streamEvaluation.bind(this),
      { methodName: 'streamEvaluation', domainName: 'challenge', logger: this.logger, errorMapper }
    );
  }
  
  /**
   * Evaluate user responses to a challenge
   * @param {Object} challenge - Challenge object
   * @param {Array} responses - User's responses
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluateResponses(challenge, responses, options = {}) {
    if (!challenge) {
      throw new AppError('Challenge is required for evaluation', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new AppError('Responses are required for evaluation', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    const threadId = options.threadId;
    if (!threadId) {
      throw new AppError('Thread ID is required for evaluation', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    if (!challenge.userId) {
      throw new AppError('Challenge must have a valid userId', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    // Get or create a conversation state for this evaluation using aiStateManager
    const conversationState = await this.aiStateManager.findOrCreateConversationState(
      challenge.userId, 
      `evaluation_${threadId}`,
      { createdAt: new Date().toISOString() }
    );
    
    // Get the previous response ID for conversation continuity
    const previousResponseId = await this.aiStateManager.getLastResponseId(conversationState.id);
    
    this.logger.debug('Retrieved previous response ID for stateful conversation', {
      challengeId: challenge.id,
      threadId: conversationState.id,
      hasLastResponseId: !!previousResponseId
    });
    
    this.logger.info('Evaluating challenge responses', {
      challengeId: challenge.id,
      threadId,
      responseCount: responses.length
    });
    
    // Get challenge type name for more accurate evaluation
    const challengeTypeName = challenge.getChallengeTypeName ? 
      challenge.getChallengeTypeName() : 
      (challenge.typeMetadata?.name || challenge.challengeTypeCode || challenge.challengeType || 'Unknown');
    
    // Get format type name for more accurate evaluation
    const formatTypeName = challenge.getFormatTypeName ? 
      challenge.getFormatTypeName() : 
      (challenge.formatMetadata?.name || challenge.formatTypeCode || challenge.formatType || 'Unknown');
    
    // Add type information to prompt options
    const promptOptions = {
      challengeTypeName,
      formatTypeName,
      typeMetadata: challenge.typeMetadata || {},
      formatMetadata: challenge.formatMetadata || {}
    };
    
    // Use the prompt builder to create an evaluation prompt
    const { prompt, systemMessage } = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
      challenge,
      userResponse: responses,
      options: promptOptions
    });
    
    this.logger.debug('Generated evaluation prompt using PromptBuilder', { 
      promptLength: prompt.length, 
      challengeId: challenge.id
    });
    
    // Format messages for AI service
    const formattedMessages = messageFormatter.formatForResponsesApi(
      prompt,
      systemMessage || `You are an AI evaluation expert specializing in providing fair and constructive feedback on ${challengeTypeName} challenges.
Always return your evaluation as a JSON object with scoring, feedback, strengths, and improvement suggestions, formatted as valid, parsable JSON.
This is a ${formatTypeName} type challenge, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
    );
    
    // Call the AI service for evaluation using aiClient
    this.logger.debug('Calling AI service for evaluation', { 
      challengeId: challenge.id, 
      threadId: conversationState.id,
      hasLastResponseId: !!previousResponseId
    });
    
    const response = await this.aiClient.sendJsonMessage(formattedMessages, {
      model: this.openAIConfig.model || 'gpt-4o',
      temperature: 0.7,
      responseFormat: 'json',
      previousResponseId
    });
    
    // Update the conversation state with the new response ID
    await this.aiStateManager.updateLastResponseId(conversationState.id, response.responseId);
    
    this.logger.debug('Updated conversation state with new response ID', {
      challengeId: challenge.id,
      threadId: conversationState.id,
      responseId: response.responseId
    });
    
    // Extract evaluation data from response
    const evaluationData = response.data;
    
    // Add metadata to evaluation
    const evaluationResult = {
      ...evaluationData,
      evaluatedAt: new Date().toISOString(),
      evaluationThreadId: threadId,
      responseId: response.responseId,
      challengeTypeName: challengeTypeName,
      formatTypeName: formatTypeName
    };
    
    this.logger.info('Successfully evaluated challenge responses', {
      challengeId: challenge.id,
      score: evaluationResult.overallScore || evaluationResult.score,
      threadId
    });
    
    return evaluationResult;
  }

  /**
   * Stream evaluation results for real-time feedback
   * @param {Object} challenge - Challenge object
   * @param {Array} responses - User's responses
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onChunk - Called with each chunk of text
   * @param {Function} callbacks.onComplete - Called when streaming is complete
   * @param {Function} callbacks.onError - Called if an error occurs
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async streamEvaluation(challenge, responses, callbacks, options = {}) {
    if (!challenge) {
      throw new AppError('Challenge is required for evaluation', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new AppError('Responses are required for evaluation', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    if (!callbacks || typeof callbacks.onChunk !== 'function') {
      throw new AppError('onChunk callback is required for streaming evaluations', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    const threadId = options.threadId;
    if (!threadId) {
      throw new AppError('Thread ID is required for evaluation', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    if (!challenge.userId) {
      throw new AppError('Challenge must have a valid userId', 400, { errorCode: 'VALIDATION_FAILED' });
    }
    
    // Get or create a conversation state for this evaluation using aiStateManager
    const conversationState = await this.aiStateManager.findOrCreateConversationState(
      challenge.userId, 
      `evaluation_stream_${threadId}`,
      { createdAt: new Date().toISOString() }
    );
    
    // Get the previous response ID for conversation continuity
    const previousResponseId = await this.aiStateManager.getLastResponseId(conversationState.id);
    
    this.logger.debug('Retrieved previous response ID for stateful conversation', {
      challengeId: challenge.id,
      threadId: conversationState.id,
      hasLastResponseId: !!previousResponseId
    });
    
    // Get challenge type name for more accurate evaluation
    const challengeTypeName = challenge.getChallengeTypeName ? 
      challenge.getChallengeTypeName() : 
      (challenge.typeMetadata?.name || challenge.challengeTypeCode || challenge.challengeType || 'Unknown');
    
    // Get format type name for more accurate evaluation
    const formatTypeName = challenge.getFormatTypeName ? 
      challenge.getFormatTypeName() : 
      (challenge.formatMetadata?.name || challenge.formatTypeCode || challenge.formatType || 'Unknown');
    
    // Add type information to prompt options
    const promptOptions = {
      challengeTypeName,
      formatTypeName,
      typeMetadata: challenge.typeMetadata || {},
      formatMetadata: challenge.formatMetadata || {}
    };
    
    // Use the prompt builder to create an evaluation prompt
    const { prompt, systemMessage } = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
      challenge,
      userResponse: responses,
      options: promptOptions
    });
    
    this.logger.debug('Generated streaming evaluation prompt', { 
      promptLength: prompt.length, 
      challengeId: challenge.id
    });
    
    // Format messages for AI service
    const formattedMessages = messageFormatter.formatForResponsesApi(
      prompt,
      systemMessage || `You are an AI evaluation expert specializing in providing real-time feedback on ${challengeTypeName} challenges.`
    );
    
    // Set up streaming options
    const streamOptions = {
      model: this.openAIConfig.model || 'gpt-4o',
      temperature: 0.7,
      previousResponseId,
      onEvent: event => {
        if (event.type === 'content') {
          callbacks.onChunk(event.content);
        } else if (event.type === 'error') {
          if (callbacks.onError) {
            callbacks.onError(event.error);
          }
        } else if (event.type === 'done') {
          if (callbacks.onComplete) {
            callbacks.onComplete();
          }
        }
      }
    };
    
    // Start streaming using aiClient
    this.logger.info('Starting evaluation stream', { 
      challengeId: challenge.id, 
      threadId
    });
    
    await this.aiClient.streamMessage(formattedMessages, streamOptions);
    
    // Update the conversation state with the new response ID (if available)
    if (streamOptions.responseId) {
      await this.aiStateManager.updateLastResponseId(conversationState.id, streamOptions.responseId);
    }
    
    this.logger.info('Completed evaluation stream', { 
      challengeId: challenge.id, 
      threadId
    });
  }
}

export default ChallengeEvaluationService; 