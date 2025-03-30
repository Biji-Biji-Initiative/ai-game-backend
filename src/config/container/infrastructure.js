import { logger } from "../../core/infra/logging/logger.js";
import { supabaseClient as supabase } from "../../core/infra/db/supabaseClient.js";
import AppError from "../../core/infra/errors/AppError.js";
import CacheService from "../../core/infra/cache/CacheService.js";
import { userLogger, personalityLogger, challengeLogger, evaluationLogger, focusAreaLogger, progressLogger, dbLogger, infraLogger, apiLogger, traitsAnalysisLogger } from "../../core/infra/logging/domainLogger.js";
import domainEvents from "../../core/common/events/domainEvents.js";
import DomainEventBusAdapter from "../../core/common/events/DomainEventBusAdapter.js";
import { robustEventBus } from "../../core/common/events/RobustEventBus.js";
import { OpenAIClient } from "../../core/infra/openai/index.js";
import { OpenAIResponseHandler } from "../../core/infra/openai/index.js";
import ConversationStateRepository from "../../core/infra/repositories/ConversationStateRepository.js";
import { OpenAIStateManager } from "../../core/infra/openai/index.js";
import { ErrorHandler } from "../../core/infra/errors/ErrorHandler.js";
import HealthCheckService from "../../core/infra/health/HealthCheckService.js";
import { runDatabaseHealthCheck } from "../../core/infra/db/databaseConnection.js";
import { checkOpenAIStatus } from "../../core/infra/openai/healthCheck.js";
import openAIConfig from "../../core/infra/openai/config.js";
import MockOpenAIClientAdapter from "../../core/ai/adapters/MockOpenAIClientAdapter.js";
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
    const _config = container.resolve('config');
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
            defaultTTL: c.resolve('config').cache?.defaultTTL || 300, // 5 minutes default
            logger: c.resolve('infraLogger')
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
            defaultTTL: c.resolve('config').cache?.configTTL || 3600, // 1 hour default for config
            logger: c.resolve('infraLogger')
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
    const { eventTypes, eventBus } = domainEvents;
    container
        .registerInstance('eventTypes', eventTypes)
        .registerInstance('eventBus', eventBus);
    
    // Register the event bus adapter that implements IEventBus interface
    container.register('iEventBus', () => {
        // Use the robust event bus implementation that provides better error handling,
        // logging, and monitoring capabilities
        return robustEventBus;
        
        // Alternatively, use the adapter for the basic domainEvents implementation
        // return new DomainEventBusAdapter();
    }, true); // Singleton: YES - shared event bus
    // Register OpenAI services
    container
        .register('openAIConfig', _c => {
        return openAIConfig;
    }, true // Singleton: YES - configuration with no state
    )
        .register('openAIClient', c => {
        const config = c.resolve('config');
        const logger = c.resolve('apiLogger');
        const apiKey = config.openai?.apiKey;
        const isDev = process.env.NODE_ENV !== 'production';
        
        // Use mock adapter in development when API key is missing or explicitly enabled
        if ((isDev && !apiKey) || process.env.USE_MOCK_OPENAI === 'true') {
            logger.warn('Using MockOpenAIClientAdapter - API responses will be simulated');
            return new MockOpenAIClientAdapter({ 
                logger
            });
        }
        
        // Use real client when API key is available
        return new OpenAIClient({
            config: c.resolve('openAIConfig'),
            logger,
            apiKey,
        });
    }, true // Singleton: YES - manages API connection with rate limiting
    )
        .register('openAIResponseHandler', c => {
        return new OpenAIResponseHandler({
            logger: c.resolve('logger'),
        });
    }, true // Singleton: YES - stateless utility service
    );
    // Register conversation state repository and OpenAI state manager
    container
        .register('conversationStateRepository', c => {
        return new ConversationStateRepository(c.resolve('supabase'), c.resolve('dbLogger'));
    }, true // Singleton: YES - repository with potentially expensive DB connection
    )
        .register('openAIStateManager', c => {
        return new OpenAIStateManager({
            openAIClient: c.resolve('openAIClient'),
            logger: c.resolve('logger'),
            redisCache: c.has('redisCache') ? c.resolve('redisCache') : null
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
            openAIClient: c.resolve('openAIClient'),
            checkOpenAIStatus,
            logger: c.resolve('logger')
        });
    }, true // Singleton: YES - stateless service
    );
    return container; // For method chaining
}

export { registerInfrastructureComponents };
export default {
    registerInfrastructureComponents
};
