-- Add comprehensive Row Level Security policies to all tables
-- This ensures that data is properly secured at the database level

-- =====================================================================
-- Users Table Security Policies
-- =====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY; -- in case it's not already enabled

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;

-- Create new policies
-- Users can only read their own data
CREATE POLICY "Users can view their own data" ON users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can only update their own data
CREATE POLICY "Users can update their own data" ON users 
  FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Admins can view all users (when using service role)
CREATE POLICY "Admin can view all users" ON users 
  FOR SELECT 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- Challenges Table Security Policies
-- =====================================================================
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own challenges" ON challenges;
DROP POLICY IF EXISTS "Users can create own challenges" ON challenges;
DROP POLICY IF EXISTS "Users can update own challenges" ON challenges;
DROP POLICY IF EXISTS "Admin can access all challenges" ON challenges;

-- Create new policies
-- Users can view only their own challenges
CREATE POLICY "Users can view own challenges" ON challenges 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT id FROM users WHERE email = user_email
  ));

-- Users can create challenges for themselves only
CREATE POLICY "Users can create own challenges" ON challenges 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT id FROM users WHERE email = user_email
  ));

-- Users can update only their own challenges
CREATE POLICY "Users can update own challenges" ON challenges 
  FOR UPDATE 
  USING (auth.uid() IN (
    SELECT id FROM users WHERE email = user_email
  )) 
  WITH CHECK (auth.uid() IN (
    SELECT id FROM users WHERE email = user_email
  ));

-- Admins can access all challenges
CREATE POLICY "Admin can access all challenges" ON challenges 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- Evaluations Table Security Policies
-- =====================================================================
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own evaluations" ON evaluations;
DROP POLICY IF EXISTS "Admin can access all evaluations" ON evaluations;

-- Create new policies
-- Users can view only their own evaluations
CREATE POLICY "Users can view own evaluations" ON evaluations 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    user_email IN (SELECT email FROM users WHERE id = auth.uid())
  );

-- Admin access for backend service
CREATE POLICY "Admin can access all evaluations" ON evaluations 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- Personality Profiles Table Security Policies
-- =====================================================================
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own personality profile" ON personality_profiles;
DROP POLICY IF EXISTS "Admin can access all personality profiles" ON personality_profiles;

-- Create new policies
-- Users can view only their own personality profile
CREATE POLICY "Users can view own personality profile" ON personality_profiles 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    user_email IN (SELECT email FROM users WHERE id = auth.uid())
  );

-- Admin access for backend service
CREATE POLICY "Admin can access all personality profiles" ON personality_profiles 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- Personality Insights Table Security Policies
-- =====================================================================
ALTER TABLE personality_insights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own personality insights" ON personality_insights;
DROP POLICY IF EXISTS "Admin can access all personality insights" ON personality_insights;

-- Create new policies
-- Users can view only their own personality insights
CREATE POLICY "Users can view own personality insights" ON personality_insights 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    user_email IN (SELECT email FROM users WHERE id = auth.uid())
  );

-- Admin access for backend service
CREATE POLICY "Admin can access all personality insights" ON personality_insights 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- User Progress Table Security Policies
-- =====================================================================
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Admin can access all user progress" ON user_progress;

-- Create new policies
-- Users can view only their own progress
CREATE POLICY "Users can view own progress" ON user_progress 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    user_email IN (SELECT email FROM users WHERE id = auth.uid())
  );

-- Admin access for backend service
CREATE POLICY "Admin can access all user progress" ON user_progress 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- Conversations Table Security Policies
-- =====================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Admin can access all conversations" ON conversations;

-- Create new policies
-- Users can view only their own conversations
CREATE POLICY "Users can view own conversations" ON conversations 
  FOR SELECT 
  USING (
    user_email IN (SELECT email FROM users WHERE id = auth.uid())
  );

-- Admin access for backend service
CREATE POLICY "Admin can access all conversations" ON conversations 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- Conversation States Table Security Policies
-- =====================================================================
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own conversation states" ON conversation_states;
DROP POLICY IF EXISTS "Admin can access all conversation states" ON conversation_states;

-- Create new policies
-- Users can view only their own conversation states
CREATE POLICY "Users can view own conversation states" ON conversation_states 
  FOR SELECT 
  USING (
    userId = auth.uid()
  );

-- Admin access for backend service
CREATE POLICY "Admin can access all conversation states" ON conversation_states 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================================
-- Leave read-only tables accessible to authenticated users
-- =====================================================================

-- Challenge Types, Format Types, and other lookup tables are read-only for regular users
ALTER TABLE challenge_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view challenge types" ON challenge_types
  FOR SELECT
  USING (auth.role() IS NOT NULL);

ALTER TABLE challenge_format_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view format types" ON challenge_format_types
  FOR SELECT
  USING (auth.role() IS NOT NULL);

ALTER TABLE focus_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view focus areas" ON focus_areas
  FOR SELECT
  USING (auth.role() IS NOT NULL);

ALTER TABLE difficulty_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view difficulty levels" ON difficulty_levels
  FOR SELECT
  USING (auth.role() IS NOT NULL);

ALTER TABLE evaluation_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view evaluation categories" ON evaluation_categories
  FOR SELECT
  USING (auth.role() IS NOT NULL);

-- =====================================================================
-- Add comment to explain RLS setup
-- =====================================================================
COMMENT ON TABLE users IS 'Stores user account information with RLS enabled';
COMMENT ON TABLE challenges IS 'Stores user challenges with RLS enabled';
COMMENT ON TABLE evaluations IS 'Stores challenge evaluations with RLS enabled';
COMMENT ON TABLE personality_profiles IS 'Stores user personality profiles with RLS enabled';
COMMENT ON TABLE personality_insights IS 'Stores user personality insights with RLS enabled';
COMMENT ON TABLE user_progress IS 'Stores user progress with RLS enabled';
COMMENT ON TABLE conversations IS 'Stores conversations with RLS enabled';
COMMENT ON TABLE conversation_states IS 'Stores conversation states with RLS enabled'; 