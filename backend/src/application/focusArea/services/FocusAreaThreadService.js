import { validateDependencies } from "#app/core/shared/utils/serviceUtils.js";
import { focusAreaLogger } from "#app/core/infra/logging/domainLogger.js";
import { FocusAreaError } from "#app/core/focusArea/errors/focusAreaErrors.js";
import { withServiceErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
'use strict';

// Create an error mapper for the focus area thread service
const focusAreaThreadErrorMapper = createErrorMapper({
  'Error': FocusAreaError
}, FocusAreaError);

/**
 * Application service that manages conversation threads for focus area generation
 * This service uses the port/adapter pattern to decouple from infrastructure concerns
 */
class FocusAreaThreadService {
  /**
   * Create a new FocusAreaThreadService
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.focusAreaThreadState - Implementation of FocusAreaThreadStatePort
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies = {}) {
    const { focusAreaThreadState, logger } = dependencies;
    
    // Validate required dependencies
    validateDependencies(dependencies, {
      serviceName: 'FocusAreaThreadService',
      required: ['focusAreaThreadState'],
      productionOnly: true
    });
    
    this.focusAreaThreadState = focusAreaThreadState;
    this.logger = logger || focusAreaLogger.child('threadService');
    
    // Apply standardized error handling to methods
    this.createThread = withServiceErrorHandling(this.createThread.bind(this), {
      methodName: 'createThread',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaThreadErrorMapper
    });
    
    this.findOrCreateThread = withServiceErrorHandling(this.findOrCreateThread.bind(this), {
      methodName: 'findOrCreateThread',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaThreadErrorMapper
    });
    
    this.getLastResponseId = withServiceErrorHandling(this.getLastResponseId.bind(this), {
      methodName: 'getLastResponseId',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaThreadErrorMapper
    });
    
    this.updateWithResponseId = withServiceErrorHandling(this.updateWithResponseId.bind(this), {
      methodName: 'updateWithResponseId',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaThreadErrorMapper
    });
  }

  /**
   * Create a new thread for focus area generation
   * @param {string} userId - User ID for whom to create the thread
   * @param {Object} metadata - Additional metadata for the thread
   * @returns {Promise<string>} Thread ID
   */
  async createThread(userId, metadata = {}) {
    return this.focusAreaThreadState.createThread(userId, metadata);
  }

  /**
   * Get an existing thread for a user or create a new one
   * @param {string} userId - User ID for whom to find or create a thread
   * @param {Object} metadata - Additional metadata for the thread
   * @returns {Promise<string>} Thread ID
   */
  async findOrCreateThread(userId, metadata = {}) {
    return this.focusAreaThreadState.findOrCreateThread(userId, metadata);
  }

  /**
   * Get the last response ID from a thread
   * @param {string} threadId - Thread ID to get last response from
   * @returns {Promise<string|null>} Last response ID or null
   */
  async getLastResponseId(threadId) {
    return this.focusAreaThreadState.getLastResponseId(threadId);
  }

  /**
   * Update thread with new response ID
   * @param {string} threadId - Thread ID to update
   * @param {string} responseId - Response ID to associate with the thread
   * @returns {Promise<boolean>} Success status
   */
  async updateWithResponseId(threadId, responseId) {
    return this.focusAreaThreadState.updateWithResponseId(threadId, responseId);
  }
}

export default FocusAreaThreadService; 