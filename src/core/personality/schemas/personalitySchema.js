/**
 * Personality Schema Definitions using Zod
 * 
 * Defines validation schemas for the Personality domain model
 * to ensure data consistency and integrity.
 */

const { z } = require('zod');

// Define the basic personality schema
const personalitySchema = z.object({
  // Required fields
  id: z.string().uuid(),
  userId: z.string().uuid(),
  
  // Optional fields with defaults
  personalityTraits: z.record(z.number().min(0).max(100)).default({}),
  aiAttitudes: z.record(z.number().min(0).max(100)).default({}),
  dominantTraits: z.array(z.string()).default([]),
  traitClusters: z.record(z.array(z.string())).default({}),
  aiAttitudeProfile: z.record(z.any()).default({}),
  insights: z.record(z.any()).default({}),
  threadId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

// Schema for creating a new personality profile
const createPersonalitySchema = personalitySchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  userId: z.string().uuid()
});

// Schema for updating an existing personality profile
const updatePersonalitySchema = personalitySchema.partial().omit({ 
  id: true,
  userId: true,
  createdAt: true, 
  updatedAt: true 
});

// Schema for trait updates
const traitUpdateSchema = z.record(z.number().min(0).max(100));

// Schema for attitude updates
const attitudeUpdateSchema = z.record(z.number().min(0).max(100));

// Schema for database representation (snake_case keys)
const personalityDatabaseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  personality_traits: z.record(z.number().min(0).max(100)).default({}),
  ai_attitudes: z.record(z.number().min(0).max(100)).default({}),
  dominant_traits: z.array(z.string()).default([]),
  trait_clusters: z.record(z.array(z.string())).default({}),
  ai_attitude_profile: z.record(z.any()).default({}),
  insights: z.record(z.any()).default({}),
  thread_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

// Convert from database format to domain model format
function fromDatabase(dbPersonality) {
  return {
    id: dbPersonality.id,
    userId: dbPersonality.user_id,
    personalityTraits: dbPersonality.personality_traits,
    aiAttitudes: dbPersonality.ai_attitudes,
    dominantTraits: dbPersonality.dominant_traits,
    traitClusters: dbPersonality.trait_clusters,
    aiAttitudeProfile: dbPersonality.ai_attitude_profile,
    insights: dbPersonality.insights,
    threadId: dbPersonality.thread_id,
    createdAt: dbPersonality.created_at,
    updatedAt: dbPersonality.updated_at
  };
}

// Convert from domain model format to database format
function toDatabase(personality) {
  return {
    id: personality.id,
    user_id: personality.userId,
    personality_traits: personality.personalityTraits,
    ai_attitudes: personality.aiAttitudes,
    dominant_traits: personality.dominantTraits,
    trait_clusters: personality.traitClusters,
    ai_attitude_profile: personality.aiAttitudeProfile,
    insights: personality.insights,
    thread_id: personality.threadId,
    created_at: personality.createdAt,
    updated_at: personality.updatedAt
  };
}

module.exports = {
  personalitySchema,
  createPersonalitySchema,
  updatePersonalitySchema,
  traitUpdateSchema,
  attitudeUpdateSchema,
  personalityDatabaseSchema,
  fromDatabase,
  toDatabase
}; 