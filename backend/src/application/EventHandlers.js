'use strict';
/**
 * Application Event Handlers
 *
 * This module sets up domain event handlers at the application level.
 * It connects events from one domain to services in other domains.
 */
/**
 * Class representing Application Event Handlers
 */
class ApplicationEventHandlers {
    /**
     * Create a new ApplicationEventHandlers instance
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.personalityCoordinator - Personality coordinator service
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.eventBus - Event bus instance (RobustEventBus)
     * @param {Object} dependencies.EventTypes - EventTypes constants object
     */
    constructor({ personalityCoordinator, logger, eventBus, EventTypes }) {
        if (!eventBus || typeof eventBus.on !== 'function') {
            throw new Error('Valid eventBus instance with \'.on\' method is required');
        }
        if (!EventTypes || typeof EventTypes !== 'object') {
            throw new Error('EventTypes constants object is required');
        }
        if (!personalityCoordinator) {
            throw new Error('PersonalityCoordinator is required');
        }
        if (!logger) {
            throw new Error('Logger is required');
        }
        this.personalityCoordinator = personalityCoordinator;
        this.logger = logger;
        this.eventBus = eventBus;
        this.EventTypes = EventTypes;
    }
    /**
     * Register event handlers for cross-domain communication
     */
    registerEventHandlers() {
        this.logger.info('Registering application event handlers');
        this.eventBus.on(this.EventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
            try {
                if (!event || !event.payload) {
                    this.logger.warn('Received PERSONALITY_PROFILE_UPDATED event without payload', { eventId: event?.id });
                    return;
                }
                if (event.payload.updateType !== 'attitudes' || !event.payload.aiAttitudes) {
                    return;
                }
                this.logger.debug('Handling personality profile update', {
                    userId: event.payload.userId,
                    updateType: event.payload.updateType,
                });
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
                    eventType: event?.type,
                    userId: event?.payload?.userId,
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
