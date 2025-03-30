'use strict';

/**
 * Creates middleware to handle API redirects
 * This middleware redirects root API requests to appropriate versioned endpoints 
 * and documentation pages
 * 
 * @param {Object} config - Application configuration object with api settings
 * @returns {Function} Express middleware function for API redirects
 */
export function createApiRedirectMiddleware(config) {
  return (req, res, next) => {
    // Redirect to versioned API
    if (req.path === '/' || req.path === '') {
      return res.redirect(`${config.api.prefix}/health`);
    }
    
    // For docs, redirect to the docs path
    if (req.path === '/docs') {
      return res.redirect(config.api.docsPath);
    }
    
    // Otherwise pass through to the next handler (which will likely be 404)
    next();
  };
}

export default { createApiRedirectMiddleware }; 