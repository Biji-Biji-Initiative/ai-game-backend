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
                await this.personalityCoordinator.synchronizeUserPreferences(event.payload.userId, event.payload.aiAttitudes);
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
    try {
        console.log('Initializing application event handlers');
        
        // Check if container is valid
        if (!container || typeof container.get !== 'function') {
            console.log('Invalid container provided for event handlers, creating minimal implementation');
            
            // Create a minimal event handler implementation
            const eventBus = domainEvents;
            const logger = console;
            
            // Register a minimal handler for critical events
            eventBus.register(EventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
                console.log('Event received (mock handler):', event.type, event.payload?.userId);
            });
            
            console.log('Minimal event handlers registered');
            return;
        }
        
        // Get dependencies from container with fallbacks
        let applicationEventHandlers;
        try {
            applicationEventHandlers = container.get('applicationEventHandlers');
        } catch (error) {
            console.log('Creating fallback application event handlers');
            
            // Create minimal event handlers with available dependencies
            let personalityCoordinator;
            try {
                personalityCoordinator = container.get('personalityCoordinator');
            } catch (error) {
                console.log('Using mock personality coordinator');
                personalityCoordinator = {
                    synchronizeUserPreferences: async (userId, attitudes) => {
                        console.log(`Mock: synchronizing preferences for user ${userId}`);
                        return true;
                    }
                };
            }
            
            applicationEventHandlers = new ApplicationEventHandlers({
                personalityCoordinator,
                logger: container.get('logger') || console
            });
        }
        
        // Check if the application event handlers are available
        if (!applicationEventHandlers || typeof applicationEventHandlers.registerEventHandlers !== 'function') {
            console.log('Application event handlers not properly initialized, creating minimal implementation');
            
            // Register minimal event handlers directly
            const eventBus = domainEvents;
            eventBus.register(EventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
                console.log('Event received (fallback handler):', event.type, event.payload?.userId);
            });
            
            console.log('Minimal fallback event handlers registered');
            return;
        }
        
        // Register the application event handlers
        applicationEventHandlers.registerEventHandlers();
        
        console.log('Application event handlers registered successfully');
    } catch (error) {
        console.error('Failed to initialize application event handlers', {
            error: error.message,
            stack: error.stack
        });
        
        // Register minimal error handling in case of failure
        try {
            const eventBus = domainEvents;
            eventBus.register(EventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
                console.log('Event received (error recovery handler):', event.type, event.payload?.userId);
            });
            console.log('Minimal error recovery event handlers registered');
        } catch (fallbackError) {
            console.error('Critical failure in event handler setup', fallbackError);
        }
    }
}
export default ApplicationEventHandlers;
