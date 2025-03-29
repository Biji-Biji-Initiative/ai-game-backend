-- Challenge Configuration Tables
-- This migration creates the tables needed for the challenge configuration

-- Challenge Types table
CREATE TABLE IF NOT EXISTS challenge_types (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  format_types TEXT[] DEFAULT '{}',
  focus_areas TEXT[] DEFAULT '{}',
  leveraged_traits TEXT[] DEFAULT '{}',
  progression_path TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Format Types table
CREATE TABLE IF NOT EXISTS format_types (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt_structure TEXT DEFAULT '',
  response_format TEXT DEFAULT '',
  evaluation_criteria TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Focus Areas table
CREATE TABLE IF NOT EXISTS focus_areas (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  related_areas TEXT[] DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  learning_outcomes JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Difficulty Levels table
CREATE TABLE IF NOT EXISTS difficulty_levels (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  question_count INTEGER DEFAULT 1,
  context_complexity FLOAT DEFAULT 0.5,
  standard_time INTEGER DEFAULT 300,
  sort_order INTEGER DEFAULT 0,
  requirements JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_challenge_types_code ON challenge_types(code);
CREATE INDEX IF NOT EXISTS idx_challenge_types_active ON challenge_types(is_active);
CREATE INDEX IF NOT EXISTS idx_format_types_code ON format_types(code);
CREATE INDEX IF NOT EXISTS idx_format_types_active ON format_types(is_active);
CREATE INDEX IF NOT EXISTS idx_focus_areas_code ON focus_areas(code);
CREATE INDEX IF NOT EXISTS idx_focus_areas_active ON focus_areas(is_active);
CREATE INDEX IF NOT EXISTS idx_focus_areas_display_order ON focus_areas(display_order);
CREATE INDEX IF NOT EXISTS idx_difficulty_levels_code ON difficulty_levels(code);
CREATE INDEX IF NOT EXISTS idx_difficulty_levels_active ON difficulty_levels(is_active);
CREATE INDEX IF NOT EXISTS idx_difficulty_levels_sort_order ON difficulty_levels(sort_order);

-- Add GIN indexes for array fields to support contains operations
CREATE INDEX IF NOT EXISTS idx_challenge_types_format_types ON challenge_types USING GIN (format_types);
CREATE INDEX IF NOT EXISTS idx_challenge_types_focus_areas ON challenge_types USING GIN (focus_areas);
CREATE INDEX IF NOT EXISTS idx_focus_areas_related_areas ON focus_areas USING GIN (related_areas);
CREATE INDEX IF NOT EXISTS idx_focus_areas_prerequisites ON focus_areas USING GIN (prerequisites); 