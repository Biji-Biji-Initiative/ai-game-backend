'use strict';

import express from 'express';
import userRoutes from "#app/core/infra/http/routes/userRoutes.js";
import personalityRoutes from "#app/core/infra/http/routes/personalityRoutes.js";
import progressRoutes from "#app/core/infra/http/routes/progressRoutes.js";
import adaptiveRoutes from "#app/core/infra/http/routes/adaptiveRoutes.js";
import focusAreaRoutes from "#app/core/infra/http/routes/focusAreaRoutes.js";
import challengeRoutes from "#app/core/infra/http/routes/challengeRoutes.js";
import evaluationRoutes from "#app/core/infra/http/routes/evaluationRoutes.js";
import userJourneyRoutes from "#app/core/infra/http/routes/userJourneyRoutes.js";
import systemRoutes from "#app/core/infra/http/routes/systemRoutes.js";
import healthRoutes from "#app/core/infra/http/routes/healthRoutes.js";
import eventBusRoutes from "#app/core/infra/http/routes/eventBusRoutes.js";
import createAuthRoutes from "#app/core/infra/http/routes/authRoutes.js";
import setupAdminRoutes from "#app/core/infra/http/routes/adminRoutes.js";
import { logger as appLogger } from "#app/core/infra/logging/logger.js";
import { startupLogger } from "#app/core/infra/logging/StartupLogger.js";

// Track registered routes to prevent duplicates
const registeredRoutes = new Set();

/**
 * Check if a route path is already registered
 * @param {string} path - The route path to check
 * @returns {boolean} - True if already registered, false otherwise
 */
function isRouteRegistered(path) {
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  if (registeredRoutes.has(normalizedPath)) {
    startupLogger.logRouteInitialization(normalizedPath, 'warning', { 
      message: 'Duplicate route detected, skipping',
      status: 'skipped'
    });
    return true;
  }
  registeredRoutes.add(normalizedPath);
  return false;
}

/**
 * Mount all application routes
 * This function directly mounts route handlers on the Express app
 * without requiring them to be registered in the container
 * 
 * @param {Object} app - Express application
 * @param {Object} container - DI container
 * @param {Object} config - Application configuration
 */
export async function mountAllRoutes(app, container, config) {
  const logger = appLogger.child({ component: 'RouterSetup' });
  const prefix = config.api.prefix || '/api/v1';
  
  logger.info(`Mounting all routes at prefix: ${prefix}`);
  console.log(`🔌 Mounting all routes at prefix: ${prefix}`);
  
  try {
    // First, ensure public endpoints don't require authentication
    // This must come BEFORE authentication middleware
    logger.info('[Setup] Mounting public API docs routes...');
    
    // Health routes (no auth required) - ONLY mount at /api/health and /api/v1/health
    // Remove the duplicate /health route
    const healthCheckController = container.get('healthCheckController');
    
    // Check for duplicate routes
    if (!isRouteRegistered('/api/health')) {
      app.get('/api/health', healthCheckController.checkHealth.bind(healthCheckController));
      logger.debug('[Setup] Mounted health route at /api/health');
      startupLogger.logRouteInitialization('/api/health', 'success', { 
        method: 'GET',
        controller: 'healthCheckController',
        action: 'checkHealth'
      });
      console.log(`  ✓ Mounted health route at /api/health`);
    } else {
      logger.warn('[Setup] Skipping duplicate route: /api/health');
    }
    
    if (!isRouteRegistered('/api/v1/health')) {
      app.get('/api/v1/health', healthCheckController.checkHealth.bind(healthCheckController));
      logger.debug('[Setup] Mounted health route at /api/v1/health');
      startupLogger.logRouteInitialization('/api/v1/health', 'success', { 
        method: 'GET',
        controller: 'healthCheckController',
        action: 'checkHealth'
      });
      console.log(`  ✓ Mounted health route at /api/v1/health`);
    } else {
      logger.warn('[Setup] Skipping duplicate route: /api/v1/health');
    }
    
    // Direct access to error test endpoint for Sentry testing (no auth required)
    if (!isRouteRegistered('/api/v1/error-test')) {
      app.get('/api/v1/error-test', (req, res, next) => {
        try {
          // Simulate an error for Sentry testing
          const errorType = req.query.type || 'default';
          throw new Error(`Direct test error for Sentry: ${errorType}`);
        } catch (error) {
          next(error);
        }
      });
      logger.debug('[Setup] Mounted error test route at /api/v1/error-test');
      startupLogger.logRouteInitialization('/api/v1/error-test', 'success', { 
        method: 'GET',
        controller: 'errorTest',
        action: 'simulateError'
      });
      console.log(`  ✓ Mounted error test route at /api/v1/error-test`);
    } else {
      logger.warn('[Setup] Skipping duplicate route: /api/v1/error-test');
    }
    
    // Set up authentication middleware from container
    const authMiddleware = container.get('authMiddleware');
    
    // Create a master API router
    const apiRouter = express.Router();
    
    // Create and mount individual route handlers
    
    // Health routes - REMOVED to prevent duplicate /health route
    // The health routes are now only mounted at /api/health and /api/v1/health
    
    // Auth routes
    try {
      const authController = container.get('authController');
      const validation = { validateBody: container.get('validation').validateBody };
      const authRouter = createAuthRoutes({ 
        authController,
        validation
      });
      
      const routePath = '/auth';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, authRouter);
        logger.info(`Auth routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'authController',
          type: 'router'
        });
        console.log(`  ✓ Mounted auth routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount auth routes', { error: error.message });
      apiRouter.use('/auth', createFallbackRouter('Auth service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/auth`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount auth routes: ${error.message}`);
    }
    
    // Admin routes
    try {
      // For now, use a fallback router instead of attempting to mount the admin routes
      // This ensures the server can start even if there's an issue with the admin routes
      const routePath = '/admin';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        logger.info('Using fallback for admin routes (temporarily disabled)');
        apiRouter.use(routePath, createFallbackRouter('Admin routes temporarily disabled'));
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'warning', { 
          message: 'Using fallback router',
          status: 'disabled'
        });
        console.log(`  ⚠️ Admin routes temporarily disabled at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount admin fallback routes', { error: error.message });
      startupLogger.logRouteInitialization(`${prefix}/admin`, 'error', { 
        error: error.message
      });
      console.log(`  ❌ Failed to mount admin fallback routes: ${error.message}`);
    }
    
    // User routes
    try {
      const userController = container.get('userController');
      const authController = container.get('authController');
      const userRouter = userRoutes(userController, authController);
      
      const routePath = '/users';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, userRouter);
        logger.info(`User routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'userController',
          type: 'router'
        });
        console.log(`  ✓ Mounted user routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount user routes', { error: error.message });
      apiRouter.use('/users', createFallbackRouter('User service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/users`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount user routes: ${error.message}`);
    }
    
    // Personality routes
    try {
      const personalityController = container.get('personalityController');
      const personalityRouter = personalityRoutes(personalityController);
      
      const routePath = '/personality';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, personalityRouter);
        logger.info(`Personality routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'personalityController',
          type: 'router'
        });
        console.log(`  ✓ Mounted personality routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount personality routes', { error: error.message });
      apiRouter.use('/personality', createFallbackRouter('Personality service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/personality`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount personality routes: ${error.message}`);
    }
    
    // Progress routes
    try {
      const progressController = container.get('progressController');
      const progressRouter = progressRoutes(progressController);
      
      const routePath = '/progress';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, progressRouter);
        logger.info(`Progress routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'progressController',
          type: 'router'
        });
        console.log(`  ✓ Mounted progress routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount progress routes', { error: error.message });
      apiRouter.use('/progress', createFallbackRouter('Progress service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/progress`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount progress routes: ${error.message}`);
    }
    
    // Adaptive routes
    try {
      const adaptiveController = container.get('adaptiveController');
      const adaptiveRouter = adaptiveRoutes(adaptiveController);
      
      const routePath = '/adaptive';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, adaptiveRouter);
        logger.info(`Adaptive routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'adaptiveController',
          type: 'router'
        });
        console.log(`  ✓ Mounted adaptive routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount adaptive routes', { error: error.message });
      apiRouter.use('/adaptive', createFallbackRouter('Adaptive service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/adaptive`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount adaptive routes: ${error.message}`);
    }
    
    // Focus area routes
    try {
      const focusAreaController = container.get('focusAreaController');
      const focusAreaRouter = focusAreaRoutes(focusAreaController);
      
      const routePath = '/focus-areas';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, focusAreaRouter);
        logger.info(`Focus area routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'focusAreaController',
          type: 'router'
        });
        console.log(`  ✓ Mounted focus area routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount focus area routes', { error: error.message });
      apiRouter.use('/focus-areas', createFallbackRouter('Focus area service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/focus-areas`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount focus area routes: ${error.message}`);
    }
    
    // Challenge routes
    try {
      const challengeController = container.get('challengeController');
      const challengeRouter = challengeRoutes(challengeController);
      
      const routePath = '/challenges';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, challengeRouter);
        logger.info(`Challenge routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'challengeController',
          type: 'router'
        });
        console.log(`  ✓ Mounted challenge routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount challenge routes', { error: error.message });
      apiRouter.use('/challenges', createFallbackRouter('Challenge service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/challenges`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount challenge routes: ${error.message}`);
    }
    
    // Evaluation routes
    try {
      const evaluationController = container.get('evaluationController');
      const evaluationRouter = evaluationRoutes(evaluationController);
      
      const routePath = '/evaluations';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, evaluationRouter);
        logger.info(`Evaluation routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'evaluationController',
          type: 'router'
        });
        console.log(`  ✓ Mounted evaluation routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount evaluation routes', { error: error.message });
      apiRouter.use('/evaluations', createFallbackRouter('Evaluation service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/evaluations`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount evaluation routes: ${error.message}`);
    }
    
    // User journey routes
    try {
      const userJourneyController = container.get('userJourneyController');
      const userJourneyRouter = userJourneyRoutes(userJourneyController);
      
      const routePath = '/user-journey';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, userJourneyRouter);
        logger.info(`User journey routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'userJourneyController',
          type: 'router'
        });
        console.log(`  ✓ Mounted user journey routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount user journey routes', { error: error.message });
      apiRouter.use('/user-journey', createFallbackRouter('User journey service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/user-journey`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount user journey routes: ${error.message}`);
    }
    
    // System routes
    try {
      const systemController = container.get('systemController');
      
      // Create container wrapper for system routes
      const containerWrapper = {
        get: (name) => {
          if (name === 'systemController') {
            return systemController;
          }
          return container.get(name);
        }
      };
      
      // Make sure to call the systemRoutes function to get the router
      const systemRouter = systemRoutes(containerWrapper);
      
      if (!systemRouter || typeof systemRouter.use !== 'function') {
        throw new Error('System router is not a valid Express router');
      }
      
      // Add a middleware to explicitly skip authentication for the error-test endpoint
      const errorTestPath = '/system/error-test';
      if (!isRouteRegistered(`${prefix}${errorTestPath}`)) {
        apiRouter.use(errorTestPath, (req, res, next) => {
          logger.debug('Bypassing auth for system error test endpoint');
          next();
        });
        logger.debug(`Mounted middleware for ${prefix}${errorTestPath}`);
        startupLogger.logMiddlewareInitialization(`${prefix}${errorTestPath}`, 'success', { 
          type: 'auth-bypass',
          purpose: 'error-testing'
        });
        console.log(`  ✓ Mounted auth bypass middleware for ${prefix}${errorTestPath}`);
      }
      
      const routePath = '/system';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, systemRouter);
        logger.info(`System routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          controller: 'systemController',
          type: 'router'
        });
        console.log(`  ✓ Mounted system routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount system routes', { error: error.message });
      apiRouter.use('/system', createFallbackRouter('System service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/system`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount system routes: ${error.message}`);
    }
    
    // Event bus routes
    try {
      let dlqService;
      try {
        dlqService = container.get('deadLetterQueueService');
      } catch (e) {
        logger.warn('Dead letter queue service not available for event bus routes');
      }
      
      let eventBusInstance;
      try {
        eventBusInstance = container.get('eventBus');
      } catch (e) {
        logger.warn('Event bus instance not available for event bus routes');
      }
      
      const eventBusRouter = eventBusRoutes({
        deadLetterQueueService: dlqService,
        eventBus: eventBusInstance
      });
      
      const routePath = '/events';
      if (!isRouteRegistered(`${prefix}${routePath}`)) {
        apiRouter.use(routePath, eventBusRouter);
        logger.info(`Event bus routes mounted at ${prefix}${routePath}`);
        startupLogger.logRouteInitialization(`${prefix}${routePath}`, 'success', { 
          service: 'eventBus',
          type: 'router'
        });
        console.log(`  ✓ Mounted event bus routes at ${prefix}${routePath}`);
      } else {
        logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
      }
    } catch (error) {
      logger.error('Failed to mount event bus routes', { error: error.message });
      apiRouter.use('/events', createFallbackRouter('Event bus service unavailable'));
      startupLogger.logRouteInitialization(`${prefix}/events`, 'error', { 
        error: error.message,
        fallback: true
      });
      console.log(`  ❌ Failed to mount event bus routes: ${error.message}`);
    }
    
    // Mount the master API router at both /api/v1 and /api paths
    // This ensures both versioned and unversioned routes work
    if (!isRouteRegistered('/api/v1')) {
      app.use('/api/v1', apiRouter);
      logger.info('API routes mounted at /api/v1');
      startupLogger.logRouteInitialization('/api/v1', 'success', { 
        type: 'master-router',
        version: 'v1'
      });
      console.log(`  ✓ API routes mounted at /api/v1`);
    } else {
      logger.warn('Skipping duplicate route mounting at /api/v1');
    }
    
    // Deprecation middleware for unversioned routes
    const deprecationMiddleware = (req, res, next) => {
      // Add deprecation warning header
      res.set('X-API-Deprecated', 'The /api path is deprecated. Please use /api/v1 instead.');
      
      // Log deprecation warning
      logger.warn('Unversioned API path used', { 
        path: req.path, 
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        message: 'Using deprecated /api path instead of /api/v1'
      });
      
      // Allow the request to continue
      next();
    };
    
    // Mount unversioned routes with deprecation middleware
    if (!isRouteRegistered('/api')) {
      app.use('/api', deprecationMiddleware, apiRouter);
      logger.info('API routes mounted at /api with deprecation warnings');
      startupLogger.logRouteInitialization('/api', 'warning', { 
        type: 'master-router',
        version: 'unversioned',
        deprecated: true
      });
      console.log(`  ⚠️ API routes mounted at /api (deprecated) with warnings`);
    } else {
      logger.warn('Skipping duplicate route mounting at /api');
    }
    
    return true;
  } catch (error) {
    logger.error('Error mounting routes', { error: error.message, stack: error.stack });
    startupLogger.logComponentInitialization('routes', 'error', { 
      error: error.message,
      stack: error.stack
    });
    console.log(`  ❌ Error mounting routes: ${error.message}`);
    return false;
  }
}

/**
 * Create a fallback router that returns an error message
 * @param {string} message - Error message to display
 * @returns {express.Router} Express router with fallback handler
 */
function createFallbackRouter(message) {
  const router = express.Router();
  router.all('*', (req, res) => {
    res.status(503).json({
      error: 'Route unavailable',
      message
    });
  });
  return router;
}
