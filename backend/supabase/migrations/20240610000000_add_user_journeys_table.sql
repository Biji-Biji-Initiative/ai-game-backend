-- Create user_journeys table for the UserJourney aggregate
-- Migration: 20240610000000_add_user_journeys_table.sql

-- Table for the UserJourney aggregate
CREATE TABLE IF NOT EXISTS user_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    session_count INTEGER DEFAULT 0,
    current_session_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    engagement_level TEXT DEFAULT 'new',
    metrics JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Add appropriate indexes
CREATE INDEX IF NOT EXISTS user_journeys_user_id_idx ON user_journeys(user_id);
CREATE INDEX IF NOT EXISTS user_journeys_engagement_level_idx ON user_journeys(engagement_level);
CREATE INDEX IF NOT EXISTS user_journeys_last_activity_idx ON user_journeys(last_activity);

-- Enable Row Level Security
ALTER TABLE user_journeys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own journey data
CREATE POLICY user_journey_select_policy ON user_journeys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own journey data (strictly speaking, this would be application-managed)
CREATE POLICY user_journey_insert_policy ON user_journeys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own journey data (strictly speaking, this would be application-managed)
CREATE POLICY user_journey_update_policy ON user_journeys
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass (allows the backend application to manage all journey data)
CREATE POLICY service_role_policy ON user_journeys
  USING (auth.role() = 'service_role');

-- Ensure table is discoverable
COMMENT ON TABLE user_journeys IS 'Aggregate table for user journey state';

-- Ensure user_journey_events table is properly set up
CREATE TABLE IF NOT EXISTS user_journey_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    event_data JSONB DEFAULT '{}'::jsonb,
    challenge_id UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add appropriate indexes for the events table
CREATE INDEX IF NOT EXISTS user_journey_events_user_id_idx ON user_journey_events(user_id);
CREATE INDEX IF NOT EXISTS user_journey_events_event_type_idx ON user_journey_events(event_type);
CREATE INDEX IF NOT EXISTS user_journey_events_timestamp_idx ON user_journey_events(timestamp);
CREATE INDEX IF NOT EXISTS user_journey_events_challenge_id_idx ON user_journey_events(challenge_id) WHERE challenge_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE user_journey_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for events table
-- Users can read their own events
CREATE POLICY user_journey_events_select_policy ON user_journey_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create events about themselves (strictly speaking, this would be application-managed)
CREATE POLICY user_journey_events_insert_policy ON user_journey_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY service_role_events_policy ON user_journey_events
  USING (auth.role() = 'service_role');

-- Ensure table is discoverable
COMMENT ON TABLE user_journey_events IS 'Individual events for user journey tracking'; 