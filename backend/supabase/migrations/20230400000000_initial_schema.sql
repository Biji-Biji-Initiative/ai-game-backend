-- INITIAL SCHEMA MIGRATION
-- This file contains a complete schema definition for the initial database state

-- Create types (enums)
CREATE TYPE challenge_status AS ENUM ('active', 'submitted', 'completed', 'archived');
CREATE TYPE challenge_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Base Tables

-- Users table (required by other tables)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Challenge Types
CREATE TABLE IF NOT EXISTS challenge_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_type_id UUID REFERENCES challenge_types(id),
  format_types TEXT[] DEFAULT '{}',
  focus_areas TEXT[] DEFAULT '{}',
  leveraged_traits TEXT[] DEFAULT '{}',
  progression_path TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_system_defined BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Format Types
CREATE TABLE IF NOT EXISTS challenge_format_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system_defined BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Focus Areas
CREATE TABLE IF NOT EXISTS focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  related_areas TEXT[] DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  learning_outcomes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  relevance_score REAL,
  relevance_explanation TEXT,
  suggested_challenges JSONB,
  skill_progression JSONB,
  is_selected BOOLEAN DEFAULT FALSE,
  ai_generated BOOLEAN DEFAULT TRUE,
  generation_thread_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Difficulty Levels
CREATE TABLE IF NOT EXISTS difficulty_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  question_count INTEGER DEFAULT 1,
  context_complexity FLOAT DEFAULT 0.5,
  standard_time INTEGER DEFAULT 300,
  sort_order INTEGER DEFAULT 0,
  requirements JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Evaluation Categories
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_system_defined BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  
  -- Challenge type info
  challenge_type_id UUID REFERENCES challenge_types(id),
  challenge_type_code TEXT NOT NULL,
  
  -- Format type info
  format_type_id UUID REFERENCES challenge_format_types(id),
  format_type_code TEXT NOT NULL,
  
  -- Core challenge properties
  focus_area TEXT NOT NULL,
  difficulty challenge_difficulty NOT NULL,
  content JSONB NOT NULL,
  
  -- Additional properties
  status challenge_status NOT NULL DEFAULT 'active',
  difficulty_settings JSONB DEFAULT '{}',
  questions JSONB DEFAULT '[]',
  evaluation JSONB DEFAULT NULL,
  responses JSONB DEFAULT NULL,
  evaluation_criteria JSONB DEFAULT NULL,
  
  -- Thread IDs for conversational persistence
  thread_id TEXT DEFAULT NULL,
  evaluation_thread_id TEXT DEFAULT NULL,
  generation_thread_id TEXT DEFAULT NULL,
  
  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT TRUE,
  generation_metadata JSONB DEFAULT NULL,
  
  -- Dynamic type metadata
  type_metadata JSONB DEFAULT '{}',
  format_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_email TEXT DEFAULT NULL,
  challenge_id UUID REFERENCES challenges(id),
  
  -- Evaluation data
  score FLOAT DEFAULT NULL,
  overall_score FLOAT DEFAULT NULL,
  feedback TEXT DEFAULT NULL,
  overall_feedback TEXT DEFAULT NULL,
  next_steps TEXT DEFAULT NULL,
  strengths JSONB DEFAULT NULL,
  areas_for_improvement JSONB DEFAULT NULL,
  
  -- Detailed evaluation components
  category_scores JSONB DEFAULT NULL,
  metrics JSONB DEFAULT NULL,
  performance_metrics JSONB DEFAULT NULL,
  strength_analysis JSONB DEFAULT NULL,
  improvement_suggestions JSONB DEFAULT NULL,
  feedback_points JSONB DEFAULT NULL,
  
  -- Response data
  response_id TEXT DEFAULT NULL,
  response_text TEXT DEFAULT NULL,
  
  -- Thread tracking
  thread_id TEXT DEFAULT NULL,
  evaluation_thread_id TEXT DEFAULT NULL,
  
  -- Streaming status
  is_streaming BOOLEAN DEFAULT FALSE,
  streaming_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- Additional data
  metadata JSONB DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Mapping Tables

-- Focus Area to Evaluation Category Mappings
CREATE TABLE IF NOT EXISTS focus_area_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area TEXT NOT NULL,
  category_code TEXT NOT NULL REFERENCES evaluation_categories(code) ON DELETE CASCADE,
  weight INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trait to Challenge Type Mappings
CREATE TABLE IF NOT EXISTS trait_challenge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_code TEXT NOT NULL UNIQUE,
  trait_name TEXT NOT NULL,
  challenge_type_code TEXT NOT NULL REFERENCES challenge_types(code) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Focus Area to Challenge Type Mappings
CREATE TABLE IF NOT EXISTS focus_area_challenge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area TEXT NOT NULL UNIQUE,
  challenge_type_code TEXT NOT NULL REFERENCES challenge_types(code) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversations and User Journey tables

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_email TEXT REFERENCES users(email),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversation States 
CREATE TABLE IF NOT EXISTS conversation_states (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  context TEXT NOT NULL,
  lastResponseId TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT conversation_states_user_context_unique UNIQUE (userId, context)
);

-- User Progress
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_email TEXT REFERENCES users(email),
  focus_area TEXT NOT NULL,
  progress_level INTEGER DEFAULT 1,
  completed_challenges INTEGER DEFAULT 0,
  average_score FLOAT DEFAULT 0,
  skill_levels JSONB DEFAULT '{}',
  last_challenge_id UUID REFERENCES challenges(id),
  last_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Journey Events
CREATE TABLE IF NOT EXISTS user_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_email TEXT REFERENCES users(email),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Thread Activity Logs
CREATE TABLE IF NOT EXISTS thread_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  user_email TEXT REFERENCES users(email),
  activity_type TEXT NOT NULL,
  activity_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Personality data tables

-- Personality Profiles
CREATE TABLE IF NOT EXISTS personality_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_email TEXT REFERENCES users(email),
  profile_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Personality Insights
CREATE TABLE IF NOT EXISTS personality_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_email TEXT REFERENCES users(email),
  insight_type TEXT NOT NULL,
  insight_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  category TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Helper functions 

-- Create a function to insert or update custom challenge types
CREATE OR REPLACE FUNCTION upsert_custom_challenge_type(
  p_code TEXT,
  p_name TEXT,
  p_description TEXT,
  p_parent_code TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_parent_id UUID;
  v_type_id UUID;
BEGIN
  -- Get parent ID if provided
  IF p_parent_code IS NOT NULL THEN
    SELECT id INTO v_parent_id FROM challenge_types WHERE code = p_parent_code;
  END IF;
  
  -- Try to find existing type
  SELECT id INTO v_type_id FROM challenge_types WHERE code = p_code;
  
  -- Insert or update
  IF v_type_id IS NULL THEN
    -- Insert new type
    INSERT INTO challenge_types (
      code, name, description, parent_type_id, metadata, is_system_defined
    ) VALUES (
      p_code, p_name, p_description, v_parent_id, p_metadata, FALSE
    ) RETURNING id INTO v_type_id;
  ELSE
    -- Update existing type
    UPDATE challenge_types SET
      name = p_name,
      description = p_description,
      parent_type_id = v_parent_id,
      metadata = p_metadata,
      updated_at = now()
    WHERE id = v_type_id;
  END IF;
  
  RETURN v_type_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function for challenge completion notifications
CREATE OR REPLACE FUNCTION challenge_completed_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Your logic here for challenge completion notifications
  -- This would typically insert into some notification table
  -- or perform other actions when a challenge is completed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create useful views

-- User activity view
CREATE OR REPLACE VIEW user_activity_view AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  COUNT(DISTINCT c.id) as total_challenges,
  COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_challenges,
  MAX(c.updated_at) as last_activity
FROM 
  users u
LEFT JOIN 
  challenges c ON u.email = c.user_email
GROUP BY 
  u.id, u.email, u.name;

-- User personality view
CREATE OR REPLACE VIEW user_personality_view AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  pp.profile_data,
  pp.created_at as profile_created_at
FROM 
  users u
LEFT JOIN 
  personality_profiles pp ON u.id = pp.user_id;

-- Triggers for updated_at column
CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON challenges
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_challenge_types_updated_at
BEFORE UPDATE ON challenge_types
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_format_types_updated_at
BEFORE UPDATE ON challenge_format_types
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_focus_areas_updated_at
BEFORE UPDATE ON focus_areas
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON evaluations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON user_progress
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_personality_profiles_updated_at
BEFORE UPDATE ON personality_profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER challenge_completed_trigger
AFTER UPDATE ON challenges
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE PROCEDURE challenge_completed_notification();

-- Create indexes for better performance
CREATE INDEX idx_challenges_user_email ON challenges (user_email);
CREATE INDEX idx_challenges_focus_area ON challenges (focus_area);
CREATE INDEX idx_challenges_status ON challenges (status);
CREATE INDEX idx_challenges_created_at ON challenges (created_at);
CREATE INDEX idx_challenges_completed_at ON challenges (completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_challenges_challenge_type_code ON challenges (challenge_type_code);
CREATE INDEX idx_challenges_format_type_code ON challenges (format_type_code);
CREATE INDEX idx_challenge_types_parent_id ON challenge_types (parent_type_id);
CREATE INDEX idx_challenges_type_metadata ON challenges USING gin (type_metadata);
CREATE INDEX idx_challenges_format_metadata ON challenges USING gin (format_metadata);
CREATE INDEX idx_challenges_generation_metadata ON challenges USING gin (generation_metadata);

CREATE INDEX idx_evaluations_user_id ON evaluations (user_id);
CREATE INDEX idx_evaluations_challenge_id ON evaluations (challenge_id);
CREATE INDEX idx_evaluations_created_at ON evaluations (created_at);
CREATE INDEX idx_evaluations_evaluated_at ON evaluations (evaluated_at) WHERE evaluated_at IS NOT NULL;

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_user_progress_user_id ON user_progress (user_id);
CREATE INDEX idx_user_progress_user_email ON user_progress (user_email);
CREATE INDEX idx_user_progress_focus_area ON user_progress (focus_area);

CREATE INDEX idx_personality_profiles_user_id ON personality_profiles (user_id);
CREATE INDEX idx_personality_profiles_user_email ON personality_profiles (user_email);
CREATE INDEX idx_personality_insights_user_id ON personality_insights (user_id);
CREATE INDEX idx_personality_insights_insight_type ON personality_insights (insight_type);

CREATE INDEX idx_conversations_user_email ON conversations (user_email);
CREATE INDEX idx_conversation_states_user_id ON conversation_states (userId);

-- Enable Row Level Security for tables that need it
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);

-- COMMENT ON key tables for documentation
COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON TABLE challenges IS 'Stores user challenges and their status';
COMMENT ON TABLE evaluations IS 'Stores challenge evaluation results';
COMMENT ON TABLE conversation_states IS 'Stores state for stateful API conversations';
COMMENT ON TABLE personality_profiles IS 'Stores user personality assessment results'; 