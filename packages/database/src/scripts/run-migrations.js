/**
 * Database Migration Script
 *
 * This script connects to Supabase and runs database migrations
 * from the migrations directory.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('ERROR: SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_KEY/SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigrations() {
  try {
    console.log('Checking migration directory:', migrationsDir);

    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory doesn't exist: ${migrationsDir}`);
      process.exit(1);
    }

    // Get all migration files, sorted by name
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log(`Found ${migrationFiles.length} migration files.`);

    // Create migrations table if it doesn't exist
    const { error: createTableError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (createTableError) {
      throw new Error(`Failed to create migrations table: ${createTableError.message}`);
    }

    // Get already applied migrations
    const { data: appliedMigrations, error: fetchError } = await supabase
      .from('migrations')
      .select('name');

    if (fetchError) {
      throw new Error(`Failed to fetch applied migrations: ${fetchError.message}`);
    }

    const appliedMigrationNames = appliedMigrations.map(m => m.name);

    // Run each migration that hasn't been applied yet
    for (const migrationFile of migrationFiles) {
      if (appliedMigrationNames.includes(migrationFile)) {
        console.log(`Migration ${migrationFile} already applied, skipping.`);
        continue;
      }

      console.log(`Applying migration: ${migrationFile}`);

      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      // Run the migration
      const { error: migrationError } = await supabase.rpc('execute_sql', {
        sql_query: migrationSql
      });

      if (migrationError) {
        throw new Error(`Failed to apply migration ${migrationFile}: ${migrationError.message}`);
      }

      // Record the migration
      const { error: recordError } = await supabase
        .from('migrations')
        .insert({ name: migrationFile });

      if (recordError) {
        throw new Error(`Failed to record migration ${migrationFile}: ${recordError.message}`);
      }

      console.log(`Migration ${migrationFile} applied successfully.`);
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

runMigrations();
