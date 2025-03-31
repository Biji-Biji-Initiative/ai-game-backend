import { logger } from "../../core/infra/logging/logger.js";
import { supabaseClient as supabase } from "../../core/infra/db/supabaseClient.js";
import AppError from "../../core/infra/errors/AppError.js";
import CacheService from "../../core/infra/cache/CacheService.js";
import { userLogger, personalityLogger, challengeLogger, evaluationLogger, focusAreaLogger, progressLogger, dbLogger, infraLogger, apiLogger, traitsAnalysisLogger } from "../../core/infra/logging/domainLogger.js";
import domainEvents from "../../core/common/events/domainEvents.js";
import { OpenAIClient } from "../../core/infra/openai/index.js";
import { OpenAIResponseHandler } from "../../core/infra/openai/index.js";
import ConversationStateRepository from "../../core/infra/repositories/ConversationStateRepository.js";
import { OpenAIStateManager } from "../../core/infra/openai/index.js";
import { ErrorHandler } from "../../core/infra/errors/ErrorHandler.js";
import HealthCheckService from "../../core/infra/health/HealthCheckService.js";
import { runDatabaseHealthCheck } from "../../core/infra/db/databaseConnection.js";
import { checkOpenAIStatus } from "../../core/infra/openai/healthCheck.js";
import openAIConfig from "../../core/infra/openai/config.js";
'use strict';
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
    // Register basic infrastructure instances
    // These are singletons by nature since registerInstance always creates singletons
    container
        .registerInstance('logger', logger)
        .registerInstance('AppError', AppError)
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
    
    container
        .registerInstance('userLogger', userLogger)
        .registerInstance('personalityLogger', personalityLogger)
        .registerInstance('challengeLogger', challengeLogger)
        .registerInstance('evaluationLogger', evaluationLogger)
        .registerInstance('focusAreaLogger', focusAreaLogger)
        .registerInstance('progressLogger', progressLogger)
        .registerInstance('traitsAnalysisLogger', traitsAnalysisLogger)
        .registerInstance('dbLogger', dbLogger)
        .registerInstance('infraLogger', infraLogger)
        .registerInstance('apiLogger', apiLogger);
    // Register event system
    // Event bus should be a singleton to ensure all subscribers receive events
    
    try {
        // Use structured logging with the infrastructure logger
        const infraLogger = container.get('infraLogger');
        
        // Log event bus diagnostics with proper structure
        infraLogger.debug('Initializing event bus registration', {
            component: 'event-bus',
            domainEventsType: typeof domainEvents,
            domainEventsKeys: Object.keys(domainEvents),
            hasEventTypes: !!domainEvents.EventTypes
        });
        
        // Use direct property access instead of destructuring since it's more reliable
        const eventBus = domainEvents.eventBus;
        const eventTypes = domainEvents.EventTypes;
        
        // More detailed diagnostics using structured logging
        infraLogger.debug('Event bus properties', {
            component: 'event-bus',
            hasEventBus: !!eventBus,
            hasEventTypes: !!eventTypes,
            hasSubscribeMethod: eventBus && typeof eventBus.subscribe === 'function',
            hasRegisterMethod: eventBus && typeof eventBus.register === 'function',
            hasPublishMethod: eventBus && typeof eventBus.publish === 'function',
            eventBusMethods: eventBus ? Object.getOwnPropertyNames(Object.getPrototypeOf(eventBus)) : []
        });
        
        // Register event bus with the container
        container
            .registerInstance('eventTypes', eventTypes)
            .registerInstance('eventBus', eventBus);
            
        infraLogger.info('Event bus registered successfully', { component: 'event-bus' });
    } catch (error) {
        // Log errors with the structured logger
        container.get('infraLogger').error('Failed to register event bus', { 
            component: 'event-bus',
            error: error.message, 
            stack: error.stack
        });
    }
    
    // Register OpenAI services
    container
        .register('openAIConfig', _c => {
        return openAIConfig;
    }, true // Singleton: YES - configuration with no state
    )
        .register('openAIClient', c => {
        return new OpenAIClient({
            config: c.get('openAIConfig'),
            logger: c.get('apiLogger'),
            apiKey: c.get('config').openai.apiKey,
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
    // Register health check service
    container.register('healthCheckService', c => {
        return new HealthCheckService({
            runDatabaseHealthCheck,
            openAIClient: c.get('openAIClient'),
            checkOpenAIStatus,
            logger: c.get('logger')
        });
    }, true // Singleton: YES - stateless service
    );
    return container; // For method chaining
}

export { registerInfrastructureComponents };
export default {
    registerInfrastructureComponents
};
