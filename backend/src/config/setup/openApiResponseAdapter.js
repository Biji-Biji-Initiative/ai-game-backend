/**
 * OpenAPI Response Adapter Setup
 * 
 * This module adds the OpenAPI response adapter to the application.
 * It ensures that all API responses match the expected schema in the OpenAPI spec.
 */

'use strict';

import { createOpenApiResponseAdapter } from '#app/core/infra/http/middleware/openapi/responseAdapter.js';
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";

/**
 * Configures OpenAPI Response Adapter middleware.
 * @param {express.Application} app - The Express application.
 * @param {Object} config - Application configuration.
 * @param {DIContainer} container - DI Container.
 */
export function configureOpenApiResponseAdapter(app, config, container) {
  const logger = container.get('infraLogger') || infraLogger;
  logger.info('[Setup] Configuring OpenAPI response adapter...');
  
  try {
    // Create and apply the response adapter middleware
    const responseAdapter = createOpenApiResponseAdapter();
    app.use(responseAdapter);
    
    logger.info('[Setup] OpenAPI response adapter configured successfully.');
  } catch (error) {
    logger.error('[Setup] Failed to configure OpenAPI response adapter:', { 
      error: error.message, 
      stack: error.stack 
    });
  }
}

export default { configureOpenApiResponseAdapter };
