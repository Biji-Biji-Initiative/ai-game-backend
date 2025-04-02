'use strict';

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet'; // Assuming helmet is used or intended
import cookieParser from 'cookie-parser'; // Import if used
import { 
    requestLogger, 
    correlationIdMiddleware 
} from "#app/core/infra/logging/logger.js";
import { applyRateLimiting } from "#app/core/infra/http/middleware/rateLimit.js";
import { createAuthMiddleware } from "#app/core/infra/http/middleware/auth.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";

/**
 * Configures core application middleware (excluding error handlers and routing).
 * @param {express.Application} app - The Express application instance.
 * @param {Object} config - The application configuration object.
 * @param {DIContainer} container - The Dependency Injection container.
 */
function configureCoreMiddleware(app, config, container) {
    const logger = container.get('infraLogger') || infraLogger;
    logger.info('[Setup] Configuring core middleware...');

    // --- Security Middleware --- 
    app.use(helmet()); // Basic security headers
    logger.debug('[Setup] Helmet middleware applied.');

    // CORS
    const getCorsOptions = () => { /* ... CORS options logic from app.js ... */ 
        const corsOptions = {
            origin: (origin, callback) => {
              if (!origin) {
                return callback(null, true);
              }
              if (config.isProduction) {
                if (Array.isArray(config.cors.allowedOrigins) && config.cors.allowedOrigins.includes(origin)) {
                  callback(null, true);
                } else {
                  callback(new Error(`Origin ${origin} not allowed by CORS policy`));
                }
              } else {
                callback(null, true);
              }
            },
            methods: config.cors.methods,
            allowedHeaders: config.cors.allowedHeaders,
            exposedHeaders: config.cors.exposedHeaders,
            credentials: config.cors.credentials,
            maxAge: config.cors.maxAge
          };
          return corsOptions;
    };
    app.use(cors(getCorsOptions()));
    app.options('*', cors(getCorsOptions())); // Handle preflight requests
    logger.debug('[Setup] CORS middleware applied.');

    // Rate Limiting
    applyRateLimiting(app); // Assuming this function takes app and config implicitly or gets from container
    logger.debug('[Setup] Rate limiting middleware applied.');

    // --- Request Parsing & Utils --- 
    app.use(bodyParser.json({ limit: config.server?.bodyLimit || '10mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: config.server?.bodyLimit || '10mb' }));
    app.use(cookieParser()); // If needed
    logger.debug('[Setup] Body parsing middleware applied.');

    // Request ID
    app.use((req, res, next) => {
        req.id = uuidv4();
        res.setHeader('X-Request-Id', req.id);
        next();
    });
    logger.debug('[Setup] Request ID middleware applied.');

    // Correlation ID for Logging
    app.use(correlationIdMiddleware);
    logger.debug('[Setup] Correlation ID middleware applied.');

    // Request Logging (after IDs are set)
    app.use(requestLogger); // Assuming requestLogger gets logger via its own import
    logger.debug('[Setup] Request logging middleware applied.');
    
    // --- Authentication Middleware --- 
    // Must run BEFORE any protected routes are mounted
    try {
        const supabase = container.get('db'); 
        if (!supabase) {
            throw new Error('Database client not found in container for auth middleware setup.');
        }
        const authMiddleware = createAuthMiddleware(supabase); 
        // Apply globally to API prefix - adjust if more granular control needed
        app.use(`${config.api.prefix}`, authMiddleware); 
        logger.info('[Setup] Authentication middleware configured successfully.');

    } catch (error) {
        logger.error('[Setup] CRITICAL: Failed to configure authentication middleware!', { error: error.message });
        // Add a failing middleware if auth setup fails
        app.use((req, res, next) => { 
            next(new Error('Authentication middleware setup failed, server unavailable.'));
        });
    }
    
    logger.info('[Setup] Core middleware configuration complete.');
}

export { configureCoreMiddleware }; 