'use strict';

/**
 * Challenge Coordinator
 * 
 * Application-level coordinator that orchestrates domain services for challenges
 * This coordinator follows the principles of Domain-Driven Design by delegating
 * business logic to the appropriate domain services and coordinating across domains.
 * 
 * NOTE: This coordinator has been updated to remove direct dependencies on OpenAI infrastructure
 * as part of Ticket 4 to better follow Ports & Adapters architecture.
 */
const { challengeLogger } = require('../core/infra/logging/domainLogger');
const BaseCoordinator = require('./BaseCoordinator');

// Import domain model
const Challenge = require('../core/challenge/models/Challenge');

// Import domain errors
const { 
  ChallengeNotFoundError, 
  ChallengeGenerationError, 
  ChallengeResponseError 
} = require('../core/challenge/errors/ChallengeErrors');

// Add import for value objects
const { 
  createEmail, 
  createChallengeId, 
  createFocusArea,
  createDifficultyLevel,
  Email,
  ChallengeId,
  FocusArea,
  DifficultyLevel
} = require('../core/common/valueObjects');

/**
 * Challenge Coordinator Class
 * Manages challenge-related operations across domains
 * Extends BaseCoordinator for standardized error handling and operation execution
 */
class ChallengeCoordinator extends BaseCoordinator {
  /**
   * Create a new ChallengeCoordinator
   * @param {Object} dependencies Injected dependencies
   * @param {UserService} dependencies.userService Service for user operations
   * @param {ChallengeService} dependencies.challengeService Service for challenge operations
   * @param {ChallengeConfigService} dependencies.challengeConfigService Service for challenge configuration
   * @param {ChallengeFactory} dependencies.challengeFactory Factory for creating challenges
   * @param {ChallengeGenerationService} dependencies.challengeGenerationService Service for challenge generation
   * @param {ChallengeEvaluationService} dependencies.challengeEvaluationService Service for challenge evaluation
   * @param {Logger} dependencies.logger Logger instance
   */
  constructor({ 
    userService,
    challengeService,
    challengeConfigService,
    challengeFactory,
    challengeGenerationService,
    challengeEvaluationService,
    logger 
  }) {
    // Call super with name and logger
    super({
      name: 'ChallengeCoordinator',
      logger: logger || challengeLogger.child('coordinator')
    });

    // Validate required dependencies
    const requiredDependencies = [
      'userService',
      'challengeService',
      'challengeConfigService',
      'challengeFactory',
      'challengeGenerationService',
      'challengeEvaluationService'
    ];

    this.validateDependencies({
      userService,
      challengeService,
      challengeConfigService,
      challengeFactory,
      challengeGenerationService,
      challengeEvaluationService
    }, requiredDependencies);

    // Initialize services
    this.userService = userService;
    this.challengeService = challengeService;
    this.challengeConfigService = challengeConfigService;
    this.challengeFactory = challengeFactory;
    this.challengeGenerationService = challengeGenerationService;
    this.challengeEvaluationService = challengeEvaluationService;
  }

  /**
   * Generate and persist a new challenge for a user
   * @param {Object} params - Challenge generation parameters
   * @param {string|Email} params.userEmail - User email or Email value object
   * @param {string|FocusArea} [params.focusArea] - Focus area for the challenge or FocusArea value object
   * @param {string} [params.challengeType] - Type of challenge
   * @param {string} [params.formatType] - Format type of the challenge
   * @param {string|DifficultyLevel} [params.difficulty] - Difficulty level or DifficultyLevel value object
   * @param {Object} [params.config] - Configuration object
   * @param {Object} [params.difficultyManager] - Difficulty manager for calculating optimal difficulty
   * @returns {Promise<Object>} - The generated challenge
   */
  generateAndPersistChallenge(params) {
    const { userEmail, focusArea, challengeType, formatType, difficulty } = params;
    
    // Context for logging
    const context = { 
      userEmail: typeof userEmail === 'string' ? userEmail : userEmail?.value, 
      focusArea: typeof focusArea === 'string' ? focusArea : focusArea?.value,
      challengeType,
      formatType,
      difficulty: typeof difficulty === 'string' ? difficulty : difficulty?.value
    };

    return this.executeOperation(async () => {
      // Create value objects for validation and domain logic
      const emailVO = userEmail instanceof Email ? userEmail : createEmail(userEmail);
      const focusAreaVO = focusArea instanceof FocusArea ? focusArea : (focusArea ? createFocusArea(focusArea) : null);
      const difficultyVO = difficulty instanceof DifficultyLevel ? difficulty : (difficulty ? createDifficultyLevel(difficulty) : null);
      
      // Validate input using value objects
      if (!emailVO) {
        throw new ChallengeGenerationError('Invalid user email');
      }
      
      // Get user data using the value object directly
      const user = await this.userService.findByEmail(emailVO);
      if (!user) {
        throw new ChallengeGenerationError(`User with email ${emailVO.value} not found`);
      }
      
      // Get user's recent challenges for context
      const recentChallenges = await this.challengeService.getRecentChallengesForUser(emailVO, 3);
      
      // Create a conversation context identifier
      const conversationContext = `challenge_gen_${emailVO.value}`;
      
      // Use the factory to create the challenge with validated parameters
      const challengeEntity = await this.challengeFactory.createChallenge({
        user,
        recentChallenges,
        challengeTypeCode: challengeType,
        formatTypeCode: formatType,
        focusArea: focusAreaVO || focusArea,
        difficulty: difficultyVO || difficulty,
        difficultyManager: params.difficultyManager,
        config: params.config
      });
      
      // Generate challenge content using the domain service
      // The state management is now handled inside the service using the AIStateManager port
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
          conversationContext,
          allowDynamicTypes: true 
        }
      );
      
      // Update the challenge entity with generated content
      challengeEntity.title = fullChallenge.title || challengeEntity.title;
      challengeEntity.description = fullChallenge.description;
      challengeEntity.instructions = fullChallenge.instructions;
      challengeEntity.content = fullChallenge.content;
      challengeEntity.responseId = fullChallenge.responseId;
      challengeEntity.evaluationCriteria = fullChallenge.evaluationCriteria;
      
      // Persist the challenge using the service
      const savedChallenge = await this.challengeService.saveChallenge(challengeEntity);
      
      // Define secondary operations for parallel execution
      const updateLastActiveOperation = async () => {
        await this.userService.updateUser(emailVO, { lastActive: new Date().toISOString() });
      };
      
      // Execute secondary operations in parallel without blocking the main flow
      this.executeSecondaryOperations(
        [updateLastActiveOperation], 
        'updateUserLastActive', 
        { userEmail: emailVO.value }
      );
      
      return savedChallenge;
    }, 'generateAndPersistChallenge', context, ChallengeGenerationError);
  }

  /**
   * Submit and evaluate a challenge response
   * @param {Object} params - Challenge response submission parameters
   * @param {string|ChallengeId} params.challengeId - Challenge ID or ChallengeId value object
   * @param {string|Email} params.userEmail - User's email or Email value object
   * @param {string} params.response - User's response
   * @param {Object} [params.progressTrackingService] - Optional progress tracking service for updating user stats
   * @param {Object} [params.userJourneyService] - Optional user journey service for recording events
   * @returns {Promise<Object>} - Evaluation results and updated challenge
   */
  submitChallengeResponse(params) {
    const { challengeId, userEmail, response } = params;
    
    // Context for logging
    const context = { 
      challengeId: typeof challengeId === 'string' ? challengeId : challengeId?.value, 
      userEmail: typeof userEmail === 'string' ? userEmail : userEmail?.value, 
      hasProgressTracker: !!params.progressTrackingService,
      hasJourneyService: !!params.userJourneyService
    };

    return this.executeOperation(async () => {
      // Create value objects for validation and domain logic
      const challengeIdVO = challengeId instanceof ChallengeId ? challengeId : createChallengeId(challengeId);
      const emailVO = userEmail instanceof Email ? userEmail : createEmail(userEmail);
      
      // Validate required parameters
      if (!challengeIdVO) {
        throw new ChallengeResponseError('Invalid Challenge ID');
      }
      
      if (!response) {
        throw new ChallengeResponseError('Response is required');
      }
      
      // Get the challenge using value object directly
      const challengeData = await this.challengeService.getChallengeById(challengeIdVO);
      if (!challengeData) {
        throw new ChallengeNotFoundError(`Challenge with ID ${challengeIdVO.value} not found`);
      }
      
      // Use the challenge directly as it should already be a domain entity
      const challenge = challengeData;
      
      // Check if challenge is already completed using domain model method
      if (challenge.isCompleted()) {
        throw new ChallengeResponseError(`Challenge with ID ${challengeIdVO.value} is already completed`);
      }
      
      // Format responses as an array for compatibility
      const responses = Array.isArray(response) ? response : [{ response }];
      
      // Create a conversation context identifier
      const conversationContext = `challenge_eval_${challengeIdVO.value}`;
      
      // Submit responses to the challenge using domain model method
      challenge.submitResponses(responses);
      
      // Evaluate the responses using the domain service
      // The state management is now handled inside the service using the AIStateManager port
      const evaluation = await this.challengeEvaluationService.evaluateResponses(
        challenge, 
        responses, 
        { 
          conversationContext,
          stateMetadata: { challengeId: challengeIdVO.value }
        }
      );
      
      // Complete the challenge with the evaluation using domain model method
      challenge.complete(evaluation);
      
      // Update the challenge in the repository
      const updatedChallenge = await this.challengeService.updateChallenge(
        challenge.id, 
        challenge
      );

      // Define secondary operations for parallel execution
      const secondaryOpFunctions = [];
      
      // Add user progress tracking operation if service is provided
      if (params.progressTrackingService && emailVO) {
        const progressOperation = async () => {
          await params.progressTrackingService.updateProgressAfterChallenge(
            emailVO, 
            challenge.focusArea,
            challengeIdVO,
            evaluation
          );
        };
        secondaryOpFunctions.push(progressOperation);
      }
      
      // Add user journey event recording operation if service is provided
      if (params.userJourneyService && emailVO) {
        const journeyOperation = async () => {
          await params.userJourneyService.recordUserEvent(emailVO, 'challenge_completed', {
            challengeId: challengeIdVO,
            challengeType: challenge.challengeType,
            focusArea: challenge.focusArea,
            score: challenge.getScore() || 0
          });
        };
        secondaryOpFunctions.push(journeyOperation);
      }
      
      // Add user lastActive timestamp update operation
      const lastActiveOperation = async () => {
        await this.userService.updateUser(emailVO, { lastActive: new Date().toISOString() });
      };
      secondaryOpFunctions.push(lastActiveOperation);
      
      // Execute all secondary operations in parallel
      // We're not awaiting the result as these are non-critical and shouldn't block the main response
      this.executeSecondaryOperations(
        secondaryOpFunctions, 
        'challengeCompletionOperations', 
        { challengeId: challengeIdVO.value, userEmail: emailVO.value }
      );
      
      return {
        evaluation,
        challenge: updatedChallenge
      };
    }, 'submitChallengeResponse', context, ChallengeResponseError);
  }

  /**
   * Get challenge history for a user
   * @param {string|Email} userEmail - User's email or Email value object
   * @returns {Promise<Array>} - List of challenges
   */
  getChallengeHistoryForUser(userEmail) {
    return this.executeOperation(async () => {
      // Create value object for validation
      const emailVO = userEmail instanceof Email ? userEmail : createEmail(userEmail);
      
      if (!emailVO) {
        throw new ChallengeNotFoundError('Invalid user email');
      }
      
      const challenges = await this.challengeService.getChallengesForUser(emailVO);
      return challenges;
    }, 'getChallengeHistoryForUser', { 
      userEmail: typeof userEmail === 'string' ? userEmail : userEmail?.value 
    }, ChallengeNotFoundError);
  }

  /**
   * Get a challenge by ID
   * @param {string|ChallengeId} challengeId - Challenge ID or ChallengeId value object
   * @returns {Promise<Object>} - Challenge data
   */
  getChallengeById(challengeId) {
    return this.executeOperation(async () => {
      // Create value object for validation
      const challengeIdVO = challengeId instanceof ChallengeId ? challengeId : createChallengeId(challengeId);
      
      if (!challengeIdVO) {
        throw new ChallengeNotFoundError('Invalid challenge ID');
      }
      
      const challenge = await this.challengeService.getChallengeById(challengeIdVO);
      if (!challenge) {
        throw new ChallengeNotFoundError(`Challenge with ID ${challengeIdVO.value} not found`);
      }
      
      return challenge;
    }, 'getChallengeById', { 
      challengeId: typeof challengeId === 'string' ? challengeId : challengeId?.value 
    }, ChallengeNotFoundError);
  }
}

module.exports = ChallengeCoordinator; 