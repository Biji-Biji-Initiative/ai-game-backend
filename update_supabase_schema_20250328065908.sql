-- Migration to update Supabase schema to match code schema
-- Generated on 2025-03-28T06:59:08.075Z

-- Create ENUM challenge_status which is missing in Supabase
CREATE TYPE challenge_status AS ENUM ('active', 'submitted', 'completed', 'archived');

-- Create ENUM challenge_difficulty which is missing in Supabase
CREATE TYPE challenge_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- Create table challenge_types which is missing in Supabase
CREATE TABLE IF NOT EXISTS challenge_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL NOT NULL,
  name TEXT NOT NULL NOT NULL,
  description TEXT,
  format_types TEXT[] DEFAULT DEFAULT '{}',
  focus_areas TEXT[] DEFAULT DEFAULT '{}',
  leveraged_traits TEXT[] DEFAULT DEFAULT '{}',
  progression_path TEXT[] DEFAULT DEFAULT '{}',
  metadata JSONB DEFAULT DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  parent_type_id UUID REFERENCES challenge_types(id) REFERENCES challenge_types,
  is_system_defined BOOLEAN DEFAULT FALSE DEFAULT FALSE
);

-- Create table format_types which is missing in Supabase
CREATE TABLE IF NOT EXISTS format_types (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL NOT NULL,
  name TEXT NOT NULL NOT NULL,
  description TEXT NOT NULL NOT NULL,
  prompt_structure TEXT DEFAULT DEFAULT '',
  response_format TEXT DEFAULT DEFAULT '',
  evaluation_criteria TEXT[] DEFAULT DEFAULT '{}',
  metadata JSONB DEFAULT DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() DEFAULT NOW()
);

-- Create table focus_areas which is missing in Supabase
CREATE TABLE IF NOT EXISTS focus_areas (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL NOT NULL,
  name TEXT NOT NULL NOT NULL,
  description TEXT NOT NULL NOT NULL,
  related_areas TEXT[] DEFAULT DEFAULT '{}',
  prerequisites TEXT[] DEFAULT DEFAULT '{}',
  learning_outcomes JSONB DEFAULT DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE DEFAULT TRUE,
  display_order INTEGER DEFAULT 0 DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() DEFAULT NOW()
);

-- Create table difficulty_levels which is missing in Supabase
CREATE TABLE IF NOT EXISTS difficulty_levels (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL NOT NULL,
  name TEXT NOT NULL NOT NULL,
  description TEXT NOT NULL NOT NULL,
  question_count INTEGER DEFAULT 1 DEFAULT 1,
  context_complexity FLOAT DEFAULT 0 DEFAULT 0.5,
  standard_time INTEGER DEFAULT 300 DEFAULT 300,
  sort_order INTEGER DEFAULT 0 DEFAULT 0,
  requirements JSONB DEFAULT DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() DEFAULT NOW()
);

-- Create table challenge_format_types which is missing in Supabase
CREATE TABLE IF NOT EXISTS challenge_format_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL NOT NULL,
  name TEXT NOT NULL NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  is_system_defined BOOLEAN DEFAULT FALSE DEFAULT FALSE,
  metadata JSONB DEFAULT DEFAULT '{}'
);

-- Create table challenges which is missing in Supabase
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE NOT NULL REFERENCES users,
  title TEXT NOT NULL NOT NULL,
  challenge_type_id UUID REFERENCES challenge_types(id) REFERENCES challenge_types,
  challenge_type_code TEXT NOT NULL NOT NULL,
  format_type_id UUID REFERENCES challenge_format_types(id) REFERENCES challenge_format_types,
  format_type_code TEXT NOT NULL NOT NULL,
  focus_area TEXT NOT NULL NOT NULL,
  difficulty challenge_difficulty NOT NULL NOT NULL,
  content JSONB NOT NULL NOT NULL,
  status challenge_status NOT NULL DEFAULT NOT NULL DEFAULT 'active',
  difficulty_settings JSONB DEFAULT DEFAULT '{}',
  questions JSONB DEFAULT DEFAULT '[]',
  evaluation JSONB DEFAULT NULL DEFAULT NULL,
  responses JSONB DEFAULT NULL DEFAULT NULL,
  evaluation_criteria JSONB DEFAULT NULL DEFAULT NULL,
  thread_id TEXT DEFAULT NULL DEFAULT NULL,
  evaluation_thread_id TEXT DEFAULT NULL DEFAULT NULL,
  generation_thread_id TEXT DEFAULT NULL DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL DEFAULT NULL,
  ai_generated BOOLEAN DEFAULT TRUE DEFAULT TRUE,
  generation_metadata JSONB DEFAULT NULL DEFAULT NULL,
  type_metadata JSONB DEFAULT DEFAULT '{}',
  format_metadata JSONB DEFAULT DEFAULT '{}'
);

-- Create table evaluation_categories which is missing in Supabase
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL NOT NULL,
  name TEXT NOT NULL NOT NULL,
  description TEXT NOT NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  is_system_defined BOOLEAN DEFAULT FALSE DEFAULT FALSE
);

-- Create table focus_area_category_mappings which is missing in Supabase
CREATE TABLE IF NOT EXISTS focus_area_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() DEFAULT gen_random_uuid(),
  focus_area TEXT NOT NULL NOT NULL,
  category_code TEXT NOT NULL REFERENCES evaluation_categories(code) ON DELETE CASCADE NOT NULL REFERENCES evaluation_categories,
  weight INTEGER DEFAULT 10 DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now()
);

-- Create table trait_challenge_mappings which is missing in Supabase
CREATE TABLE IF NOT EXISTS trait_challenge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() DEFAULT gen_random_uuid(),
  trait_code TEXT NOT NULL UNIQUE NOT NULL,
  trait_name TEXT NOT NULL NOT NULL,
  challenge_type_code TEXT NOT NULL REFERENCES challenge_types(code) ON DELETE CASCADE NOT NULL REFERENCES challenge_types,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now()
);

-- Create table focus_area_challenge_mappings which is missing in Supabase
CREATE TABLE IF NOT EXISTS focus_area_challenge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() DEFAULT gen_random_uuid(),
  focus_area TEXT NOT NULL UNIQUE NOT NULL,
  challenge_type_code TEXT NOT NULL REFERENCES challenge_types(code) ON DELETE CASCADE NOT NULL REFERENCES challenge_types,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() DEFAULT now()
);

-- Create or replace function upsert_custom_challenge_type
CREATE OR REPLACE FUNCTION upsert_custom_challenge_type(
  p_code TEXT,
  p_name TEXT,
  p_description TEXT,
  p_parent_code TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_parent_id UUID;

-- Create or replace function update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();

-- Create or replace function challenge_completed_notification
CREATE OR REPLACE FUNCTION challenge_completed_notification() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Insert into notifications table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
      INSERT INTO notifications (
        user_email,
        type,
        title,
        message,
        data,
        created_at
      ) VALUES (
        NEW.user_email,
        'challenge_completed',
        'Challenge Completed',
        'You have successfully completed a challenge: ' || NEW.title,
        jsonb_build_object(
          'challengeId', NEW.id,
          'challengeTitle', NEW.title,
          'focusArea', NEW.focus_area,
          'score', CASE WHEN NEW.evaluation ? 'overallScore' 
                        THEN NEW.evaluation->>'overallScore' 
                        ELSE NEW.evaluation->>'score' END
        ),
        now()
      );

-- Create trigger update_challenges_updated_at
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create trigger update_challenge_types_updated_at
CREATE TRIGGER update_challenge_types_updated_at BEFORE UPDATE ON challenge_types
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create trigger update_format_types_updated_at
CREATE TRIGGER update_format_types_updated_at BEFORE UPDATE ON challenge_format_types
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create trigger challenge_completed_trigger
CREATE TRIGGER challenge_completed_trigger AFTER UPDATE ON challenges
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed') EXECUTE PROCEDURE challenge_completed_notification();

