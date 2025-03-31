'use strict';
/**
 * HTTP Request Validation Middleware
 *
 * Provides middleware functions to validate request bodies,
 * query parameters, and URL parameters using Zod schemas.
 *
 * @module validation
 * @requires zod
 */
import AppError from '@/core/infra/errors/AppError.js';
import { logger } from '@/core/infra/logging/logger.js';
import { sendValidationErrorResponse } from '@/core/infra/errors/errorStandardization.js';

/**
 * Middleware to validate request body against a schema
 * @param {Object|Function} schema - Schema definition or validation function
 * @returns {Function} Express middleware
 */
export function validateBody(schema) {
  // If schema is not provided or undefined, return a pass-through middleware
  if (!schema) {
    logger.warn('validateBody called without schema - using fallback validation');
    return (req, res, next) => {
      if (!req.body || Object.keys(req.body).length === 0) {
        return sendValidationErrorResponse([{ 
          field: 'body', 
          message: 'Request body is required' 
        }], req, res);
      }
      next();
    };
  }

  // Return the validation middleware
  return (req, res, next) => {
    try {
      // If schema is a function, assume it's a validator function
      if (typeof schema === 'function') {
        const result = schema(req.body);
        if (result !== true && result !== undefined) {
          return sendValidationErrorResponse(
            Array.isArray(result) ? result : [{ field: 'body', message: result.toString() }], 
            req, 
            res
          );
        }
      } 
      // If schema is an object, it's a simple key-type validation
      else if (typeof schema === 'object') {
        const errors = [];
        
        // Check for required fields with correct types
        Object.entries(schema).forEach(([field, type]) => {
          const value = req.body[field];
          
          // Check if field exists
          if (value === undefined) {
            errors.push({ field, message: `${field} is required` });
            return;
          }
          
          // Type validation
          if (type === 'string' && typeof value !== 'string') {
            errors.push({ field, message: `${field} must be a string`, value });
          } else if (type === 'number' && typeof value !== 'number') {
            errors.push({ field, message: `${field} must be a number`, value });
          } else if (type === 'boolean' && typeof value !== 'boolean') {
            errors.push({ field, message: `${field} must be a boolean`, value });
          } else if (type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
            errors.push({ field, message: `${field} must be an object`, value });
          } else if (type === 'array' && !Array.isArray(value)) {
            errors.push({ field, message: `${field} must be an array`, value });
          }
          // Add more type validations as needed
        });
        
        if (errors.length > 0) {
          return sendValidationErrorResponse(errors, req, res);
        }
      }
      
      next();
    } catch (error) {
      logger.error('Validation error', { error: error.message, stack: error.stack });
      next(new AppError('Validation failed', 400, { 
        cause: error, 
        isOperational: true 
      }));
    }
  };
}

/**
 * Middleware to validate request query parameters
 * @param {Object|Function} schema - Schema definition or validation function
 * @returns {Function} Express middleware
 */
export function validateQuery(schema) {
  // Implementation follows similar pattern to validateBody
  // but operates on req.query instead of req.body
  return (req, res, next) => {
    try {
      // If schema is a function, assume it's a validator function
      if (typeof schema === 'function') {
        const result = schema(req.query);
        if (result !== true && result !== undefined) {
          return sendValidationErrorResponse(
            Array.isArray(result) ? result : [{ field: 'query', message: result.toString() }], 
            req, 
            res
          );
        }
      } 
      // If schema is an object, it's a simple key-type validation
      else if (typeof schema === 'object') {
        const errors = [];
        
        // Check for required fields with correct types
        Object.entries(schema).forEach(([field, type]) => {
          const value = req.query[field];
          
          // Check if field exists (only if required)
          if (value === undefined && type.endsWith('!')) {
            errors.push({ field, message: `${field} query parameter is required` });
            return;
          }
          
          // Skip validation if value is undefined and field is not required
          if (value === undefined) {
            return;
          }
          
          // Remove ! from type if it exists
          const cleanType = type.endsWith('!') ? type.slice(0, -1) : type;
          
          // Type validation
          if (cleanType === 'string' && typeof value !== 'string') {
            errors.push({ field, message: `${field} must be a string`, value });
          } else if (cleanType === 'number' && isNaN(Number(value))) {
            errors.push({ field, message: `${field} must be a number`, value });
          } else if (cleanType === 'boolean' && !['true', 'false', '0', '1'].includes(String(value).toLowerCase())) {
            errors.push({ field, message: `${field} must be a boolean`, value });
          }
          // Add more type validations as needed
        });
        
        if (errors.length > 0) {
          return sendValidationErrorResponse(errors, req, res);
        }
      }
      
      next();
    } catch (error) {
      logger.error('Query validation error', { error: error.message, stack: error.stack });
      next(new AppError('Query validation failed', 400, { 
        cause: error, 
        isOperational: true 
      }));
    }
  };
}

/**
 * Creates a middleware function that validates request URL parameters
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateParams = schema => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.params);
            // Replace request params with validated data
            req.params = validatedData;
            next();
        }
        catch (error) {
            logger.debug('Params validation failed', { 
                path: req.path, 
                method: req.method,
                params: req.params,
                errors: error.errors
            });
            
            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = error.errors
                    .map(err => `URL parameter ${err.path.join('.')}: ${err.message}`)
                    .join('; ');
                return next(new AppError(formattedErrors, 400));
            }
            next(new AppError('Invalid URL parameters', 400));
        }
    };
};

export default {
    validateBody,
    validateQuery,
    validateParams
};
