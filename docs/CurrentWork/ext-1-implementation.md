# EXT-1: Implement Feature Flags for New Domain Features

## Problem Statement

As our application grows, deploying new features becomes increasingly risky. Currently, new features are deployed directly to production with no way to:

1. Gradually roll out features to subsets of users
2. A/B test different implementations
3. Quickly disable problematic features without code redeployment
4. Separate feature deployment from feature activation

This leads to potential issues:
- Deployment failures affecting all users simultaneously
- Inability to gather controlled feedback before full release
- No mechanism for emergency feature deactivation without rollbacks
- Difficulty coordinating features across multiple services

## Implementation Strategy

I'll implement a flexible feature flag system that will:

1. Support multiple flag types (boolean, percentage rollout, user targeting)
2. Allow both local and remote configuration
3. Provide a consistent API for checking feature status
4. Include admin controls for real-time flag management

## Implementation Details

### 1. Create Feature Flag Core Service

First, I'll create a core service for feature flag management:

```javascript
// src/core/featureFlags/services/FeatureFlagService.js

import { logger } from '../../infra/logging/logger.js';
import { InfraError } from '../../infra/errors/InfraErrors.js';

/**
 * Feature flag management service
 * Handles feature flag evaluation and management
 */
class FeatureFlagService {
  /**
   * Create a new feature flag service
   * @param {Object} options - Service configuration
   * @param {Object} options.flagProvider - Provider for flag values
   * @param {Object} options.cacheService - Cache service for flag values
   * @param {Object} options.logger - Logger instance
   */
  constructor({ flagProvider, cacheService, logger }) {
    this.provider = flagProvider;
    this.cache = cacheService;
    this.logger = logger?.child({ service: 'feature-flags' }) || logger;
    
    // Internal store for local flags during development
    this._localFlags = new Map();
    
    // Cache TTL (5 minutes)
    this.cacheTTL = 5 * 60;
  }
  
  /**
   * Initialize the feature flag service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Load initial flags from provider
      await this.refreshFlags();
      
      // Log successful initialization
      this.logger.info('Feature flag service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize feature flag service', { error });
      throw new InfraError('Failed to initialize feature flags', {
        cause: error,
        component: 'featureFlags',
        operation: 'initialize'
      });
    }
  }
  
  /**
   * Refresh flags from the provider
   * @returns {Promise<void>}
   */
  async refreshFlags() {
    try {
      const flags = await this.provider.getAllFlags();
      
      // Store in cache
      await this.cache.set('feature-flags:all', flags, this.cacheTTL);
      
      this.logger.debug('Refreshed feature flags', { 
        count: Object.keys(flags).length
      });
    } catch (error) {
      this.logger.error('Failed to refresh feature flags', { error });
      throw new InfraError('Failed to refresh feature flags', {
        cause: error,
        component: 'featureFlags',
        operation: 'refreshFlags'
      });
    }
  }
  
  /**
   * Check if a feature is enabled
   * @param {string} flagKey - Feature flag key
   * @param {Object} context - Evaluation context (user, environment, etc.)
   * @param {boolean} defaultValue - Default value if flag is not found
   * @returns {Promise<boolean>} Whether the feature is enabled
   */
  async isEnabled(flagKey, context = {}, defaultValue = false) {
    try {
      const cacheKey = `feature-flags:${flagKey}`;
      
      // Try to get from cache first
      return await this.cache.getOrSet(cacheKey, async () => {
        // Check for local override (development only)
        if (process.env.NODE_ENV === 'development' && this._localFlags.has(flagKey)) {
          const localValue = this._localFlags.get(flagKey);
          this.logger.debug('Using local feature flag value', { 
            flagKey, 
            value: localValue
          });
          return this._evaluateFlag(localValue, context);
        }
        
        // Get from provider
        const flag = await this.provider.getFlag(flagKey);
        if (!flag) {
          this.logger.debug('Feature flag not found', { 
            flagKey, 
            defaultValue
          });
          return defaultValue;
        }
        
        // Evaluate the flag
        return this._evaluateFlag(flag, context);
      }, this.cacheTTL);
    } catch (error) {
      this.logger.warn('Error evaluating feature flag', { 
        flagKey, 
        error: error.message
      });
      return defaultValue;
    }
  }
  
  /**
   * Set a local feature flag value (development only)
   * @param {string} flagKey - Feature flag key
   * @param {any} value - Flag value
   */
  setLocalFlag(flagKey, value) {
    if (process.env.NODE_ENV !== 'development') {
      this.logger.warn('Local flags can only be set in development mode');
      return;
    }
    
    this._localFlags.set(flagKey, value);
    this.logger.debug('Set local feature flag', { flagKey, value });
  }
  
  /**
   * Evaluate a feature flag
   * @param {Object} flag - Feature flag configuration
   * @param {Object} context - Evaluation context
   * @returns {boolean} Evaluation result
   * @private
   */
  _evaluateFlag(flag, context = {}) {
    // Handle simple boolean flags
    if (typeof flag === 'boolean') {
      return flag;
    }
    
    // Handle percentage rollout flags
    if (flag.percentage !== undefined) {
      const userId = context.userId || 'anonymous';
      const hash = this._hashString(`${userId}:${flag.key}`);
      const percentage = hash % 100;
      return percentage < flag.percentage;
    }
    
    // Handle user targeting flags
    if (flag.targetUsers && Array.isArray(flag.targetUsers)) {
      if (context.userId && flag.targetUsers.includes(context.userId)) {
        return true;
      }
    }
    
    // Handle user attributes targeting
    if (flag.targetAttributes && typeof flag.targetAttributes === 'object') {
      const userAttributes = context.userAttributes || {};
      
      // Check if all target attributes match
      const matches = Object.entries(flag.targetAttributes).every(([key, value]) => {
        return userAttributes[key] === value;
      });
      
      if (matches) {
        return true;
      }
    }
    
    // Fall back to enabled property
    return flag.enabled === true;
  }
  
  /**
   * Simple hash function for consistent percentage rollouts
   * @param {string} str - String to hash
   * @returns {number} Hash value (0-99)
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }
}

export default FeatureFlagService;
```

### 2. Create Feature Flag Provider Interface

Now I'll define the provider interface and a local implementation:

```javascript
// src/core/featureFlags/providers/FeatureFlagProvider.js

/**
 * Feature flag provider interface
 * Defines the contract for providing feature flag values
 */
class FeatureFlagProvider {
  /**
   * Get all feature flags
   * @returns {Promise<Object>} Map of flag keys to flag configurations
   */
  async getAllFlags() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get a specific feature flag
   * @param {string} flagKey - Feature flag key
   * @returns {Promise<Object|boolean|null>} Flag configuration or null if not found
   */
  async getFlag(flagKey) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Update a feature flag
   * @param {string} flagKey - Feature flag key
   * @param {Object|boolean} flagConfig - New flag configuration
   * @returns {Promise<boolean>} Whether the update was successful
   */
  async updateFlag(flagKey, flagConfig) {
    throw new Error('Method not implemented');
  }
}

export default FeatureFlagProvider;
```

### 3. Create Local Config Provider

```javascript
// src/core/featureFlags/providers/LocalConfigProvider.js

import FeatureFlagProvider from './FeatureFlagProvider.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Local configuration provider for feature flags
 * Uses local JSON file for flag storage
 * @implements {FeatureFlagProvider}
 */
class LocalConfigProvider extends FeatureFlagProvider {
  /**
   * Create a new local config provider
   * @param {Object} options - Provider options
   * @param {string} options.configPath - Path to flags config file
   * @param {Object} options.logger - Logger instance
   */
  constructor({ configPath, logger }) {
    super();
    this.configPath = configPath || path.resolve(process.cwd(), 'config/featureFlags.json');
    this.logger = logger;
    this.flags = null;
  }
  
  /**
   * Load flags from file
   * @private
   */
  async _loadFlags() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      this.flags = JSON.parse(data);
    } catch (error) {
      this.logger.warn('Failed to load feature flags from file', { 
        path: this.configPath,
        error: error.message
      });
      this.flags = {};
      
      // Create file if it doesn't exist
      if (error.code === 'ENOENT') {
        try {
          const dir = path.dirname(this.configPath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(this.configPath, JSON.stringify({}, null, 2));
          this.logger.info('Created empty feature flags file', { path: this.configPath });
        } catch (writeError) {
          this.logger.error('Failed to create feature flags file', { 
            path: this.configPath,
            error: writeError.message
          });
        }
      }
    }
  }
  
  /**
   * Get all feature flags
   * @returns {Promise<Object>} Map of flag keys to flag configurations
   */
  async getAllFlags() {
    if (!this.flags) {
      await this._loadFlags();
    }
    return this.flags;
  }
  
  /**
   * Get a specific feature flag
   * @param {string} flagKey - Feature flag key
   * @returns {Promise<Object|boolean|null>} Flag configuration or null if not found
   */
  async getFlag(flagKey) {
    if (!this.flags) {
      await this._loadFlags();
    }
    return this.flags[flagKey] || null;
  }
  
  /**
   * Update a feature flag
   * @param {string} flagKey - Feature flag key
   * @param {Object|boolean} flagConfig - New flag configuration
   * @returns {Promise<boolean>} Whether the update was successful
   */
  async updateFlag(flagKey, flagConfig) {
    if (!this.flags) {
      await this._loadFlags();
    }
    
    this.flags[flagKey] = flagConfig;
    
    try {
      await fs.writeFile(
        this.configPath, 
        JSON.stringify(this.flags, null, 2)
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to update feature flag', { 
        flagKey, 
        error: error.message
      });
      return false;
    }
  }
}

export default LocalConfigProvider;
```

### 4. Create Database Provider

```javascript
// src/core/featureFlags/providers/DatabaseProvider.js

import FeatureFlagProvider from './FeatureFlagProvider.js';
import { DatabaseError } from '../../infra/errors/InfraErrors.js';

/**
 * Database provider for feature flags
 * Uses application database for flag storage
 * @implements {FeatureFlagProvider}
 */
class DatabaseProvider extends FeatureFlagProvider {
  /**
   * Create a new database provider
   * @param {Object} options - Provider options
   * @param {Object} options.db - Database client
   * @param {Object} options.logger - Logger instance
   */
  constructor({ db, logger }) {
    super();
    this.db = db;
    this.logger = logger;
    this.tableName = 'feature_flags';
  }
  
  /**
   * Get all feature flags
   * @returns {Promise<Object>} Map of flag keys to flag configurations
   */
  async getAllFlags() {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*');
        
      if (error) {
        throw new DatabaseError(`Failed to fetch feature flags: ${error.message}`, {
          cause: error,
          operation: 'getAllFlags'
        });
      }
      
      // Convert array to map with key as the key
      return (data || []).reduce((map, flag) => {
        // Parse the configuration from JSON
        const config = flag.config ? JSON.parse(flag.config) : flag.enabled;
        map[flag.key] = config;
        return map;
      }, {});
    } catch (error) {
      this.logger.error('Failed to fetch feature flags', { error });
      throw error;
    }
  }
  
  /**
   * Get a specific feature flag
   * @param {string} flagKey - Feature flag key
   * @returns {Promise<Object|boolean|null>} Flag configuration or null if not found
   */
  async getFlag(flagKey) {
    try {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('key', flagKey)
        .maybeSingle();
        
      if (error) {
        throw new DatabaseError(`Failed to fetch feature flag: ${error.message}`, {
          cause: error,
          operation: 'getFlag',
          metadata: { flagKey }
        });
      }
      
      if (!data) {
        return null;
      }
      
      // Parse the configuration from JSON
      return data.config ? JSON.parse(data.config) : data.enabled;
    } catch (error) {
      this.logger.error('Failed to fetch feature flag', { flagKey, error });
      throw error;
    }
  }
  
  /**
   * Update a feature flag
   * @param {string} flagKey - Feature flag key
   * @param {Object|boolean} flagConfig - New flag configuration
   * @returns {Promise<boolean>} Whether the update was successful
   */
  async updateFlag(flagKey, flagConfig) {
    try {
      const record = {
        key: flagKey,
        updated_at: new Date().toISOString()
      };
      
      if (typeof flagConfig === 'boolean') {
        record.enabled = flagConfig;
        record.config = null;
      } else {
        record.enabled = !!flagConfig.enabled;
        record.config = JSON.stringify(flagConfig);
      }
      
      const { error } = await this.db
        .from(this.tableName)
        .upsert(record);
        
      if (error) {
        throw new DatabaseError(`Failed to update feature flag: ${error.message}`, {
          cause: error,
          operation: 'updateFlag',
          metadata: { flagKey }
        });
      }
      
      return true;
    } catch (error) {
      this.logger.error('Failed to update feature flag', { flagKey, error });
      throw error;
    }
  }
}

export default DatabaseProvider;
```

### 5. Create Feature Flag Middleware

```javascript
// src/core/featureFlags/middleware/featureFlagMiddleware.js

/**
 * Create middleware to require a feature flag
 * @param {FeatureFlagService} featureFlagService - The feature flag service
 * @param {string} flagKey - The feature flag key to check
 * @param {boolean} defaultValue - Default value if flag not found
 * @returns {Function} Express middleware
 */
export function requireFeatureFlag(featureFlagService, flagKey, defaultValue = false) {
  return async (req, res, next) => {
    try {
      // Create context from request
      const context = {
        userId: req.user?.id,
        userAttributes: {
          role: req.user?.role,
          // Add other attributes as needed
        }
      };
      
      // Check if feature is enabled
      const isEnabled = await featureFlagService.isEnabled(flagKey, context, defaultValue);
      
      if (isEnabled) {
        return next();
      }
      
      // Feature is disabled
      return res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource could not be found'
      });
    } catch (error) {
      // Log error but don't expose details to client
      req.app.get('logger').error('Feature flag check failed', {
        flagKey,
        error: error.message
      });
      
      // Default to disabled on error
      return res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource could not be found'
      });
    }
  };
}

/**
 * Add feature flags to response locals
 * @param {FeatureFlagService} featureFlagService - The feature flag service
 * @param {Array<string>} flagKeys - Feature flag keys to include
 * @returns {Function} Express middleware
 */
export function injectFeatureFlags(featureFlagService, flagKeys = []) {
  return async (req, res, next) => {
    try {
      // Create context from request
      const context = {
        userId: req.user?.id,
        userAttributes: {
          role: req.user?.role,
          // Add other attributes as needed
        }
      };
      
      // Create empty flags object in locals
      res.locals.flags = {};
      
      // Check each flag
      await Promise.all(flagKeys.map(async (flagKey) => {
        const isEnabled = await featureFlagService.isEnabled(flagKey, context);
        res.locals.flags[flagKey] = isEnabled;
      }));
      
      next();
    } catch (error) {
      // Log but continue
      req.app.get('logger').error('Failed to inject feature flags', {
        error: error.message
      });
      next();
    }
  };
}

export default {
  requireFeatureFlag,
  injectFeatureFlags
};
```

### 6. Add Database Migration

```javascript
// migrations/20230618123456_add_feature_flags_table.js

export async function up(knex) {
  return knex.schema.createTable('feature_flags', table => {
    table.string('key').primary().notNullable();
    table.boolean('enabled').defaultTo(false).notNullable();
    table.text('config').nullable();
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });
}

export async function down(knex) {
  return knex.schema.dropTable('feature_flags');
}
```

### 7. Register in DI Container

```javascript
// src/config/container/featureFlags.js

import FeatureFlagService from '../../core/featureFlags/services/FeatureFlagService.js';
import LocalConfigProvider from '../../core/featureFlags/providers/LocalConfigProvider.js';
import DatabaseProvider from '../../core/featureFlags/providers/DatabaseProvider.js';
import path from 'path';

/**
 * Register feature flag components in the container
 * @param {DIContainer} container - The DI container
 */
function registerFeatureFlagComponents(container) {
  // Register feature flag provider based on environment
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // Use local config provider in development and test
    container.register('featureFlagProvider', c => {
      return new LocalConfigProvider({
        configPath: path.resolve(process.cwd(), 'config/featureFlags.json'),
        logger: c.get('logger')
      });
    }, true); // Singleton
  } else {
    // Use database provider in production
    container.register('featureFlagProvider', c => {
      return new DatabaseProvider({
        db: c.get('db'),
        logger: c.get('logger')
      });
    }, true); // Singleton
  }
  
  // Register feature flag service
  container.register('featureFlagService', c => {
    return new FeatureFlagService({
      flagProvider: c.get('featureFlagProvider'),
      cacheService: c.get('cacheService'),
      logger: c.get('logger')
    });
  }, true); // Singleton
}

export { registerFeatureFlagComponents };
export default {
  registerFeatureFlagComponents
};
```

### 8. Initialize on App Startup

```javascript
// src/app.js (update)

// ... other imports
'use strict';

// Initialize feature flags after setting up the container
async function initializeFeatureFlags(app) {
  try {
    const container = app.get('container');
    const featureFlagService = container.get('featureFlagService');
    await featureFlagService.initialize();
    
    // Log success
    app.get('logger').info('Feature flags initialized');
  } catch (error) {
    app.get('logger').error('Failed to initialize feature flags', { error });
    // Continue app startup even if feature flags fail to load
  }
}

// ... in app startup code
app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  
  // Initialize feature flags
  await initializeFeatureFlags(app);
});
```

### 9. Example Usage in Routes

```javascript
// src/core/user/routes/userRoutes.js (example)

import express from 'express';
import { requireFeatureFlag } from '../../featureFlags/middleware/featureFlagMiddleware.js';
'use strict';

/**
 * User routes factory
 * @param {UserController} userController - User controller
 * @param {FeatureFlagService} featureFlagService - Feature flag service
 * @returns {express.Router} Express router
 */
export default function userRoutes(userController, featureFlagService) {
  const router = express.Router();
  
  // Existing routes...
  
  // New route behind feature flag
  router.get(
    '/advanced-profile',
    requireFeatureFlag(featureFlagService, 'USER_ADVANCED_PROFILE'),
    (req, res) => userController.getAdvancedProfile(req, res)
  );
  
  return router;
}
```

### 10. Example Usage in Components

```javascript
// src/core/user/services/UserService.js (example)

async getUserPreferences(userId) {
  // Get basic preferences
  const basicPreferences = await this.userPreferencesRepository.getPreferences(userId);
  
  // Check if advanced preferences feature is enabled
  const featureFlagService = this.container.get('featureFlagService');
  const advancedPreferencesEnabled = await featureFlagService.isEnabled(
    'USER_ADVANCED_PREFERENCES',
    { userId }
  );
  
  if (advancedPreferencesEnabled) {
    // Get advanced preferences
    const advancedPreferences = await this.userAdvancedPreferencesRepository.getPreferences(userId);
    
    // Merge preferences
    return {
      ...basicPreferences,
      ...advancedPreferences
    };
  }
  
  return basicPreferences;
}
```

## Testing Strategy

1. **Unit Tests**: Test flag evaluation with different contexts
2. **Integration Tests**: Verify middleware correctly enables/disables features
3. **API Tests**: Confirm feature flags control access to endpoints
4. **Performance Tests**: Measure impact on response times

## Benefits

This feature flag implementation provides several key benefits:

1. **Gradual Rollouts**: New features can be safely introduced to subsets of users
2. **A/B Testing**: Different implementations can be tested simultaneously
3. **Emergency Shutoff**: Problematic features can be disabled without redeployment
4. **Targeted Features**: Users can be given access based on attributes or segments
5. **Decoupled Deployment**: Feature deployment is separated from feature activation

## Next Steps

After implementing feature flags, we should:

1. Set up monitoring for feature flag usage
2. Create admin UI for flag management
3. Document feature flag naming conventions
4. Set up automated tests for feature flag impact
5. Consider more advanced flag providers (e.g., LaunchDarkly)
