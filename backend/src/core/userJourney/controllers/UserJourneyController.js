import { logger } from "#app/core/infra/logging/logger.js";
import { UserJourneyError, UserJourneyNotFoundError, UserJourneyValidationError, UserJourneyProcessingError } from "#app/core/userJourney/errors/userJourneyErrors.js";
import { UserJourneyDTOMapper } from "#app/core/userJourney/dtos/UserJourneyDTO.js";
import AppError from "#app/core/infra/errors/AppError.js";
import { withControllerErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
// import { trackEventSchema } from "#app/core/userJourney/schemas/userJourneyApiSchemas.js"; // Incorrect path
'use strict';
/**
 * User Journey Controller
 *
 * Handles HTTP requests related to user journey tracking.
 * Located within the userJourney domain following our DDD architecture.
 */
// const container = require('../../../config/container');
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
   * @param {Object} dependencies.userService - User Service (Changed from Repository)
   */
  constructor({
    userJourneyCoordinator,
    userService,
    logger
  }) {
    if (!userService) throw new Error('userService is required');
    if (!userJourneyCoordinator) throw new Error('userJourneyCoordinator is required');
    
    this.userJourneyCoordinator = userJourneyCoordinator;
    this.userService = userService;
    this.logger = logger || userJourneyLogger;
    
    // Apply error handling to controller methods using withControllerErrorHandling
    this.trackEvent = withControllerErrorHandling(
      this.trackEvent.bind(this),
      {
        methodName: 'trackEvent',
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
    this.getUserJourneyEvents = withControllerErrorHandling(
      this.getUserJourneyEvents.bind(this),
      {
        methodName: 'getUserJourneyEvents',
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
    // Add the missing methods required by RouteFactory
    this.getUserJourneyById = withControllerErrorHandling(
      this.getUserJourneyById.bind(this),
      {
        methodName: 'getUserJourneyById',
        domainName: 'userJourney',
        logger: this.logger,
        errorMappings: userJourneyControllerErrorMappings
      }
    );
    this.getJourneyEvent = withControllerErrorHandling(
      this.getJourneyEvent.bind(this),
      {
        methodName: 'getJourneyEvent',
        domainName: 'userJourney',
        logger: this.logger,
        errorMappings: userJourneyControllerErrorMappings
      }
    );
    this.getEventsByType = withControllerErrorHandling(
      this.getEventsByType.bind(this),
      {
        methodName: 'getEventsByType',
        domainName: 'userJourney',
        logger: this.logger,
        errorMappings: userJourneyControllerErrorMappings
      }
    );
    this.getUserTimeline = withControllerErrorHandling(
      this.getUserTimeline.bind(this),
      {
        methodName: 'getUserTimeline',
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
    // TEMPORARY: Use req.body directly
    const params = req.body;
    if (!params || !params.userEmail || !params.eventType) { // Basic check
        throw new UserJourneyValidationError('Missing required fields (userEmail, eventType)');
    }
    
    // Check if user exists using UserService
    const user = await this.userService.getUserByEmail(params.userEmail);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${params.userEmail}`); 
    }
    // Record the event
    const event = await this.userJourneyCoordinator.recordUserEvent(
      params.userEmail, 
      params.eventType, 
      params.eventData || {}, 
      params.challengeId
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
      throw new UserJourneyValidationError('User email is required');
    }
    // Check if user exists using UserService
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${email}`);
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
    const {
      email
    } = req.params;
    const {
      timeframe
    } = req.query;
    if (!email) {
      throw new UserJourneyValidationError('User email is required');
    }
    // Check if user exists using UserService
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${email}`);
    }
    // Get activity summary
    const summary = await this.userJourneyCoordinator.getUserActivitySummary(email, timeframe || 'week');
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
    const {
      email
    } = req.params;
    if (!email) {
      throw new UserJourneyValidationError('User email is required');
    }
    // Check if user exists using UserService
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${email}`);
    }
    // Get engagement metrics
    const metrics = await this.userJourneyCoordinator.getUserEngagementMetrics(email);
    // Convert to summary DTO
    const metricsDto = UserJourneyDTOMapper.toSummaryDTO(metrics);
    return res.status(200).json({
      status: 'success',
      data: {
        metrics: metricsDto
      }
    });
  }
  /**
   * Get journey events for the currently authenticated user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserJourneyEvents(req, res) {
    const userId = req.user.id;
    
    // Get the user email using UserService
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${userId}`);
    }
    
    // Get events for the current user
    const events = await this.userJourneyCoordinator.getUserEvents(user.email, {
      limit: 50 // Reasonable default limit
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
   * Get user journey by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserJourneyById(req, res) {
    const journeyId = req.params.id;
    const userId = req.user.id;
    
    if (!journeyId) {
      throw new UserJourneyValidationError('Journey ID is required');
    }
    
    // Check if user exists using UserService
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${userId}`);
    }
    
    // Get journey by ID
    const journey = await this.userJourneyCoordinator.getJourneyById(journeyId, userId);
    if (!journey) {
      throw new UserJourneyNotFoundError('Journey not found'); // Use specific error
    }
    
    // Convert to DTO
    const journeyDto = UserJourneyDTOMapper.toDTO(journey);
    
    return res.status(200).json({
      status: 'success',
      data: {
        journey: journeyDto
      }
    });
  }
  /**
   * Get a specific journey event by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getJourneyEvent(req, res) {
    const eventId = req.params.eventId;
    const userId = req.user.id;
    
    if (!eventId) {
      throw new UserJourneyValidationError('Event ID is required');
    }
    
    // Check if user exists using UserService
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${userId}`);
    }
    
    // Get event by ID
    const event = await this.userJourneyCoordinator.getEventById(eventId, userId);
    if (!event) {
      throw new UserJourneyNotFoundError('Event not found'); // Use specific error
    }
    
    // Convert to DTO
    const eventDto = UserJourneyDTOMapper.toDTO(event);
    
    return res.status(200).json({
      status: 'success',
      data: {
        event: eventDto
      }
    });
  }
  /**
   * Get journey events filtered by type
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getEventsByType(req, res) {
    const { type } = req.params;
    const userId = req.user.id;
    const { limit } = req.query;
    
    if (!type) {
      throw new UserJourneyValidationError('Event type is required');
    }
    
    // Check if user exists using UserService
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${userId}`);
    }
    
    // Get events by type
    const events = await this.userJourneyCoordinator.getUserEvents(user.email, {
      eventType: type,
      limit: limit ? parseInt(limit) : 20
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
   * Get user timeline showing journey events in chronological order
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserTimeline(req, res) {
    const userId = req.user.id;
    const { startDate, endDate, limit } = req.query;
    
    // Check if user exists using UserService
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserJourneyNotFoundError(`User not found: ${userId}`);
    }
    
    // Get all events for timeline, sorted by date
    const events = await this.userJourneyCoordinator.getUserEvents(user.email, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 50,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    });
    
    // Convert to DTOs
    const timelineEvents = UserJourneyDTOMapper.toDTOCollection(events);
    
    return res.status(200).json({
      status: 'success',
      results: timelineEvents.length,
      data: {
        timeline: timelineEvents
      }
    });
  }
}
export default UserJourneyController;