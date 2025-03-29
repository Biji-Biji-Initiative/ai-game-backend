'use strict';

/**
 * AI Components Registration
 * 
 * This module registers all AI-related components in the DI container.
 */

/**
 * Register AI components in the container
 * @param {DIContainer} container - The DI container
 */
function registerAIComponents(container) {
  // Register AI adapters
  container.register(
    'aiClient',
    c => {
      const { OpenAIClientAdapter } = require('../../core/ai');
      return new OpenAIClientAdapter({
        openAIClient: c.get('openAIClient'),
        logger: c.get('logger')
      });
    },
    true // Singleton
  );

  container.register(
    'aiStateManager',
    c => {
      const { OpenAIStateManagerAdapter } = require('../../core/ai');
      return new OpenAIStateManagerAdapter({
        openAIStateManager: c.get('openAIStateManager'),
        logger: c.get('logger')
      });
    },
    true // Singleton
  );
}

module.exports = { registerAIComponents }; 