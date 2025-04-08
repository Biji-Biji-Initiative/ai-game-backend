'use strict';

import { logger } from "#app/core/infra/logging/logger.js";
import { initializeSupabaseClient } from "#app/core/infra/db/supabaseClient.js";
import AppError from "#app/core/infra/errors/AppError.js";
import CacheService from "#app/core/infra/cache/CacheService.js";
import LogService from "#app/core/infra/logging/LogService.js";
import EmailService from "#app/core/infra/email/EmailService.js";
import MemoryCacheProvider from "#app/core/infra/cache/MemoryCacheProvider.js";
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
import config from '#app/config/config.js';

/**
 * Infrastructure Components Registration
 *
 * This module registers core infrastructure components like the database client,
 * event bus, logger, cache services, etc.
 */

/**
 * Register infrastructure components in the container
 * @param {DIContainer} container - The DI container
 * @param {Logger} logger - The logger instance passed down from container registration
 */
function registerInfrastructureComponents(container, logger) {
    // Use passed-in logger or fallback
    const infraLogger = logger || container.get('logger').child({ context: 'DI-Infra' });
    infraLogger.info('Starting infrastructure registration...');

    // --- Phase 1: Register & Resolve Core Primitives --- 
    infraLogger.info('Registering & Resolving Core Primitives...');

    // 1a. Config (already registered in index.js, just get it)
    const appConfig = container.get('config');
    if (!appConfig) {
        infraLogger.error('CRITICAL: Could not resolve \'config\' from container!');
        throw new Error('Configuration object not found in DI container.');
    }
    infraLogger.info('Resolved config.');

    // 1b. Base Logger (already registered in index.js, just get it)
    const registeredLogger = container.get('logger'); 
    if (!registeredLogger || typeof registeredLogger.child !== 'function') {
        infraLogger.error('CRITICAL: Base logger invalid or missing child method!');
        throw new Error('Base application logger resolution failed.');
    }
    registeredLogger.info('[DI Infra] Logger registered and validated.');
    
    // 1c. Register DB Factory (but don't resolve yet)
    container.register('dbFactory', (c) => {
         const conf = c.get('config'); // Get config inside factory
         const log = c.get('logger');   // Get logger inside factory
         // Check for the keys inside the nested supabase object
         if (!conf.supabase?.url || !conf.supabase?.anonKey) { 
             log.error('Supabase URL or Anon Key missing in configuration!', { hasUrl: !!conf.supabase?.url, hasAnonKey: !!conf.supabase?.anonKey });
             throw new Error('Supabase URL or Anon Key missing in configuration for dbFactory.');
         }
         // Construct the expected nested structure for initializeSupabaseClient
         // (conf.supabase already has the correct structure now)
         const supabaseConfig = {
           supabase: conf.supabase
         };
         return initializeSupabaseClient(supabaseConfig, log); // Pass the nested config
    }, true); // Singleton factory
    registeredLogger.info('[DI Infra] dbFactory registered.');

    // 1d. NOW, explicitly resolve the database instance to ensure it's created
    let dbInstance;
    try {
        dbInstance = container.get('dbFactory');
        if (!dbInstance) {
             throw new Error('dbFactory returned null or undefined');
        }
        // Also register the resolved instance under 'db' and 'supabase' for direct access
        container.registerInstance('db', dbInstance);
        container.registerInstance('supabase', dbInstance);
        registeredLogger.info('[DI Infra] Database client INSTANCE resolved and registered as \'db\'.');
    } catch (error) {
        registeredLogger.error('[DI Infra] CRITICAL: Failed to resolve db instance from dbFactory!', { error: error.message, stack: error.stack });
        throw new Error(`Failed to resolve Supabase instance: ${error.message}`);
    }
    
    // --- Phase 2: Register Components Dependent on Core Primitives --- 
    infraLogger.info('Registering dependent infrastructure components...');

    // 2a. Specific Loggers (Can now safely use registeredLogger.child)
    container.registerInstance('infraLogger', registeredLogger.child('infra'));
    container.registerInstance('eventsLogger', registeredLogger.child('events'));
    container.registerInstance('userLogger', registeredLogger.child('user'));
    container.registerInstance('personalityLogger', registeredLogger.child('personality'));
    container.registerInstance('progressLogger', registeredLogger.child('progress'));
    container.registerInstance('adaptiveLogger', registeredLogger.child('adaptive'));
    container.registerInstance('challengeLogger', registeredLogger.child('challenge'));
    container.registerInstance('evaluationLogger', registeredLogger.child('evaluation'));
    container.registerInstance('userJourneyLogger', registeredLogger.child('userJourney'));
    container.registerInstance('focusAreaLogger', registeredLogger.child('focusArea'));
    container.registerInstance('aiLogger', registeredLogger.child('ai'));
    container.registerInstance('traitsAnalysisLogger', registeredLogger.child('traitsAnalysis'));
    container.registerInstance('refreshTokenLogger', registeredLogger.child('refreshToken'));
    registeredLogger.info('[DI Infra] Specific loggers registered.');
    
    // Register LogService
    container.register('logService', c => {
        return new LogService({
            getLogger: (name) => {
                // Try to get a named logger first
                const loggerName = `${name.toLowerCase()}Logger`;
                if (c.has(loggerName)) {
                    return c.get(loggerName);
                }
                // Fall back to the base logger with child
                return c.get('logger').child(name);
            }
        });
    }, true); // Singleton
    registeredLogger.info('[DI Infra] LogService registered.');
    
    // Register EmailService
    container.register('emailService', c => {
        return new EmailService({
            config: c.get('config'),
            logger: c.get('logger').child({ service: 'EmailService' })
        });
    }, true); // Singleton
    registeredLogger.info('[DI Infra] EmailService registered.');

    // 2b. Event Bus 
    const resolvedDbInstance = dbInstance; 
    container.register('deadLetterQueueService', c => {
        // Use the dbInstance from the outer scope
        if (!resolvedDbInstance) throw new Error('DB instance (resolvedDbInstance) not found for DLQService');
        return new DeadLetterQueueService({
            db: resolvedDbInstance, 
            logger: c.get('logger').child('dead-letter-queue')
        });
    }, true); // Singleton
    
    // Then register robustEventBus with async factory to await deadLetterQueueService
    infraLogger.info('Registering robustEventBus...');
    container.register('robustEventBus', async c => {
        const busLogger = c.get('eventsLogger') || c.get('logger').child({ component: 'event-bus' });
        
        // Await the DLQ service and handle errors gracefully
        let dlqService = null;
        try {
            dlqService = await c.get('deadLetterQueueService');
            busLogger.debug('[DI Infra] Successfully resolved deadLetterQueueService for robustEventBus');
        } catch (error) {
            busLogger.warn('[DI Infra] Failed to resolve deadLetterQueueService for robustEventBus', { 
                error: error.message 
            });
        }
        
        const bus = new RobustEventBus({ 
            logger: busLogger, 
            dlqService: dlqService // Will be null if resolution failed
        });
        
        try {
            Object.values(EventTypes).forEach(eventType => {
                if (eventType && typeof eventType === 'string') {
                    bus.registerEventType(eventType);
                } else if (eventType && typeof eventType === 'object' && eventType.key) {
                    bus.registerEventType(eventType.key, eventType.options);
                }
            });
            busLogger.info('[DI Infra] Registered standard event types with RobustEventBus.');
        } catch(err) {
            busLogger.error('[DI Infra] Failed to register standard event types', { error: err.message });
        }
        
        return bus;
    }, true); // Singleton
    
    // Register eventBus as an alias to robustEventBus, using async factory to properly await
    infraLogger.info('Registering eventBus alias...');
    container.register('eventBus', async c => {
        const eventBus = await c.get('robustEventBus');
        infraLogger.debug('[DI Infra] Successfully resolved robustEventBus for eventBus alias');
        return eventBus;
    }, true); // Singleton
    
    // Register EventTypes as a value
    container.registerInstance('eventTypes', EventTypes);

    // 2c. Cache Service
    container.register('cacheService', c => {
        const cacheLogger = c.get('infraLogger').child({ service: 'CacheService' });
        
        // Create a memory cache provider instance
        const memoryProvider = new MemoryCacheProvider({
            ttl: appConfig.cache?.defaultTTL || 300,
            checkPeriod: appConfig.cache?.checkPeriod || 60,
            useClones: (appConfig.cache?.useClones || 'false') === 'true',
            enablePatterns: (appConfig.cache?.enablePatterns || 'true') === 'true'
        });
        
        return new CacheService(memoryProvider, {
            logger: cacheLogger,
            defaultTTL: appConfig.cache?.defaultTTL || 300,
            logHits: (appConfig.cache?.logHits || 'true') === 'true',
            logMisses: (appConfig.cache?.logMisses || 'true') === 'true',
            enabled: (appConfig.cache?.enabled || 'true') === 'true'
        });
    }, true); // Singleton
    container.register('configCache', c => c.get('cacheService'), true); // Alias config cache
    registeredLogger.info('[DI Infra] CacheService registered.');

    // 2d. Cache Invalidation Manager (Async factory, depends on cacheService & eventBus)
    container.register('cacheInvalidationManager', async c => {
        const CacheInvalidationManagerModule = await import("#app/core/infra/cache/CacheInvalidationManager.js");
        const { CacheInvalidationManager } = CacheInvalidationManagerModule;
        const cacheServiceInstance = c.get('cacheService');
        const eventBusInstance = c.get('eventBus');
        if (!cacheServiceInstance || !eventBusInstance) {
             throw new Error('cacheService or eventBus missing for CacheInvalidationManager');
        }
        return new CacheInvalidationManager({
            cacheService: cacheServiceInstance,
            eventBus: eventBusInstance,
            logger: c.get('infraLogger')
        });
    }, true); // Singleton
    registeredLogger.info('[DI Infra] cacheInvalidationManager registered (async factory).');

    // 2e. Memory Monitor (Instance) - Temporary fix: memoryMonitor is not defined
    // container.registerInstance('memoryMonitor', memoryMonitor);
    registeredLogger.info('[DI Infra] Memory Monitor registration skipped (undefined).');
    
    // Register validation middleware
    infraLogger.info('Registering validation middleware...');
    container.register('validation', async () => {
        // Use dynamic import() instead of require() for ESM compatibility
        const validationModule = await import('#app/core/infra/http/middleware/validation.js');
        return {
            validateBody: validationModule.validateBody,
            validateQuery: validationModule.validateQuery,
            validateParams: validationModule.validateParams
        };
    }, true); // Singleton
    
    // Register authentication middleware
    infraLogger.info('Registering authentication middleware...');
    container.register('authMiddleware', async c => {
        // Use dynamic import for ESM compatibility
        const authMiddlewareModule = await import('#app/core/infra/http/middleware/auth.js');
        const { createAuthMiddleware, requireAdmin, addRequestId } = authMiddlewareModule;
        
        // Get the supabase client
        const supabase = c.get('db');
        if (!supabase) {
            throw new Error('Supabase client not available for authMiddleware');
        }
        
        return {
            authenticateUser: createAuthMiddleware(supabase),
            requireAdmin,
            addRequestId
        };
    }, true); // Singleton

    // Register Sentry services
    infraLogger.info('Registering Sentry error monitoring services...');
    container.register('sentryService', async c => {
        const sentryModule = await import('#app/config/setup/sentry.js');
        return {
            captureException: sentryModule.captureException,
            setUser: sentryModule.setUser,
            clearUser: sentryModule.clearUser
        };
    }, true); // Singleton

    infraLogger.info('Infrastructure component registration complete.');
}

export { registerInfrastructureComponents };
export default {
    registerInfrastructureComponents
};
