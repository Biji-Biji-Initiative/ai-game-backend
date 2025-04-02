'use strict';

import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '#app/config/swagger.js'; // Assuming swagger.js exports the JSON spec
import OpenApiValidator from 'express-openapi-validator';
import path from 'path';
import fs from 'fs';
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";

/**
 * Initializes Swagger UI documentation.
 * @param {express.Application} app - The Express application instance.
 * @param {Logger} logger - Logger instance.
 */
function initializeSwaggerUI(app, logger) {
    // ... implementation ...
}

/**
 * Configures OpenAPI Validator middleware.
 * @param {express.Application} app - The Express application instance.
 * @param {Object} config - Application configuration.
 * @param {Logger} logger - Logger instance.
 */
function initializeOpenAPIValidator(app, config, logger) {
    // ... implementation ...
}


/**
 * Initializes all Swagger and OpenAPI related setup.
 * @param {express.Application} app - The Express application instance.
 * @param {Object} config - Application configuration.
 * @param {DIContainer} container - DI Container (to get logger).
 */
function configureSwagger(app, config, container) {
    const logger = container.get('infraLogger') || infraLogger;
    logger.info('[Setup] Configuring Swagger & OpenAPI...');
    initializeSwaggerUI(app, logger);
    initializeOpenAPIValidator(app, config, logger);
    logger.info('[Setup] Swagger & OpenAPI configuration complete.');
}

const initializeSwagger = initializeSwaggerUI; // Keep alias for potential backward compatibility

export { 
    initializeSwagger, 
    initializeSwaggerUI,
    initializeOpenAPIValidator,
    configureSwagger // New main function for setup module
}; 

export default { 
    initializeSwagger: initializeSwaggerUI, 
    initializeOpenAPIValidator,
    configureSwagger
}; 