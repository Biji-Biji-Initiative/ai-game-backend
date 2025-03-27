/**
 * Challenge Evaluation Service
 * 
 * Evaluates user responses to challenges using OpenAI Responses API
 * Follows domain-driven design principles and uses the prompt factory pattern
 * 
 * @module challengeEvaluationService
 * @requires promptFactory
 * @requires responsesApiClient
 * @requires logger
 */

const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../../core/infra/logging/logger');
const { PromptFactory, PROMPT_TYPES } = require('../../prompt/promptFactory');
const responsesApiClient = require('../../../core/infra/api/responsesApiClient');

/**
 * Evaluate user responses to a challenge
 * @param {Object} challenge - Challenge object
 * @param {Array} responses - User's responses
 * @param {Object} options - Additional options
 * @param {string} options.threadId - Thread ID for stateful conversation
 * @param {string} options.previousResponseId - Previous response ID for context
 * @param {number} options.temperature - Temperature for generation
 * @returns {Promise<Object>} Evaluation results
 */
async function evaluateResponses(challenge, responses, options = {}) {
  try {
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
    
    logger.info('Evaluating challenge responses', {
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
    
    // Use the prompt factory to create an evaluation prompt
    const prompt = PromptFactory.buildPrompt(PROMPT_TYPES.EVALUATION, {
      challenge,
      userResponse: responses,
      options: promptOptions
    });
    
    logger.debug('Generated evaluation prompt using PromptFactory', { 
      promptLength: prompt.length, 
      challengeId: challenge.id
    });
    
    // Configure API call options for Responses API
    const apiOptions = {
      model: options.model || 'gpt-4o',
      temperature: options.temperature || 0.4, // Lower temperature for more consistent evaluations
      previousResponseId: options.previousResponseId
    };
    
    // Create messages for the Responses API
    const messages = [
      {
        role: responsesApiClient.MessageRole.SYSTEM,
        content: `You are an AI evaluation expert specializing in providing fair and constructive feedback on ${challengeTypeName} challenges.
Always return your evaluation as a JSON object with scoring, feedback, strengths, and improvement suggestions, formatted as valid, parsable JSON.
This is a ${formatTypeName} type challenge, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
      },
      {
        role: responsesApiClient.MessageRole.USER,
        content: prompt
      }
    ];
    
    // Call the OpenAI Responses API for evaluation
    logger.debug('Calling OpenAI Responses API for evaluation', { 
      challengeId: challenge.id, 
      threadId 
    });
    
    const response = await responsesApiClient.sendJsonMessage(messages, apiOptions);
    
    // Validate and process the response
    if (!response || !response.data) {
      throw new Error('Invalid evaluation response format from OpenAI Responses API');
    }
    
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
    
    logger.info('Successfully evaluated challenge responses', {
      challengeId: challenge.id,
      score: evaluationResult.overallScore || evaluationResult.score,
      threadId
    });
    
    return evaluationResult;
  } catch (error) {
    logger.error('Error in challenge evaluation service', { 
      error: error.message,
      challengeId: challenge?.id
    });
    throw error;
  }
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
async function streamEvaluation(challenge, responses, callbacks, options = {}) {
  try {
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
    
    // Use the prompt factory to create an evaluation prompt
    const prompt = PromptFactory.buildPrompt(PROMPT_TYPES.EVALUATION, {
      challenge,
      userResponse: responses,
      options: promptOptions
    });
    
    // Add streaming instructions to the prompt
    const streamingPrompt = `${prompt}\n\nIMPORTANT: Format your response as a continuous stream, providing each part of the evaluation as soon as it's ready. Start with overall feedback, then detailed analysis of each response, followed by strengths and improvement suggestions.`;
    
    // Configure streaming options
    const streamOptions = {
      model: options.model || 'gpt-4o',
      temperature: options.temperature || 0.4,
      previousResponseId: options.previousResponseId,
      onChunk: callbacks.onChunk,
      onComplete: callbacks.onComplete,
      onError: callbacks.onError
    };
    
    // Create messages for the Responses API
    const messages = [
      {
        role: responsesApiClient.MessageRole.SYSTEM,
        content: `You are an AI evaluation expert providing real-time feedback on ${challengeTypeName} challenges.
Your evaluation should be structured but conversational, providing immediate value as you analyze the responses.
This is a ${formatTypeName} type challenge, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
      },
      {
        role: responsesApiClient.MessageRole.USER,
        content: streamingPrompt
      }
    ];
    
    // Stream the evaluation
    await responsesApiClient.streamMessage(messages, streamOptions);
  } catch (error) {
    logger.error('Error in evaluation streaming', { 
      error: error.message,
      challengeId: challenge?.id
    });
    
    if (callbacks.onError) {
      callbacks.onError(error);
    } else {
      throw error;
    }
  }
}

module.exports = {
  evaluateResponses,
  streamEvaluation
}; 