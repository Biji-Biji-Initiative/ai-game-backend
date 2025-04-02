'use strict';

// Import event registration functions
import { registerEventHandlers } from "#app/application/EventHandlers.js";
import { setupEventHandlers as setupDomainEventHandlers } from "#app/core/infra/events/eventSetup.js"; // Alias to avoid name clash
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";

/**
 * Registers all application and domain event handlers.
 * @param {DIContainer} container - The Dependency Injection container.
 */
function registerAllEventHandlers(container) {
    const logger = container.get('infraLogger') || infraLogger;
    logger.info('[Setup] Registering event handlers...');
    try {
        // Register application event handlers 
        registerEventHandlers(container);
        logger.debug('[Setup] Application event handlers registered.');

        // Register domain event handlers 
        setupDomainEventHandlers(container); 
        logger.debug('[Setup] Domain event handlers registered.');
        
        logger.info('[Setup] Event handler registration complete.');
    } catch (error) {
        logger.error('[Setup] CRITICAL: Failed to register event handlers!', { error: error.message });
        // Depending on severity, might want to re-throw or exit
        throw error; 
    }
}

export { registerAllEventHandlers }; 