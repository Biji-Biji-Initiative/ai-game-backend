/**
 * OpenAPI Response Adapter Middleware
 * 
 * This middleware adapts API responses to match the expected OpenAPI schema.
 */

'use strict';

import { logger } from "#app/core/infra/logging/logger.js";

/**
 * Creates the OpenAPI response adapter middleware.
 * This middleware intercepts Express responses and transforms them to match
 * the expected OpenAPI schema format.
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
export function createOpenApiResponseAdapter(options = {}) {
  const log = logger.child({ component: 'OpenApiResponseAdapter' });
  
  // Define endpoint transformations
  const ENDPOINT_TRANSFORMS = {
    '/api/v1/focus-areas': {
      collection: (data) => ({ focusAreas: data }),
      single: (data) => ({ focusArea: data })
    },
    '/api/v1/personality/profile': {
      collection: null,
      single: (data) => ({ profile: data })
    },
    '/api/v1/challenges': {
      collection: (data) => ({ challenges: data }),
      single: (data) => ({ challenge: data })
    },
    '/api/v1/evaluations': {
      collection: (data) => ({ evaluations: data }),
      single: (data) => ({ evaluation: data })
    }
  };
  
  return function openApiResponseAdapter(req, res, next) {
    // Store the original json method
    const originalJson = res.json;
    
    // Helper to find matching transform
    const findTransform = (path) => {
      // Direct match first
      if (ENDPOINT_TRANSFORMS[path]) {
        return ENDPOINT_TRANSFORMS[path];
      }
      
      // Try prefix matches
      for (const [key, transform] of Object.entries(ENDPOINT_TRANSFORMS)) {
        if (path.startsWith(key)) {
          return transform;
        }
      }
      
      return null;
    };
    
    // Override the json method
    res.json = function(data) {
      try {
        // Skip transformation for non-API routes or if explicitly requested
        if (req.skipResponseAdapter || !req.path.startsWith('/api')) {
          return originalJson.call(this, data);
        }
        
        // If data already matches our expected schema format, consider transforming it
        if (data && typeof data === 'object' && 
            (data.status === 'success' || data.status === 'error') && 
            ('data' in data || 'message' in data)) {
          
          // Apply endpoint-specific transformations
          const transform = findTransform(req.path);
          if (transform && data.status === 'success') {
            // Check if data is an array (collection) or object (single item)
            if (Array.isArray(data.data) && transform.collection) {
              data = {
                status: 'success',
                data: transform.collection(data.data),
                meta: data.meta
              };
            } 
            // Check if it's a single item
            else if (data.data && typeof data.data === 'object' && !Array.isArray(data.data) && transform.single) {
              data = {
                status: 'success',
                data: transform.single(data.data),
                meta: data.meta
              };
            }
          }
          
          return originalJson.call(this, data);
        }
        
        // Transform success responses (status 2xx)
        if (this.statusCode >= 200 && this.statusCode < 300) {
          // Transform legacy { success: true, data: ... } format
          if (data && typeof data === 'object' && data.success === true) {
            let transformedData = {
              status: 'success',
              data: data.data || {}
            };
            
            // Copy meta information if it exists
            if (data.pagination) {
              transformedData.meta = data.pagination;
            } else if (data.meta) {
              transformedData.meta = data.meta;
            }
            
            // Copy message if it exists
            if (data.message) {
              transformedData.message = data.message;
            }
            
            // Apply endpoint-specific transformations
            const transform = findTransform(req.path);
            if (transform) {
              // Check if data is an array (collection) or object (single item)
              if (Array.isArray(transformedData.data) && transform.collection) {
                transformedData.data = transform.collection(transformedData.data);
              } 
              // Check if it's a single item
              else if (transformedData.data && typeof transformedData.data === 'object' && !Array.isArray(transformedData.data) && transform.single) {
                transformedData.data = transform.single(transformedData.data);
              }
            }
            
            return originalJson.call(this, transformedData);
          }
          
          // Transform direct data responses (when just the raw data is returned)
          let transformedData = {
            status: 'success',
            data: data
          };
          
          // Apply endpoint-specific transformations
          const transform = findTransform(req.path);
          if (transform) {
            // Check if data is an array (collection) or object (single item)
            if (Array.isArray(data) && transform.collection) {
              transformedData.data = transform.collection(data);
            } 
            // Check if it's a single item
            else if (data && typeof data === 'object' && !Array.isArray(data) && transform.single) {
              transformedData.data = transform.single(data);
            }
          }
          
          return originalJson.call(this, transformedData);
        }
        
        // Transform error responses (status >= 400)
        if (this.statusCode >= 400) {
          // Transform legacy { success: false, error: ... } format
          if (data && typeof data === 'object' && data.success === false) {
            return originalJson.call(this, {
              status: 'error',
              message: data.error || data.message || 'An error occurred',
              code: data.code || this.statusCode.toString()
            });
          }
          
          // Transform direct error messages
          const errorMessage = typeof data === 'string' ? data : 
                              (data && data.message) ? data.message : 
                              'An error occurred';
          
          return originalJson.call(this, {
            status: 'error',
            message: errorMessage,
            code: (data && data.code) ? data.code : this.statusCode.toString()
          });
        }
        
        // For all other status codes, use the original json method
        return originalJson.call(this, data);
      } catch (error) {
        log.error('Error in response adapter:', { 
          error: error.message, 
          path: req.path, 
          method: req.method 
        });
        
        // Fall back to original json method in case of errors
        return originalJson.call(this, data);
      }
    };
    
    // Continue to the next middleware
    next();
  };
}

export default createOpenApiResponseAdapter;
