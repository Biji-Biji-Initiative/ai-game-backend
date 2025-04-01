'use strict';

import { logger } from "#app/core/infra/logging/logger.js";
import { supabaseClient as supabase } from "#app/core/infra/db/supabaseClient.js";
import AppError from "#app/core/infra/errors/AppError.js";
import CacheService from "#app/core/infra/cache/CacheService.js";
import { 
    userLogger, 
    personalityLogger, 
    challengeLogger, 
    evaluationLogger, 
    focusAreaLogger, 
    progressLogger, 
    dbLogger, 
    infraLogger, 
    apiLogger, 
    traitsAnalysisLogger, 
    eventsLogger,
    adaptiveLogger,
    userJourneyLogger
} from "#app/core/infra/logging/domainLogger.js";
import domainEvents from "#app/core/common/events/domainEvents.js";
import { OpenAIClient } from "#app/core/infra/openai/index.js";
import { OpenAIResponseHandler } from "#app/core/infra/openai/index.js";
import ConversationStateRepository from "#app/core/infra/repositories/ConversationStateRepository.js";
import { OpenAIStateManager } from "#app/core/infra/openai/index.js";
import { ErrorHandler } from "#app/core/infra/errors/errorHandler.js";
import HealthCheckService from "#app/core/infra/health/HealthCheckService.js";
import { runDatabaseHealthCheck } from "#app/core/infra/db/databaseConnection.js";
import { checkOpenAIStatus } from "#app/core/infra/openai/healthCheck.js";
import openAIConfig from "#app/core/infra/openai/config.js";

console.log('[infrastructure.js] Imported runDatabaseHealthCheck type:', typeof runDatabaseHealthCheck);
console.log('[infrastructure.js] Imported checkOpenAIStatus type:', typeof checkOpenAIStatus);

/**
 * Infrastructure Components Registration
 *
 * This module registers all infrastructure components in the DI container.
 * Uses method chaining and improved singleton management based on component type.
 */
/**
 * Register infrastructure components in the container
 * @param {DIContainer} container - The DI container
 */
function registerInfrastructureComponents(container) {
    const _config = container.get('config');
    
    // Ensure critical instances are available or throw early
    if (!logger) throw new Error("Default logger instance is missing");
    if (!supabase) throw new Error("Supabase client instance is missing");

    // Register basic infrastructure instances
    container
        .registerInstance('logger', logger)
        .registerInstance('AppError', AppError) // AppError seems less critical
        .registerInstance('supabase', supabase);
    
    // Register cache services
    container.register('cacheService', c => {
        const memoryCache = {
            get: async (key) => null,
            set: async (key, value, ttl) => true,
            delete: async (key) => true,
            flush: async () => true
        };
        return new CacheService(memoryCache, {
            defaultTTL: c.get('config').cache?.defaultTTL || 300, // 5 minutes default
            logger: c.get('infraLogger')
        });
    }, true // Singleton: YES - maintains shared cache
    );
      
    // Config cache
    container.register('configCache', c => {
        const memoryCache = {
            get: async (key) => null,
            set: async (key, value, ttl) => true,
            delete: async (key) => true,
            flush: async () => true
        };
        return new CacheService(memoryCache, {
            defaultTTL: c.get('config').cache?.configTTL || 3600, // 1 hour default for config
            logger: c.get('infraLogger')
        });
    }, true // Singleton: YES - maintains shared cache
    );
    
    // Register loggers (ensure they are imported correctly)
    const loggers = {
        userLogger, personalityLogger, challengeLogger, evaluationLogger, 
        focusAreaLogger, progressLogger, traitsAnalysisLogger, dbLogger, 
        infraLogger, apiLogger, eventsLogger, adaptiveLogger, userJourneyLogger
    };
    for (const [name, instance] of Object.entries(loggers)) {
        if (!instance) {
            console.warn(`[DI Infrastructure] Logger instance for ${name} is missing/undefined during import. Skipping registration.`);
            // Optionally register a fallback basic logger
            container.registerInstance(name, logger.child({ missingLogger: name }));
        } else {
            container.registerInstance(name, instance);
        }
    }

    // Register event system robustly
    try {
        const infraLogger = container.get('infraLogger');
        infraLogger.debug('Attempting to register event bus from domainEvents module', { component: 'event-bus' });

        // Get eventBus and eventTypes from the imported module
        const eventBus = domainEvents?.eventBus;
        const eventTypes = domainEvents?.EventTypes;

        // Explicitly check if they are valid before registering
        if (!eventBus || typeof eventBus.publish !== 'function' || typeof eventBus.subscribe !== 'function') {
            throw new Error('Imported domainEvents.eventBus is invalid or missing required methods (publish, subscribe).');
        }
        if (!eventTypes || typeof eventTypes !== 'object' || Object.keys(eventTypes).length === 0) {
             throw new Error('Imported domainEvents.EventTypes is invalid or empty.');
        }

        // Register the validated instances
        container
            .registerInstance('eventBus', eventBus)
            .registerInstance('eventTypes', eventTypes);
            
        infraLogger.info('Event bus registered successfully from domainEvents module', { component: 'event-bus' });
    } catch (error) {
        const infraLogger = container.get('infraLogger'); // Get logger again in case initial get failed
        infraLogger.error('Failed to register event bus from domainEvents module', { 
            component: 'event-bus',
            error: error.message, 
            stack: error.stack,
            importedDomainEvents: typeof domainEvents
        });
        // Register mock/null implementations so app doesn't crash
        if (!container.has('eventBus')) {
             container.registerInstance('eventBus', { subscribe: () => {}, publish: () => {}, register: () => {} });
             console.warn('[DI] Registered MOCK eventBus due to registration failure.');
        }
        if (!container.has('eventTypes')) {
             container.registerInstance('eventTypes', {});
             console.warn('[DI] Registered MOCK eventTypes due to registration failure.');
        }
    }
    
    // Register OpenAI services
    container
        .register('openAIConfig', _c => {
            return openAIConfig;
        }, true // Singleton: YES - configuration with no state
        )
        .register('openAIClient', c => {
            // Use our custom OpenAIClient instead of the direct SDK
            return new OpenAIClient({
                config: c.get('openAIConfig'),
                logger: c.get('apiLogger'),
                apiKey: c.get('config').openai?.apiKey || process.env.OPENAI_API_KEY,
            });
        }, true // Singleton: YES - manages API connection with rate limiting
        )
        .register('openAIResponseHandler', c => {
            return new OpenAIResponseHandler({
                logger: c.get('logger'),
            });
        }, true // Singleton: YES - stateless utility service
        );
    // Register conversation state repository and OpenAI state manager
    container
        .register('conversationStateRepository', c => {
        return new ConversationStateRepository(c.get('supabase'), c.get('dbLogger'));
    }, true // Singleton: YES - repository with potentially expensive DB connection
    )
        .register('openAIStateManager', c => {
        return new OpenAIStateManager({
            openAIClient: c.get('openAIClient'),
            logger: c.get('logger'),
            redisCache: c.has('redisCache') ? c.get('redisCache') : null
        });
    }, true // Singleton: YES - manages shared state
    );
    // Register error handling
    container.register('errorHandler', _c => {
        return new ErrorHandler();
    }, true // Singleton: YES - stateless utility service
    );
    // Register health check service (ensure dependencies are valid)
    container.register('healthCheckService', c => {
        const svcLogger = c.get('infraLogger'); 
        if (!svcLogger) throw new Error('infraLogger is unavailable for HealthCheckService');

        const aiClient = c.get('openAIClient'); 
        if (!aiClient) throw new Error('openAIClient is unavailable for HealthCheckService');

        // WARNING: Known issue with function references in JS - define them directly
        // Import these functions at the call site to avoid reference issues
        const dbHealthFn = async () => {
            // Import the function directly here to avoid the reference issue
            const { runDatabaseHealthCheck } = await import("#app/core/infra/db/databaseConnection.js");
            svcLogger.debug('[healthCheckService] Executing runDatabaseHealthCheck (direct import)');
            return await runDatabaseHealthCheck();
        };
        
        const aiHealthFn = async (client) => {
            // Import the function directly here to avoid the reference issue
            const { checkOpenAIStatus } = await import("#app/core/infra/openai/healthCheck.js");
            svcLogger.debug('[healthCheckService] Executing checkOpenAIStatus (direct import)');
            return await checkOpenAIStatus(client);
        };
        
        svcLogger.debug('Creating HealthCheckService with direct async imports');
        
        return new HealthCheckService({
            runDatabaseHealthCheck: dbHealthFn,
            openAIClient: aiClient,
            checkOpenAIStatus: aiHealthFn,
            logger: svcLogger
        });
    }, true);
    return container; // For method chaining
}

export { registerInfrastructureComponents };
export default {
    registerInfrastructureComponents
};
