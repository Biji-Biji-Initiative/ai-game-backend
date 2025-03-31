import { z } from 'zod';

/**
 * Preference schemas using Zod for validation
 * 
 * These schemas define the structure and allowed values for user preferences,
 * ensuring type safety and consistent validation across the application.
 */

/**
 * UI preferences schema
 * Controls the appearance and behavior of the user interface
 */
export const uiPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  compactView: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  animationsEnabled: z.boolean().default(true),
}).strict();

/**
 * Notification preferences schema
 * Controls how and when the user receives notifications
 */
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  challengeReminders: z.boolean().default(true),
  weeklyProgressReports: z.boolean().default(true),
  newFeaturesAnnouncements: z.boolean().default(true),
}).strict();

/**
 * AI interaction preferences schema
 * Controls how AI features interact with the user
 */
export const aiInteractionPreferencesSchema = z.object({
  detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
  communicationStyle: z.enum(['formal', 'casual', 'technical']).default('casual'),
  responseFormat: z.enum(['structured', 'conversational', 'mixed']).default('mixed'),
  codeExamplesEnabled: z.boolean().default(true),
  includeExplanations: z.boolean().default(true),
}).strict();

/**
 * Learning preferences schema
 * Controls the user's learning experience
 */
export const learningPreferencesSchema = z.object({
  preferredChallengeTypes: z.array(z.string()).default([]),
  preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  topicsToAvoid: z.array(z.string()).default([]),
  learningStyle: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']).default('reading'),
  preferredFeedbackStyle: z.enum(['direct', 'gentle', 'detailed', 'minimal']).default('detailed'),
}).strict();

/**
 * Complete preferences schema
 * Combines all preference categories
 */
export const preferencesSchema = z.object({
  ui: uiPreferencesSchema.default({}),
  notifications: notificationPreferencesSchema.default({}),
  aiInteraction: aiInteractionPreferencesSchema.default({}),
  learning: learningPreferencesSchema.default({}),
}).strict();

/**
 * Returns default preferences for all categories
 * @returns {Object} Default preferences
 */
export function getDefaultPreferences() {
  return preferencesSchema.parse({});
}

/**
 * Validates preferences for a specific category
 * @param {string} category - Preference category
 * @param {Object} data - Data to validate
 * @returns {Object} Validated data
 */
export function validatePreferenceCategory(category, data) {
  switch (category) {
    case 'ui':
      return uiPreferencesSchema.parse(data);
    case 'notifications':
      return notificationPreferencesSchema.parse(data);
    case 'aiInteraction':
      return aiInteractionPreferencesSchema.parse(data);
    case 'learning':
      return learningPreferencesSchema.parse(data);
    default:
      throw new Error(`Unknown preference category: ${category}`);
  }
}

/**
 * Get all valid preference categories
 * @returns {Array<string>} List of valid preference categories
 */
export function getValidPreferenceCategories() {
  return ['ui', 'notifications', 'aiInteraction', 'learning'];
}

/**
 * Check if a preference category is valid
 * @param {string} category - Category to check
 * @returns {boolean} True if category is valid
 */
export function isValidPreferenceCategory(category) {
  return getValidPreferenceCategories().includes(category);
} 