'use strict';

import { startupLogger } from "#app/core/infra/logging/StartupLogger.js";

/**
 * Wraps a route handler to log route initialization
 * @param {string} path - Route path
 * @param {string} method - HTTP method
 * @param {Function} handler - Original route handler
 * @returns {Function} Wrapped route handler
 */
export const wrapRouteHandler = (path, method, handler) => {
  // Log route initialization
  startupLogger.logRouteInitialization(path, method, 'success');
  
  // Return wrapped handler
  return (req, res, next) => {
    return handler(req, res, next);
  };
};

/**
 * Monkey patches Express router methods to log route initialization
 * @param {express.Router} router - Express router
 * @param {string} basePath - Base path for the router
 * @returns {express.Router} Modified router
 */
export const patchRouterForLogging = (router, basePath = '') => {
  // Store original methods
  const originalGet = router.get;
  const originalPost = router.post;
  const originalPut = router.put;
  const originalDelete = router.delete;
  const originalPatch = router.patch;
  
  // Patch GET method
  router.get = function(path, ...handlers) {
    const fullPath = `${basePath}${path}`;
    startupLogger.logRouteInitialization(fullPath, 'GET', 'success');
    return originalGet.call(this, path, ...handlers);
  };
  
  // Patch POST method
  router.post = function(path, ...handlers) {
    const fullPath = `${basePath}${path}`;
    startupLogger.logRouteInitialization(fullPath, 'POST', 'success');
    return originalPost.call(this, path, ...handlers);
  };
  
  // Patch PUT method
  router.put = function(path, ...handlers) {
    const fullPath = `${basePath}${path}`;
    startupLogger.logRouteInitialization(fullPath, 'PUT', 'success');
    return originalPut.call(this, path, ...handlers);
  };
  
  // Patch DELETE method
  router.delete = function(path, ...handlers) {
    const fullPath = `${basePath}${path}`;
    startupLogger.logRouteInitialization(fullPath, 'DELETE', 'success');
    return originalDelete.call(this, path, ...handlers);
  };
  
  // Patch PATCH method
  router.patch = function(path, ...handlers) {
    const fullPath = `${basePath}${path}`;
    startupLogger.logRouteInitialization(fullPath, 'PATCH', 'success');
    return originalPatch.call(this, path, ...handlers);
  };
  
  return router;
};
