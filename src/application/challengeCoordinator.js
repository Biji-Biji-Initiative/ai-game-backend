/**
 * Challenge Coordinator
 * 
 * Application-level coordinator that orchestrates domain services for challenges
 * This coordinator follows the principles of Domain-Driven Design by delegating
 * business logic to the appropriate domain services and coordinating across domains.
 */
const { challengeLogger } = require('../core/infra/logging/domainLogger');

// Import domain model
const Challenge = require('../core/challenge/models/Challenge');

// Import domain errors
const { 
  ChallengeNotFoundError, 
  ChallengeGenerationError, 
  ChallengeResponseError 
} = require('../core/challenge/errors/ChallengeErrors');

/**
 * Challenge Coordinator Class
 * Manages challenge-related operations across domains
 */
class ChallengeCoordinator {
  /**
   * Create a new ChallengeCoordinator
   * @param {Object} dependencies Injected dependencies
   * @param {UserService} dependencies.userService Service for user operations
   * @param {ChallengeService} dependencies.challengeService Service for challenge operations
   * @param {ChallengeTypeRepository} dependencies.challengeTypeRepository Repository for challenge types
   * @param {FormatTypeRepository} dependencies.formatTypeRepository Repository for format types
   * @param {FocusAreaConfigRepository} dependencies.focusAreaConfigRepository Repository for focus areas
   * @param {DifficultyLevelRepository} dependencies.difficultyLevelRepository Repository for difficulty levels
   * @param {ChallengeGenerationService} dependencies.challengeGenerationService Service for challenge generation
   * @param {ChallengeEvaluationService} dependencies.challengeEvaluationService Service for challenge evaluation
   * @param {OpenAIClient} dependencies.openAIClient OpenAI client for AI operations
   * @param {OpenAIStateManager} dependencies.openAIStateManager State manager for OpenAI conversations
   * @param {Logger} dependencies.logger Logger instance
   */
  constructor({ 
    userService,
    challengeService,
    challengeTypeRepository,
    formatTypeRepository,
    focusAreaConfigRepository,
    difficultyLevelRepository,
    challengeGenerationService,
    challengeEvaluationService,
    openAIClient, 
    openAIStateManager, 
    logger 
  }) {
    this.userService = userService;
    this.challengeService = challengeService;
    this.challengeTypeRepository = challengeTypeRepository;
    this.formatTypeRepository = formatTypeRepository;
    this.focusAreaConfigRepository = focusAreaConfigRepository;
    this.difficultyLevelRepository = difficultyLevelRepository;
    this.challengeGenerationService = challengeGenerationService;
    this.challengeEvaluationService = challengeEvaluationService;
    this.openAIClient = openAIClient;
    this.openAIStateManager = openAIStateManager;
    this.logger = logger || challengeLogger.child('coordinator');
  }

  /**
   * Generate a challenge for a user
   * @param {Object} params - Challenge generation parameters
   * @param {string} params.userEmail - User email
   * @param {string} [params.focusArea] - Focus area for the challenge
   * @param {string} [params.challengeType] - Type of challenge
   * @param {string} [params.formatType] - Format type of the challenge
   * @param {string} [params.difficulty] - Difficulty level
   * @param {Object} [params.config] - Configuration object
   * @param {Object} [params.difficultyManager] - Difficulty manager for calculating optimal difficulty
   * @returns {Promise<Object>} - The generated challenge
   */
  async generateAndPersistChallenge(params) {
    try {
      const { userEmail, focusArea, challengeType, formatType, difficulty, config, difficultyManager } = params;
      
      // Validate input
      if (!userEmail) {
        throw new ChallengeGenerationError('User email is required');
      }
      
      // Get user data
      const user = await this.userService.findByEmail(userEmail);
      if (!user) {
        throw new ChallengeGenerationError(`User with email ${userEmail} not found`);
      }
      
      // Get user's recent challenges for context
      const recentChallenges = await this.challengeService.getRecentChallengesForUser(userEmail, 3);
      
      // Determine challenge parameters
      let challengeParams = {};
      
      // If difficultyManager is provided and parameters are missing, get recommendations
      if (difficultyManager && (!challengeType || !focusArea)) {
        // Get user's challenge history
        const userChallengeHistory = await this.challengeService.getChallengesForUser(userEmail);
        
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
          throw new ChallengeGenerationError(`Invalid challenge type: ${challengeParams.challengeTypeCode}`);
        }
        
        if (config.game && config.game.focusAreas &&
            !config.game.focusAreas.includes(challengeParams.focusArea)) {
          throw new ChallengeGenerationError(`Invalid focus area: ${challengeParams.focusArea}`);
        }
      }
      
      this.logger.info(`Generating challenge for user: ${userEmail}`, { 
        challengeTypeCode: challengeParams.challengeTypeCode, 
        focusArea: challengeParams.focusArea,
        difficulty: challengeParams.difficulty
      });
      
      // Find or create conversation state for challenge generation
      const conversationContext = `challenge_gen_${userEmail}`;
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        userEmail, 
        conversationContext
      );
      
      // Get the last response ID for stateful conversation
      const lastResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
      
      // Generate challenge using the domain service
      const challenge = await this.challengeGenerationService.generateChallenge(
        user, 
        challengeParams, 
        recentChallenges,
        { 
          stateId: conversationState.id,
          lastResponseId,
          allowDynamicTypes: true 
        }
      );
      
      // Update the state with the new response ID if available
      if (challenge.responseId) {
        await this.openAIStateManager.updateLastResponseId(conversationState.id, challenge.responseId);
      }
      
      // Persist the challenge using the repository
      const savedChallenge = await this.challengeService.saveChallenge(challenge);
      
      // Update user's lastActive timestamp
      await this.userService.updateUser(userEmail, { lastActive: new Date().toISOString() });
      
      return savedChallenge;
    } catch (error) {
      this.logger.error('Error generating and persisting challenge:', { error: error.message });
      throw new ChallengeGenerationError(`Failed to generate challenge: ${error.message}`);
    }
  }

  /**
   * Submit and evaluate a challenge response
   * @param {Object} params - Challenge response submission parameters
   * @param {string} params.challengeId - Challenge ID
   * @param {string} params.userEmail - User's email
   * @param {string} params.response - User's response
   * @param {Object} [params.progressTrackingService] - Optional progress tracking service for updating user stats
   * @param {Object} [params.userJourneyService] - Optional user journey service for recording events
   * @returns {Promise<Object>} - Evaluation results and updated challenge
   */
  async submitChallengeResponse(params) {
    try {
      const { challengeId, userEmail, response, progressTrackingService, userJourneyService } = params;
      
      // Validate required parameters
      if (!challengeId) {
        throw new ChallengeResponseError('Challenge ID is required');
      }
      
      if (!response) {
        throw new ChallengeResponseError('Response is required');
      }
      
      // Get the challenge
      const challengeData = await this.challengeService.getChallengeById(challengeId);
      if (!challengeData) {
        throw new ChallengeNotFoundError(`Challenge with ID ${challengeId} not found`);
      }
      
      // Convert to domain model if necessary
      const challenge = challengeData instanceof Challenge ? 
        challengeData : Challenge.fromDatabase(challengeData);
      
      // Check if challenge is already completed using domain model method
      if (challenge.isCompleted()) {
        throw new ChallengeResponseError(`Challenge with ID ${challengeId} is already completed`);
      }
      
      // Format responses as an array for compatibility
      const responses = Array.isArray(response) ? response : [{ response }];
      
      this.logger.info(`Processing challenge response submission for challenge: ${challengeId}`, { 
        userEmail,
        challengeType: challenge.challengeType,
        responseCount: responses.length
      });
      
      // Find or create conversation state for challenge evaluation
      const conversationContext = `challenge_eval_${challengeId}`;
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        userEmail, 
        conversationContext,
        { challengeId }
      );
      
      // Get the last response ID for stateful conversation
      const lastResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
      
      // Submit responses to the challenge using domain model method
      challenge.submitResponses(responses);
      
      // Evaluate the responses using the domain service
      const evaluation = await this.challengeEvaluationService.evaluateResponses(
        challenge, 
        responses, 
        { 
          stateId: conversationState.id,
          lastResponseId 
        }
      );
      
      // Update the state with the new response ID if available
      if (evaluation.responseId) {
        await this.openAIStateManager.updateLastResponseId(conversationState.id, evaluation.responseId);
      }
      
      // Complete the challenge with the evaluation using domain model method
      challenge.complete(evaluation);
      
      // Update the challenge in the repository using toDatabase() method
      const updatedChallenge = await this.challengeService.updateChallenge(
        challenge.id, 
        challenge.toDatabase()
      );
      
      // Update user progress if service is provided
      if (progressTrackingService && userEmail) {
        try {
          await progressTrackingService.updateProgressAfterChallenge(
            userEmail,
            challenge.focusArea,
            challengeId,
            evaluation
          );
          this.logger.info(`Updated progress for user: ${userEmail}`);
        } catch (progressError) {
          this.logger.error('Error updating user progress:', { error: progressError.message });
          // Don't fail the whole operation if progress tracking fails
        }
      }
      
      // Record user journey event if service is provided
      if (userJourneyService && userEmail) {
        try {
          await userJourneyService.recordUserEvent(userEmail, 'challenge_completed', {
            challengeId,
            challengeType: challenge.challengeType,
            focusArea: challenge.focusArea,
            score: challenge.getScore() || 0
          });
          this.logger.info(`Recorded journey event for user: ${userEmail}`);
        } catch (journeyError) {
          this.logger.error('Error recording user journey event:', { error: journeyError.message });
          // Don't fail the whole operation if event recording fails
        }
      }
      
      // Update user's lastActive timestamp
      try {
        await this.userService.updateUser(userEmail, { lastActive: new Date().toISOString() });
      } catch (updateError) {
        this.logger.error('Error updating user lastActive timestamp:', { error: updateError.message });
        // Don't fail the whole operation if user update fails
      }
      
      this.logger.info(`Challenge response processed successfully for challenge: ${challengeId}`, {
        userEmail,
        score: challenge.getScore() || 0
      });
      
      return {
        evaluation,
        challenge: updatedChallenge
      };
    } catch (error) {
      this.logger.error('Error submitting and evaluating challenge response:', {
        error: error.message,
        challengeId: params.challengeId
      });
      
      if (error instanceof ChallengeNotFoundError) {
        throw error;
      }
      
      throw new ChallengeResponseError(`Failed to process challenge response: ${error.message}`);
    }
  }

  /**
   * Get challenge history for a user
   * @param {string} userEmail - User's email
   * @returns {Promise<Array>} - List of challenges
   */
  async getChallengeHistoryForUser(userEmail) {
    try {
      if (!userEmail) {
        throw new ChallengeNotFoundError('User email is required');
      }

      this.logger.debug(`Getting challenge history for user: ${userEmail}`);
      
      const challenges = await this.challengeService.getChallengesForUser(userEmail);
      
      this.logger.info(`Retrieved ${challenges.length} challenges for user: ${userEmail}`);
      
      return challenges;
    } catch (error) {
      this.logger.error('Error getting challenge history:', { 
        error: error.message,
        userEmail 
      });
      throw new ChallengeNotFoundError(`Failed to retrieve challenge history: ${error.message}`);
    }
  }

  /**
   * Get a challenge by ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Object>} - Challenge object
   */
  async getChallengeById(challengeId) {
    try {
      if (!challengeId) {
        throw new ChallengeNotFoundError('Challenge ID is required');
      }

      this.logger.debug(`Getting challenge by ID: ${challengeId}`);
      
      const challenge = await this.challengeService.getChallengeById(challengeId);
      
      if (!challenge) {
        throw new ChallengeNotFoundError(`Challenge with ID ${challengeId} not found`);
      }
      
      this.logger.info(`Retrieved challenge: ${challengeId}`);
      
      return challenge;
    } catch (error) {
      this.logger.error('Error getting challenge by ID:', { 
        error: error.message,
        challengeId 
      });
      
      if (error instanceof ChallengeNotFoundError) {
        throw error;
      }
      
      throw new ChallengeNotFoundError(`Failed to retrieve challenge: ${error.message}`);
    }
  }
}

module.exports = ChallengeCoordinator; 