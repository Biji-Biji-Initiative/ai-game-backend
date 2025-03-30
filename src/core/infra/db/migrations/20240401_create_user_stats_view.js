/**
 * Migration: Create User Stats View Table
 * 
 * This migration creates the user_stats_view table used for the event-driven
 * denormalization pattern as part of our cross-aggregate query strategy.
 * 
 * The table stores pre-computed statistics derived from events across multiple
 * aggregates, eliminating the need for expensive cross-aggregate queries at read time.
 */

// Migration function to be executed during deployment
export async function up(supabase) {
  console.log('Running migration: Create user_stats_view table');
  
  const { error } = await supabase.rpc('create_user_stats_view_table', {});
  
  if (error) {
    console.error('Error creating user_stats_view table:', error);
    throw error;
  }
  
  console.log('Successfully created user_stats_view table');
}

// Define the RPC function to create the table
export async function setupRpcFunction(supabase) {
  const createRpcFunctionSql = `
  CREATE OR REPLACE FUNCTION create_user_stats_view_table()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    -- Create the user_stats_view table if it doesn't exist
    CREATE TABLE IF NOT EXISTS user_stats_view (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      total_challenges_completed INTEGER NOT NULL DEFAULT 0,
      average_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      highest_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0,
      total_score NUMERIC(10,2) NOT NULL DEFAULT 0,
      last_challenge_completed TIMESTAMP WITH TIME ZONE,
      primary_focus_area TEXT,
      total_challenges_by_frontend INTEGER NOT NULL DEFAULT 0,
      total_challenges_by_backend INTEGER NOT NULL DEFAULT 0,
      total_challenges_by_data INTEGER NOT NULL DEFAULT 0,
      total_challenges_by_devops INTEGER NOT NULL DEFAULT 0,
      total_challenges_by_mobile INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_user_stats_view_user_id ON user_stats_view(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_view_email ON user_stats_view(email);
    
    -- Create function to update the updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    -- Create trigger to automatically update the updated_at column
    DROP TRIGGER IF EXISTS update_user_stats_view_updated_at ON user_stats_view;
    CREATE TRIGGER update_user_stats_view_updated_at
    BEFORE UPDATE ON user_stats_view
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
    -- Grant appropriate permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_stats_view TO authenticated;
    GRANT SELECT ON user_stats_view TO anon;
  END;
  $$;
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: createRpcFunctionSql });
  
  if (error) {
    console.error('Error creating RPC function:', error);
    throw error;
  }
  
  console.log('Successfully set up RPC function for user_stats_view table creation');
}

// Rollback function if needed
export async function down(supabase) {
  console.log('Running rollback: Drop user_stats_view table');
  
  const { error } = await supabase.rpc('drop_user_stats_view_table', {});
  
  if (error) {
    console.error('Error dropping user_stats_view table:', error);
    throw error;
  }
  
  console.log('Successfully dropped user_stats_view table');
}

// Define the RPC function to drop the table
export async function setupRollbackFunction(supabase) {
  const createRollbackFunctionSql = `
  CREATE OR REPLACE FUNCTION drop_user_stats_view_table()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    DROP TABLE IF EXISTS user_stats_view;
  END;
  $$;
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: createRollbackFunctionSql });
  
  if (error) {
    console.error('Error creating rollback function:', error);
    throw error;
  }
  
  console.log('Successfully set up rollback function for user_stats_view table');
} 