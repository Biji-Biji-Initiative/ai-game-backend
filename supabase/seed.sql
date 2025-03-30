-- Seed file for local development
-- This file adds test data that will be loaded during 'supabase db reset'

-- Insert test users
INSERT INTO users (id, email, name, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'test@example.com', 'Test User', now()),
  ('22222222-2222-2222-2222-222222222222', 'developer@example.com', 'Developer User', now())
ON CONFLICT (email) DO NOTHING;

-- Auto-confirm test users for local development only
-- IMPORTANT: This is for LOCAL DEVELOPMENT ONLY
-- Do not include this in production migrations!

DO $$
BEGIN
  -- Check if auth.users exists (it might not in some local setups)
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'auth' AND tablename = 'users'
  ) THEN
    -- Auto confirm test users
    UPDATE auth.users 
    SET email_confirmed_at = now() 
    WHERE email IN ('test@example.com', 'developer@example.com')
    AND email_confirmed_at IS NULL;
  END IF;
END $$;

-- Add test personality profile for the test user
INSERT INTO personality_profiles (user_id, user_email, profile_data)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'test@example.com', 
   '{
     "traits": {
       "openness": 0.85,
       "conscientiousness": 0.65,
       "extraversion": 0.45,
       "agreeableness": 0.75,
       "neuroticism": 0.35
     },
     "learning_style": "visual",
     "strengths": ["creative", "detail_oriented", "analytical"],
     "areas_for_growth": ["time_management", "public_speaking"]
   }'
  )
ON CONFLICT (user_id) DO NOTHING;

-- Add test challenges for the test user
INSERT INTO challenges (
  user_email, 
  title, 
  challenge_type_code, 
  format_type_code, 
  focus_area, 
  difficulty, 
  content,
  status,
  created_at
)
VALUES
  (
    'test@example.com',
    'Sample Coding Challenge',
    'code_implementation',
    'implementation',
    'coding',
    'beginner',
    '{"description": "Create a function that adds two numbers", "requirements": ["Must handle positive and negative numbers", "Must return a numeric result"]}',
    'active',
    now() - interval '2 days'
  ),
  (
    'test@example.com',
    'Sample Problem Solving Challenge',
    'problem_solving',
    'written',
    'problem_solving',
    'intermediate',
    '{"description": "Describe how you would architect a scalable web application", "requirements": ["Must address database design", "Must include security considerations"]}',
    'completed',
    now() - interval '7 days'
  )
ON CONFLICT DO NOTHING; 