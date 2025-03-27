/**
 * Challenge Coordinator
 * 
 * Application-level coordinator that orchestrates domain services for challenges
 * This coordinator follows the principles of Domain-Driven Design by delegating
 * business logic to the appropriate domain services and coordinating across domains.
 */
const { logger } = require('../core/infra/logging/logger');

// Import domain services from core
const challengeGenerationService = require('../core/challenge/services/challengeGenerationService');
const challengeEvaluationService = require('../core/challenge/services/challengeEvaluationService');
const challengeThreadService = require('../core/challenge/services/challengeThreadService');

// Import domain model
const Challenge = require('../core/challenge/models/Challenge');

// Import container but don't resolve dependencies at module load time
const container = require('../config/container');

/**
 * Generate a challenge for a user
 * @param {Object} params - Challenge generation parameters
 * @param {string} params.email - User email
 * @param {string} [params.focusArea] - Focus area for the challenge
 * @param {string} [params.challengeType] - Type of challenge
 * @param {string} [params.formatType] - Format type of the challenge
 * @param {string} [params.difficulty] - Difficulty level
 * @param {Object} [params.config] - Configuration object
 * @param {Object} [params.difficultyManager] - Difficulty manager for calculating optimal difficulty
 * @returns {Promise<Object>} - The generated challenge
 */
const generateAndPersistChallenge = async (params) => {
  // Get repositories at runtime
  const challengeRepository = container.get('challengeRepository');
  const userRepository = container.get('userRepository');

  try {
    const { email, focusArea, challengeType, formatType, difficulty, config, difficultyManager } = params;
    
    // Validate input
    if (!email) {
      throw new Error('Email is required');
    }
    
    // Get user data
    const user = await userRepository.getUserByEmail(email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    
    // Get user's recent challenges for context
    const recentChallenges = await challengeRepository.getRecentChallengesForUser(email, 3);
    
    // Determine challenge parameters
    let challengeParams = {};
    
    // If difficultyManager is provided and parameters are missing, get recommendations
    if (difficultyManager && (!challengeType || !focusArea)) {
      // Get user's challenge history
      const userChallengeHistory = await challengeRepository.getChallengesForUser(email);
      
      // Get optimal next challenge recommendation
      const recommendation = difficultyManager.getNextChallengeRecommendation(user, userChallengeHistory);
      
      challengeParams = {
        challengeTypeCode: challengeType || recommendation.challengeType,
        focusArea: focusArea || recommendation.focusArea,
        formatTypeCode: formatType || recommendation.formatType,
        difficulty: difficulty || recommendation.difficulty
      };
      
      // Calculate optimal difficulty if not explicitly provided
      if (!difficulty && difficultyManager) {
        challengeParams.difficultySettings = difficultyManager.calculateOptimalDifficulty(
          user, 
          userChallengeHistory, 
          challengeParams.challengeTypeCode
        );
      }
    } else {
      // Use provided parameters or defaults
      challengeParams = {
        challengeTypeCode: challengeType || 'critical-analysis',
        focusArea: focusArea || user.focusArea || 'AI Ethics',
        formatTypeCode: formatType || 'scenario',
        difficulty: difficulty || 'medium'
      };
      
      // Set basic difficulty settings if not calculated by difficultyManager
      if (!challengeParams.difficultySettings) {
        const difficultyLevel = challengeParams.difficulty;
        challengeParams.difficultySettings = {
          level: difficultyLevel,
          complexity: difficultyLevel === 'hard' ? 0.8 : difficultyLevel === 'medium' ? 0.6 : 0.4,
          depth: difficultyLevel === 'hard' ? 0.8 : difficultyLevel === 'medium' ? 0.6 : 0.4
        };
      }
    }
    
    // Validate parameters against config if provided
    if (config) {
      // Adapt legacy config validation to use challengeTypeCode
      if (config.game && config.game.challengeTypes && 
          !config.game.challengeTypes.some(type => type.id === challengeParams.challengeTypeCode)) {
        throw new Error(`Invalid challenge type: ${challengeParams.challengeTypeCode}`);
      }
      
      if (config.game && config.game.focusAreas &&
          !config.game.focusAreas.includes(challengeParams.focusArea)) {
        throw new Error(`Invalid focus area: ${challengeParams.focusArea}`);
      }
    }
    
    logger.info(`Generating challenge for user: ${email}`, { 
      challengeTypeCode: challengeParams.challengeTypeCode, 
      focusArea: challengeParams.focusArea,
      difficulty: challengeParams.difficulty
    });
    
    // Create or get a thread for this user's challenges
    let threadId = user.challengeThreadId;
    if (!threadId) {
      // Create a new thread using the domain service
      const threadMetadata = await challengeThreadService.createChallengeThread(email);
      threadId = threadMetadata.id;
      
      // Update user with the new thread ID
      await userRepository.updateUser(email, { challengeThreadId: threadId });
      logger.info('Created new challenge thread for user', { email, threadId });
    }
    
    // Generate challenge using the domain service
    const challenge = await challengeGenerationService.generateChallenge(
      user, 
      challengeParams, 
      recentChallenges,
      { threadId, allowDynamicTypes: true }
    );
    
    // Persist the challenge using the repository
    const savedChallenge = await challengeRepository.saveChallenge(challenge);
    
    // Update user's lastActive timestamp
    await userRepository.updateUser(email, { lastActive: new Date().toISOString() });
    
    return savedChallenge;
  } catch (error) {
    logger.error('Error generating and persisting challenge:', { error: error.message });
    throw error;
  }
};

/**
 * Submit and evaluate a challenge response
 * @param {Object} params - Challenge response submission parameters
 * @param {string} params.challengeId - Challenge ID
 * @param {Array} params.responses - User's responses
 * @param {Object} [params.progressTrackingService] - Optional progress tracking service for updating user stats
 * @param {Object} [params.userJourneyService] - Optional user journey service for recording events
 * @returns {Promise<Object>} - Evaluation results and updated challenge
 */
const submitChallengeResponse = async (params) => {
  // Get repositories at runtime
  const challengeRepository = container.get('challengeRepository');
  const userRepository = container.get('userRepository');

  try {
    const { challengeId, responses, progressTrackingService, userJourneyService } = params;
    
    // Validate required parameters
    if (!challengeId) {
      throw new Error('Challenge ID is required');
    }
    
    if (!responses || !Array.isArray(responses)) {
      throw new Error('Responses must be provided as an array');
    }
    
    // Get the challenge
    const challengeData = await challengeRepository.getChallengeById(challengeId);
    if (!challengeData) {
      throw new Error(`Challenge with ID ${challengeId} not found`);
    }
    
    // Convert to domain model if necessary
    const challenge = challengeData instanceof Challenge ? 
      challengeData : Challenge.fromDatabase(challengeData);
    
    // Check if challenge is already completed
    if (challenge.isCompleted()) {
      throw new Error(`Challenge with ID ${challengeId} is already completed`);
    }
    
    // Validate responses format based on challenge type
    if (challenge.formatTypeCode === 'multiple-choice') {
      const validResponses = responses.every(r => r.questionId && r.answer !== undefined);
      if (!validResponses) {
        throw new Error('Each response must have questionId and answer for multiple-choice challenges');
      }
    }
    
    logger.info(`Processing challenge response submission for challenge: ${challengeId}`, { 
      userEmail: challenge.userEmail,
      challengeTypeCode: challenge.challengeTypeCode,
      responseCount: responses.length
    });
    
    // Create or get evaluation thread
    let evaluationThreadId = challenge.evaluationThreadId;
    if (!evaluationThreadId) {
      const threadMetadata = await challengeThreadService.createEvaluationThread(
        challenge.userEmail, 
        challenge.id
      );
      evaluationThreadId = threadMetadata.id;
      
      // Update challenge with evaluation thread ID
      challenge.update({ evaluationThreadId });
      await challengeRepository.updateChallenge(challenge.id, { evaluationThreadId });
    }
    
    // Submit responses to the challenge
    challenge.submitResponses(responses);
    
    // Evaluate the responses using the domain service
    const evaluation = await challengeEvaluationService.evaluateResponses(
      challenge, 
      responses, 
      { threadId: evaluationThreadId }
    );
    
    // Complete the challenge with the evaluation
    challenge.complete(evaluation);
    
    // Update the challenge in the repository
    const updatedChallenge = await challengeRepository.updateChallenge(
      challenge.id, 
      challenge.toObject()
    );
    
    // Update user progress if service is provided
    if (progressTrackingService && challenge.userEmail) {
      try {
        await progressTrackingService.updateProgressAfterChallenge(
          challenge.userEmail,
          challenge.focusArea,
          challengeId,
          evaluation
        );
        logger.info(`Updated progress for user: ${challenge.userEmail}`);
      } catch (progressError) {
        logger.error('Error updating user progress:', { error: progressError.message });
        // Don't fail the whole operation if progress tracking fails
      }
    }
    
    // Record user journey event if service is provided
    if (userJourneyService && challenge.userEmail) {
      try {
        await userJourneyService.recordUserEvent(challenge.userEmail, 'challenge_completed', {
          challengeId,
          challengeTypeCode: challenge.challengeTypeCode,
          focusArea: challenge.focusArea,
          score: evaluation.score || 0
        });
        logger.info(`Recorded journey event for user: ${challenge.userEmail}`);
      } catch (journeyError) {
        logger.error('Error recording user journey event:', { error: journeyError.message });
        // Don't fail the whole operation if event recording fails
      }
    }
    
    // Update user's lastActive timestamp
    try {
      await userRepository.updateUser(challenge.userEmail, { lastActive: new Date().toISOString() });
    } catch (updateError) {
      logger.error('Error updating user lastActive timestamp:', { error: updateError.message });
      // Don't fail the whole operation if user update fails
    }
    
    logger.info(`Challenge response processed successfully for challenge: ${challengeId}`, {
      userEmail: challenge.userEmail,
      score: evaluation.score || 0
    });
    
    return {
      evaluation,
      challenge: updatedChallenge
    };
  } catch (error) {
    logger.error('Error submitting and evaluating challenge response:', {
      error: error.message,
      challengeId: params.challengeId
    });
    throw error;
  }
};

/**
 * Submit and evaluate a challenge response with streaming
 * @param {Object} params - Challenge response submission parameters
 * @param {string} params.challengeId - Challenge ID
 * @param {Array} params.responses - User's responses
 * @param {Object} [params.progressTrackingService] - Optional progress tracking service
 * @param {Object} [params.userJourneyService] - Optional user journey service
 * @param {Function} [params.onEvaluationProgress] - Optional callback for streaming evaluation progress
 * @returns {Promise<Object>} - Evaluation results and updated challenge
 */
const submitChallengeResponseStream = async (params) => {
  // Get repositories at runtime
  const challengeRepository = container.get('challengeRepository');
  const userRepository = container.get('userRepository');

  try {
    const { challengeId, responses, progressTrackingService, userJourneyService, onEvaluationProgress } = params;
    
    // Validate required parameters
    if (!challengeId) {
      throw new Error('Challenge ID is required');
    }
    
    if (!responses || !Array.isArray(responses)) {
      throw new Error('Responses must be provided as an array');
    }
    
    // Get the challenge
    const challengeData = await challengeRepository.getChallengeById(challengeId);
    if (!challengeData) {
      throw new Error(`Challenge with ID ${challengeId} not found`);
    }
    
    // Convert to domain model if necessary
    const challenge = challengeData instanceof Challenge ? 
      challengeData : Challenge.fromDatabase(challengeData);
    
    // Check if challenge is already completed
    if (challenge.isCompleted()) {
      throw new Error(`Challenge with ID ${challengeId} is already completed`);
    }
    
    logger.info(`Processing streaming challenge response for challenge: ${challengeId}`, { 
      userEmail: challenge.userEmail,
      challengeTypeCode: challenge.challengeTypeCode,
      responseCount: responses.length
    });
    
    // Create or get evaluation thread
    let evaluationThreadId = challenge.evaluationThreadId;
    if (!evaluationThreadId) {
      const threadMetadata = await challengeThreadService.createEvaluationThread(
        challenge.userEmail, 
        challenge.id
      );
      evaluationThreadId = threadMetadata.id;
      
      // Update challenge with evaluation thread ID
      challenge.update({ evaluationThreadId });
      await challengeRepository.updateChallenge(challenge.id, { evaluationThreadId });
    }
    
    // Submit responses to the challenge
    challenge.submitResponses(responses);
    
    // Notify about starting evaluation
    if (onEvaluationProgress) {
      onEvaluationProgress('evaluation.started', 'Starting evaluation of your response');
    }
    
    // Set up evaluation result
    let evaluationResult = {
      score: 0,
      overallFeedback: '',
      strengths: [],
      areasForImprovement: [],
      nextSteps: ''
    };
    
    // Set up callbacks for streaming
    const callbacks = {
      onChunk: (chunk) => {
        try {
          // Try to parse the chunk as JSON
          let data;
          try {
            if (chunk.trim().startsWith('{') && chunk.trim().endsWith('}')) {
              data = JSON.parse(chunk);
            }
          } catch (e) {
            // Not JSON, treat as text
            data = null;
          }
          
          if (data) {
            // Handle structured data
            if (data.score !== undefined) {
              evaluationResult.score = data.score;
              if (onEvaluationProgress) {
                onEvaluationProgress('evaluation.score', data.score);
              }
            }
            
            if (data.feedback || data.overallFeedback) {
              const feedback = data.feedback || data.overallFeedback;
              evaluationResult.overallFeedback += feedback;
              if (onEvaluationProgress) {
                onEvaluationProgress('evaluation.feedback', feedback);
              }
            }
            
            if (data.strength) {
              evaluationResult.strengths.push(data.strength);
              if (onEvaluationProgress) {
                onEvaluationProgress('evaluation.strength', data.strength);
              }
            }
            
            if (data.area_for_improvement || data.areaForImprovement) {
              const improvement = data.area_for_improvement || data.areaForImprovement;
              evaluationResult.areasForImprovement.push(improvement);
              if (onEvaluationProgress) {
                onEvaluationProgress('evaluation.improvement', improvement);
              }
            }
            
            if (data.next_steps || data.nextSteps) {
              evaluationResult.nextSteps = data.next_steps || data.nextSteps;
              if (onEvaluationProgress) {
                onEvaluationProgress('evaluation.nextSteps', evaluationResult.nextSteps);
              }
            }
          } else {
            // Plain text, treat as feedback
            evaluationResult.overallFeedback += chunk;
            if (onEvaluationProgress) {
              onEvaluationProgress('evaluation.chunk', chunk);
            }
          }
        } catch (error) {
          logger.error('Error handling evaluation chunk', { error: error.message });
          // Continue processing despite error
        }
      },
      onComplete: async (fullText) => {
        try {
          // Extract strengths and areas for improvement from full text if not provided in chunks
          if (evaluationResult.strengths.length === 0 || evaluationResult.areasForImprovement.length === 0) {
            const sections = fullText.split(/\n#{2,3}\s+/);
            
            // Look for strengths and areas for improvement in sections
            for (const section of sections) {
              const title = section.split('\n')[0].toLowerCase();
              const content = section.split('\n').slice(1).join('\n').trim();
              
              if (title.includes('strength') && evaluationResult.strengths.length === 0) {
                // Extract bullet points or numbered items
                const items = content.split(/\n[\-\*\d\.\)]+\s+/).filter(item => item.trim());
                if (items.length > 0) {
                  evaluationResult.strengths = items;
                  if (onEvaluationProgress) {
                    onEvaluationProgress('evaluation.strengths', items);
                  }
                }
              } else if ((title.includes('improvement') || title.includes('weakness')) && 
                        evaluationResult.areasForImprovement.length === 0) {
                // Extract bullet points or numbered items
                const items = content.split(/\n[\-\*\d\.\)]+\s+/).filter(item => item.trim());
                if (items.length > 0) {
                  evaluationResult.areasForImprovement = items;
                  if (onEvaluationProgress) {
                    onEvaluationProgress('evaluation.improvements', items);
                  }
                }
              } else if (title.includes('next step') && !evaluationResult.nextSteps) {
                evaluationResult.nextSteps = content;
                if (onEvaluationProgress) {
                  onEvaluationProgress('evaluation.nextSteps', content);
                }
              }
            }
          }
          
          // If still no score, try to extract it
          if (evaluationResult.score === 0) {
            const scoreMatch = fullText.match(/score[:\s]+(\d+)/i);
            if (scoreMatch && scoreMatch[1]) {
              evaluationResult.score = parseInt(scoreMatch[1], 10);
              if (onEvaluationProgress) {
                onEvaluationProgress('evaluation.score', evaluationResult.score);
              }
            }
          }
          
          // Complete the challenge with the evaluation
          challenge.complete({
            score: evaluationResult.score,
            overallFeedback: evaluationResult.overallFeedback,
            strengths: evaluationResult.strengths,
            areasForImprovement: evaluationResult.areasForImprovement,
            nextSteps: evaluationResult.nextSteps,
            fullText: fullText
          });
          
          // Update the challenge in the repository
          const updatedChallenge = await challengeRepository.updateChallenge(
            challenge.id, 
            challenge.toObject()
          );
          
          // Update user progress if service is provided
          if (progressTrackingService && challenge.userEmail) {
            try {
              await progressTrackingService.updateProgressAfterChallenge(
                challenge.userEmail,
                challenge.focusArea,
                challengeId,
                {
                  score: evaluationResult.score,
                  strengths: evaluationResult.strengths,
                  areasForImprovement: evaluationResult.areasForImprovement
                }
              );
              logger.info(`Updated progress for user: ${challenge.userEmail}`);
            } catch (progressError) {
              logger.error('Error updating user progress:', { error: progressError.message });
              // Don't fail the whole operation if progress tracking fails
            }
          }
          
          // Record user journey event if service is provided
          if (userJourneyService && challenge.userEmail) {
            try {
              await userJourneyService.recordUserEvent(challenge.userEmail, 'challenge_completed', {
                challengeId,
                challengeTypeCode: challenge.challengeTypeCode,
                focusArea: challenge.focusArea,
                score: evaluationResult.score || 0
              });
              logger.info(`Recorded journey event for user: ${challenge.userEmail}`);
            } catch (journeyError) {
              logger.error('Error recording user journey event:', { error: journeyError.message });
              // Don't fail the whole operation if event recording fails
            }
          }
          
          // Update user's lastActive timestamp
          try {
            await userRepository.updateUser(challenge.userEmail, { lastActive: new Date().toISOString() });
          } catch (updateError) {
            logger.error('Error updating user lastActive timestamp:', { error: updateError.message });
            // Don't fail the whole operation if user update fails
          }
          
          logger.info(`Challenge response processed successfully for challenge: ${challengeId}`, {
            userEmail: challenge.userEmail,
            score: evaluationResult.score || 0
          });
          
          if (onEvaluationProgress) {
            onEvaluationProgress('evaluation.complete', {
              challengeId,
              evaluation: {
                score: evaluationResult.score,
                strengths: evaluationResult.strengths,
                areasForImprovement: evaluationResult.areasForImprovement,
                nextSteps: evaluationResult.nextSteps
              }
            });
          }
          
          return {
            evaluation: {
              score: evaluationResult.score,
              overallFeedback: evaluationResult.overallFeedback,
              strengths: evaluationResult.strengths,
              areasForImprovement: evaluationResult.areasForImprovement,
              nextSteps: evaluationResult.nextSteps
            },
            challenge: updatedChallenge
          };
        } catch (error) {
          logger.error('Error processing streaming evaluation completion', { error: error.message });
          throw error;
        }
      },
      onError: (error) => {
        logger.error('Error during streaming evaluation', { error: error.message });
        if (onEvaluationProgress) {
          onEvaluationProgress('evaluation.error', error.message);
        }
        throw error;
      }
    };
    
    // Stream the evaluation using the domain service
    return await challengeEvaluationService.streamEvaluateResponses(
      challenge,
      responses,
      callbacks,
      { threadId: evaluationThreadId }
    );
  } catch (error) {
    logger.error('Error submitting and streaming challenge response:', {
      error: error.message,
      challengeId: params.challengeId
    });
    throw error;
  }
};

module.exports = {
  generateAndPersistChallenge,
  submitChallengeResponse,
  submitChallengeResponseStream
}; 