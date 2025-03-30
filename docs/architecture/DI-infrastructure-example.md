# Example: Improved Infrastructure Components Registration

This file shows the improved method chaining and documentation in infrastructure components registration.

```javascript
import { logger } from "@/core/infra/logging/logger.js";
import { supabaseClient as supabase } from "@/core/infra/db/supabaseClient.js";
import AppError from "@/core/infra/errors/AppError.js";
import CacheService from "@/core/infra/cache/CacheService.js";
import { 
  userLogger, personalityLogger, challengeLogger, evaluationLogger, 
  focusAreaLogger, progressLogger, dbLogger, infraLogger, apiLogger 
} from "@/core/infra/logging/domainLogger.js";
import domainEvents from "@/core/common/events/domainEvents.js";
import { OpenAIClient, OpenAIResponseHandler, OpenAIStateManager } from "@/core/infra/openai/index.js";
import ConversationStateRepository from "@/core/infra/repositories/ConversationStateRepository.js";
import { ErrorHandler } from "@/core/infra/errors/ErrorHandler.js";
import HealthCheckService from "@/core/infra/health/HealthCheckService.js";
import { runDatabaseHealthCheck } from "@/core/infra/db/databaseConnection.js";
import { checkOpenAIStatus } from "@/core/infra/openai/healthCheck.js";

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
 * @returns {DIContainer} - The container instance for chaining
 */
function registerInfrastructureComponents(container) {
  const _config = container.get('config');
  
  // Register basic infrastructure instances
  // Using method chaining for cleaner code
  container
    .registerInstance('logger', logger)
    .registerInstance('AppError', AppError)
    .registerInstance('supabase', supabase);
  
  // Register cache services with clear documentation of singleton decision
  container.register(
    'cacheService', 
    c => {
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
    }, 
    true // Singleton: YES - maintains shared cache across requests
  );
    
  // Config cache with improved singleton documentation
  container.register(
    'configCache', 
    c => {
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
    }, 
    true // Singleton: YES - maintains shared configuration cache across application lifecycle
  );
  
  // Register domain loggers using method chaining
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
  
  // Register event system with clear singleton documentation
  const { eventTypes, eventBus } = domainEvents;
  container
    .registerInstance('eventTypes', eventTypes)
    .registerInstance('eventBus', eventBus); // Singleton by nature: central event hub
  
  // Register OpenAI services with improved method chaining and documentation
  container
    .register(
      'openAIConfig', 
      _c => require('../../core/infra/openai/config'),
      true // Singleton: YES - static configuration with no state
    )
    .register(
      'openAIClient', 
      c => new OpenAIClient({
        config: c.get('openAIConfig'),
        logger: c.get('apiLogger'),
        apiKey: c.get('config').openai.apiKey,
      }),
      true // Singleton: YES - manages API connection with rate limiting
    )
    .register(
      'openAIResponseHandler', 
      c => new OpenAIResponseHandler({
        logger: c.get('logger'),
      }),
      true // Singleton: YES - stateless utility service
    );
  
  // Register conversation state repository and OpenAI state manager
  container
    .register(
      'conversationStateRepository', 
      c => new ConversationStateRepository(
        c.get('supabase'), 
        c.get('dbLogger')
      ),
      true // Singleton: YES - repository with potentially expensive DB connection
    )
    .register(
      'openAIStateManager', 
      c => new OpenAIStateManager({
        openAIClient: c.get('openAIClient'),
        logger: c.get('logger'),
        redisCache: c.get('redisCache')
      }),
      true // Singleton: YES - manages shared state across OpenAI interactions
    );
  
  // Register error handling with clear documentation
  container.register(
    'errorHandler', 
    _c => new ErrorHandler(),
    true // Singleton: YES - stateless utility service
  );
  
  // Register health check service with clear documentation
  container.register(
    'healthCheckService', 
    c => new HealthCheckService({
      runDatabaseHealthCheck,
      openAIClient: c.get('openAIClient'),
      checkOpenAIStatus,
      logger: c.get('logger')
    }),
    true // Singleton: YES - stateless service that provides system-wide health checks
  );
  
  // Return container for method chaining
  return container;
}

export { registerInfrastructureComponents };
export default {
  registerInfrastructureComponents
};
```

This improved version demonstrates:

1. **Method Chaining** - Using the chainable API for cleaner code
2. **Clear Singleton Documentation** - Each registration includes a comment explaining why singleton is used
3. **Improved Code Organization** - Related registrations are grouped together
4. **Consistent Return Pattern** - Returns the container for further chaining 