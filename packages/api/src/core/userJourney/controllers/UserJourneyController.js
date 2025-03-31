"../../../infra/logging/logger.js;
""../../../userJourney/errors/userJourneyErrors.js59;
""../../../userJourney/dtos/UserJourneyDTO.js226;
""../../../infra/errors/AppError.js310;
""../../../infra/errors/errorStandardization.js368;
""../../../common/valueObjects/index.js461;
'use strict';
/**
 * User Journey Controller
 *
 * Handles HTTP requests related to user journey tracking.
 * Located within the userJourney domain following our DDD architecture.
 */
// const container = '../../../config/container433;
// Error mappings for controllers
const userJourneyControllerErrorMappings = [{
  errorClass: UserJourneyNotFoundError,
  statusCode: 404
}, {
  errorClass: UserJourneyValidationError,
  statusCode: 400
}, {
  errorClass: UserJourneyProcessingError,
  statusCode: 500
}, {
  errorClass: UserJourneyError,
  statusCode: 500
}, {
  errorClass: AppError,
  statusCode: error => error.statusCode || 500
}];
/**
 * Controller for handling user journey-related HTTP requests
 */
class UserJourneyController {
  /**
   * Create a new UserJourneyController
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.userJourneyCoordinator - Coordinator for user journey operations
   * @param {Object} dependencies.userRepository - Repository for user operations
   */
  constructor({
    userJourneyCoordinator,
    userRepository
  }) {
    this.userJourneyCoordinator = userJourneyCoordinator;
    this.userRepository = userRepository;
    this.logger = logger;
    // Apply error handling to controller methods using withControllerErrorHandling
    this.trackEvent = withControllerErrorHandling(
      this.trackEvent.bind(this),
      {
        methodName: ''trackEvent',
        domainName: 'userJourney',
        logger: this.logger,
        errorMappings: userJourneyControllerErrorMappings
      }
    );
    this.getUserEvents = withControllerErrorHandling(
      this.getUserEvents.bind(this),
      {
        methodName: 'getUserEvents',
        domainName: 'userJourney',
        logger: this.logger,
        errorMappings: userJourneyControllerErrorMappings
      }
    );
    this.getUserActivitySummary = withControllerErrorHandling(
      this.getUserActivitySummary.bind(this),
      {
        methodName: 'getUserActivitySummary',
        domainName: 'userJourney',
        logger: this.logger,
        errorMappings: userJourneyControllerErrorMappings
      }
    );
    this.getUserEngagementMetrics = withControllerErrorHandling(
      this.getUserEngagementMetrics.bind(this),
      {
        methodName: 'getUserEngagementMetrics',
        domainName: 'userJourney',
        logger: this.logger,
        errorMappings: userJourneyControllerErrorMappings
      }
    );
  }
  /**
   * Track a user event
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async trackEvent(req, res) {
    // Convert request to domain parameters
    const params = UserJourneyDTOMapper.fromRequest(req.body);
    
    if (!params.userEmail) {
      throw new AppError('User email is required', 400);
    }
    
    if (!params.eventType) {
      throw new AppError('Event type is required', 400);
    }
    
    // Create Value Objects from primitives
    const emailVO = createEmail(params.userEmail);
    if (!emailVO) {
      throw new AppError('Invalid email format', 400);
    }
    
    // Create challengeId Value Object if provided
    let challengeIdVO = null;
    if (params.challengeId) {
      challengeIdVO = createChallengeId(params.challengeId);
      if (!challengeIdVO) {
        throw new AppError('Invalid challenge ID format', 400);
      }
    }
    
    // Check if user exists
    const user = await this.userRepository.findByEmail(params.userEmail);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Record the event with Value Objects
    const event = await this.userJourneyCoordinator.recordUserEvent(
      emailVO,
      params.eventType, 
      params.eventData || {}, 
      challengeIdVO
    );
    
    // Convert to DTO
    const eventDto = UserJourneyDTOMapper.toDTO(event);
    
    return res.status(201).json({
      status: 'success',
      data: {
        event: eventDto
      }
    });
  }
  /**
   * Get user journey events for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserEvents(req, res) {
    const {
      email
    } = req.params;
    const {
      startDate,
      endDate,
      eventType,
      limit
    } = req.query;
    if (!email) {
      throw new AppError('User email is required', 400);
    }
    // Check if user exists
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    // Get events with optional filters
    const events = await this.userJourneyCoordinator.getUserEvents(email, {
      startDate,
      endDate,
      eventType,
      limit: limit ? parseInt(limit) : undefined
    });
    // Convert to DTOs
    const eventDtos = UserJourneyDTOMapper.toDTOCollection(events);
    return res.status(200).json({
      status: 'success',
      results: eventDtos.length,
      data: {
        events: eventDtos
      }
    });
  }
  /**
   * Get user activity summary
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserActivitySummary(req, res) {
    const { email } = req.params;
    const { timeframe } = req.query;
    
    if (!email) {
      throw new AppError('User email is required', 400);
    }
    
    // Create Email Value Object
    const emailVO = createEmail(email);
    if (!emailVO) {
      throw new AppError('Invalid email format', 400);
    }
    
    // Check if user exists
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Get activity summary using Value Object
    const summary = await this.userJourneyCoordinator.getUserActivitySummary(emailVO, timeframe || 'week');
    
    // Convert to DTO
    const summaryDto = UserJourneyDTOMapper.toSummaryDTO(summary);
    
    return res.status(200).json({
      status: 'success',
      data: {
        summary: summaryDto
      }
    });
  }
  /**
   * Get user engagement metrics
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserEngagementMetrics(req, res) {
    const { email } = req.params;
    
    if (!email) {
      throw new AppError('User email is required', 400);
    }
    
    // Create Email Value Object
    const emailVO = createEmail(email);
    if (!emailVO) {
      throw new AppError('Invalid email format', 400);
    }
    
    // Check if user exists
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Get engagement metrics using Value Object
    const metrics = await this.userJourneyCoordinator.getUserEngagementMetrics(emailVO);
    
    // Convert to summary DTO
    const metricsDto = UserJourneyDTOMapper.toSummaryDTO(metrics);
    
    return res.status(200).json({
      status: 'success',
      data: {
        metrics: metricsDto
      }
    });
  }
}
export default UserJourneyController;"