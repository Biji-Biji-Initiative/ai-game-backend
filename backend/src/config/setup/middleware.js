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
import { createVersioningMiddleware } from "#app/core/infra/http/middleware/versioning.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
import { responseFormatterMiddleware } from "#app/core/infra/http/responseFormatter.js";
import { startupLogger } from "#app/core/infra/logging/StartupLogger.js"; // Import startupLogger

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
    startupLogger.logMiddlewareInitialization('helmet', 'success', { type: 'security' });

    // CORS
    const getCorsOptions = () => { /* ... CORS options logic from app.js ... */ 
        const corsOptions = {
            origin: (origin, callback) => {
                // Allow requests with no origin (like mobile apps, curl, etc.)
                if (!origin) {
                    logger.debug('[CORS] Request with no origin allowed');
                    return callback(null, true);
                }

                if (config.cors.allowedOrigins === '*') {
                    // In development mode, allow all origins
                    logger.debug(`[CORS] Development mode - all origins allowed: ${origin}`);
                    return callback(null, true);
                } else if (Array.isArray(config.cors.allowedOrigins)) {
                    // In production, check against allowed origins list
                    if (config.cors.allowedOrigins.includes(origin)) {
                        logger.debug(`[CORS] Origin allowed: ${origin}`);
                        return callback(null, true);
                    }
                    
                    // Also check if origin matches any pattern with wildcards
                    // For example, if allowedOrigins includes "https://*.example.com"
                    for (const allowedOrigin of config.cors.allowedOrigins) {
                        if (allowedOrigin.includes('*')) {
                            const pattern = allowedOrigin.replace(/\*/g, '.*');
                            const regex = new RegExp(pattern);
                            if (regex.test(origin)) {
                                logger.debug(`[CORS] Origin matched pattern ${allowedOrigin}: ${origin}`);
                                return callback(null, true);
                            }
                        }
                    }
                    
                    // Not in allowed list
                    logger.warn(`[CORS] Origin rejected: ${origin}`);
                    return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
                }
                
                // Default allow
                logger.debug(`[CORS] Origin allowed by default: ${origin}`);
                return callback(null, true);
            },
            methods: config.cors.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: config.cors.allowedHeaders || ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposedHeaders: config.cors.exposedHeaders || ['X-Request-Id', 'X-Response-Time'],
            credentials: config.cors.credentials !== false,
            maxAge: config.cors.maxAge || 86400, // 24 hours
            preflightContinue: false,
            optionsSuccessStatus: 204
        };
        return corsOptions;
    };
    
    const corsOptions = getCorsOptions();
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions)); // Handle preflight requests
    logger.debug('[Setup] CORS middleware applied with options:', {
        allowedOrigins: config.cors.allowedOrigins,
        methods: corsOptions.methods,
        credentials: corsOptions.credentials
    });
    startupLogger.logMiddlewareInitialization('cors', 'success', { 
        type: 'security',
        origins: config.cors.allowedOrigins,
        methods: corsOptions.methods
    });

    // Rate Limiting
    applyRateLimiting(app); // Assuming this function takes app and config implicitly or gets from container
    logger.debug('[Setup] Rate limiting middleware applied.');
    startupLogger.logMiddlewareInitialization('rateLimit', 'success', { type: 'security' });

    // --- Request Parsing & Utils --- 
    app.use(bodyParser.json({ limit: config.server?.bodyLimit || '10mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: config.server?.bodyLimit || '10mb' }));
    logger.debug('[Setup] Body parsing middleware applied.');
    startupLogger.logMiddlewareInitialization('bodyParser', 'success', { 
        type: 'parser',
        limit: config.server?.bodyLimit || '10mb'
    });

    app.use(cookieParser()); // If needed
    startupLogger.logMiddlewareInitialization('cookieParser', 'success', { type: 'parser' });

    // Request ID
    app.use((req, res, next) => {
        req.id = uuidv4();
        res.setHeader('X-Request-Id', req.id);
        next();
    });
    logger.debug('[Setup] Request ID middleware applied.');
    startupLogger.logMiddlewareInitialization('requestId', 'success', { type: 'utility' });

    // Correlation ID for Logging
    app.use(correlationIdMiddleware);
    logger.debug('[Setup] Correlation ID middleware applied.');
    startupLogger.logMiddlewareInitialization('correlationId', 'success', { type: 'logging' });

    // Request Logging (after IDs are set)
    app.use(requestLogger); // Assuming requestLogger gets logger via its own import
    logger.debug('[Setup] Request logging middleware applied.');
    startupLogger.logMiddlewareInitialization('requestLogger', 'success', { type: 'logging' });
    
    // Response Formatter Middleware
    app.use(responseFormatterMiddleware);
    logger.debug('[Setup] Response formatter middleware applied.');
    startupLogger.logMiddlewareInitialization('responseFormatter', 'success', { type: 'utility' });
    
    // API Versioning Middleware
    try {
        const versioningMiddleware = createVersioningMiddleware(config);
        app.use(versioningMiddleware);
        logger.info('[Setup] API versioning middleware applied.');
        startupLogger.logMiddlewareInitialization('versioning', 'success', { type: 'routing' });
    } catch (error) {
        logger.error('[Setup] Failed to configure API versioning middleware!', { error: error.message });
        startupLogger.logMiddlewareInitialization('versioning', 'error', { 
            type: 'routing',
            error: error.message
        });
    }
    
    // --- Authentication Middleware --- 
    // Must run BEFORE any protected routes are mounted
    try {
        const supabase = container.get('db'); 
        if (!supabase) {
            throw new Error('Database client not found in container for auth middleware setup.');
        }
        const authMiddleware = createAuthMiddleware(supabase); 
        
        // Define public paths that don't require authentication
        const publicPaths = [
            '/health', 
            '/auth',
            '/v1/health',
            '/users/register',
            '/system'
        ];
        
        // Define completely public paths that bypass the API prefix check
        const bypassPaths = [
            '/api-docs',
            '/api-docs-json',
            '/api-docs/',
            '/favicon.ico',
            '/static',
            '/sentry-test',
            '/openapi/',
            '/monitoring', // Add monitoring to bypass paths
            '/monitoring/'  // Add monitoring with trailing slash
        ];
        
        // Apply authentication middleware with path exclusions
        app.use((req, res, next) => {
            const apiPrefix = config.api.prefix;
            const path = req.path;
            
            // Log path for debugging
            logger.debug(`[Auth] Processing path: ${path}`);
            
            // Check if this is a bypass path that should always be public
            const isBypassPath = bypassPaths.some(bypassPath => path.startsWith(bypassPath));
            if (isBypassPath) {
                logger.debug(`[Auth] Bypassing auth for path: ${path}`);
                return next();
            }
            
            // Check if this is an API path
            if (path.startsWith(apiPrefix)) {
                // Get the route after the API prefix
                const routePath = path.substring(apiPrefix.length);
                
                logger.debug(`[Auth] API route detected. Checking '${routePath}' against public paths: ${JSON.stringify(publicPaths)}`);
                
                // Check if it starts with any of the public paths
                const isPublicPath = publicPaths.some(publicPath => routePath.startsWith(publicPath));
                if (isPublicPath) {
                    logger.debug(`[Auth] Skipping auth for public path: ${path}`);
                    return next();
                }
                
                // Apply auth for all other API routes
                logger.debug(`[Auth] Applying auth middleware for: ${path}`);
                return authMiddleware(req, res, next);
            }
            
            // Non-API routes pass through
            logger.debug(`[Auth] Non-API path, skipping auth: ${path}`);
            next();
        });
        
        logger.info('[Setup] Authentication middleware configured with exclusions for public paths.');
        startupLogger.logMiddlewareInitialization('authentication', 'success', { 
            type: 'security',
            publicPaths,
            bypassPaths
        });
    } catch (error) {
        logger.error('[Setup] CRITICAL: Failed to configure authentication middleware!', { error: error.message });
        startupLogger.logMiddlewareInitialization('authentication', 'error', { 
            type: 'security',
            error: error.message
        });
        
        // Add a failing middleware if auth setup fails
        app.use((req, res, next) => { 
            next(new Error('Authentication middleware setup failed, server unavailable.'));
        });
    }
    
    logger.info('[Setup] Core middleware configuration complete.');
}

export { configureCoreMiddleware };
