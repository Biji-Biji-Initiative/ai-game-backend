'use strict';

/**
 * User API Validation Schemas
 *
 * Defines input validation schemas for User domain API endpoints.
 */
const { z } = require('zod');

/**
 * Schema for validating user profile update requests
 */
const updateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    professionalTitle: z.string().min(1).max(100).optional(),
    location: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    preferences: z
      .object({
        theme: z.enum(['light', 'dark', 'system']).optional(),
        emailNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
      })
      .optional(),
    settings: z.record(z.any()).optional(),
  })
  .strict();

/**
 * Schema for validating focus area update requests
 */
const updateFocusAreaSchema = z
  .object({
    focusArea: z.string().min(1).max(50),
  })
  .strict();

/**
 * Schema for validating user creation requests
 */
const createUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    displayName: z.string().min(1).max(50).optional(),
    role: z.enum(['user', 'admin']).optional().default('user'),
  })
  .strict();

/**
 * Schema for validating user ID parameter
 */
const userIdSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

module.exports = {
  updateUserSchema,
  updateFocusAreaSchema,
  createUserSchema,
  userIdSchema,
};
