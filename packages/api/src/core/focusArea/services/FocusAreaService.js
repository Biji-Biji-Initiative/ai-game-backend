"../../../infra/logging/domainLogger.js;
""../../../focusArea/errors/focusAreaErrors.js74;
""../../../infra/errors/errorStandardization.js177;
'use strict';
// Create an error mapper for the focus area service
const focusAreaServiceErrorMapper = createErrorMapper({
  'FocusAreaNotFoundError': FocusAreaNotFoundError,
  'Error': FocusAreaError
}, FocusAreaError);
/**
 * Service for managing focus area entities
 */
class FocusAreaService {
  /**
   * Create a new FocusAreaService
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.focusAreaRepository - Repository for focus area operations
   * @param {Object} dependencies.eventBus - Event bus for publishing domain events
   * @param {Object} dependencies.eventTypes - Event type constants
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({
    focusAreaRepository,
    eventBus,
    eventTypes,
    logger
  }) {
    if (!focusAreaRepository) {
      throw new Error('focusAreaRepository is required for FocusAreaService');
    }
    this.focusAreaRepository = focusAreaRepository;
    this.eventBus = eventBus;
    this.eventTypes = eventTypes;
    this.logger = logger || focusAreaLogger.child('service');
    // Apply standardized error handling to methods
    this.getFocusAreasForUser = withServiceErrorHandling(this.getFocusAreasForUser.bind(this), {
      methodName: 'getFocusAreasForUser',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaServiceErrorMapper
    });
    this.save = withServiceErrorHandling(this.save.bind(this), {
      methodName: 'save',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaServiceErrorMapper
    });
    this.deleteAllForUser = withServiceErrorHandling(this.deleteAllForUser.bind(this), {
      methodName: 'deleteAllForUser',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaServiceErrorMapper
    });
  }
  /**
   * Get focus areas for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of focus areas
   */
  getFocusAreasForUser(userId) {
    this.logger.debug('Getting focus areas for user', {
      userId
    });
    return this.focusAreaRepository.findByUserId(userId);
  }
  /**
   * Save focus areas for a user
   * @param {string} userId - User ID
   * @param {Array} focusAreas - List of focus areas to save
   * @returns {Promise<Array>} Saved focus areas
   */
  async save(userId, focusAreas) {
    this.logger.debug('Saving focus areas for user', {
      userId,
      count: focusAreas?.length
    });
    const savedAreas = await this.focusAreaRepository.save(userId, focusAreas);
    // Publish an event if there's an event bus
    if (this.eventBus && this.eventTypes) {
      await this.eventBus.publish(this.eventTypes.FOCUS_AREAS_SAVED, {
        userId,
        count: savedAreas.length,
        focusAreaIds: savedAreas.map(area => area.id)
      });
    }
    return savedAreas;
  }
  /**
   * Delete all focus areas for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async deleteAllForUser(userId) {
    this.logger.debug('Deleting all focus areas for user', {
      userId
    });
    const success = await this.focusAreaRepository.deleteAllForUser(userId);
    // Publish an event if there's an event bus
    if (this.eventBus && this.eventTypes && success) {
      await this.eventBus.publish(this.eventTypes.FOCUS_AREAS_DELETED, {
        userId,
        allDeleted: true
      });
    }
    return success;
  }
}
export default FocusAreaService;"