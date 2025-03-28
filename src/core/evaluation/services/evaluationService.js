/**
 * Advanced Evaluation Service
 * 
 * Core business logic for generating deeply personalized evaluations
 * using OpenAI Responses API with comprehensive user context and growth tracking.
 * Integrates with the prompt builder architecture for consistent prompt generation.
 * 
 * @module evaluationService
 * @requires promptBuilder
 * @requires responsesApiClient
 * @requires logger
 */

const { v4: uuidv4 } = require('uuid');
const promptBuilder = require('../../prompt/promptBuilder');
const { PROMPT_TYPES, getRecommendedModel } = require('../../prompt/promptTypes');
const Evaluation = require('../models/Evaluation');

/**
 * Service for generating and processing evaluations
 */
class EvaluationService {
  /**
   * Create a new EvaluationService
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.responsesApiClient - Client for Responses API calls
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.openAIStateManager - Manager for OpenAI conversation state
   * @param {Object} dependencies.evaluationDomainService - Domain service for evaluations
   */
  constructor({ 
    responsesApiClient, 
    logger, 
    openAIStateManager,
    evaluationDomainService 
  }) {
    this.responsesApiClient = responsesApiClient;
    this.logger = logger;
    this.openAIStateManager = openAIStateManager;
    this.evaluationDomainService = evaluationDomainService;
  }

  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @private
   */
  log(level, message, meta = {}) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](message, meta);
    } else {
      console[level === 'error' ? 'error' : 'log'](message, meta);
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
    try {
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
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        userId, 
        `evaluation_${threadId}`,
        { createdAt: new Date().toISOString() }
      );
      
      // Get the previous response ID for conversation continuity
      const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);

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
      
      // Gather user and history data for personalization
      const user = options.user || { email: userId };
      const evaluationHistory = options.evaluationHistory || {};
      
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
      this.log('debug', 'Generating personalized evaluation prompt', { challengeId: challenge.id });
      
      const { prompt, systemMessage } = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
        challenge,
        userResponse,
        user,
        evaluationHistory,
        options: promptOptions
      });
      
      this.log('debug', 'Generated personalized evaluation prompt', { 
        promptLength: prompt.length, 
        challengeId: challenge.id,
        hasUserContext: !!options.user,
        hasEvaluationHistory: !!options.evaluationHistory
      });
      
      // Configure API call options for Responses API
      const apiOptions = {
        model: options.model || 'gpt-4o',
        temperature: options.temperature || 0.4, // Lower temperature for more consistent evaluations
        responseFormat: 'json',
        previousResponseId: previousResponseId
      };
      
      // Create messages for the Responses API
      const messages = [
        {
          role: this.responsesApiClient.MessageRole.SYSTEM,
          content: systemMessage || `You are an AI evaluation expert specializing in providing personalized feedback on ${challengeTypeName} challenges.
Always return your evaluation as a JSON object with category scores, overall score, detailed feedback, strengths with analysis, and personalized insights.
Format your response as valid, parsable JSON with no markdown formatting.
This is a ${formatTypeName} type challenge in the ${focusArea} focus area, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
        },
        {
          role: this.responsesApiClient.MessageRole.USER,
          content: prompt
        }
      ];
      
      // Call the OpenAI Responses API for evaluation
      this.log('debug', 'Calling OpenAI Responses API for personalized evaluation', { 
        challengeId: challenge.id, 
        threadId 
      });
      
      const response = await this.responsesApiClient.sendJsonMessage(messages, apiOptions);
      
      // Update the conversation state with the new response ID
      await this.openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
      
      // Validate and process the response
      if (!response || !response.data) {
        throw new Error('Invalid evaluation response format from OpenAI Responses API');
      }
      
      // Extract evaluation data from response
      const evaluationData = response.data;
      
      // Calculate overall score if not provided but category scores are
      let overallScore = evaluationData.overallScore || evaluationData.score;
      if (!overallScore && evaluationData.categoryScores) {
        // Calculate weighted average based on the category scores
        const categoryScores = evaluationData.categoryScores;
        const totalPoints = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
        overallScore = Math.round(totalPoints);
      }
      
      // Calculate score changes if we have history
      const previousScore = evaluationHistory.previousScores?.overall;
      const scoreChange = previousScore !== undefined ? (overallScore - previousScore) : 0;
      
      // Calculate category score changes
      const categoryScoreChanges = this.getCategoryScoreChanges(
        evaluationData.categoryScores || {},
        evaluationHistory.previousScores || {}
      );
      
      // Prepare user context from available data
      const userContext = {
        skillLevel: user.skillLevel || 'intermediate',
        focusAreas: user.focusAreas || [],
        learningGoals: user.learningGoals || [],
        previousScores: evaluationHistory.previousScores || {},
        completedChallengeCount: user.completedChallenges || 0
      };
      
      // Prepare growth metrics
      const growthMetrics = {
        scoreChange,
        categoryScoreChanges,
        improvementRate: this.calculateOverallImprovement(categoryScoreChanges),
        consistentStrengths: evaluationData.growthInsights?.persistentStrengths || 
                            evaluationHistory.consistentStrengths || [],
        persistentWeaknesses: evaluationData.growthInsights?.developmentAreas || 
                             evaluationHistory.areasNeedingImprovement || [],
        lastEvaluationId: evaluationHistory.lastEvaluationId
      };
      
      // Prepare challenge context
      const challengeContext = {
        title: challenge.title || '',
        type: challengeTypeName,
        focusArea: focusArea,
        difficulty: challenge.difficulty || 'intermediate',
        categoryWeights: this.getCategoryWeightsFromPrompt(prompt)
      };
      
      // Normalize the evaluation structure with enhanced data
      const normalizedData = {
        userId,
        challengeId: challenge.id,
        score: overallScore || 70,
        categoryScores: evaluationData.categoryScores || {},
        overallFeedback: evaluationData.overallFeedback || evaluationData.feedback || '',
        strengths: evaluationData.strengths || [],
        strengthAnalysis: evaluationData.strengthAnalysis || [],
        areasForImprovement: evaluationData.areasForImprovement || evaluationData.improvements || [],
        improvementPlans: evaluationData.improvementPlans || [],
        nextSteps: evaluationData.recommendations?.nextSteps || evaluationData.nextSteps || '',
        recommendedResources: evaluationData.recommendations?.resources || [],
        recommendedChallenges: evaluationData.recommendations?.recommendedChallenges || [],
        userContext: userContext,
        challengeContext: challengeContext,
        growthMetrics: growthMetrics,
        responseId: response.responseId,
        threadId,
        metadata: {
          evaluationPromptLength: prompt.length,
          personalizationLevel: options.user ? 'personalized' : 'standard',
          hasHistory: !!options.evaluationHistory,
          categoryWeights: challengeContext.categoryWeights,
          generatedAt: new Date().toISOString()
        }
      };
      
      // Create domain model instance
      const evaluation = new Evaluation(normalizedData);
      
      this.log('info', 'Successfully evaluated challenge response with personalization', {
        challengeId: challenge.id,
        score: evaluation.score,
        threadId,
        personalization: options.user ? 'enabled' : 'disabled'
      });
      
      return evaluation;
    } catch (error) {
      this.log('error', 'Error in personalized evaluation service', { 
        error: error.message,
        challengeId: challenge?.id
      });
      throw error;
    }
  }

  /**
   * Stream personalized evaluation results for real-time feedback
   * @param {Object} challenge - Challenge object
   * @param {string|Array} userResponse - User's response (string or array of responses)
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onChunk - Called with each chunk of text
   * @param {Function} callbacks.onComplete - Called when streaming is complete
   * @param {Function} callbacks.onError - Called if an error occurs
   * @param {Object} options - Additional options including user and history data
   * @returns {Promise<void>}
   */
  async streamEvaluation(challenge, userResponse, callbacks, options = {}) {
    try {
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
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        userId, 
        `evaluation_stream_${threadId}`,
        { createdAt: new Date().toISOString() }
      );
      
      // Get the previous response ID for conversation continuity
      const previousResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
      
      // Gather user and history data for personalization
      const user = options.user || {};
      const evaluationHistory = options.evaluationHistory || {};
      
      // Get challenge type and format information
      const challengeTypeName = challenge.getChallengeTypeName ? 
        challenge.getChallengeTypeName() : 
        (challenge.typeMetadata?.name || challenge.challengeTypeCode || challenge.challengeType || 'standard');
      
      const formatTypeName = challenge.getFormatTypeName ? 
        challenge.getFormatTypeName() : 
        (challenge.formatMetadata?.name || challenge.formatTypeCode || challenge.formatType || 'standard');
      
      const focusArea = challenge.focusArea || options.focusArea || 'general';
      
      // Add type information to prompt options
      const promptOptions = {
        challengeTypeName,
        formatTypeName,
        focusArea,
        typeMetadata: challenge.typeMetadata || {},
        formatMetadata: challenge.formatMetadata || {},
        evaluationHistory,
        isStreaming: true, // Indicate this is for streaming
        threadId,
        previousResponseId: options.previousResponseId
      };
      
      // Use the prompt builder to create a personalized evaluation prompt
      const { prompt, systemMessage } = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
        challenge,
        userResponse,
        user,
        evaluationHistory,
        options: promptOptions
      });
      
      // Add streaming-specific instructions
      const streamingPrompt = `${prompt}\n\nIMPORTANT: Format your response as a continuous stream of your evaluation, providing each part as soon as it's ready. Begin with an overall assessment, then provide detailed analysis of each category, followed by strengths and improvement areas. This is a real-time evaluation, so provide as much value as possible throughout the stream.`;
      
      // Configure streaming options
      const streamOptions = {
        model: options.model || 'gpt-4o',
        temperature: options.temperature || 0.4,
        previousResponseId: previousResponseId,
        onChunk: callbacks.onChunk,
        onComplete: (response) => {
          // Update the conversation state with the new response ID when streaming is complete
          if (response && response.responseId) {
            this.openAIStateManager.updateLastResponseId(conversationState.id, response.responseId)
              .then(() => {
                if (callbacks.onComplete) {
                  callbacks.onComplete(response);
                }
              })
              .catch(error => {
                this.log('error', 'Error updating response ID after streaming', { 
                  error: error.message,
                  stateId: conversationState.id
                });
                if (callbacks.onComplete) {
                  callbacks.onComplete(response);
                }
              });
          } else if (callbacks.onComplete) {
            callbacks.onComplete(response);
          }
        },
        onError: callbacks.onError
      };
      
      // Create messages for the Responses API
      const messages = [
        {
          role: this.responsesApiClient.MessageRole.SYSTEM,
          content: systemMessage || `You are an AI evaluation expert providing real-time personalized feedback on ${challengeTypeName} challenges.
Your evaluation should be structured but conversational, providing immediate value as you analyze the response.
This is a ${formatTypeName} type challenge in the ${focusArea} focus area, so adapt your evaluation criteria accordingly.
For each strength you identify, provide a detailed analysis explaining why it's effective and how it contributes to the quality.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
        },
        {
          role: this.responsesApiClient.MessageRole.USER,
          content: streamingPrompt
        }
      ];
      
      // Stream the evaluation
      await this.responsesApiClient.streamMessage(messages, streamOptions);
    } catch (error) {
      this.log('error', 'Error in personalized evaluation streaming', { 
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

  /**
   * Process and enhance an evaluation result
   * @param {Object} evaluationData - Raw evaluation data
   * @param {Object} options - Processing options
   * @returns {Promise<Evaluation>} Processed evaluation model
   */
  async processEvaluation(evaluationData, options = {}) {
    try {
      if (!evaluationData || typeof evaluationData !== 'object') {
        throw new Error('Valid evaluation data is required for processing');
      }
      
      // Handle case where we already have an Evaluation model
      if (evaluationData instanceof Evaluation) {
        return evaluationData;
      }
      
      // Calculate overall score if not provided but category scores are
      let overallScore = evaluationData.score || evaluationData.overallScore;
      if (!overallScore && evaluationData.categoryScores) {
        // Calculate weighted average based on the category scores
        const categoryScores = evaluationData.categoryScores;
        const totalPoints = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
        overallScore = Math.round(totalPoints);
      }
      
      // Enhance with user context if evaluationDomainService is available
      if (evaluationData.userContext && this.evaluationDomainService) {
        try {
          // Create a temporary evaluation for processing
          const tempEval = new Evaluation({
            ...evaluationData,
            id: evaluationData.id || 'temp-id',
            userId: evaluationData.userId || 'temp-user',
            challengeId: evaluationData.challengeId || 'temp-challenge',
            score: overallScore || 0,
            categoryScores: evaluationData.categoryScores || {}
          });
          
          // Process user context with domain service
          const enrichedContext = await this.evaluationDomainService.processUserContext(tempEval);
          
          // Update user context with enriched data
          evaluationData.userContext = {
            ...evaluationData.userContext,
            ...enrichedContext
          };
        } catch (error) {
          this.log('warn', 'Error enriching user context in evaluation', { 
            error: error.message,
            userId: evaluationData.userId
          });
        }
      }
      
      // Create domain model instance
      const evaluation = new Evaluation({
        ...evaluationData,
        score: overallScore
      });
      
      return evaluation;
    } catch (error) {
      this.log('error', 'Error processing evaluation', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract category weights from the evaluation prompt
   * @param {string} prompt - Evaluation prompt text
   * @returns {Object} Category weights mapping
   * @private
   */
  getCategoryWeightsFromPrompt(prompt) {
    const weights = {};
    
    try {
      // Extract the category weights section from the prompt
      const criteriaMatch = prompt.match(/EVALUATION CRITERIA[\s\S]*?The total maximum score is 100 points/i);
      
      if (criteriaMatch) {
        const criteriaText = criteriaMatch[0];
        
        // Extract each category and weight using regex
        const categoryRegex = /- ([a-z_]+) \(0-(\d+) points\)/g;
        let match;
        
        while ((match = categoryRegex.exec(criteriaText)) !== null) {
          const category = match[1];
          const weight = parseInt(match[2], 10);
          
          if (category && !isNaN(weight)) {
            weights[category] = weight;
          }
        }
      }
      
      return weights;
    } catch (error) {
      this.log('warn', 'Error extracting category weights from prompt', { error: error.message });
      return {};
    }
  }

  /**
   * Calculate changes in category scores
   * @param {Object} currentScores - Current category scores
   * @param {Object} previousScores - Previous category scores
   * @returns {Object} Category score changes
   * @private
   */
  getCategoryScoreChanges(currentScores, previousScores) {
    const changes = {};
    
    // Skip if we don't have both sets of scores
    if (!currentScores || !previousScores) {
      return changes;
    }
    
    // Calculate changes for each category
    Object.entries(currentScores).forEach(([category, score]) => {
      if (previousScores[category] !== undefined) {
        changes[category] = score - previousScores[category];
      }
    });
    
    return changes;
  }

  /**
   * Calculate overall improvement rate
   * @param {Object} categoryChanges - Category score changes
   * @returns {number} Overall improvement rate
   * @private
   */
  calculateOverallImprovement(categoryChanges) {
    if (!categoryChanges || Object.keys(categoryChanges).length === 0) {
      return 0;
    }
    
    const changes = Object.values(categoryChanges);
    const sum = changes.reduce((total, change) => total + change, 0);
    
    return Math.round(sum / changes.length);
  }
}

module.exports = EvaluationService; 