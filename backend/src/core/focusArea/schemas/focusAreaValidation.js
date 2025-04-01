import { z } from "zod";
'use strict';
/**
 * Base schema for a focus area
 */
const focusAreaSchema = z
    .object({
    id: z.string().uuid('Focus area ID must be a valid UUID'),
    userId: z.string().min(1, 'User ID is required and cannot be empty'),
    name: z
        .string()
        .min(1, 'Focus area name is required and cannot be empty')
        .max(200, 'Focus area name cannot exceed 200 characters')
        .refine(name => name.trim() === name, 'Focus area name cannot start or end with whitespace'),
    description: z
        .string()
        .max(1000, 'Focus area description cannot exceed 1000 characters')
        .nullable()
        .optional(),
    active: z.boolean().default(true),
    priority: z
        .number()
        .int('Priority must be a whole number')
        .min(1, 'Priority must be at least 1')
        .max(5, 'Priority cannot exceed 5')
        .default(1),
    metadata: z.record(z.unknown()).default({}),
})
    .strict();
/**
 * Schema for creating a new focus area
 */
const createFocusAreaSchema = focusAreaSchema.omit({ id: true }).strict();
/**
 * Schema for updating a focus area
 */
const baseUpdateSchema = focusAreaSchema.partial().omit({ id: true, userId: true });
const updateFocusAreaSchema = z.object(baseUpdateSchema.shape).strict().refine(
    data => Object.keys(data).length > 0,
    {
        message: 'At least one field must be provided for update',
    }
);
/**
 * Schema for API request to set focus areas for a user
 */
const setFocusAreasSchema = z
    .object({
    focusAreas: z
        .array(z.union([
        z.string().min(1, 'Focus area name is required and cannot be empty'),
        z
            .object({
            name: z.string().min(1, 'Focus area name is required and cannot be empty'),
            description: z
                .string()
                .max(1000, 'Focus area description cannot exceed 1000 characters')
                .nullable()
                .optional(),
            priority: z
                .number()
                .int('Priority must be a whole number')
                .min(1, 'Priority must be at least 1')
                .max(5, 'Priority cannot exceed 5')
                .optional(),
            active: z.boolean().optional(),
        })
            .strict(),
    ]))
        .min(1, 'At least one focus area must be provided'),
})
    .strict();
/**
 * Schema for generating a focus area (admin only)
 */
const generateFocusAreaSchema = z
    .object({
    name: z
        .string()
        .min(1, 'Focus area name is required and cannot be empty')
        .max(200, 'Focus area name cannot exceed 200 characters'),
    description: z
        .string()
        .min(1, 'Focus area description is required and cannot be empty')
        .max(1000, 'Focus area description cannot exceed 1000 characters'),
    category: z.string().min(1, 'Category is required and cannot be empty').optional(),
    difficulty: z
        .enum(['beginner', 'intermediate', 'advanced'], {
        errorMap: () => ({
            message: 'Difficulty must be one of: beginner, intermediate, advanced',
        }),
    })
        .optional(),
})
    .strict();
/**
 * Schema for query parameters when getting focus areas
 */
const getFocusAreasQuerySchema = z
    .object({
    activeOnly: z.boolean().optional().default(true),
    orderBy: z
        .enum(['priority', 'name', 'createdAt'], {
        errorMap: () => ({ message: 'Order by must be one of: priority, name, createdAt' }),
    })
        .optional()
        .default('priority'),
    limit: z
        .number()
        .int('Limit must be a whole number')
        .positive('Limit must be a positive number')
        .optional(),
})
    .strict();
/**
 * Email URL parameter validation schema
 */
const emailParamSchema = z
    .object({
    email: z
        .string()
        .email('Invalid email format')
        .min(3, 'Email must be at least 3 characters')
        .max(254, 'Email cannot exceed 254 characters'),
})
    .strict();
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
    }
    catch (error) {
        if (error.errors) {
            const formattedErrors = error.errors
                .map(err => `${err.path.join('.')}: ${err.message}`)
                .join('; ');
            throw new Error(`Validation failed: ${formattedErrors}`);
        }
        throw error;
    }
}
export { focusAreaSchema };
export { createFocusAreaSchema };
export { updateFocusAreaSchema };
export { setFocusAreasSchema };
export { generateFocusAreaSchema };
export { getFocusAreasQuerySchema };
export { emailParamSchema };
export { validate };
export default {
    focusAreaSchema,
    createFocusAreaSchema,
    updateFocusAreaSchema,
    setFocusAreasSchema,
    generateFocusAreaSchema,
    getFocusAreasQuerySchema,
    emailParamSchema,
    validate
};
