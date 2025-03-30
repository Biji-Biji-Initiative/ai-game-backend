'use strict';
/**
 * Application Event Handlers
 *
 * This module sets up domain event handlers at the application level.
 * It connects events from one domain to services in other domains.
 */

import { PersonalityEventPayloads } from "../core/common/events/EventPayloads.js";

/**
 * Class representing Application Event Handlers
 */
class ApplicationEventHandlers {
    /**
     * Create a new ApplicationEventHandlers instance
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.personalityCoordinator - Personality coordinator service
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.iEventBus - Event bus interface implementation
     */
    /**
     * Method constructor
     */
    constructor({ personalityCoordinator, logger, iEventBus }) {
        this.personalityCoordinator = personalityCoordinator;
        this.logger = logger;
        this.eventBus = iEventBus; // Use the injected event bus interface
        this.eventTypes = iEventBus.getEventTypes(); // Get event types from the interface
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
        this.eventBus.register(this.eventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
            try {
                // Validate the event payload using the defined structure
                if (!PersonalityEventPayloads.validateProfileUpdatedPayload(event.payload, 'attitudes')) {
                    this.logger.warn('Invalid personality profile update payload', {
                        eventType: event.type,
                        payload: event.payload
                    });
                    return;
                }
                
                const { userId, aiAttitudes } = event.payload;
                
                this.logger.debug('Handling personality profile update', {
                    userId,
                    updateType: event.payload.updateType,
                });
                
                // Synchronize user preferences based on AI attitudes
                await this.personalityCoordinator.synchronizeUserPreferences(userId, aiAttitudes);
                
                this.logger.info('Successfully processed personality profile update', {
                    userId,
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
