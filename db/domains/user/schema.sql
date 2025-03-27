-- User Domain Database Schema
-- This file defines all tables, indexes, and other database objects for the User domain
-- Personality data is now managed by the personality domain

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to avoid conflicts (use in dev only)
-- DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  -- Core identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  
  -- Profile information
  full_name TEXT NOT NULL,
  professional_title TEXT,
  role TEXT DEFAULT 'user',
  location TEXT,
  country TEXT,
  
  -- User preferences
  focus_area TEXT,
  
  -- Thread IDs for stateful conversations
  focus_area_thread_id TEXT,
  challenge_thread_id TEXT,
  evaluation_thread_id TEXT,
  personality_thread_id TEXT,
  
  -- Metadata and timestamps
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments on table and columns for better documentation
COMMENT ON TABLE users IS 'Users of the platform with their profile and preferences';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.email IS 'User email address, used for login and identification';
COMMENT ON COLUMN users.full_name IS 'User full name for display purposes';
COMMENT ON COLUMN users.professional_title IS 'User professional title or job role';
COMMENT ON COLUMN users.role IS 'User role (user, admin)';
COMMENT ON COLUMN users.location IS 'User location (city/region)';
COMMENT ON COLUMN users.country IS 'User country';
COMMENT ON COLUMN users.focus_area IS 'Current focus area for the user';
COMMENT ON COLUMN users.focus_area_thread_id IS 'ID of the focus area conversation thread';
COMMENT ON COLUMN users.challenge_thread_id IS 'ID of the challenge conversation thread';
COMMENT ON COLUMN users.evaluation_thread_id IS 'ID of the evaluation conversation thread';
COMMENT ON COLUMN users.personality_thread_id IS 'ID of the personality assessment thread';
COMMENT ON COLUMN users.last_active IS 'Timestamp of the user last activity';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the user record was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the user record was last updated';

-- Create indexes for faster searching and filtering
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_focus_area ON users(focus_area);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a view for user activity analytics
CREATE OR REPLACE VIEW user_activity_view AS
SELECT
  id,
  email,
  full_name,
  focus_area,
  last_active,
  created_at,
  updated_at,
  CASE
    WHEN last_active > NOW() - INTERVAL '7 days' THEN 'active'
    WHEN last_active > NOW() - INTERVAL '30 days' THEN 'recent'
    ELSE 'inactive'
  END AS activity_status
FROM users;

COMMENT ON VIEW user_activity_view IS 'View for analyzing user activity patterns';

-- Create a trigger to automatically create a personality profile for new users
CREATE OR REPLACE FUNCTION create_personality_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO personality_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger if it doesn't exist
DROP TRIGGER IF EXISTS create_personality_profile_trigger ON users;
CREATE TRIGGER create_personality_profile_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_personality_profile_for_new_user(); 