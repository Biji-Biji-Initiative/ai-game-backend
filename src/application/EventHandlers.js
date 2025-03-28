/**
 * Application Event Handlers
 * 
 * This module sets up domain event handlers at the application level.
 * It connects events from one domain to services in other domains.
 */

const { EventTypes, eventBus } = require('../core/common/events/domainEvents');
const { appLogger } = require('../core/infra/logging/appLogger');

/**
 * Register event handlers for cross-domain communication
 * @param {Object} container - Dependency injection container
 */
function registerEventHandlers(container) {
  const logger = appLogger.child('eventHandlers');
  
  logger.info('Registering application event handlers');
  
  // Handle personality profile updated events
  eventBus.subscribe(EventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
    try {
      // Only handle attitude updates for cross-domain integration
      if (!event.payload || event.payload.updateType !== 'attitudes' || !event.payload.aiAttitudes) {
        return;
      }
      
      logger.debug('Handling personality profile update', {
        userId: event.payload.userId,
        updateType: event.payload.updateType
      });
      
      // Get the personality coordinator
      const personalityCoordinator = container.get('personalityCoordinator');
      
      // Synchronize user preferences based on AI attitudes
      await personalityCoordinator.synchronizeUserPreferences(
        event.payload.userId,
        event.payload.aiAttitudes
      );
      
      logger.info('Successfully processed personality profile update', {
        userId: event.payload.userId,
        updateType: event.payload.updateType
      });
    } catch (error) {
      logger.error('Error handling personality profile update', {
        error: error.message,
        stack: error.stack,
        eventType: event.type,
        userId: event.payload?.userId
      });
    }
  });
  
  logger.info('Application event handlers registered');
}

module.exports = {
  registerEventHandlers
}; 