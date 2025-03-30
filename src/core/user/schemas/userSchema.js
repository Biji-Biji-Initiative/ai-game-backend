/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - email
 *         - fullName
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         fullName:
 *           type: string
 *           description: User's full name
 *         focusAreas:
 *           type: array
 *           items:
 *             type: string
 *           description: User's selected focus areas
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: User's role
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was last updated
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the user's last login
 *     
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         fullName:
 *           type: string
 *         focusAreas:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         stats:
 *           type: object
 *           properties:
 *             challengesCompleted:
 *               type: integer
 *             averageScore:
 *               type: number
 */

import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
'use strict';
// Define the basic user schema
const userSchema = z
    .object({
    // Required fields
    id: z.string().uuid('User ID must be a valid UUID').nullable(),
    email: z
        .string()
        .email('Invalid email format')
        .min(3, 'Email must be at least 3 characters')
        .max(254, 'Email cannot exceed 254 characters')
        .refine(email => email.trim() === email, 'Email cannot start or end with whitespace'),
    fullName: z
        .string()
        .min(1, 'Full name is required and cannot be empty')
        .max(100, 'Full name cannot exceed 100 characters')
        .refine(name => name.trim() === name, 'Full name cannot start or end with whitespace'),
    // Optional fields with defaults
    professionalTitle: z
        .string()
        .max(100, 'Professional title cannot exceed 100 characters')
        .refine(title => !title || title.trim() === title, 'Professional title cannot start or end with whitespace')
        .default(''),
    location: z
        .string()
        .max(100, 'Location cannot exceed 100 characters')
        .refine(loc => !loc || loc.trim() === loc, 'Location cannot start or end with whitespace')
        .default(''),
    country: z
        .string()
        .max(100, 'Country cannot exceed 100 characters')
        .refine(country => !country || country.trim() === country, 'Country cannot start or end with whitespace')
        .default(''),
    focusArea: z
        .string()
        .max(100, 'Focus area cannot exceed 100 characters')
        .refine(area => !area || area.trim() === area, 'Focus area cannot start or end with whitespace')
        .default(''),
    lastActive: z
        .string()
        .datetime('Last active must be a valid ISO datetime')
        .nullable()
        .optional(),
    createdAt: z.string().datetime('Created at must be a valid ISO datetime').optional(),
    updatedAt: z.string().datetime('Updated at must be a valid ISO datetime').optional(),
    // Account status and metadata
    status: z
        .enum(['active', 'inactive', 'pending', 'suspended'], {
        errorMap: () => ({
            message: 'Status must be one of: active, inactive, pending, suspended',
        }),
    })
        .default('active'),
    roles: z
        .array(z.enum(['user', 'admin', 'moderator'], {
        errorMap: () => ({ message: 'Role must be one of: user, admin, moderator' }),
    }))
        .min(1, 'At least one role is required')
        .default(['user']),
    onboardingCompleted: z.boolean().default(false),
    lastLoginAt: z
        .string()
        .datetime('Last login must be a valid ISO datetime')
        .nullable()
        .optional(),
    // Thread IDs
    focusAreaThreadId: z
        .string()
        .min(1, 'Focus area thread ID cannot be empty')
        .max(100, 'Focus area thread ID cannot exceed 100 characters')
        .optional()
        .default(''),
    challengeThreadId: z
        .string()
        .min(1, 'Challenge thread ID cannot be empty')
        .max(100, 'Challenge thread ID cannot exceed 100 characters')
        .optional()
        .default(''),
    evaluationThreadId: z
        .string()
        .min(1, 'Evaluation thread ID cannot be empty')
        .max(100, 'Evaluation thread ID cannot exceed 100 characters')
        .optional()
        .default(''),
    personalityThreadId: z
        .string()
        .min(1, 'Personality thread ID cannot be empty')
        .max(100, 'Personality thread ID cannot exceed 100 characters')
        .optional()
        .default(''),
    // Preferences
    preferences: z
        .object({
        theme: z
            .enum(['light', 'dark', 'system'], {
            errorMap: () => ({ message: 'Theme must be one of: light, dark, system' }),
        })
            .default('system'),
        emailNotifications: z.boolean().default(true),
        pushNotifications: z.boolean().default(true),
        aiInteraction: z
            .object({
            detailLevel: z
                .enum(['basic', 'detailed', 'comprehensive'], {
                errorMap: () => ({
                    message: 'Detail level must be one of: basic, detailed, comprehensive',
                }),
            })
                .default('detailed'),
            communicationStyle: z
                .enum(['formal', 'casual', 'technical'], {
                errorMap: () => ({
                    message: 'Communication style must be one of: formal, casual, technical',
                }),
            })
                .default('casual'),
            responseFormat: z
                .enum(['structured', 'conversational', 'mixed'], {
                errorMap: () => ({
                    message: 'Response format must be one of: structured, conversational, mixed',
                }),
            })
                .default('mixed'),
        })
            .strict()
            .default({}),
    })
        .strict()
        .default({}),
})
    .strict();
// Schema for creating a new user
const createUserSchema = userSchema
    .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastActive: true,
    lastLoginAt: true,
})
    .extend({
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password cannot exceed 100 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})
    .strict();
// Schema for updating a user
const updateUserSchema = userSchema
    .partial()
    .omit({
    id: true,
    email: true,
    createdAt: true,
    updatedAt: true,
    lastActive: true,
    lastLoginAt: true,
})
    .strict();
// Schema for user search options
const userSearchOptionsSchema = z
    .object({
    limit: z
        .number()
        .int('Limit must be a whole number')
        .positive('Limit must be a positive number')
        .max(100, 'Limit cannot exceed 100')
        .optional()
        .default(20),
    offset: z
        .number()
        .int('Offset must be a whole number')
        .nonnegative('Offset cannot be negative')
        .optional()
        .default(0),
    status: z
        .enum(['active', 'inactive', 'pending', 'suspended'], {
        errorMap: () => ({
            message: 'Status must be one of: active, inactive, pending, suspended',
        }),
    })
        .optional(),
    role: z
        .enum(['user', 'admin', 'moderator'], {
        errorMap: () => ({ message: 'Role must be one of: user, admin, moderator' }),
    })
        .optional(),
    focusArea: z
        .string()
        .min(1, 'Focus area cannot be empty')
        .max(100, 'Focus area cannot exceed 100 characters')
        .optional(),
    onboardingCompleted: z.boolean().optional(),
    startDate: z.string().datetime('Start date must be a valid ISO datetime').optional(),
    endDate: z.string().datetime('End date must be a valid ISO datetime').optional(),
})
    .strict()
    .refine(data => {
    if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
}, { message: 'Start date must be before or equal to end date' });
// Schema for database representation (snake_case keys)
const userDatabaseSchema = z.object({
    id: z.string().uuid().nullable(),
    email: z.string().email('Invalid email format'),
    full_name: z.string().min(1, 'Full name is required'),
    professional_title: z.string().optional().default(''),
    location: z.string().optional().default(''),
    country: z.string().optional().default(''),
    focus_area: z.string().optional().default(''),
    last_active: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional().default('active'),
    roles: z.array(z.string()).optional().default(['user']),
    onboarding_completed: z.boolean().optional().default(false),
    last_login_at: z.string().nullable().optional(),
    focus_area_thread_id: z.string().optional().default(''),
    challenge_thread_id: z.string().optional().default(''),
    evaluation_thread_id: z.string().optional().default(''),
    personality_thread_id: z.string().optional().default(''),
    preferences: z.any().optional(), // Stored as JSONB in the database
});
export { userSchema };
export { createUserSchema };
export { updateUserSchema };
export { userSearchOptionsSchema };
export { userDatabaseSchema };
export default {
    userSchema,
    createUserSchema,
    updateUserSchema,
    userSearchOptionsSchema,
    userDatabaseSchema
};
