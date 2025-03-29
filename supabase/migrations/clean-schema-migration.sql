-- CLEAN SCHEMA MIGRATION
-- This file contains a complete schema definition based on code models

-- First drop all existing tables and types (if any exist) to ensure clean slate
DO $$ 
DECLARE
  tbl text;
  typ text;
BEGIN
  -- Drop all tables
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(tbl) || ' CASCADE';
  END LOOP;
  
  -- Drop all types
  FOR typ IN 
    SELECT typname FROM pg_type 
    JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid 
    WHERE pg_namespace.nspname = 'public' 
    AND pg_type.typtype = 'e'
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(typ) || ' CASCADE';
  END LOOP;
END $$;

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
  description TEXT NOT NULL,
  related_areas TEXT[] DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  learning_outcomes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
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
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now()
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
    END IF;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create views

-- User Activity View
CREATE OR REPLACE VIEW user_activity_view AS
SELECT 
  u.id,
  u.email,
  u.name,
  COUNT(DISTINCT c.id) AS challenge_count,
  COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) AS completed_challenges,
  MAX(c.completed_at) AS last_challenge_completed,
  COUNT(DISTINCT e.id) AS evaluation_count,
  AVG(e.overall_score) AS average_score,
  COUNT(DISTINCT conv.id) AS conversation_count,
  JSONB_AGG(DISTINCT fa.focus_area) FILTER (WHERE fa.focus_area IS NOT NULL) AS focus_areas
FROM 
  users u
LEFT JOIN challenges c ON u.email = c.user_email
LEFT JOIN evaluations e ON u.id = e.user_id
LEFT JOIN conversations conv ON u.email = conv.user_email
LEFT JOIN (
  SELECT DISTINCT user_email, focus_area 
  FROM challenges
  WHERE focus_area IS NOT NULL
) fa ON u.email = fa.user_email
GROUP BY u.id, u.email, u.name;

-- User Personality View
CREATE OR REPLACE VIEW user_personality_view AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  pp.profile_data,
  JSONB_AGG(pi.insight_data) FILTER (WHERE pi.id IS NOT NULL) AS insights,
  pp.updated_at AS profile_updated_at
FROM 
  users u
LEFT JOIN personality_profiles pp ON u.id = pp.user_id
LEFT JOIN personality_insights pi ON u.id = pi.user_id
GROUP BY u.id, u.email, u.name, pp.profile_data, pp.updated_at;

-- Create triggers for auto-updating timestamps

-- Challenges
CREATE TRIGGER update_challenges_updated_at
BEFORE UPDATE ON challenges
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Challenge Types
CREATE TRIGGER update_challenge_types_updated_at
BEFORE UPDATE ON challenge_types
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Challenge Format Types
CREATE TRIGGER update_format_types_updated_at
BEFORE UPDATE ON challenge_format_types
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Users
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Focus Areas
CREATE TRIGGER update_focus_areas_updated_at
BEFORE UPDATE ON focus_areas
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Conversations
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Evaluations
CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON evaluations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- User Progress
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON user_progress
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Personality Profiles
CREATE TRIGGER update_personality_profiles_updated_at
BEFORE UPDATE ON personality_profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Challenge completion trigger
CREATE TRIGGER challenge_completed_trigger
AFTER UPDATE ON challenges
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE PROCEDURE challenge_completed_notification();

-- Add Row Level Security policies

-- Enable RLS on tables
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_format_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own challenges
CREATE POLICY challenge_select_policy ON challenges
  FOR SELECT USING (user_email = auth.uid()::text OR user_email = current_user);

-- Policy: Users can only update their own challenges
CREATE POLICY challenge_update_policy ON challenges
  FOR UPDATE USING (user_email = auth.uid()::text OR user_email = current_user);

-- Policy: Users can only insert challenges for themselves
CREATE POLICY challenge_insert_policy ON challenges
  FOR INSERT WITH CHECK (user_email = auth.uid()::text OR user_email = current_user);

-- Policy: Users can only delete their own challenges
CREATE POLICY challenge_delete_policy ON challenges
  FOR DELETE USING (user_email = auth.uid()::text OR user_email = current_user);

-- Policy: Everyone can view challenge types
CREATE POLICY challenge_type_select_policy ON challenge_types
  FOR SELECT USING (true);

-- Policy: Only authenticated users can create custom challenge types
CREATE POLICY challenge_type_insert_policy ON challenge_types
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND NOT is_system_defined);

-- Default data for system tables

-- Insert base challenge types
INSERT INTO challenge_types (code, name, description, is_system_defined) VALUES
  ('critical-thinking', 'Critical Thinking', 'Challenges that require analysis, evaluation, and complex problem-solving', TRUE),
  ('ethical-dilemma', 'Ethical Dilemma', 'Scenarios that pose ethical questions requiring thoughtful consideration', TRUE),
  ('creative-synthesis', 'Creative Synthesis', 'Challenges that involve combining ideas to create new solutions', TRUE),
  ('future-scenario', 'Future Scenario', 'Forward-looking situations that require strategic thinking', TRUE),
  ('human-ai-boundary', 'Human-AI Boundary', 'Exploration of the boundaries between human and AI capabilities', TRUE),
  ('technical-implementation', 'Technical Implementation', 'Challenges focused on implementing technical solutions', TRUE),
  ('communication', 'Communication', 'Challenges that test effective communication skills', TRUE),
  ('problem-solving', 'Problem Solving', 'General problem-solving scenarios', TRUE),
  ('custom', 'Custom', 'Custom challenge type defined dynamically', TRUE);

-- Insert base format types
INSERT INTO challenge_format_types (code, name, description, is_system_defined) VALUES
  ('multiple-choice', 'Multiple Choice', 'Questions with predetermined answer options', TRUE),
  ('open-ended', 'Open Ended', 'Questions requiring free-form responses', TRUE),
  ('scenario', 'Scenario', 'Detailed situations requiring analysis and response', TRUE),
  ('reflection', 'Reflection', 'Prompts that ask for personal reflection', TRUE),
  ('simulation', 'Simulation', 'Interactive scenarios simulating real-world situations', TRUE),
  ('mixed', 'Mixed', 'Combination of multiple format types', TRUE);

-- Insert base difficulty levels
INSERT INTO difficulty_levels (code, name, description, question_count, context_complexity, standard_time) VALUES
  ('beginner', 'Beginner', 'Entry-level challenges with simple concepts', 1, 0.3, 300),
  ('intermediate', 'Intermediate', 'Moderate complexity requiring some domain knowledge', 2, 0.5, 600),
  ('advanced', 'Advanced', 'Complex challenges requiring deep understanding', 3, 0.7, 900),
  ('expert', 'Expert', 'Highly complex challenges requiring comprehensive expertise', 4, 0.9, 1200);

-- Insert base evaluation categories
INSERT INTO evaluation_categories (code, name, description, is_system_defined) VALUES
  ('critical-thinking', 'Critical Thinking', 'Ability to analyze information and form reasoned judgments', TRUE),
  ('creativity', 'Creativity', 'Generation of novel and valuable ideas or solutions', TRUE),
  ('empathy', 'Empathy', 'Understanding and sharing the feelings of others', TRUE),
  ('ethics', 'Ethics', 'Moral principles and values in decision making', TRUE),
  ('communication', 'Communication', 'Clear and effective expression of ideas', TRUE),
  ('problem-solving', 'Problem Solving', 'Ability to find solutions to challenging situations', TRUE),
  ('strategic-thinking', 'Strategic Thinking', 'Long-term planning and vision', TRUE),
  ('adaptability', 'Adaptability', 'Flexibility in changing situations', TRUE);

-- Create indexes for improved query performance

-- Challenges table indexes
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

-- Evaluations table indexes
CREATE INDEX idx_evaluations_user_id ON evaluations (user_id);
CREATE INDEX idx_evaluations_challenge_id ON evaluations (challenge_id);
CREATE INDEX idx_evaluations_created_at ON evaluations (created_at);
CREATE INDEX idx_evaluations_evaluated_at ON evaluations (evaluated_at) WHERE evaluated_at IS NOT NULL;

-- User tables indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_user_progress_user_id ON user_progress (user_id);
CREATE INDEX idx_user_progress_user_email ON user_progress (user_email);
CREATE INDEX idx_user_progress_focus_area ON user_progress (focus_area);

-- Personality tables indexes
CREATE INDEX idx_personality_profiles_user_id ON personality_profiles (user_id);
CREATE INDEX idx_personality_profiles_user_email ON personality_profiles (user_email);
CREATE INDEX idx_personality_insights_user_id ON personality_insights (user_id);
CREATE INDEX idx_personality_insights_insight_type ON personality_insights (insight_type);

-- Conversations indexes
CREATE INDEX idx_conversations_user_email ON conversations (user_email);
CREATE INDEX idx_conversation_states_user_id ON conversation_states (userId); 