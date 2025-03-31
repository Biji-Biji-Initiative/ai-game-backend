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
import AppError, { AppError as NamedAppError } from "../../../infra/errors/AppError.js";
import { logger } from "../../../infra/logging/logger.js";

// Use either the named import or default import based on what's available
const ErrorClass = NamedAppError || AppError;
/**
 * Creates a middleware function that validates request body
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateBody = schema => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.body);
            // Replace request body with validated data
            req.body = validatedData;
            next();
        }
        catch (error) {
            logger.debug('Body validation failed', { 
                path: req.path, 
                method: req.method,
                body: req.body,
                errors: error.errors
            });
            
            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = error.errors
                    .map(err => `${err.path.join('.')}: ${err.message}`)
                    .join('; ');
                return next(new ErrorClass(formattedErrors, 400));
            }
            next(new ErrorClass('Validation error', 400));
        }
    };
};
/**
 * Creates a middleware function that validates request query parameters
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateQuery = schema => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.query);
            // Replace request query with validated data
            req.query = validatedData;
            next();
        }
        catch (error) {
            logger.debug('Query validation failed', { 
                path: req.path, 
                method: req.method,
                query: req.query,
                errors: error.errors
            });
            
            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = error.errors
                    .map(err => `Query parameter ${err.path.join('.')}: ${err.message}`)
                    .join('; ');
                return next(new ErrorClass(formattedErrors, 400));
            }
            next(new ErrorClass('Invalid query parameters', 400));
        }
    };
};
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
                return next(new ErrorClass(formattedErrors, 400));
            }
            next(new ErrorClass('Invalid URL parameters', 400));
        }
    };
};
export { validateBody };
export { validateQuery };
export { validateParams };
export default {
    validateBody,
    validateQuery,
    validateParams
};
