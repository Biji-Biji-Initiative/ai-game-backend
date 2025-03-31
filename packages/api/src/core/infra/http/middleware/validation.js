'use strict';
/**
 * HTTP Request Validation Middleware
 *
 * Provides middleware functions to validate request bodies,
 * query parameters, URL parameters, headers, and cookies using Zod schemas.
 *
 * @module validation
 * @requires zod
 */
'../../../errors/AppError.js243;
''../../../logging/logger.js298;
/**
 * Format Zod validation errors into a user-friendly message
 *
 * @param {import(''zod').ZodError} error - Zod validation error
 * @param {string} prefix - Prefix for error messages
 * @returns {string} Formatted error message
 * @private
 */
const formatZodErrors = (error, prefix = '') => {
    if (!error.errors || !Array.isArray(error.errors)) {
        return 'Validation error';
    }

    return error.errors
        .map(err => {
            const path = err.path.join('.');
            return `${prefix}${path}: ${err.message}`;
        })
        .join('; ');
};
/**
 * Creates a middleware function that validates request body
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {Object} options - Validation options
 * @param {boolean} [options.stripUnknown=false] - Whether to remove unknown fields
 * @returns {Function} Express middleware function
 */
const validateBody = (schema, options = {}) => {
    return (req, res, next) => {
        try {
            const parseOptions = {};

            // Apply strip unknown option if specified
            if (options.stripUnknown) {
                parseOptions.stripUnknown = true;
            }

            const validatedData = schema.parse(req.body);

            // Replace request body with validated data
            req.body = validatedData;
            next();
        }
        catch (error) {
            // Log the validation error
            logger.debug('Request body validation failed', {
                body: req.body,
                error: error.errors
            });

            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = formatZodErrors(error);
                return next(new AppError(formattedErrors, 400, {
                    errorCode: 'VALIDATION_ERROR',
                    metadata: {
                        validationErrors: error.errors
                    }
                }));
            }

            next(new AppError('Request body validation error', 400, {
                errorCode: 'VALIDATION_ERROR'
            }));
        }
    };
};
/**
 * Creates a middleware function that validates request query parameters
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {Object} options - Validation options
 * @param {boolean} [options.stripUnknown=false] - Whether to remove unknown fields
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema, options = {}) => {
    return (req, res, next) => {
        try {
            const parseOptions = {};

            // Apply strip unknown option if specified
            if (options.stripUnknown) {
                parseOptions.stripUnknown = true;
            }

            const validatedData = schema.parse(req.query);

            // Replace request query with validated data
            req.query = validatedData;
            next();
        }
        catch (error) {
            // Log the validation error
            logger.debug('Request query validation failed', {
                query: req.query,
                error: error.errors
            });

            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = formatZodErrors(error, 'Query parameter ');
                return next(new AppError(formattedErrors, 400, {
                    errorCode: 'VALIDATION_ERROR',
                    metadata: {
                        validationErrors: error.errors
                    }
                }));
            }

            next(new AppError('Invalid query parameters', 400, {
                errorCode: 'VALIDATION_ERROR'
            }));
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
const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.params);

            // Replace request params with validated data
            req.params = validatedData;
            next();
        }
        catch (error) {
            // Log the validation error
            logger.debug('Request params validation failed', {
                params: req.params,
                error: error.errors
            });

            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = formatZodErrors(error, 'URL parameter ');
                return next(new AppError(formattedErrors, 400, {
                    errorCode: 'VALIDATION_ERROR',
                    metadata: {
                        validationErrors: error.errors
                    }
                }));
            }

            next(new AppError('Invalid URL parameters', 400, {
                errorCode: 'VALIDATION_ERROR'
            }));
        }
    };
};
/**
 * Creates a middleware function that validates request headers
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateHeaders = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.headers);

            // Note: We don't replace req.headers as it's an IncomingHttpHeaders object
            // Instead, we can attach the validated headers to the request
            req.validatedHeaders = validatedData;
            next();
        }
        catch (error) {
            // Log the validation error
            logger.debug('Request headers validation failed', {
                // Don't log authorization headers
                headers: { ...req.headers, authorization: '[REDACTED]' },
                error: error.errors
            });

            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = formatZodErrors(error, 'Header ');
                return next(new AppError(formattedErrors, 400, {
                    errorCode: 'VALIDATION_ERROR',
                    metadata: {
                        validationErrors: error.errors
                    }
                }));
            }

            next(new AppError('Invalid request headers', 400, {
                errorCode: 'VALIDATION_ERROR'
            }));
        }
    };
};
/**
 * Creates a middleware function that validates request cookies
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateCookies = (schema) => {
    return (req, res, next) => {
        try {
            // Express doesn't parse cookies by default,
            // so we need cookie-parser middleware to be applied before this
            if (!req.cookies) {
                return next(new AppError('Cookies are required but cookie parser middleware is not enabled', 500, {
                    errorCode: 'SERVER_CONFIGURATION_ERROR'
                }));
            }

            const validatedData = schema.parse(req.cookies);

            // Replace request cookies with validated data
            req.cookies = validatedData;
            next();
        }
        catch (error) {
            // Log the validation error
            logger.debug('Request cookies validation failed', {
                cookies: req.cookies,
                error: error.errors
            });

            // Format Zod validation errors
            if (error.errors) {
                const formattedErrors = formatZodErrors(error, 'Cookie ');
                return next(new AppError(formattedErrors, 400, {
                    errorCode: 'VALIDATION_ERROR',
                    metadata: {
                        validationErrors: error.errors
                    }
                }));
            }

            next(new AppError('Invalid cookies', 400, {
                errorCode: 'VALIDATION_ERROR'
            }));
        }
    };
};
/**
 * Creates a middleware function that validates request against multiple schemas
 *
 * @param {Object} schemas - Object with schemas for different request parts
 * @param {import('zod').ZodSchema} [schemas.body] - Schema for request body
 * @param {import('zod').ZodSchema} [schemas.query] - Schema for query parameters
 * @param {import('zod').ZodSchema} [schemas.params] - Schema for URL parameters
 * @param {import('zod').ZodSchema} [schemas.headers] - Schema for request headers
 * @param {import('zod').ZodSchema} [schemas.cookies] - Schema for request cookies
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateRequest = (schemas, options = {}) => {
    return (req, res, next) => {
        // Create a chain of validation middleware
        const middlewares = [];

        if (schemas.body) {
            middlewares.push(validateBody(schemas.body, options));
        }

        if (schemas.query) {
            middlewares.push(validateQuery(schemas.query, options));
        }

        if (schemas.params) {
            middlewares.push(validateParams(schemas.params));
        }

        if (schemas.headers) {
            middlewares.push(validateHeaders(schemas.headers));
        }

        if (schemas.cookies) {
            middlewares.push(validateCookies(schemas.cookies));
        }

        // Execute middleware chain
        const executeMiddleware = (index) => {
            if (index >= middlewares.length) {
                return next();
            }

            middlewares[index](req, res, (err) => {
                if (err) {
                    return next(err);
                }
                executeMiddleware(index + 1);
            });
        };

        executeMiddleware(0);
    };
};
export {
    validateBody,
    validateQuery,
    validateParams,
    validateHeaders,
    validateCookies,
    validateRequest
};
export default {
    validateBody,
    validateQuery,
    validateParams,
    validateHeaders,
    validateCookies,
    validateRequest
};
