/**
 * Zod Schema for Difficulty Model
 * 
 * Defines validation schemas for Difficulty entities.
 * Used for data validation in repositories and services.
 * 
 * @module DifficultySchema
 * @requires zod
 */

const { z } = require('zod');

// Difficulty level enum
const difficultyLevelEnum = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);

// Main Difficulty schema
const DifficultySchema = z.object({
  level: difficultyLevelEnum.default('beginner'),
  complexity: z.number().min(0).max(1).default(0.5),
  depth: z.number().min(0).max(1).default(0.5),
  timeAllocation: z.number().int().min(60).max(1800).default(300),
  adaptiveFactor: z.number().min(-1).max(1).default(0.0)
});

// Schema for difficulty update operations (all fields optional)
const DifficultyUpdateSchema = DifficultySchema.partial();

// Schema for personality traits
const PersonalityTraitsSchema = z.object({
  openness: z.number().min(0).max(1).optional(),
  conscientiousness: z.number().min(0).max(1).optional(),
  extraversion: z.number().min(0).max(1).optional(),
  agreeableness: z.number().min(0).max(1).optional(),
  neuroticism: z.number().min(0).max(1).optional()
});

module.exports = {
  DifficultySchema,
  DifficultyUpdateSchema,
  PersonalityTraitsSchema,
  difficultyLevelEnum
}; 