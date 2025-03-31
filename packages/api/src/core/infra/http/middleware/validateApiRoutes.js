/**
 * API Route Validation
 *
 * Middleware that automatically validates API routes based on predefined schemas.
 * This facilitates consistent validation across all API endpoints and reduces boilerplate.
 */

import { validateRequest } from './validation.js';
import { logger } from '@/logging/logger.js';

// Store for route validation schemas
const routeSchemas = new Map();

/**
 * Register validation schemas for an API route
 *
 * @param {string} routePath - The route path (e.g., '/users/:id')
 * @param {string} method - The HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {Object} schemas - Validation schemas for different parts of the request
 * @param {Object} [schemas.body] - Schema for request body
 * @param {Object} [schemas.query] - Schema for query parameters
 * @param {Object} [schemas.params] - Schema for URL parameters
 * @param {Object} [schemas.headers] - Schema for request headers
 * @param {Object} [schemas.cookies] - Schema for request cookies
 * @param {Object} [options] - Validation options
 * @param {boolean} [options.stripUnknown=false] - Whether to remove unknown fields
 */
export function registerRouteValidation(routePath, method, schemas, options = {}) {
  // Normalize method to uppercase
  const normalizedMethod = method.toUpperCase();

  // Create a route key
  const routeKey = `${normalizedMethod}:${routePath}`;

  // Store the schemas and options
  routeSchemas.set(routeKey, { schemas, options });

  logger.debug(`Registered validation schemas for ${normalizedMethod} ${routePath}`);
}

/**
 * Register validation schemas for multiple routes
 *
 * @param {Object<string, Object>} routesConfig - Configuration object with route paths as keys
 * @param {string} basePath - Base path to prepend to route paths
 */
export function registerRoutesValidation(routesConfig, basePath = '') {
  if (!routesConfig || typeof routesConfig !== 'object') {
    throw new Error('Routes configuration must be an object');
  }

  for (const [routePath, config] of Object.entries(routesConfig)) {
    const fullPath = basePath + routePath;

    for (const [method, methodConfig] of Object.entries(config)) {
      const { schemas, options } = methodConfig;

      if (schemas) {
        registerRouteValidation(fullPath, method, schemas, options);
      }
    }
  }

  logger.info(`Registered validation schemas for ${Object.keys(routesConfig).length} routes`);
}

/**
 * Create middleware that applies validation to routes based on registered schemas
 *
 * @returns {Function} Express middleware function
 */
export function createValidationMiddleware() {
  return (req, res, next) => {
    // Extract route information
    const { method, path } = req;

    // Try to find an exact match for the route
    const routeKey = `${method}:${path}`;
    let schemaConfig = routeSchemas.get(routeKey);

    // If no exact match, try to find a parametric route match
    if (!schemaConfig) {
      // Find a matching parametric route (e.g., '/users/:id' for '/users/123')
      for (const [key, config] of routeSchemas.entries()) {
        const [routeMethod, routePath] = key.split(':', 2);

        // Skip if method doesn't match
        if (routeMethod !== method) {
          continue;
        }

        // Convert route path to regex pattern
        const pattern = routePath
          .replace(/:[^/]+/g, '[^/]+') // Replace :param with regex
          .replace(/\//g, '\\/'); // Escape slashes

        const regex = new RegExp(`^${pattern}$`);

        if (regex.test(path)) {
          schemaConfig = config;
          break;
        }
      }
    }

    // If we found a matching schema, apply validation
    if (schemaConfig) {
      const { schemas, options } = schemaConfig;

      // Apply validation middleware
      validateRequest(schemas, options)(req, res, next);
    } else {
      // No schema found, skip validation
      next();
    }
  };
}

/**
 * Get all registered validation schemas
 *
 * @returns {Map} Map of registered validation schemas
 */
export function getRegisteredSchemas() {
  return new Map(routeSchemas);
}

/**
 * Clear all registered validation schemas
 */
export function clearRegisteredSchemas() {
  routeSchemas.clear();
  logger.debug('Cleared all registered validation schemas');
}

export default {
  registerRouteValidation,
  registerRoutesValidation,
  createValidationMiddleware,
  getRegisteredSchemas,
  clearRegisteredSchemas
};
