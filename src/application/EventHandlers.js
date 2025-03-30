import domainEvents from "../core/common/events/domainEvents.js";
'use strict';
/**
 * Application Event Handlers
 *
 * This module sets up domain event handlers at the application level.
 * It connects events from one domain to services in other domains.
 */
const { EventTypes } = domainEvents;
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
    /**
     * Method constructor
     */
    constructor({ personalityCoordinator, logger }) {
        this.personalityCoordinator = personalityCoordinator;
        this.logger = logger;
        this.eventBus = domainEvents; // Use the domainEvents object directly
    }
    /**
     * Register event handlers for cross-domain communication
     */
    /**
     * Method registerEventHandlers
     */
    registerEventHandlers() {
        this.logger.info('Registering application event handlers');
        // Handle personality profile updated events
        this.eventBus.register(EventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
            try {
                // Only handle attitude updates for cross-domain integration
                if (!event.payload ||
                    event.payload.updateType !== 'attitudes' ||
                    !event.payload.aiAttitudes) {
                    return;
                }
                this.logger.debug('Handling personality profile update', {
                    userId: event.payload.userId,
                    updateType: event.payload.updateType,
                });
                // Synchronize user preferences based on AI attitudes
                await this.personalityCoordinator.synchronizeUserPreferences(
                    event.payload.userId, 
                    event.payload.aiAttitudes
                );
                this.logger.info('Successfully processed personality profile update', {
                    userId: event.payload.userId,
                    updateType: event.payload.updateType,
                });
            }
            catch (error) {
                this.logger.error('Error handling personality profile update', {
                    error: error.message,
                    stack: error.stack,
                    eventType: event.type,
                    userId: event.payload?.userId,
                });
            }
        });
        this.logger.info('Application event handlers registered');
    }
}
/**
 * Register the application event handlers
 * @param {Object} container - The dependency injection container
 */
export function registerEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required for event handler registration');
    }

    const logger = container.get('logger');
    logger.info('Initializing application event handlers');

    // Get the application event handlers directly from the container
    const applicationEventHandlers = container.get('applicationEventHandlers');
    
    // Register the event handlers
    applicationEventHandlers.registerEventHandlers();
    
    logger.info('Application event handlers registered successfully');
}
export default ApplicationEventHandlers;
