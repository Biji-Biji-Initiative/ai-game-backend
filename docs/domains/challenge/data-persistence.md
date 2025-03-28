# Challenge Module Supabase Integration

## Overview

This document describes the integration between the Challenge domain model and Supabase database. It outlines the database schema, conversion between domain model and database records, and provides instructions for setting up the required Supabase tables and functions.

## Database Schema

The Challenge module uses a `challenges` table in Supabase with the following schema:

```sql
CREATE TABLE challenges (
  -- Core identification
  id UUID PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  
  -- Core challenge properties
  title TEXT NOT NULL,
  challenge_type challenge_type NOT NULL,
  format_type challenge_format_type NOT NULL,
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
  generation_metadata JSONB DEFAULT NULL
);
```

## Custom Enum Types

The Challenge module uses several custom enum types for type safety:

1. `challenge_status`: Represents the status of a challenge
   - `active`: Challenge is active but not yet submitted
   - `submitted`: Challenge has been submitted but not evaluated
   - `completed`: Challenge has been evaluated
   - `archived`: Challenge has been archived

2. `challenge_type`: Represents the type of challenge
   - Various types such as `critical-thinking`, `ethical-dilemma`, etc.

3. `challenge_format_type`: Represents the format of the challenge
   - `multiple-choice`, `open-ended`, etc.

4. `challenge_difficulty`: Represents the difficulty level
   - `beginner`, `intermediate`, `advanced`, `expert`

## Data Mapping

The Challenge domain model uses camelCase properties, while the Supabase database uses snake_case field names. The `challengeDbMapper` utility handles conversion between these formats:

- `toModel`: Converts a database record to a Challenge domain model
- `toDbRecord`: Converts a Challenge domain model to a database record
- `toModelList`: Converts a list of database records to Challenge domain models
- `convertUpdatesToDbFormat`: Converts an updates object to database format

## Repository Implementation

The Challenge repository handles all database operations:

1. `createChallenge`: Creates a new challenge in the database
2. `getChallengeById`: Gets a challenge by ID
3. `getChallengesForUser`: Gets all challenges for a user
4. `getRecentChallengesForUser`: Gets a user's recent challenges
5. `updateChallenge`: Updates a challenge
6. `deleteChallenge`: Deletes a challenge
7. `getChallengesByFocusArea`: Gets challenges by focus area
8. `getUserChallengeHistory`: Gets a user's challenge history

## Row Level Security

Supabase Row Level Security (RLS) policies restrict access to challenges:

1. Users can only see their own challenges
2. Users can only insert their own challenges
3. Users can only update their own challenges
4. Users can only delete their own challenges
5. Admins can manage all challenges

## Notifications Integration

A database trigger automatically creates notifications when a challenge is completed:

```sql
CREATE TRIGGER challenge_completed_trigger
AFTER UPDATE ON challenges
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE PROCEDURE challenge_completed_notification();
```

## Setup Instructions

1. Create the enums and table in Supabase:
   ```bash
   node scripts/applyMigration.js migrations/challenge_table.sql
   ```

2. Verify the table was created:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'challenges';
   ```

3. Make sure Row Level Security is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'challenges';
   ```

## Indexes

The following indexes are created to optimize query performance:

```sql
CREATE INDEX idx_challenges_user_email ON challenges (user_email);
CREATE INDEX idx_challenges_focus_area ON challenges (focus_area);
CREATE INDEX idx_challenges_status ON challenges (status);
CREATE INDEX idx_challenges_created_at ON challenges (created_at);
CREATE INDEX idx_challenges_completed_at ON challenges (completed_at) WHERE completed_at IS NOT NULL;
```

## Testing

You can test the Supabase integration using the Challenge module tests:

```bash
npm run test:challenges
```

These tests include:
- Creating challenges in the database
- Retrieving challenges
- Updating challenges
- Running queries with filters

## Troubleshooting

If you encounter issues with the Supabase integration:

1. Check that the database tables and enums exist
2. Verify Row Level Security policies are correctly set up
3. Check that the service role key has the necessary permissions
4. Look for errors in the Supabase logs 