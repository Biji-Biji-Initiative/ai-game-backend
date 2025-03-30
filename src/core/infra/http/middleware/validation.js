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
// const AppError = require('../../core/infra/errors/AppError');
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
            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = error.errors
                    .map(err => `${err.path.join('.')}: ${err.message}`)
                    .join('; ');
                return next(new AppError(formattedErrors, 400));
            }
            next(new AppError('Validation error', 400));
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
            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = error.errors
                    .map(err => `Query parameter ${err.path.join('.')}: ${err.message}`)
                    .join('; ');
                return next(new AppError(formattedErrors, 400));
            }
            next(new AppError('Invalid query parameters', 400));
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
export { validateBody };
export { validateQuery };
export { validateParams };
export default {
    validateBody,
    validateQuery,
    validateParams
};
