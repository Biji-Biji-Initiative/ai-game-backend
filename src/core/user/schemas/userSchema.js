/**
 * User Schema Definitions using Zod
 * 
 * Defines validation schemas for the User domain model
 * to ensure data consistency and integrity.
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
  role: z.enum(['user', 'admin']).default('user'),
  location: z.string().optional().default(''),
  country: z.string().optional().default(''),
  personalityTraits: z.record(z.number().min(0).max(1)).optional().default({}),
  aiAttitudes: z.record(z.number().min(0).max(1)).optional().default({}),
  focusArea: z.string().optional().default(''),
  lastActive: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  
  // Thread IDs
  focusAreaThreadId: z.string().optional().default(''),
  challengeThreadId: z.string().optional().default(''),
  evaluationThreadId: z.string().optional().default(''),
  personalityThreadId: z.string().optional().default('')
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
  role: z.enum(['user', 'admin']).default('user'),
  location: z.string().optional().default(''),
  country: z.string().optional().default(''),
  personality_traits: z.record(z.number().min(0).max(1)).optional().default({}),
  ai_attitudes: z.record(z.number().min(0).max(1)).optional().default({}),
  focus_area: z.string().optional().default(''),
  last_active: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  focus_area_thread_id: z.string().optional().default(''),
  challenge_thread_id: z.string().optional().default(''),
  evaluation_thread_id: z.string().optional().default(''),
  personality_thread_id: z.string().optional().default('')
});

// Convert from database format to domain model format
function fromDatabase(dbUser) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.full_name,
    professionalTitle: dbUser.professional_title,
    role: dbUser.role,
    location: dbUser.location,
    country: dbUser.country,
    personalityTraits: dbUser.personality_traits,
    aiAttitudes: dbUser.ai_attitudes,
    focusArea: dbUser.focus_area,
    lastActive: dbUser.last_active,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    focusAreaThreadId: dbUser.focus_area_thread_id,
    challengeThreadId: dbUser.challenge_thread_id,
    evaluationThreadId: dbUser.evaluation_thread_id,
    personalityThreadId: dbUser.personality_thread_id
  };
}

// Convert from domain model format to database format
function toDatabase(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    professional_title: user.professionalTitle,
    role: user.role,
    location: user.location,
    country: user.country,
    personality_traits: user.personalityTraits,
    ai_attitudes: user.aiAttitudes,
    focus_area: user.focusArea,
    last_active: user.lastActive,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    focus_area_thread_id: user.focusAreaThreadId,
    challenge_thread_id: user.challengeThreadId,
    evaluation_thread_id: user.evaluationThreadId,
    personality_thread_id: user.personalityThreadId
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