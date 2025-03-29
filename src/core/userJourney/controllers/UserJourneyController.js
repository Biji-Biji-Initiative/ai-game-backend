'use strict';

/**
 * User Journey Controller
 * 
 * Handles HTTP requests related to user journey tracking.
 * Located within the userJourney domain following our DDD architecture.
 */
// const container = require('../../../config/container');
const { logger } = require('../../core/infra/logging/logger');

// Import domain-specific error classes
const {
  UserJourneyError,
  UserJourneyNotFoundError,
  UserJourneyValidationError,
  UserJourneyProcessingError,
} = require('../errors/UserJourneyErrors');
const { UserJourneyDTOMapper } = require('../dtos/UserJourneyDTO');
const AppError = require('../../core/infra/errors/AppError');

const {
  applyControllerErrorHandling
} = require('../../../core/infra/errors/centralizedErrorUtils');

// Error mappings for controllers
const userJourneyControllerErrorMappings = [
  { errorClass: UserJourneyNotFoundError, statusCode: 404 },
  { errorClass: UserJourneyValidationError, statusCode: 400 },
  { errorClass: UserJourneyProcessingError, statusCode: 500 },
  { errorClass: UserJourneyError, statusCode: 500 },
  { errorClass: AppError, statusCode: error => error.statusCode || 500 }
];

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
  constructor({ userJourneyCoordinator, userRepository }) {
    this.userJourneyCoordinator = userJourneyCoordinator;
    this.userRepository = userRepository;
    this.logger = logger;
    
    // Apply error handling to controller methods using standardized utility
    this.trackEvent = applyControllerErrorHandling(this, 'trackEvent', 'userJourney', userJourneyControllerErrorMappings);
    this.getUserEvents = applyControllerErrorHandling(this, 'getUserEvents', 'userJourney', userJourneyControllerErrorMappings);
    this.getUserActivitySummary = applyControllerErrorHandling(this, 'getUserActivitySummary', 'userJourney', userJourneyControllerErrorMappings);
    this.getUserEngagementMetrics = applyControllerErrorHandling(this, 'getUserEngagementMetrics', 'userJourney', userJourneyControllerErrorMappings);
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
    
    // Check if user exists
    const user = await this.userRepository.findByEmail(params.userEmail);
    
    if (!user) {
      throw new AppError('User not found', 404);
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
    const { email } = req.params;
    const { startDate, endDate, eventType, limit } = req.query;
    
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
    
    // Check if user exists
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Get activity summary
    const summary = await this.userJourneyCoordinator.getUserActivitySummary(
      email, 
      timeframe || 'week'
    );
    
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
    
    // Check if user exists
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new AppError('User not found', 404);
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
}

module.exports = UserJourneyController; 