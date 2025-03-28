/**
 * Challenge Evaluation Service
 * 
 * Evaluates user responses to challenges using OpenAI Responses API
 * Follows domain-driven design principles and uses the prompt builder pattern
 * 
 * @module challengeEvaluationService
 * @requires promptBuilder
 * @requires logger
 */

const { v4: uuidv4 } = require('uuid');
const { PROMPT_TYPES } = require('../../prompt/promptTypes');
const promptBuilder = require('../../prompt/promptBuilder');

/**
 * Service for evaluating user responses to challenges
 */
class ChallengeEvaluationService {
  /**
   * Create a new ChallengeEvaluationService
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.openAIClient - Client for OpenAI API calls
   * @param {Object} dependencies.openAIStateManager - Manager for OpenAI conversation state
   * @param {Object} dependencies.openAIConfig - OpenAI configuration
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ openAIClient, openAIStateManager, openAIConfig, logger }) {
    this.openAIClient = openAIClient;
    this.openAIStateManager = openAIStateManager;
    this.MessageRole = openAIConfig.OpenAITypes.MessageRole;
    this.logger = logger;
  }

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
  async evaluateResponses(challenge, responses, options = {}) {
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
      
      // Get or create a conversation state for this evaluation
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        challenge.userId, 
        `evaluation_${threadId}`,
        { createdAt: new Date().toISOString() }
      );
      
      // Get the previous response ID for conversation continuity
      const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
      
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
      
      // Create messages for the Responses API
      const messages = [
        {
          role: this.MessageRole.SYSTEM,
          content: systemMessage || `You are an AI evaluation expert specializing in providing fair and constructive feedback on ${challengeTypeName} challenges.
Always return your evaluation as a JSON object with scoring, feedback, strengths, and improvement suggestions, formatted as valid, parsable JSON.
This is a ${formatTypeName} type challenge, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
        },
        {
          role: this.MessageRole.USER,
          content: prompt
        }
      ];
      
      // Call the OpenAI Responses API for evaluation
      this.logger.debug('Calling OpenAI Responses API for evaluation', { 
        challengeId: challenge.id, 
        stateId: conversationState.id
      });
      
      // Send the JSON message with the 'EVALUATION' use case
      const response = await this.openAIClient.sendJsonMessage(messages, 'EVALUATION', {
        previous_response_id: previousResponseId
      });
      
      // Update the conversation state with the new response ID
      await this.openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
      
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
    } catch (error) {
      this.logger.error('Error in challenge evaluation service', { 
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
  async streamEvaluation(challenge, responses, callbacks, options = {}) {
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
      
      // Get or create a conversation state for this evaluation
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        challenge.userId, 
        `evaluation_stream_${threadId}`,
        { createdAt: new Date().toISOString() }
      );
      
      // Get the previous response ID for conversation continuity
      const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
      
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
      
      // Create messages for the Responses API
      const messages = [
        {
          role: this.MessageRole.SYSTEM,
          content: systemMessage || `You are an AI evaluation expert providing real-time feedback on ${challengeTypeName} challenges.
Your evaluation should be structured but conversational, providing immediate value as you analyze the responses.
This is a ${formatTypeName} type challenge, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
        },
        {
          role: this.MessageRole.USER,
          content: streamingPrompt
        }
      ];
      
      // Stream the evaluation using the new architecture
      const stream = await this.openAIClient.streamMessage(messages, 'EVALUATION', {
        previous_response_id: previousResponseId
      });
      
      // Setup event handlers for the stream
      let fullResponse = '';
      let responseId = '';
      
      // Process the stream
      for await (const chunk of stream) {
        // Handle different event types from Responses API SSE events
        
        // Store response_id if available
        if (chunk.id && !responseId) {
          responseId = chunk.id;
        }
        
        // Look for content in various formats of the stream chunks
        let textContent = '';
        
        // Handle standard event data format from Responses API
        if (chunk.event === 'response.data' && chunk.data) {
          // Handle message delta (text content)
          if (chunk.data.type === 'message.delta' && chunk.data.delta) {
            if (chunk.data.delta.type === 'text') {
              textContent = chunk.data.delta.text || '';
            }
          }
        } 
        // Handle direct text content (backward compatibility)
        else if (chunk.type === 'text' || chunk.type === 'response.output_text.delta') {
          textContent = chunk.text || chunk.delta || '';
        }
        // Handle structured output data
        else if (chunk.output && Array.isArray(chunk.output) && chunk.output.length > 0) {
          const text = chunk.output[0]?.content?.find(item => 
            item.type === 'text' || item.type === 'output_text'
          )?.text || '';
          
          if (text) {
            textContent = text;
          }
        }
        
        // Process any extracted text content
        if (textContent) {
          fullResponse += textContent;
          if (callbacks.onChunk) {
            callbacks.onChunk(textContent);
          }
        }
      }
      
      // If we got a response ID, update the conversation state
      if (responseId) {
        await this.openAIStateManager.updateLastResponseId(conversationState.id, responseId);
      }
      
      // Call the completion callback if provided
      if (callbacks.onComplete) {
        callbacks.onComplete(fullResponse, responseId);
      }
    } catch (error) {
      this.logger.error('Error in evaluation streaming', { 
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
}

module.exports = ChallengeEvaluationService; 