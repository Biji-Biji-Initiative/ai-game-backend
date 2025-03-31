'use strict';

import rateLimit from 'express-rate-limit';
import config from '../../../../config/config.js';
import { logger } from '../../logging/logger.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Rate Limiting middleware factory
 * Creates rate limiting middleware with different configurations
 * based on the application needs.
 */

/**
 * Create and configure rate limiter for different endpoints
 */
const createRateLimiter = (options) => {
  return rateLimit({
    // Custom handler for rate limiting
    handler: (req, res, next, options) => {
      logger.warn('Rate limit reached', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        status: 'error',
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    },
    // Use default config or override with options
    ...options
  });
};

/**
 * Global rate limiter for all API routes
 */
export const globalLimiter = createRateLimiter({
  ...config.rateLimit.global,
  // Skip rate limiting when disabled in config
  skip: (req) => !config.rateLimit.enabled || (config.rateLimit.global.skip === true)
});

/**
 * Rate limiter for authentication routes (login, signup)
 */
export const authLimiter = createRateLimiter({
  ...config.rateLimit.auth,
  // Skip rate limiting when disabled in config
  skip: (req) => !config.rateLimit.enabled
});

/**
 * Rate limiter for sensitive operations
 */
export const sensitiveLimiter = createRateLimiter({
  ...config.rateLimit.sensitive,
  // Skip rate limiting when disabled in config
  skip: (req) => !config.rateLimit.enabled
});

/**
 * Apply rate limiting middleware
 * @param {Object} app - Express app
 * @param {Object} options - Options to customize rate limiting
 */
export const applyRateLimiting = (app, options = {}) => {
  if (!config.rateLimit.enabled) {
    logger.info('API rate limiting is disabled');
    return;
  }

  // Apply global rate limiting to all API routes
  const apiPrefix = config.api.prefix;
  app.use(`${apiPrefix}/*`, globalLimiter);
  logger.info('Applied global rate limiting to all API routes', {
    windowMs: config.rateLimit.global.windowMs,
    max: config.rateLimit.global.max
  });

  // Apply auth-specific rate limiting
  app.use([
    `${apiPrefix}/auth/login`,
    `${apiPrefix}/auth/signup`,
    `${apiPrefix}/auth/reset-password`
  ], authLimiter);
  logger.info('Applied authentication rate limiting', {
    windowMs: config.rateLimit.auth.windowMs,
    max: config.rateLimit.auth.max
  });

  // Apply rate limiting for sensitive operations
  // Note: This can be expanded based on application needs
  app.use([
    `${apiPrefix}/user/profile`,
    `${apiPrefix}/user/settings`
  ], sensitiveLimiter);
  logger.info('Applied sensitive operations rate limiting', {
    windowMs: config.rateLimit.sensitive.windowMs,
    max: config.rateLimit.sensitive.max
  });
};

export default {
  globalLimiter,
  authLimiter,
  sensitiveLimiter,
  applyRateLimiting
};
