/**
 * User Journey Controller
 * 
 * Handles HTTP requests related to user journey tracking.
 * Located within the userJourney domain following our DDD architecture.
 */
const { logger } = require('../../../core/infra/logging/logger');
const AppError = require('../../../core/infra/errors/AppError');
const container = require('../../../config/container');

class UserJourneyController {
  constructor() {
    this.userJourneyCoordinator = container.get('userJourneyCoordinator');
    this.userRepository = container.get('userRepository');
  }

  /**
   * Track a user event
   */
  async trackEvent(req, res, next) {
    try {
      const { email, eventType, eventData, challengeId } = req.body;
      
      if (!email) {
        throw new AppError('User email is required', 400);
      }
      
      if (!eventType) {
        throw new AppError('Event type is required', 400);
      }
      
      // Check if user exists
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Record the event
      const event = await this.userJourneyCoordinator.trackUserEvent(
        email, 
        eventType, 
        eventData || {}, 
        challengeId
      );
      
      res.status(201).json({
        status: 'success',
        data: {
          event
        }
      });
    } catch (error) {
      logger.error('Error tracking user event', { error: error.message });
      next(error);
    }
  }

  /**
   * Get user journey events for a user
   */
  async getUserEvents(req, res, next) {
    try {
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
      
      res.status(200).json({
        status: 'success',
        results: events.length,
        data: {
          events
        }
      });
    } catch (error) {
      logger.error('Error getting user events', { error: error.message });
      next(error);
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(req, res, next) {
    try {
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
      
      res.status(200).json({
        status: 'success',
        data: {
          summary
        }
      });
    } catch (error) {
      logger.error('Error getting user activity summary', { error: error.message });
      next(error);
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(req, res, next) {
    try {
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
      
      res.status(200).json({
        status: 'success',
        data: {
          metrics
        }
      });
    } catch (error) {
      logger.error('Error getting user engagement metrics', { error: error.message });
      next(error);
    }
  }
}

module.exports = UserJourneyController; 