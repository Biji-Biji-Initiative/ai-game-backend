/**
 * User Schema Definitions using Zod
 * 
 * Defines validation schemas for the User domain model
 * to ensure data consistency and integrity.
 * Personality data is now managed by the personality domain.
 */

const { z } = require('zod');

// Define the basic user schema
const userSchema = z.object({
  // Required fields
  id: z.string().uuid().nullable(),
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(1, 'Full name is required'),
  
  // Optional fields with defaults
  professionalTitle: z.string().optional().default(''),
  location: z.string().optional().default(''),
  country: z.string().optional().default(''),
  focusArea: z.string().optional().default(''),
  lastActive: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  
  // Account status and metadata
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional().default('active'),
  roles: z.array(z.string()).optional().default(['user']),
  onboardingCompleted: z.boolean().optional().default(false),
  lastLoginAt: z.string().nullable().optional(),
  
  // Thread IDs
  focusAreaThreadId: z.string().optional().default(''),
  challengeThreadId: z.string().optional().default(''),
  evaluationThreadId: z.string().optional().default(''),
  personalityThreadId: z.string().optional().default(''),
  
  // Preferences
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional().default('system'),
    emailNotifications: z.boolean().optional().default(true),
    pushNotifications: z.boolean().optional().default(true),
    aiInteraction: z.object({
      detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('detailed'),
      communicationStyle: z.enum(['formal', 'casual', 'technical']).optional().default('casual'),
      responseFormat: z.enum(['structured', 'conversational', 'mixed']).optional().default('mixed')
    }).optional().default({})
  }).optional().default({})
});

// Schema for creating a new user
const createUserSchema = userSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Schema for updating an existing user
const updateUserSchema = userSchema.partial().omit({ 
  id: true, 
  email: true, 
  createdAt: true, 
  updatedAt: true 
});

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
  preferences: z.any().optional() // Stored as JSONB in the database
});

// Convert from database format to domain model format
function fromDatabase(dbUser) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.full_name,
    professionalTitle: dbUser.professional_title,
    location: dbUser.location,
    country: dbUser.country,
    focusArea: dbUser.focus_area,
    lastActive: dbUser.last_active,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    status: dbUser.status || 'active',
    roles: dbUser.roles || ['user'],
    onboardingCompleted: dbUser.onboarding_completed || false,
    lastLoginAt: dbUser.last_login_at || null,
    focusAreaThreadId: dbUser.focus_area_thread_id,
    challengeThreadId: dbUser.challenge_thread_id,
    evaluationThreadId: dbUser.evaluation_thread_id,
    personalityThreadId: dbUser.personality_thread_id,
    preferences: dbUser.preferences || {}
  };
}

// Convert from domain model format to database format
function toDatabase(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    professional_title: user.professionalTitle,
    location: user.location,
    country: user.country,
    focus_area: user.focusArea,
    last_active: user.lastActive,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    status: user.status || 'active',
    roles: user.roles || ['user'],
    onboarding_completed: user.onboardingCompleted || false,
    last_login_at: user.lastLoginAt || null,
    focus_area_thread_id: user.focusAreaThreadId,
    challenge_thread_id: user.challengeThreadId,
    evaluation_thread_id: user.evaluationThreadId,
    personality_thread_id: user.personalityThreadId,
    preferences: user.preferences || {}
  };
}

module.exports = {
  userSchema,
  createUserSchema,
  updateUserSchema,
  userDatabaseSchema,
  fromDatabase,
  toDatabase
}; 