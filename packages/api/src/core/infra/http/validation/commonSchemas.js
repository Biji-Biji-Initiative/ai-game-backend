/**
 * Common validation schemas
 * 
 * This module provides reusable Zod schemas for common validation patterns
 * used across API endpoints.
 */

import { z } from 'zod';

/**
 * UUID Schema
 * Validates that a string is a valid UUID v4 format
 */
const uuidSchema = z.string().uuid({
  message: 'Must be a valid UUID v4'
});

/**
 * ID Schema
 * Validates an ID field (either UUID or numeric ID)
 */
const idSchema = z.union([
  z.string().uuid({ message: 'ID must be a valid UUID' }),
  z.coerce.number().int().positive({ message: 'ID must be a positive integer' })
], {
  errorMap: () => ({ message: 'ID must be a valid UUID or positive integer' })
});

/**
 * Email Schema
 * Validates that a string is a valid email format
 */
const emailSchema = z.string().email({
  message: 'Invalid email address format'
});

/**
 * Password Schema
 * Validates that a string meets password requirements
 */
const passwordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' });

/**
 * Pagination Schema
 * Validates common pagination parameters
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
}).strict();

/**
 * Date String Schema
 * Validates that a string is a valid ISO date format
 */
const dateStringSchema = z.string().datetime({
  message: 'Must be a valid ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)'
});

/**
 * Date Range Schema
 * Validates date range parameters
 */
const dateRangeSchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema
}).refine(
  data => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: 'Start date must be before or equal to end date',
    path: ['startDate']
  }
);

/**
 * Sort Direction Schema
 * Validates a sort direction parameter
 */
const sortDirectionSchema = z.enum(['asc', 'desc'], {
  errorMap: () => ({ message: 'Sort direction must be either "asc" or "desc"' })
});

/**
 * API Key Schema
 * Validates an API key format
 */
const apiKeySchema = z.string()
  .min(32, { message: 'API key must be at least 32 characters' })
  .max(128, { message: 'API key cannot exceed 128 characters' });

/**
 * Authorization Header Schema
 * Validates the Authorization header format
 */
const authHeaderSchema = z.object({
  authorization: z.string()
    .regex(/^Bearer\s.+$/, { message: 'Authorization header must use Bearer scheme' })
});

/**
 * Search Query Schema
 * Validates a search query parameter
 */
const searchQuerySchema = z.object({
  q: z.string()
    .min(1, { message: 'Search query cannot be empty' })
    .max(100, { message: 'Search query too long (max 100 characters)' })
}).strict();

/**
 * Sanitize a string for safety
 * 
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (input) => {
  // Basic XSS prevention
  return input.replace(/[<>]/g, '');
};

/**
 * Create a sanitized string schema
 * 
 * @param {Object} options - Schema options
 * @param {number} [options.min] - Minimum length
 * @param {number} [options.max] - Maximum length
 * @returns {z.ZodSchema} Zod schema for sanitized strings
 */
const createSanitizedStringSchema = (options = {}) => {
  const { min, max } = options;
  
  let schema = z.string();
  
  if (min !== undefined) {
    schema = schema.min(min);
  }
  
  if (max !== undefined) {
    schema = schema.max(max);
  }
  
  return schema.transform(sanitizeString);
};

export {
  uuidSchema,
  idSchema,
  emailSchema,
  passwordSchema,
  paginationSchema,
  dateStringSchema,
  dateRangeSchema,
  sortDirectionSchema,
  apiKeySchema,
  authHeaderSchema,
  searchQuerySchema,
  sanitizeString,
  createSanitizedStringSchema
};

export default {
  uuidSchema,
  idSchema,
  emailSchema,
  passwordSchema,
  paginationSchema,
  dateStringSchema,
  dateRangeSchema,
  sortDirectionSchema,
  apiKeySchema,
  authHeaderSchema,
  searchQuerySchema,
  sanitizeString,
  createSanitizedStringSchema
}; 