/**
 * Security Validation Schemas
 * 
 * This module provides validation schemas focused on security concerns such as
 * preventing XSS, SQL injection, and other common web vulnerabilities.
 */

import { z } from 'zod';

/**
 * Safe string regex patterns
 */
const SECURITY_PATTERNS = {
  // Alphanumeric + limited safe characters
  SAFE_STRING: /^[a-zA-Z0-9_\-. ]+$/,
  // Alphanumeric + underscore
  USERNAME: /^[a-zA-Z0-9_]+$/,
  // No SQL injection characters
  SQL_SAFE: /^[^'";\\]+$/,
  // No HTML/script tags
  NO_HTML: /^[^<>]+$/,
  // URL path segment (no query parameters, fragments)
  URL_PATH: /^[a-zA-Z0-9_\-./]+$/,
  // Filename (no path traversal)
  FILENAME: /^[a-zA-Z0-9_\-. ]+\.[a-zA-Z0-9]+$/,
  // Hostname
  HOSTNAME: /^[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
};

/**
 * Common security error messages
 */
const SECURITY_MESSAGES = {
  SAFE_STRING: 'Can only contain alphanumeric characters, underscores, hyphens, spaces, and periods',
  USERNAME: 'Can only contain alphanumeric characters and underscores',
  SQL_SAFE: 'Contains characters that could be used for SQL injection',
  NO_HTML: 'Contains HTML tags which are not allowed',
  URL_PATH: 'Invalid URL path format',
  FILENAME: 'Invalid filename format',
  HOSTNAME: 'Invalid hostname format',
  JSON_DEPTH: 'JSON structure is too deeply nested',
  ARRAY_LENGTH: 'Array exceeds maximum allowed length'
};

/**
 * Sanitize a string by removing potentially dangerous characters
 * 
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  
  // Replace potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML tags
    .replace(/['"]/g, '') // Remove quotes to prevent breaking out of attributes
    .replace(/;/g, ''); // Remove semicolons to prevent command injection
};

/**
 * Simple safe string schema
 * For user-provided strings that should be safe from XSS, etc.
 */
const safeStringSchema = z.string()
  .regex(SECURITY_PATTERNS.SAFE_STRING, { message: SECURITY_MESSAGES.SAFE_STRING })
  .transform(sanitizeString);

/**
 * Username schema
 * For validating usernames
 */
const usernameSchema = z.string()
  .min(3, { message: 'Username must be at least 3 characters' })
  .max(30, { message: 'Username cannot exceed 30 characters' })
  .regex(SECURITY_PATTERNS.USERNAME, { message: SECURITY_MESSAGES.USERNAME });

/**
 * Email schema with additional validation
 */
const safeEmailSchema = z.string()
  .email({ message: 'Invalid email address format' })
  .refine(
    email => !email.includes('--') && !email.includes('/*'),
    { message: 'Email contains potentially dangerous characters' }
  );

/**
 * URL schema with security validations
 */
const safeUrlSchema = z.string()
  .url({ message: 'Invalid URL format' })
  .refine(
    url => {
      try {
        const parsedUrl = new URL(url);
        return ['http:', 'https:'].includes(parsedUrl.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL must use http or https protocol' }
  );

/**
 * URL path schema (for routes, file paths, etc.)
 */
const urlPathSchema = z.string()
  .regex(SECURITY_PATTERNS.URL_PATH, { message: SECURITY_MESSAGES.URL_PATH })
  .refine(
    path => !path.includes('..') && !path.includes('./'),
    { message: 'Path contains directory traversal sequences' }
  );

/**
 * Filename schema with security validations
 */
const filenameSchema = z.string()
  .regex(SECURITY_PATTERNS.FILENAME, { message: SECURITY_MESSAGES.FILENAME })
  .refine(
    filename => !filename.includes('..'),
    { message: 'Filename contains directory traversal sequences' }
  );

/**
 * Hostname schema
 */
const hostnameSchema = z.string()
  .regex(SECURITY_PATTERNS.HOSTNAME, { message: SECURITY_MESSAGES.HOSTNAME });

/**
 * Safe JSON schema with depth and array length limits
 * 
 * @param {Object} options - Schema options
 * @param {number} [options.maxDepth=10] - Maximum nesting depth
 * @param {number} [options.maxArrayLength=100] - Maximum array length
 * @returns {z.ZodSchema} Zod schema for JSON data
 */
const createSafeJsonSchema = (options = {}) => {
  const { maxDepth = 10, maxArrayLength = 100 } = options;
  
  const checkDepth = (obj, currentDepth = 0) => {
    if (currentDepth > maxDepth) {
      return false;
    }
    
    if (typeof obj !== 'object' || obj === null) {
      return true;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length > maxArrayLength) {
        return false;
      }
      
      return obj.every(item => checkDepth(item, currentDepth + 1));
    }
    
    return Object.values(obj).every(val => checkDepth(val, currentDepth + 1));
  };
  
  return z.string()
    .transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        
        if (!checkDepth(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'JSON exceeds maximum allowed depth or array length',
            path: []
          });
          return z.NEVER;
        }
        
        return parsed;
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid JSON format',
          path: []
        });
        return z.NEVER;
      }
    });
};

/**
 * Safe object schema for nested JSON data
 * 
 * @param {Object} baseSchema - Base schema to extend
 * @param {Object} [options] - Schema options
 * @param {number} [options.maxDepth=5] - Maximum nesting depth
 * @param {number} [options.maxArrayLength=50] - Maximum array length
 * @returns {z.ZodSchema} Safe object schema
 */
const createSafeObjectSchema = (baseSchema, options = {}) => {
  const { maxDepth = 5, maxArrayLength = 50 } = options;
  
  return baseSchema.superRefine((data, ctx) => {
    // Check JSON depth
    const checkDepth = (obj, currentDepth = 0) => {
      if (currentDepth > maxDepth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: SECURITY_MESSAGES.JSON_DEPTH,
          path: []
        });
        return false;
      }
      
      if (typeof obj !== 'object' || obj === null) {
        return true;
      }
      
      if (Array.isArray(obj)) {
        if (obj.length > maxArrayLength) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: SECURITY_MESSAGES.ARRAY_LENGTH,
            path: []
          });
          return false;
        }
        
        return obj.every(item => checkDepth(item, currentDepth + 1));
      }
      
      return Object.values(obj).every(val => checkDepth(val, currentDepth + 1));
    };
    
    checkDepth(data);
  });
};

/**
 * Rate limit parameters schema
 */
const rateLimitParamsSchema = z.object({
  windowMs: z.number().int().positive().optional(),
  max: z.number().int().positive(),
  message: z.string().optional(),
  standardHeaders: z.boolean().optional(),
  legacyHeaders: z.boolean().optional()
}).strict();

export {
  SECURITY_PATTERNS,
  SECURITY_MESSAGES,
  sanitizeString,
  safeStringSchema,
  usernameSchema,
  safeEmailSchema,
  safeUrlSchema,
  urlPathSchema,
  filenameSchema,
  hostnameSchema,
  createSafeJsonSchema,
  createSafeObjectSchema,
  rateLimitParamsSchema
};

export default {
  patterns: SECURITY_PATTERNS,
  messages: SECURITY_MESSAGES,
  sanitizeString,
  safeStringSchema,
  usernameSchema,
  safeEmailSchema,
  safeUrlSchema,
  urlPathSchema,
  filenameSchema,
  hostnameSchema,
  createSafeJsonSchema,
  createSafeObjectSchema,
  rateLimitParamsSchema
}; 