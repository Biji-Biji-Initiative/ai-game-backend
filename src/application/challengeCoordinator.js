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
   * @param {ChallengeConfigService} dependencies.challengeConfigService Service for challenge configuration
   * @param {ChallengeFactory} dependencies.challengeFactory Factory for creating challenges
   * @param {ChallengeGenerationService} dependencies.challengeGenerationService Service for challenge generation
   * @param {ChallengeEvaluationService} dependencies.challengeEvaluationService Service for challenge evaluation
   * @param {OpenAIClient} dependencies.openAIClient OpenAI client for AI operations
   * @param {OpenAIStateManager} dependencies.openAIStateManager State manager for OpenAI conversations
   * @param {Logger} dependencies.logger Logger instance
   */
  constructor({ 
    userService,
    challengeService,
    challengeConfigService,
    challengeFactory,
    challengeGenerationService,
    challengeEvaluationService,
    openAIClient, 
    openAIStateManager, 
    logger 
  }) {
    this.userService = userService;
    this.challengeService = challengeService;
    this.challengeConfigService = challengeConfigService;
    this.challengeFactory = challengeFactory;
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
      
      this.logger.info(`Generating challenge for user: ${userEmail}`, { 
        challengeType, 
        focusArea,
        difficulty
      });
      
      // Find or create conversation state for challenge generation
      const conversationContext = `challenge_gen_${userEmail}`;
      const conversationState = await this.openAIStateManager.findOrCreateConversationState(
        userEmail, 
        conversationContext
      );
      
      // Get the last response ID for stateful conversation
      const lastResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
      
      // Use the factory to create the challenge with validated parameters
      const challengeEntity = await this.challengeFactory.createChallenge({
        user,
        recentChallenges,
        challengeTypeCode: challengeType,
        formatTypeCode: formatType,
        focusArea,
        difficulty,
        difficultyManager,
        config
      });
      
      // Generate challenge content using the domain service
      const fullChallenge = await this.challengeGenerationService.generateChallenge(
        user, 
        {
          challengeTypeCode: challengeEntity.challengeType,
          focusArea: challengeEntity.focusArea,
          formatTypeCode: challengeEntity.formatType,
          difficulty: challengeEntity.difficulty,
          difficultySettings: challengeEntity.difficultySettings,
          typeMetadata: challengeEntity.typeMetadata,
          formatMetadata: challengeEntity.formatMetadata
        }, 
        recentChallenges,
        { 
          stateId: conversationState.id,
          lastResponseId,
          allowDynamicTypes: true 
        }
      );
      
      // Update the state with the new response ID if available
      if (fullChallenge.responseId) {
        await this.openAIStateManager.updateLastResponseId(conversationState.id, fullChallenge.responseId);
      }
      
      // Update the challenge entity with generated content
      challengeEntity.title = fullChallenge.title || challengeEntity.title;
      challengeEntity.description = fullChallenge.description;
      challengeEntity.instructions = fullChallenge.instructions;
      challengeEntity.content = fullChallenge.content;
      challengeEntity.responseId = fullChallenge.responseId;
      challengeEntity.evaluationCriteria = fullChallenge.evaluationCriteria;
      
      // Persist the challenge using the service
      const savedChallenge = await this.challengeService.saveChallenge(challengeEntity);
      
      // Update user's lastActive timestamp asynchronously (non-blocking)
      this.userService
        .updateUser(userEmail, { lastActive: new Date().toISOString() })
        .then(() => {
          this.logger.debug(`Updated lastActive timestamp for user: ${userEmail}`);
        })
        .catch(updateError => {
          this.logger.error('Error updating user lastActive timestamp:', { 
            error: updateError.message,
            userEmail
          });
        });
      
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
      
      this.logger.debug('Found or created conversation state for challenge evaluation', {
        userEmail,
        challengeId,
        stateId: conversationState.id
      });
      
      // Get the last response ID for stateful conversation
      const lastResponseId = await this.openAIStateManager.getLastResponseId(conversationState.id);
      
      this.logger.debug('Retrieved last response ID for stateful conversation', {
        stateId: conversationState.id,
        hasResponseId: !!lastResponseId
      });
      
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
        
        this.logger.debug('Updated conversation state with new response ID', {
          stateId: conversationState.id,
          responseId: evaluation.responseId
        });
      }
      
      // Complete the challenge with the evaluation using domain model method
      challenge.complete(evaluation);
      
      // Update the challenge in the repository using toDatabase() method
      const updatedChallenge = await this.challengeService.updateChallenge(
        challenge.id, 
        challenge.toDatabase()
      );

      // Prepare secondary operations that can be performed in parallel
      const secondaryOperations = [];
      
      // Add user progress tracking operation if service is provided
      if (progressTrackingService && userEmail) {
        const progressOperation = progressTrackingService
          .updateProgressAfterChallenge(
            userEmail,
            challenge.focusArea,
            challengeId,
            evaluation
          )
          .then(() => {
            this.logger.info(`Updated progress for user: ${userEmail}`);
          })
          .catch(progressError => {
            this.logger.error('Error updating user progress:', { error: progressError.message });
            // Don't throw to avoid failing the whole operation
          });
        
        secondaryOperations.push(progressOperation);
      }
      
      // Add user journey event recording operation if service is provided
      if (userJourneyService && userEmail) {
        const journeyOperation = userJourneyService
          .recordUserEvent(userEmail, 'challenge_completed', {
            challengeId,
            challengeType: challenge.challengeType,
            focusArea: challenge.focusArea,
            score: challenge.getScore() || 0
          })
          .then(() => {
            this.logger.info(`Recorded journey event for user: ${userEmail}`);
          })
          .catch(journeyError => {
            this.logger.error('Error recording user journey event:', { error: journeyError.message });
            // Don't throw to avoid failing the whole operation
          });
        
        secondaryOperations.push(journeyOperation);
      }
      
      // Add user lastActive timestamp update operation
      const lastActiveOperation = this.userService
        .updateUser(userEmail, { lastActive: new Date().toISOString() })
        .catch(updateError => {
          this.logger.error('Error updating user lastActive timestamp:', { error: updateError.message });
          // Don't throw to avoid failing the whole operation
        });
      
      secondaryOperations.push(lastActiveOperation);
      
      // Execute all secondary operations in parallel
      // We're not awaiting the result as these are non-critical and shouldn't block the main response
      Promise.all(secondaryOperations)
        .then(() => {
          this.logger.debug('All secondary operations completed successfully', { challengeId });
        })
        .catch(error => {
          this.logger.error('Error in secondary operations:', { error: error.message });
        });
      
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