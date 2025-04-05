'use strict';

import OpenAIResponsesAdapter from "#app/core/ai/adapters/OpenAIResponsesAdapter.js";
import OpenAIStateManager from "#app/core/ai/adapters/OpenAIStateManager.js";
import { promptTypesExtended } from "#app/core/prompt/promptTypesExtended.js";

/**
 * Register AI components in the DI container
 * @param {DIContainer} container - DI container
 * @param {Object} logger - Logger instance
 */
export function registerAIComponents(container, logger) {
  logger.info('Registering AI components...');
  
  // Existing AI components registration...
  
  // Register OpenAI Responses adapter
  container.register('openAIResponsesAdapter', () => {
    const config = container.get('config');
    const openAIClient = container.get('openAIClient');
    const stateManager = container.get('openAIStateManager');
    
    return new OpenAIResponsesAdapter({
      openAIClient,
      stateManager,
      config: config.ai?.openai,
      logger: container.get('logger')
    });
  });
  
  // Register OpenAI State Manager
  container.register('openAIStateManager', () => {
    const threadStateRepository = container.get('threadStateRepository');
    
    return new OpenAIStateManager({
      threadStateRepository,
      logger: container.get('logger')
    });
  });
  
  // Register extended prompt types
  container.register('promptTypes', () => {
    return promptTypesExtended;
  });
  
  logger.info('AI components registered successfully');
}
