-- Update focus_areas table to ensure it matches our model requirements
ALTER TABLE focus_areas 
  ALTER COLUMN description DROP NOT NULL; -- Description is optional in our model

-- Add relevance_explanation column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'focus_areas' AND column_name = 'relevance_score'
  ) THEN
    ALTER TABLE focus_areas ADD COLUMN relevance_score REAL;
  END IF;
END $$;

-- Add relevance_explanation column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'focus_areas' AND column_name = 'relevance_explanation'
  ) THEN
    ALTER TABLE focus_areas ADD COLUMN relevance_explanation TEXT;
  END IF;
END $$;

-- Add suggested_challenges column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'focus_areas' AND column_name = 'suggested_challenges'
  ) THEN
    ALTER TABLE focus_areas ADD COLUMN suggested_challenges JSONB;
  END IF;
END $$;

-- Add skill_progression column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'focus_areas' AND column_name = 'skill_progression'
  ) THEN
    ALTER TABLE focus_areas ADD COLUMN skill_progression JSONB;
  END IF;
END $$;

-- Add is_selected column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'focus_areas' AND column_name = 'is_selected'
  ) THEN
    ALTER TABLE focus_areas ADD COLUMN is_selected BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Add ai_generated column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'focus_areas' AND column_name = 'ai_generated'
  ) THEN
    ALTER TABLE focus_areas ADD COLUMN ai_generated BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;

-- Add generation_thread_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'focus_areas' AND column_name = 'generation_thread_id'
  ) THEN
    ALTER TABLE focus_areas ADD COLUMN generation_thread_id UUID;
  END IF;
END $$; 