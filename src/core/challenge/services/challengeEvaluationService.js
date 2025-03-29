/**
 * Challenge Evaluation Service
 * 
 * Domain service that handles the evaluation of challenge responses.
 * Provides functionality to evaluate responses and stream evaluation results.
 */

'use strict';

const { createErrorMapper, withServiceErrorHandling } = require('../../../core/infra/errors/errorStandardization');
const { ChallengeError } = require('../errors/ChallengeErrors');
const promptBuilder = require('../../prompt/promptBuilder');
const { PROMPT_TYPES } = require('../../prompt/promptTypes');
const { formatForResponsesApi } = require('../../core/infra/openai/messageFormatter');

/**
 * Service for handling challenge response evaluations
 */
class ChallengeEvaluationService {
  /**
   * Create a new ChallengeEvaluationService
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.openAIClient - Client for OpenAI API calls
   * @param {Object} dependencies.openAIStateManager - Manager for OpenAI conversation state
   * @param {Object} dependencies.openAIConfig - Configuration for OpenAI
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies = {}) {
    const { openAIClient, openAIStateManager, openAIConfig, logger } = dependencies;
    
    if (!openAIClient) {
      throw new Error('openAIClient is required for ChallengeEvaluationService');
    }
    
    if (!openAIStateManager) {
      throw new Error('openAIStateManager is required for ChallengeEvaluationService');
    }
    
    this.openAIClient = openAIClient;
    this.openAIStateManager = openAIStateManager;
    this.openAIConfig = openAIConfig || {};
    this.logger = logger || console;
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
      throw new Error('Challenge is required for evaluation');
    }
    
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new Error('Responses are required for evaluation');
    }
    
    const threadId = options.threadId;
    if (!threadId) {
      throw new Error('Thread ID is required for evaluation');
    }
    
    // Get or create a conversation state for this evaluation
    const conversationState = await this.openAIStateManager.findOrCreateConversationState(
      challenge.userId, 
      `evaluation_${threadId}`,
      { createdAt: new Date().toISOString() }
    );
    
    // Get the previous response ID for conversation continuity
    const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
    
    this.logger.debug('Retrieved previous response ID for stateful conversation', {
      challengeId: challenge.id,
      stateId: conversationState.id,
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
    
    // Format messages for OpenAI API
    const formattedMessages = formatForResponsesApi(
      prompt,
      systemMessage || `You are an AI evaluation expert specializing in providing fair and constructive feedback on ${challengeTypeName} challenges.
Always return your evaluation as a JSON object with scoring, feedback, strengths, and improvement suggestions, formatted as valid, parsable JSON.
This is a ${formatTypeName} type challenge, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
    );
    
    // Call the OpenAI API for evaluation
    this.logger.debug('Calling OpenAI API for evaluation', { 
      challengeId: challenge.id, 
      stateId: conversationState.id,
      hasLastResponseId: !!previousResponseId
    });
    
    const response = await this.openAIClient.sendJsonMessage(formattedMessages, {
      model: this.openAIConfig.model || 'gpt-4o',
      temperature: 0.7,
      responseFormat: 'json',
      previousResponseId
    });
    
    // Update the conversation state with the new response ID
    await this.openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
    
    this.logger.debug('Updated conversation state with new response ID', {
      challengeId: challenge.id,
      stateId: conversationState.id,
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
      throw new Error('Challenge is required for evaluation');
    }
    
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new Error('Responses are required for evaluation');
    }
    
    if (!callbacks || typeof callbacks.onChunk !== 'function') {
      throw new Error('onChunk callback is required for streaming evaluations');
    }
    
    const threadId = options.threadId;
    if (!threadId) {
      throw new Error('Thread ID is required for evaluation');
    }
    
    // Get or create a conversation state for this evaluation
    const conversationState = await this.openAIStateManager.findOrCreateConversationState(
      challenge.userId, 
      `evaluation_stream_${threadId}`,
      { createdAt: new Date().toISOString() }
    );
    
    // Get the previous response ID for conversation continuity
    const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
    
    this.logger.debug('Retrieved previous response ID for stateful conversation', {
      challengeId: challenge.id,
      stateId: conversationState.id,
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
    
    this.logger.debug('Generated evaluation prompt for streaming', { 
      promptLength: prompt.length, 
      challengeId: challenge.id
    });
    
    // Add streaming instructions to the prompt
    const streamingPrompt = `${prompt}\n\nIMPORTANT: Format your response as a continuous stream, providing each part of the evaluation as soon as it's ready. Start with overall feedback, then detailed analysis of each response, followed by strengths and improvement suggestions.`;
    
    // Format messages for OpenAI API
    const formattedMessages = formatForResponsesApi(
      streamingPrompt,
      systemMessage || `You are an AI evaluation expert providing real-time feedback on ${challengeTypeName} challenges.
Your evaluation should be structured but conversational, providing immediate value as you analyze the responses.
This is a ${formatTypeName} type challenge, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
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
    
    // Start streaming
    this.logger.info('Starting evaluation stream', { 
      challengeId: challenge.id, 
      threadId
    });
    
    await this.openAIClient.streamMessage(formattedMessages, streamOptions);
    
    // Update the conversation state with the new response ID (if available)
    if (streamOptions.responseId) {
      await this.openAIStateManager.updateLastResponseId(conversationState.id, streamOptions.responseId);
    }
    
    this.logger.info('Completed evaluation stream', { 
      challengeId: challenge.id, 
      threadId
    });
  }
}

module.exports = ChallengeEvaluationService;
