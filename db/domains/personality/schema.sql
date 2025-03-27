-- Personality Domain Database Schema
-- This file defines all tables, indexes, and other database objects for the Personality domain

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Personality Profiles Table
CREATE TABLE IF NOT EXISTS personality_profiles (
  -- Primary identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationship to User domain
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Core personality data
  personality_traits JSONB DEFAULT '{}'::JSONB,
  ai_attitudes JSONB DEFAULT '{}'::JSONB,
  
  -- Analysis results
  dominant_traits JSONB DEFAULT '[]'::JSONB,
  trait_clusters JSONB DEFAULT '{}'::JSONB,
  ai_attitude_profile JSONB DEFAULT '{}'::JSONB,
  insights JSONB DEFAULT '{}'::JSONB,
  
  -- Conversation tracking
  thread_id TEXT,
  
  -- Metadata and timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Enforce uniqueness of user_id (one profile per user)
  CONSTRAINT personality_profiles_user_id_unique UNIQUE (user_id)
);

-- Add comments on table and columns for better documentation
COMMENT ON TABLE personality_profiles IS 'Personality profiles for users with traits, AI attitudes, and generated insights';
COMMENT ON COLUMN personality_profiles.id IS 'Unique identifier for the personality profile';
COMMENT ON COLUMN personality_profiles.user_id IS 'Foreign key to the users table';
COMMENT ON COLUMN personality_profiles.personality_traits IS 'JSONB containing personality trait assessments and scores';
COMMENT ON COLUMN personality_profiles.ai_attitudes IS 'JSONB containing attitudes toward AI technologies';
COMMENT ON COLUMN personality_profiles.dominant_traits IS 'JSONB array of the user''s most dominant personality traits';
COMMENT ON COLUMN personality_profiles.trait_clusters IS 'JSONB containing categorized personality trait clusters';
COMMENT ON COLUMN personality_profiles.ai_attitude_profile IS 'JSONB containing analyzed AI attitude profile';
COMMENT ON COLUMN personality_profiles.insights IS 'JSONB containing generated insights based on personality analysis';
COMMENT ON COLUMN personality_profiles.thread_id IS 'ID of the conversation thread for personality analysis';
COMMENT ON COLUMN personality_profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN personality_profiles.updated_at IS 'Timestamp when the profile was last updated';

-- Create indexes for faster searching and filtering
CREATE INDEX IF NOT EXISTS idx_personality_profiles_user_id ON personality_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_personality_profiles_created_at ON personality_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_personality_profiles_updated_at ON personality_profiles(updated_at);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_personality_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS personality_profiles_updated_at_trigger ON personality_profiles;
CREATE TRIGGER personality_profiles_updated_at_trigger
BEFORE UPDATE ON personality_profiles
FOR EACH ROW
EXECUTE FUNCTION update_personality_updated_at_column();

-- Create a view that joins personality profiles with user information
CREATE OR REPLACE VIEW user_personality_view AS
SELECT
  u.id AS user_id,
  u.email,
  u.full_name,
  pp.id AS personality_profile_id,
  pp.personality_traits,
  pp.ai_attitudes,
  pp.dominant_traits,
  pp.trait_clusters,
  pp.ai_attitude_profile,
  pp.updated_at AS profile_updated_at
FROM
  users u
LEFT JOIN
  personality_profiles pp ON u.id = pp.user_id;

COMMENT ON VIEW user_personality_view IS 'View combining user information with their personality profile data';

-- Create a function to create a personality profile when a new user is created
CREATE OR REPLACE FUNCTION create_personality_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO personality_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create a personality profile for new users
DROP TRIGGER IF EXISTS create_personality_profile_trigger ON users;
CREATE TRIGGER create_personality_profile_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_personality_profile_for_new_user(); 