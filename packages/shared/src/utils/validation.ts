/**
 * Validation utilities using Zod
 */
import { z } from 'zod';
import { UserRole } from '../types/index.js';

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be at most 255 characters');

// User validation schema
export const userCreateSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  roles: z.array(z.nativeEnum(UserRole)).optional().default([UserRole.USER]),
});

// User update validation schema
export const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters').optional(),
  roles: z.array(z.nativeEnum(UserRole)).optional(),
});

// Challenge validation schema
export const challengeCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be at most 1000 characters'),
  type: z.string().min(2, 'Type must be at least 2 characters').max(50, 'Type must be at most 50 characters'),
  difficulty: z.string().min(2, 'Difficulty must be at least 2 characters').max(50, 'Difficulty must be at most 50 characters'),
  userId: z.string().uuid('User ID must be a valid UUID'),
});

// Export validation utilities
export const validation = {
  email: emailSchema,
  userCreate: userCreateSchema,
  userUpdate: userUpdateSchema,
  challengeCreate: challengeCreateSchema,
};

export default validation;

/**
 * Error response structure
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate data against a schema
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validation result
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: ValidationError[]
} {
  try {
    const validData = schema.parse(data);
    return {
      success: true,
      data: validData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }

    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Unknown validation error' }]
    };
  }
}
