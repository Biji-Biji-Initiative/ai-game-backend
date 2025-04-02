'use strict';

import { logger } from "#app/core/infra/logging/logger.js";
import { initializeSupabaseClient } from "#app/core/infra/db/supabaseClient.js";
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
import { DeadLetterQueueService } from "#app/core/common/events/DeadLetterQueueService.js";
import { RobustEventBus } from "#app/core/common/events/RobustEventBus.js";
import { DomainEventsCompatibility } from "#app/core/common/events/domainEvents.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { OpenAIClient } from "#app/core/infra/openai/index.js";
import { OpenAIResponseHandler } from "#app/core/infra/openai/index.js";
import ConversationStateRepository from "#app/core/infra/repositories/ConversationStateRepository.js";
import { OpenAIStateManager } from "#app/core/infra/openai/index.js";
import { ErrorHandler } from "#app/core/infra/errors/errorHandler.js";
import HealthCheckService from "#app/core/infra/health/HealthCheckService.js";
import openAIConfig from "#app/core/infra/openai/config.js";

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
    
    // 1. Register Logger FIRST
    if (!logger) throw new Error("Default logger instance is missing");
    container.registerInstance('logger', logger);
    logger.info('[DI Infra] Logger registered.');

    // 1b. Register ALL specific loggers immediately after main logger
    const loggers = {
        userLogger, personalityLogger, challengeLogger, evaluationLogger, 
        focusAreaLogger, progressLogger, traitsAnalysisLogger, dbLogger, 
        infraLogger, apiLogger, eventsLogger, adaptiveLogger, userJourneyLogger
    };
    for (const [name, instance] of Object.entries(loggers)) {
        if (instance) {
            container.registerInstance(name, instance);
            logger.debug(`[DI Infra] Registered specific logger: ${name}`);
        } else {
             logger.warn(`[DI Infrastructure] Logger instance for ${name} is missing.`);
    }
    }
    // Ensure critical fallbacks exist if imports failed
    if (!container.has('infraLogger')) container.registerInstance('infraLogger', logger.child({ context: 'infra' }));
    if (!container.has('eventsLogger')) container.registerInstance('eventsLogger', logger.child({ context: 'events' }));
    logger.info('[DI Infra] Specific loggers registered.');

    // 2. Initialize and Register Database (Supabase)
    try {
        const dbInstance = initializeSupabaseClient(_config, logger);
        if (!dbInstance) throw new Error('initializeSupabaseClient failed');
        container.registerInstance('db', dbInstance);
        logger.info('[DI Infra] Database (Supabase) client registered successfully as \'db\'.');
        if (container.has('db')) {
            logger.info('[DI Infra] Confirmed: \'db\' is in container.');
        } else {
            logger.error('[DI Infra] CRITICAL FAILURE: \'db\' NOT in container immediately after registration.');
        }
    } catch (error) {
        logger.error('[DI Infra] CRITICAL: Database registration failed', { error: error.message });
        if (process.env.NODE_ENV === 'production') throw error;
        if (!container.has('db')) { 
             logger.warn('[DI Infra] Registering fallback MOCK Database client as \'db\'.');
             const mockDb = {
                from: () => ({
                    select: () => ({
                        eq: () => Promise.resolve({ data: [], error: null }),
                        in: () => Promise.resolve({ data: [], error: null }),
                        order: () => Promise.resolve({ data: [], error: null })
                    }),
                    insert: () => Promise.resolve({ data: [], error: null }),
                    update: () => Promise.resolve({ data: [], error: null }),
                    delete: () => Promise.resolve({ data: [], error: null })
                })
             };
             container.registerInstance('db', mockDb); 
        }
    }

    // 4. Register DeadLetterQueueService (needs db, logger)
    container.register('deadLetterQueueService', c => new DeadLetterQueueService({
        db: c.get('db'),
        logger: c.get('logger')
    }), true); 

    // 5. Register RobustEventBus (needs logger, dlqService)
    container.register('robustEventBus', c => new RobustEventBus({
        logger: c.get('eventsLogger'),
        dlqService: c.get('deadLetterQueueService'),
        useDLQ: true,
        recordHistory: _config?.events?.recordHistory ?? (process.env.NODE_ENV !== 'production')
    }), true); 
    logger.info('[DI Infra] RobustEventBus registered.');

    // ---> Register standard event types AFTER robustEventBus is registered
    try {
        const robustEventBusInstance = container.get('robustEventBus');
        if (robustEventBusInstance && EventTypes) {
            Object.entries(EventTypes).forEach(([key, eventName]) => {
                robustEventBusInstance.registerEventType(eventName, {
                    description: `Standard event: ${eventName}`,
                    category: eventName.split('.')[0]
                });
            });
            logger.info('[DI Infra] Registered standard event types with RobustEventBus.');
        } else {
            logger.error('[DI Infra] Failed to register standard event types: RobustEventBus or EventTypes missing.');
        }
    } catch (error) {
        logger.error('[DI Infra] Error registering standard event types', { error: error.message });
    }
    // ---> END ADDED

    // 7. Register 'eventBus' alias to point directly to the RobustEventBus instance
    // This ensures components getting 'eventBus' receive the actual bus with the .on method
    container.register('eventBus', c => c.get('robustEventBus'), true);
    logger.info('[DI Infra] \'eventBus\' alias registered directly to RobustEventBus instance.');

    // Register 'eventTypes' alias (as before)
    container.registerInstance('eventTypes', EventTypes);
    logger.info('[DI Infra] \'eventTypes\' alias registered.');

    // Register CacheInvalidationManager (depends on eventBus, cacheService)
    container.register('cacheInvalidationManager', async c => {
        // Use dynamic import instead of require for ES modules compatibility
        const CacheInvalidationManagerModule = await import("#app/core/infra/cache/CacheInvalidationManager.js");
        // Extract the actual class from the module's named exports
        const { CacheInvalidationManager } = CacheInvalidationManagerModule;
        
        return new CacheInvalidationManager({
            eventBus: c.get('eventBus'),
            cacheService: c.get('cacheService'),
            logger: c.get('infraLogger')
        });
    }, true); // Singleton
    logger.info('[DI Infra] cacheInvalidationManager registered.');

    // 8. Register other infrastructure
    container.registerInstance('AppError', AppError);
    
    container.register('cacheService', c => {
        const memoryCache = { 
            get: async (key) => null,
            set: async (key, value, ttl) => true,
            delete: async (key) => true,
            flush: async () => true,
        };
        return new CacheService(memoryCache, {
            defaultTTL: c.get('config').cache?.defaultTTL || 300,
            logger: c.get('infraLogger')
        });
    }, true);
    logger.info('[DI Infra] cacheService registered.');
      
    container.register('configCache', c => {
        const memoryCache = { 
            get: async (key) => null,
            set: async (key, value, ttl) => true,
            delete: async (key) => true,
            flush: async () => true,
        };
        return new CacheService(memoryCache, {
            defaultTTL: c.get('config').cache?.configTTL || 3600,
            logger: c.get('infraLogger')
        });
    }, true);
    logger.info('[DI Infra] configCache registered.');
    if (container.has('configCache')) {
        logger.info('[DI Infra] Confirmed: \'configCache\' is in container.');
    } else {
        logger.error('[DI Infra] CRITICAL FAILURE: \'configCache\' NOT in container immediately after registration.');
    }
    
    container
        .register('openAIConfig', _c => openAIConfig, true)
        .register('openAIClient', c => new OpenAIClient({
            config: c.get('openAIConfig'),
            logger: c.get('apiLogger'),
            apiKey: c.get('config').openai?.apiKey || process.env.OPENAI_API_KEY,
        }), true)
        .register('openAIResponseHandler', c => new OpenAIResponseHandler({ logger: c.get('logger') }), true);
        
    container
        .register('conversationStateRepository', c => new ConversationStateRepository(c.get('db'), c.get('dbLogger')), true)
        .register('openAIStateManager', c => new OpenAIStateManager({
            openAIClient: c.get('openAIClient'),
            logger: c.get('logger'),
            redisCache: c.has('redisCache') ? c.get('redisCache') : null
        }), true);
        
    container.register('errorHandler', _c => new ErrorHandler(), true);
    
    container.register('healthCheckService', c => {
        const svcLogger = c.get('infraLogger'); 
        const aiClient = c.get('openAIClient'); 
        if (!svcLogger || !aiClient) throw new Error('Missing logger or AI client for HealthCheckService');
        
        const dbHealthFn = async () => {
            const { runDatabaseHealthCheck } = await import("#app/core/infra/db/databaseConnection.js");
            return await runDatabaseHealthCheck(c); 
        };
        const aiHealthFn = async (client) => {
            const { checkOpenAIStatus } = await import("#app/core/infra/openai/healthCheck.js");
            return await checkOpenAIStatus(client);
        };
        
        return new HealthCheckService({
            runDatabaseHealthCheck: dbHealthFn,
            openAIClient: aiClient,
            checkOpenAIStatus: aiHealthFn,
            logger: svcLogger
        });
    }, true);

    logger.info('[DI Infra] Infrastructure component registration complete.');
    return container;
}

export { registerInfrastructureComponents };
export default {
    registerInfrastructureComponents
};
