import { z } from "zod";
import { 
  preferencesSchema, 
  getValidPreferenceCategories 
} from "#app/core/user/schemas/preferencesSchema.js";
'use strict';
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
/**
 * Schema for validating email parameter
 */
const emailParamSchema = z
    .object({
    email: z.string().email('Invalid email format'),
})
    .strict();
/**
 * Schema for validating query parameters when listing users
 */
const listUsersQuerySchema = z
    .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    sortBy: z.enum(['name', 'email', 'createdAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    query: z.string().optional(),
    status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
})
    .strict();
/**
 * Schema for validating password change requests
 */
const changePasswordSchema = z
    .object({
    currentPassword: z.string().min(8, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password confirmation is required'),
})
    .strict()
    .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
/**
 * Schema for validating user notification settings
 */
const notificationSettingsSchema = z
    .object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    challengeReminders: z.boolean().optional(),
    weeklyProgressReports: z.boolean().optional(),
    newFeaturesAnnouncements: z.boolean().optional(),
})
    .strict();

/**
 * Schema for preference category parameter validation
 */
const preferencesCategoryParamSchema = z.object({
  category: z.enum(['ui', 'notifications', 'aiInteraction', 'learning'], {
    errorMap: () => ({ message: 'Category must be one of: ui, notifications, aiInteraction, learning' })
  })
}).strict();

/**
 * Schema for preference key parameter validation
 */
const preferencesKeyParamSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z0-9.]+$/, {
    message: 'Preference key must contain only letters, numbers, and dots'
  })
}).strict();

/**
 * Schema for updating all preferences
 */
const preferencesUpdateSchema = preferencesSchema;

/**
 * Schema for updating preferences in a specific category
 */
const preferencesCategoryUpdateSchema = z.record(z.any());

/**
 * Schema for updating a single preference value
 */
const preferenceValueSchema = z.object({
  value: z.any()
}).strict();

export { updateUserSchema };
export { updateFocusAreaSchema };
export { createUserSchema };
export { userIdSchema };
export { emailParamSchema };
export { listUsersQuerySchema };
export { changePasswordSchema };
export { notificationSettingsSchema };
export { preferencesCategoryParamSchema };
export { preferencesKeyParamSchema };
export { preferencesUpdateSchema };
export { preferencesCategoryUpdateSchema };
export { preferenceValueSchema };

export default {
    updateUserSchema,
    updateFocusAreaSchema,
    createUserSchema,
    userIdSchema,
    emailParamSchema,
    listUsersQuerySchema,
    changePasswordSchema,
    notificationSettingsSchema,
    preferencesCategoryParamSchema,
    preferencesKeyParamSchema,
    preferencesUpdateSchema,
    preferencesCategoryUpdateSchema,
    preferenceValueSchema
};
