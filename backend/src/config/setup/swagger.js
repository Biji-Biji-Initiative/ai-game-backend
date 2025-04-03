'use strict';

import swaggerUi from 'swagger-ui-express';
import * as OpenApiValidator from 'express-openapi-validator'; // Ensure this import is correct
import path from 'path';
import fs from 'fs';
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
import { fileURLToPath } from 'url';
import express from 'express';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the generated OpenAPI spec
const OPENAPI_SPEC_PATH = path.resolve(__dirname, '../../../openapi/generated/openapi-spec.json');

/**
 * Initializes Swagger UI documentation.
 * @param {express.Application} app - The Express application instance.
 * @param {Logger} logger - Logger instance.
 */
function initializeSwaggerUI(app, logger) {
    try {
        // Check if the spec file exists
        if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
            logger.warn('[Setup] OpenAPI spec file not found at: ' + OPENAPI_SPEC_PATH);
            logger.warn('[Setup] Swagger UI will not be available. Run "npm run swagger:bundle" to generate the spec.');
            return;
        }

        // Parse the OpenAPI spec JSON
        const swaggerDocument = JSON.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8'));
        
        // Configure Swagger UI options
        const options = {
            explorer: true,
            swaggerOptions: {
                persistAuthorization: true,
                tagsSorter: 'alpha',
                operationsSorter: 'alpha',
            }
        };

        // Important: Mount Swagger UI at /api-docs explicitly bypassing auth
        // Create a separate router for Swagger UI that won't go through auth middleware
        const docsRouter = express.Router();
        
        // Log access to Swagger UI
        docsRouter.use((req, res, next) => {
            logger.debug('[Swagger] Access to API docs', { 
                ip: req.ip,
                path: req.path,
                method: req.method,
                requestId: req.id
            });
            next();
        });
        
        // Mount Swagger UI on the router
        docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
        
        // Mount the router at /api-docs
        app.use('/api-docs', docsRouter);
        
        logger.info('[Setup] Swagger UI initialized at /api-docs');
    } catch (error) {
        logger.error('[Setup] Failed to initialize Swagger UI:', { error: error.message });
    }
}

/**
 * Configures OpenAPI Validator middleware.
 * @param {express.Application} app - The Express application instance.
 * @param {Object} config - Application configuration.
 * @param {Logger} logger - Logger instance.
 */
function initializeOpenAPIValidator(app, config, logger) {
    try {
        // Check if the spec file exists
        if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
            logger.warn('[Setup] OpenAPI spec file not found at: ' + OPENAPI_SPEC_PATH);
            logger.warn('[Setup] OpenAPI validation will not be enabled. Run "npm run swagger:bundle" to generate the spec.');
            return;
        }

        // Configure and apply the validator middleware
        logger.info('[Setup] Installing OpenAPI validation middleware...');
        app.use(
            OpenApiValidator.middleware({
                apiSpec: OPENAPI_SPEC_PATH,
                validateRequests: true,
                validateResponses: config.env !== 'production', // Validate responses in non-production environments
                validateSecurity: {
                    handlers: {
                        bearerAuth: async (req, scopes, schema) => {
                            // This handler is already managed by our auth middleware
                            // Just return true here as auth is handled separately
                            return true;
                        }
                    }
                },
                ignorePaths: /^(?!\/(api|api\/v1)).*/  // Only validate paths that start with /api or /api/v1
            })
        );

        logger.info('[Setup] OpenAPI validation middleware installed successfully.');
    } catch (error) {
        logger.error('[Setup] Failed to initialize OpenAPI Validator:', { error: error.message, stack: error.stack });
        // Decide if you want to throw the error or just log it
        // throw error; // Uncomment this to make startup fail if validator setup fails
    }
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