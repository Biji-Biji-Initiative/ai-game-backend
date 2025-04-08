import { focusAreaLogger } from "#app/core/infra/logging/domainLogger.js";
import { FocusAreaError, FocusAreaNotFoundError } from "#app/core/focusArea/errors/focusAreaErrors.js";
import { withServiceErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";
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
      if (process.env.NODE_ENV === 'production') {
        throw new ConfigurationError('focusAreaRepository is required for FocusAreaService in production mode', {
          serviceName: 'FocusAreaService',
          dependencyName: 'focusAreaRepository'
        });
      } else {
        throw new Error('focusAreaRepository is required for FocusAreaService');
      }
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
    
    // Define and wrap findById
    if (this.focusAreaRepository) { // Only define if repository exists
         /**
         * Standardized method to get a focus area by ID
         * @param {string} id - Focus Area ID
         * @returns {Promise<FocusArea|null>} Focus Area object or null if not found
         */
        this.findById = async (id) => {
            return await this.focusAreaRepository.findById(id);
        };
        this.findById = withServiceErrorHandling(
            this.findById.bind(this),
            {
                methodName: 'findById',
                domainName: 'focusArea',
                logger: this.logger,
                errorMapper: focusAreaServiceErrorMapper
            }
        );
    } else {
        this.findById = () => {
            this.logger.error('Cannot find focus area by ID - service not configured correctly.');
            throw new FocusAreaError('FocusArea service is not configured correctly.');
        };
    }
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
    
    // The repository's save/saveBatch method (via withTransaction) handles event publishing
    const savedAreas = await this.focusAreaRepository.saveBatch(userId, focusAreas);
    
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
    
    // The repository's delete method (via withTransaction) handles event publishing
    const success = await this.focusAreaRepository.deleteAllForUser(userId);
    
    return success;
  }
}
export default FocusAreaService;