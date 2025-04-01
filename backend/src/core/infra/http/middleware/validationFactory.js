import { 
  validateBody,
  validateQuery,
  validateParams 
} from "#app/core/infra/http/middleware/validation.js";

/**
 * Validation Factory
 * 
 * Simplifies the application of validation middleware to routes
 * by providing a function that creates the appropriate middleware stack
 * based on the provided schemas.
 */

/**
 * Creates a set of validation middleware functions for a route
 * 
 * @param {Object} schemas - Schema definitions for the route
 * @param {import('zod').ZodSchema} [schemas.body] - Schema for validating request body
 * @param {import('zod').ZodSchema} [schemas.query] - Schema for validating query parameters
 * @param {import('zod').ZodSchema} [schemas.params] - Schema for validating URL parameters
 * @returns {Array<Function>} Array of middleware functions for validation
 * 
 * @example
 * // Apply validation to a route
 * router.post('/users',
 *   createValidationMiddleware({
 *     body: userSchemas.createUserSchema,
 *     query: userSchemas.paginationSchema
 *   }),
 *   userController.createUser
 * );
 */
export const createValidationMiddleware = (schemas = {}) => {
  const middleware = [];
  
  if (schemas.body) {
    middleware.push(validateBody(schemas.body));
  }
  
  if (schemas.query) {
    middleware.push(validateQuery(schemas.query));
  }
  
  if (schemas.params) {
    middleware.push(validateParams(schemas.params));
  }
  
  return middleware;
}; 