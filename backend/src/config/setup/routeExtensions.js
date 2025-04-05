'use strict';

import express from 'express';
import rivalRoutes from "#app/core/infra/http/routes/rivalRoutes.js";
import badgeRoutes from "#app/core/infra/http/routes/badgeRoutes.js";
import leaderboardRoutes from "#app/core/infra/http/routes/leaderboardRoutes.js";
import networkRoutes from "#app/core/infra/http/routes/networkRoutes.js";

/**
 * Update the mountAllRoutes function to include the new routes
 * This function extends the existing directRoutes.js file
 */
export function extendMountAllRoutes(app, container, config, logger, apiRouter, isRouteRegistered, prefix) {
  // Rival routes
  try {
    const rivalController = container.get('rivalController');
    const rivalRouter = rivalRoutes(rivalController);
    
    const routePath = '/rivals';
    if (!isRouteRegistered(`${prefix}${routePath}`)) {
      apiRouter.use(routePath, rivalRouter);
      logger.info(`Rival routes mounted at ${prefix}${routePath}`);
    } else {
      logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
    }
  } catch (error) {
    logger.error('Failed to mount rival routes', { error: error.message });
    apiRouter.use('/rivals', createFallbackRouter('Rival service unavailable'));
  }
  
  // Badge routes
  try {
    const badgeController = container.get('badgeController');
    const badgeRouter = badgeRoutes(badgeController);
    
    const routePath = '/badges';
    if (!isRouteRegistered(`${prefix}${routePath}`)) {
      apiRouter.use(routePath, badgeRouter);
      logger.info(`Badge routes mounted at ${prefix}${routePath}`);
    } else {
      logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
    }
  } catch (error) {
    logger.error('Failed to mount badge routes', { error: error.message });
    apiRouter.use('/badges', createFallbackRouter('Badge service unavailable'));
  }
  
  // Leaderboard routes
  try {
    const leaderboardController = container.get('leaderboardController');
    const leaderboardRouter = leaderboardRoutes(leaderboardController);
    
    const routePath = '/leaderboards';
    if (!isRouteRegistered(`${prefix}${routePath}`)) {
      apiRouter.use(routePath, leaderboardRouter);
      logger.info(`Leaderboard routes mounted at ${prefix}${routePath}`);
    } else {
      logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
    }
  } catch (error) {
    logger.error('Failed to mount leaderboard routes', { error: error.message });
    apiRouter.use('/leaderboards', createFallbackRouter('Leaderboard service unavailable'));
  }
  
  // Network routes
  try {
    const networkController = container.get('networkController');
    const networkRouter = networkRoutes(networkController);
    
    const routePath = '/networks';
    if (!isRouteRegistered(`${prefix}${routePath}`)) {
      apiRouter.use(routePath, networkRouter);
      logger.info(`Network routes mounted at ${prefix}${routePath}`);
    } else {
      logger.warn(`Skipping duplicate route: ${prefix}${routePath}`);
    }
  } catch (error) {
    logger.error('Failed to mount network routes', { error: error.message });
    apiRouter.use('/networks', createFallbackRouter('Network service unavailable'));
  }
}

/**
 * Create a fallback router for unavailable services
 * @param {string} message - Message to display
 * @returns {express.Router} Express router
 */
function createFallbackRouter(message) {
  const router = express.Router();
  
  router.all('*', (req, res) => {
    res.status(503).json({
      status: 'error',
      message: message || 'Service temporarily unavailable'
    });
  });
  
  return router;
}
