/**
 * Application Event Handlers
 * 
 * This module sets up domain event handlers at the application level.
 * It connects events from one domain to services in other domains.
 */

const { EventTypes, eventBus } = require('../core/common/events/domainEvents');
const { appLogger } = require('../core/infra/logging/appLogger');

/**
 * Class representing Application Event Handlers
 */
class ApplicationEventHandlers {
  /**
   * Create a new ApplicationEventHandlers instance
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.personalityCoordinator - Personality coordinator service
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ personalityCoordinator, logger }) {
    this.personalityCoordinator = personalityCoordinator;
    this.logger = logger;
  }

  /**
   * Register event handlers for cross-domain communication
   */
  registerEventHandlers() {
    this.logger.info('Registering application event handlers');
    
    // Handle personality profile updated events
    eventBus.subscribe(EventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
      try {
        // Only handle attitude updates for cross-domain integration
        if (!event.payload || event.payload.updateType !== 'attitudes' || !event.payload.aiAttitudes) {
          return;
        }
        
        this.logger.debug('Handling personality profile update', {
          userId: event.payload.userId,
          updateType: event.payload.updateType
        });
        
        // Synchronize user preferences based on AI attitudes
        await this.personalityCoordinator.synchronizeUserPreferences(
          event.payload.userId,
          event.payload.aiAttitudes
        );
        
        this.logger.info('Successfully processed personality profile update', {
          userId: event.payload.userId,
          updateType: event.payload.updateType
        });
      } catch (error) {
        this.logger.error('Error handling personality profile update', {
          error: error.message,
          stack: error.stack,
          eventType: event.type,
          userId: event.payload?.userId
        });
      }
    });
    
    this.logger.info('Application event handlers registered');
  }
}

/**
 * Register application event handlers
 * @param {Object} container - Dependency injection container
 */
function registerEventHandlers(container) {
  const logger = container.get('logger');
  logger.info('Initializing application event handlers');
  
  try {
    const applicationEventHandlers = container.get('applicationEventHandlers');
    applicationEventHandlers.registerEventHandlers();
    logger.info('Application event handlers initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application event handlers', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = ApplicationEventHandlers;
module.exports.registerEventHandlers = registerEventHandlers;