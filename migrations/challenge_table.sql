-- Migration to create the challenges table for the new Challenge domain model
-- This follows the Domain-Driven Design principles with a flexible approach to types

-- Create enum for challenge statuses (keeping this as enum since it's a core state)
CREATE TYPE challenge_status AS ENUM ('active', 'submitted', 'completed', 'archived');

-- Create table for challenge types (replacing enum)
CREATE TABLE IF NOT EXISTS challenge_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_type_id UUID REFERENCES challenge_types(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_system_defined BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);

-- Create table for challenge format types (replacing enum)
CREATE TABLE IF NOT EXISTS challenge_format_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_system_defined BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);

-- Create enum for difficulty levels (keeping this as enum since it's standard)
CREATE TYPE challenge_difficulty AS ENUM (
  'beginner',
  'intermediate',
  'advanced',
  'expert'
);

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

-- Create the challenges table with references to type tables
CREATE TABLE IF NOT EXISTS challenges (
  -- Core identification
  id UUID PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  
  -- Core challenge properties
  title TEXT NOT NULL,
  challenge_type_id UUID REFERENCES challenge_types(id),
  challenge_type_code TEXT NOT NULL, -- Denormalized for flexibility
  format_type_id UUID REFERENCES challenge_format_types(id),
  format_type_code TEXT NOT NULL, -- Denormalized for flexibility
  focus_area TEXT NOT NULL,
  difficulty challenge_difficulty NOT NULL,
  content JSONB NOT NULL,
  
  -- Optional properties
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
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- AI generation metadata
  ai_generated BOOLEAN DEFAULT TRUE,
  generation_metadata JSONB DEFAULT NULL,
  
  -- Dynamic type metadata
  type_metadata JSONB DEFAULT '{}',
  format_metadata JSONB DEFAULT '{}'
);

-- Add indexes for common query patterns
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

-- Add RLS policies for data security
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_format_types ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own challenges
CREATE POLICY challenge_select_policy ON challenges
  FOR SELECT USING (user_email = auth.uid() OR user_email = current_user);

-- Policy: Users can only update their own challenges
CREATE POLICY challenge_update_policy ON challenges
  FOR UPDATE USING (user_email = auth.uid() OR user_email = current_user);

-- Policy: Users can only insert challenges for themselves
CREATE POLICY challenge_insert_policy ON challenges
  FOR INSERT WITH CHECK (user_email = auth.uid() OR user_email = current_user);

-- Policy: Users can only delete their own challenges
CREATE POLICY challenge_delete_policy ON challenges
  FOR DELETE USING (user_email = auth.uid() OR user_email = current_user);

-- Policy: Everyone can view challenge types
CREATE POLICY challenge_type_select_policy ON challenge_types
  FOR SELECT USING (true);

-- Policy: Only authenticated users can create custom challenge types
CREATE POLICY challenge_type_insert_policy ON challenge_types
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND NOT is_system_defined);

-- Policy: Only authenticated users can update custom challenge types
CREATE POLICY challenge_type_update_policy ON challenge_types
  FOR UPDATE USING (auth.role() = 'authenticated' AND NOT is_system_defined);

-- Policy: Only authenticated users can delete custom challenge types
CREATE POLICY challenge_type_delete_policy ON challenge_types
  FOR DELETE USING (auth.role() = 'authenticated' AND NOT is_system_defined);

-- Policy: Everyone can view format types
CREATE POLICY format_type_select_policy ON challenge_format_types
  FOR SELECT USING (true);

-- Policy: Only authenticated users can create custom format types
CREATE POLICY format_type_insert_policy ON challenge_format_types
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND NOT is_system_defined);

-- Policy: Only authenticated users can update custom format types
CREATE POLICY format_type_update_policy ON challenge_format_types
  FOR UPDATE USING (auth.role() = 'authenticated' AND NOT is_system_defined);

-- Policy: Only authenticated users can delete custom format types
CREATE POLICY format_type_delete_policy ON challenge_format_types
  FOR DELETE USING (auth.role() = 'authenticated' AND NOT is_system_defined);

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

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to call the function on record update
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

-- Create the trigger for challenge completion
CREATE TRIGGER challenge_completed_trigger
AFTER UPDATE ON challenges
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE PROCEDURE challenge_completed_notification(); 