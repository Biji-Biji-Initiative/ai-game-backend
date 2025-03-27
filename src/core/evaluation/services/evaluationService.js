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
const { logger } = require('../../../core/infra/logging/logger');
const promptBuilder = require('../../prompt/promptBuilder');
const { PROMPT_TYPES, getRecommendedModel } = require('../../prompt/promptTypes');
const responsesApiClient = require('../../../core/infra/api/responsesApiClient');
const Evaluation = require('../models/Evaluation');

// Helper function for logging if logger exists
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
    logger[level](message, meta);
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
async function evaluateResponse(challenge, userResponse, options = {}) {
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
      previousResponseId: options.previousResponseId
    };
    
    // Use the prompt builder to create a personalized evaluation prompt
    log('debug', 'Generating personalized evaluation prompt', { challengeId: challenge.id });
    
    const prompt = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
      challenge,
      userResponse,
      user,
      evaluationHistory,
      options: promptOptions
    });
    
    log('debug', 'Generated personalized evaluation prompt', { 
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
      previousResponseId: options.previousResponseId
    };
    
    // Create messages for the Responses API
    const messages = [
      {
        role: responsesApiClient.MessageRole.SYSTEM,
        content: `You are an AI evaluation expert specializing in providing personalized feedback on ${challengeTypeName} challenges.
Always return your evaluation as a JSON object with category scores, overall score, detailed feedback, strengths with analysis, and personalized insights.
Format your response as valid, parsable JSON with no markdown formatting.
This is a ${formatTypeName} type challenge in the ${focusArea} focus area, so adapt your evaluation criteria accordingly.
${promptOptions.typeMetadata.evaluationNote || ''}
${promptOptions.formatMetadata.evaluationNote || ''}`
      },
      {
        role: responsesApiClient.MessageRole.USER,
        content: prompt
      }
    ];
    
    // Call the OpenAI Responses API for evaluation
    log('debug', 'Calling OpenAI Responses API for personalized evaluation', { 
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
    const categoryScoreChanges = getCategoryScoreChanges(
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
      improvementRate: calculateOverallImprovement(categoryScoreChanges),
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
      categoryWeights: getCategoryWeightsFromPrompt(prompt)
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
    
    log('info', 'Successfully evaluated challenge response with personalization', {
      challengeId: challenge.id,
      score: evaluation.score,
      threadId,
      personalization: options.user ? 'enabled' : 'disabled'
    });
    
    return evaluation;
  } catch (error) {
    log('error', 'Error in personalized evaluation service', { 
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
async function streamEvaluation(challenge, userResponse, callbacks, options = {}) {
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
    const prompt = await promptBuilder.buildPrompt(PROMPT_TYPES.EVALUATION, {
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
      previousResponseId: options.previousResponseId,
      onChunk: callbacks.onChunk,
      onComplete: callbacks.onComplete,
      onError: callbacks.onError
    };
    
    // Create messages for the Responses API
    const messages = [
      {
        role: responsesApiClient.MessageRole.SYSTEM,
        content: `You are an AI evaluation expert providing real-time personalized feedback on ${challengeTypeName} challenges.
Your evaluation should be structured but conversational, providing immediate value as you analyze the response.
This is a ${formatTypeName} type challenge in the ${focusArea} focus area, so adapt your evaluation criteria accordingly.
For each strength you identify, provide a detailed analysis explaining why it's effective and how it contributes to the quality.
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
    log('error', 'Error in personalized evaluation streaming', { 
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
 * @returns {Evaluation} Processed evaluation model
 */
function processEvaluation(evaluationData, options = {}) {
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
    
    // Enhance with user context if available
    const userContext = evaluationData.userContext || {};
    const growthMetrics = evaluationData.growthMetrics || {};
    const challengeContext = evaluationData.challengeContext || {};
    
    // Create Evaluation domain model from data
    const evaluation = new Evaluation({
      userId: evaluationData.userId || evaluationData.userEmail,
      challengeId: evaluationData.challengeId,
      score: overallScore || 70,
      categoryScores: evaluationData.categoryScores || {},
      overallFeedback: evaluationData.overallFeedback || evaluationData.feedback || '',
      strengths: evaluationData.strengths || [],
      strengthAnalysis: evaluationData.strengthAnalysis || [],
      areasForImprovement: evaluationData.areasForImprovement || evaluationData.improvements || [],
      improvementPlans: evaluationData.improvementPlans || [],
      nextSteps: evaluationData.nextSteps || evaluationData.recommendations?.nextSteps || '',
      recommendedResources: evaluationData.recommendedResources || evaluationData.recommendations?.resources || [],
      recommendedChallenges: evaluationData.recommendedChallenges || evaluationData.recommendations?.recommendedChallenges || [],
      userContext: userContext,
      growthMetrics: growthMetrics,
      challengeContext: challengeContext,
      responseId: evaluationData.responseId,
      threadId: evaluationData.threadId,
      metadata: evaluationData.metadata || {}
    });
    
    return evaluation;
  } catch (error) {
    log('error', 'Error processing evaluation', { error: error.message });
    
    // Return a default evaluation as fallback
    return new Evaluation({
      userId: evaluationData?.userId || 'unknown',
      challengeId: evaluationData?.challengeId || 'unknown',
      score: 70,
      overallFeedback: 'An error occurred while processing the evaluation.',
      strengths: ['The user submitted a response to the challenge.'],
      areasForImprovement: ['Technical error occurred during evaluation processing.'],
      nextSteps: 'Please try again or contact support if the issue persists.'
    });
  }
}

/**
 * Extract category weights from the evaluation prompt
 * @param {string} prompt - Evaluation prompt text
 * @returns {Object} Category weights mapping
 */
function getCategoryWeightsFromPrompt(prompt) {
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
    log('warn', 'Error extracting category weights from prompt', { error: error.message });
    return {};
  }
}

/**
 * Calculate changes in category scores
 * @param {Object} currentScores - Current category scores
 * @param {Object} previousScores - Previous category scores
 * @returns {Object} Category score changes
 */
function getCategoryScoreChanges(currentScores, previousScores) {
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
 */
function calculateOverallImprovement(categoryChanges) {
  if (!categoryChanges || Object.keys(categoryChanges).length === 0) {
    return 0;
  }
  
  const changes = Object.values(categoryChanges);
  const sum = changes.reduce((total, change) => total + change, 0);
  
  return Math.round(sum / changes.length);
}

module.exports = {
  evaluateResponse,
  streamEvaluation,
  processEvaluation
}; 