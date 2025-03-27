-- Migration to create mapping tables for challenge types
-- This enables dynamic trait and focus area mappings to challenge types

-- Create table for trait to challenge type mappings
CREATE TABLE IF NOT EXISTS trait_challenge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_code TEXT NOT NULL UNIQUE,
  trait_name TEXT NOT NULL,
  challenge_type_code TEXT NOT NULL REFERENCES challenge_types(code) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for focus area to challenge type mappings
CREATE TABLE IF NOT EXISTS focus_area_challenge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area TEXT NOT NULL UNIQUE,
  challenge_type_code TEXT NOT NULL REFERENCES challenge_types(code) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default trait mappings
INSERT INTO trait_challenge_mappings (trait_code, trait_name, challenge_type_code)
VALUES
  ('analyticalThinking', 'Analytical Thinking', 'critical-thinking'),
  ('creativity', 'Creativity', 'creative-synthesis'),
  ('empathy', 'Empathy', 'ethical-dilemma'),
  ('riskTaking', 'Risk Taking', 'future-scenario'),
  ('adaptability', 'Adaptability', 'human-ai-boundary')
ON CONFLICT (trait_code) DO UPDATE
SET 
  trait_name = EXCLUDED.trait_name,
  challenge_type_code = EXCLUDED.challenge_type_code,
  updated_at = now();

-- Insert default focus area mappings
INSERT INTO focus_area_challenge_mappings (focus_area, challenge_type_code)
VALUES
  ('AI Ethics', 'ethical-dilemma'),
  ('Human-AI Collaboration', 'human-ai-boundary'),
  ('Future of Work with AI', 'future-scenario'),
  ('Creative AI Applications', 'creative-synthesis'),
  ('AI Impact on Society', 'critical-thinking')
ON CONFLICT (focus_area) DO UPDATE
SET 
  challenge_type_code = EXCLUDED.challenge_type_code,
  updated_at = now();

-- Add indexes for performance
CREATE INDEX idx_trait_challenge_mappings_trait_code ON trait_challenge_mappings (trait_code);
CREATE INDEX idx_trait_challenge_mappings_challenge_type_code ON trait_challenge_mappings (challenge_type_code);
CREATE INDEX idx_focus_area_challenge_mappings_focus_area ON focus_area_challenge_mappings (focus_area);
CREATE INDEX idx_focus_area_challenge_mappings_challenge_type_code ON focus_area_challenge_mappings (challenge_type_code);

-- Add RLS policies for security
ALTER TABLE trait_challenge_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_area_challenge_mappings ENABLE ROW LEVEL SECURITY;

-- Everyone can view trait mappings
CREATE POLICY trait_mapping_select_policy ON trait_challenge_mappings
  FOR SELECT USING (true);

-- Everyone can view focus area mappings
CREATE POLICY focus_area_mapping_select_policy ON focus_area_challenge_mappings
  FOR SELECT USING (true);

-- Only authenticated users can modify mappings
CREATE POLICY trait_mapping_modify_policy ON trait_challenge_mappings
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY focus_area_mapping_modify_policy ON focus_area_challenge_mappings
  FOR ALL USING (auth.role() = 'authenticated'); 