/**
 * Focus Area Validation Schemas
 * 
 * Defines Zod validation schemas for focus area operations
 * 
 * @module focusAreaValidation
 * @requires zod
 */

const { z } = require('zod');

/**
 * Base schema for a focus area
 */
const focusAreaSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional().default(''),
  active: z.boolean().optional().default(true),
  priority: z.number().int().min(1).max(5).optional().default(1),
  metadata: z.record(z.any()).optional().default({})
});

/**
 * Schema for creating a new focus area
 */
const createFocusAreaSchema = focusAreaSchema.omit({ id: true });

/**
 * Schema for updating a focus area
 */
const updateFocusAreaSchema = focusAreaSchema
  .partial()
  .omit({ id: true, userId: true })
  .refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
  });

/**
 * Schema for API request to set focus areas for a user
 */
const setFocusAreasSchema = z.object({
  focusAreas: z.array(
    z.union([
      z.string().min(1),
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        priority: z.number().int().min(1).max(5).optional(),
        active: z.boolean().optional()
      })
    ])
  ).min(1, "At least one focus area must be provided")
});

/**
 * Schema for generating a focus area (admin only)
 */
const generateFocusAreaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional()
});

/**
 * Schema for query parameters when getting focus areas
 */
const getFocusAreasQuerySchema = z.object({
  activeOnly: z.boolean().optional().default(true),
  orderBy: z.string().optional().default('priority'),
  limit: z.number().int().positive().optional()
}).optional();

/**
 * Email URL parameter validation schema
 */
const emailParamSchema = z.object({
  email: z.string()
    .email("Invalid email format")
    .min(3, "Email must be at least 3 characters")
    .max(254, "Email cannot exceed 254 characters")
});

/**
 * Validate focus area data
 * @param {Object} data - Data to validate
 * @param {z.ZodSchema} schema - Schema to validate against
 * @returns {Object} Validated and transformed data
 * @throws {Error} If validation fails
 */
function validate(data, schema) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error.errors) {
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');
      
      throw new Error(`Validation failed: ${formattedErrors}`);
    }
    throw error;
  }
}

module.exports = {
  focusAreaSchema,
  createFocusAreaSchema,
  updateFocusAreaSchema,
  setFocusAreasSchema,
  generateFocusAreaSchema,
  getFocusAreasQuerySchema,
  emailParamSchema,
  validate
}; 