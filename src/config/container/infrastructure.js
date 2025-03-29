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
  const { logger } = require('../../core/infra/logging/logger');
  const { supabaseClient: supabase } = require('../../core/infra/db/supabaseClient');
  const AppError = require('../../core/infra/errors/AppError');
  
  // Register basic infrastructure instances
  // These are singletons by nature since registerInstance always creates singletons
  container
    .registerInstance('logger', logger)
    .registerInstance('AppError', AppError)
    .registerInstance('supabase', supabase);
  
  // Register cache services
  // Cache services should be singletons to properly maintain cached data
  container
    .register(
      'cacheService',
      c => {
        const CacheService = require('../../core/infra/services/CacheService');
        return new CacheService({
          namespace: 'app',
          stdTTL: c.get('config').cache?.defaultTTL || 300, // 5 minutes default
          checkperiod: 120, // Check for expired keys every 2 minutes
          logger: c.get('infraLogger')
        });
      },
      true // Singleton: YES - maintains shared cache
    )
    .register(
      'configCache',
      c => {
        const CacheService = require('../../core/infra/services/CacheService');
        return new CacheService({
          namespace: 'config',
          stdTTL: c.get('config').cache?.configTTL || 3600, // 1 hour default for config
          checkperiod: 300, // Check for expired keys every 5 minutes
          logger: c.get('infraLogger')
        });
      },
      true // Singleton: YES - maintains shared cache
    );
  
  // Register domain-specific loggers
  // Loggers should be singletons to maintain consistent logging contexts
  const {
    userLogger,
    personalityLogger,
    challengeLogger,
    evaluationLogger,
    focusAreaLogger,
    progressLogger,
    dbLogger,
    infraLogger,
    apiLogger,
  } = require('../../core/infra/logging/domainLogger');
  
  container
    .registerInstance('userLogger', userLogger)
    .registerInstance('personalityLogger', personalityLogger)
    .registerInstance('challengeLogger', challengeLogger)
    .registerInstance('evaluationLogger', evaluationLogger)
    .registerInstance('focusAreaLogger', focusAreaLogger)
    .registerInstance('progressLogger', progressLogger)
    .registerInstance('dbLogger', dbLogger)
    .registerInstance('infraLogger', infraLogger)
    .registerInstance('apiLogger', apiLogger);
  
  // Register event system
  // Event bus should be a singleton to ensure all subscribers receive events
  const { eventTypes, eventBus } = require('../../core/common/events/domainEvents');
  container
    .registerInstance('eventTypes', eventTypes)
    .registerInstance('eventBus', eventBus);
  
  // Register OpenAI services
  container
    .register(
      'openAIConfig',
      _c => {
        return require('../../core/infra/openai/config');
      },
      true // Singleton: YES - configuration with no state
    )
    .register(
      'openAIClient',
      c => {
        const { OpenAIClient } = require('../../core/infra/openai');
        return new OpenAIClient({
          config: c.get('openAIConfig'),
          logger: c.get('apiLogger'),
          apiKey: c.get('config').openai.apiKey,
        });
      },
      true // Singleton: YES - manages API connection with rate limiting
    )
    .register(
      'openAIResponseHandler',
      c => {
        const { OpenAIResponseHandler } = require('../../core/infra/openai');
        return new OpenAIResponseHandler({
          logger: c.get('logger'),
        });
      },
      true // Singleton: YES - stateless utility service
    );
  
  // Register conversation state repository and OpenAI state manager
  container
    .register(
      'conversationStateRepository',
      c => {
        const ConversationStateRepository = require('../../core/infra/repositories/ConversationStateRepository');
        return new ConversationStateRepository(c.get('supabase'), c.get('dbLogger'));
      },
      true // Singleton: YES - repository with potentially expensive DB connection
    )
    .register(
      'openAIStateManager',
      c => {
        const { OpenAIStateManager } = require('../../core/infra/openai');
        return new OpenAIStateManager({
          openAIClient: c.get('openAIClient'),
          logger: c.get('logger'),
          redisCache: c.get('redisCache')
        });
      },
      true // Singleton: YES - manages shared state
    );
  
  // Register error handling
  container.register(
    'errorHandler',
    _c => {
      const { ErrorHandler } = require('../../core/infra/errors/ErrorHandler');
      return new ErrorHandler();
    },
    true // Singleton: YES - stateless utility service
  );
  
  // Register health check service
  container.register(
    'healthCheckService',
    c => {
      const HealthCheckService = require('../../core/infra/health/HealthCheckService');
      const { runDatabaseHealthCheck } = require('../../core/infra/db/databaseConnection');
      const { checkOpenAIStatus } = require('../../core/infra/openai/healthCheck');
      
      return new HealthCheckService({
        runDatabaseHealthCheck,
        openAIClient: c.get('openAIClient'),
        checkOpenAIStatus,
        logger: c.get('logger')
      });
    },
    true // Singleton: YES - stateless service
  );
  
  return container; // For method chaining
}

module.exports = registerInfrastructureComponents; 