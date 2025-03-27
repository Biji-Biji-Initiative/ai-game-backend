/**
 * UserJourney Controller
 * 
 * Handles HTTP requests related to user journey operations.
 */

const UserJourneyService = require('../core/userJourney/services/UserJourneyService');
const logger = require('../utils/logger');

class UserJourneyController {
  constructor() {
    this.userJourneyService = new UserJourneyService();
  }

  /**
   * Get journey insights for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getJourneyInsights(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get journey insights
      const insights = await this.userJourneyService.getJourneyInsights(req.user.email || req.user.id);

      // Return insights
      return res.status(200).json({
        status: 'success',
        data: insights
      });
    } catch (error) {
      logger.error('Error getting journey insights', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get journey insights'
      });
    }
  }

  /**
   * Get activity summary for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getActivitySummary(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get activity summary
      const summary = await this.userJourneyService.getActivitySummary(req.user.email || req.user.id);

      // Return summary
      return res.status(200).json({
        status: 'success',
        data: summary
      });
    } catch (error) {
      logger.error('Error getting activity summary', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get activity summary'
      });
    }
  }

  /**
   * Get events for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserEvents(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { limit, type } = req.query;

      let events;
      if (type) {
        // Get events by type
        events = await this.userJourneyService.getUserEventsByType(
          req.user.email || req.user.id,
          type,
          limit ? parseInt(limit, 10) : 100
        );
      } else {
        // Get all events
        events = await this.userJourneyService.getUserEvents(
          req.user.email || req.user.id,
          limit ? parseInt(limit, 10) : 100
        );
      }

      // Return events
      return res.status(200).json({
        status: 'success',
        data: events
      });
    } catch (error) {
      logger.error('Error getting user events', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get user events'
      });
    }
  }

  /**
   * Record event for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async recordEvent(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { eventType, eventData, challengeId } = req.body;

      // Basic validation
      if (!eventType) {
        return res.status(400).json({
          status: 'error',
          message: 'Event type is required'
        });
      }

      // Record event
      const event = await this.userJourneyService.recordEvent(
        req.user.email || req.user.id,
        eventType,
        eventData || {},
        challengeId || null
      );

      // Return recorded event
      return res.status(200).json({
        status: 'success',
        data: event
      });
    } catch (error) {
      logger.error('Error recording event', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to record event'
      });
    }
  }
}

module.exports = UserJourneyController; 