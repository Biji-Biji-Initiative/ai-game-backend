const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config();

/**
 * This script completely resets and rebuilds the Supabase database schema.
 * 1. Creates a migration file with DROP commands to clean the database
 * 2. Creates a migration file with the clean schema
 * 3. Applies both migrations in sequence
 * 4. Regenerates the TypeScript types
 */

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLEANUP_SQL = 'cleanup-db.sql';
const SCHEMA_SQL = 'clean-schema-migration.sql';

console.log('🧹 COMPLETELY RESETTING SUPABASE DATABASE 🧹');
console.log('⚠️  WARNING: This will delete ALL data in your database! ⚠️');
console.log('You have 5 seconds to cancel (Ctrl+C)...');

// Wait 5 seconds before proceeding
setTimeout(() => {
  try {
    // Extract project reference from URL
    const projectRef = SUPABASE_URL.split('https://')[1].split('.')[0];
    console.log(`\n📦 Project reference: ${projectRef}`);
    
    // Step 1: Link to Supabase project
    console.log('\n🔗 Step 1: Linking to Supabase project...');
    try {
      execSync(`npx supabase link --project-ref ${projectRef}`, { stdio: 'inherit' });
      console.log('✅ Linked to Supabase project');
    } catch (error) {
      console.error('⚠️ Error linking to project. You may need to complete this step manually.');
      console.log(`Run: npx supabase link --project-ref ${projectRef}`);
      process.exit(1);
    }
    
    // Step 2: Create a migration for cleanup
    console.log('\n🧹 Step 2: Creating cleanup migration...');
    
    // Ensure migrations directory exists
    if (!fs.existsSync('supabase/migrations')) {
      fs.mkdirSync('supabase/migrations', { recursive: true });
    }
    
    // Create a timestamp and migration filenames
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
    const cleanupMigration = path.join('supabase/migrations', `${timestamp}_cleanup.sql`);
    
    console.log(`Creating ${cleanupMigration}...`);
    fs.copyFileSync(CLEANUP_SQL, cleanupMigration);
    
    // Step 3: Create a migration for schema creation
    console.log('\n🏗️ Step 3: Creating schema migration...');
    const schemaTimestamp = String(Number(timestamp) + 1); // Ensure it runs after cleanup
    const schemaMigration = path.join('supabase/migrations', `${schemaTimestamp}_schema.sql`);
    
    console.log(`Creating ${schemaMigration}...`);
    fs.copyFileSync(SCHEMA_SQL, schemaMigration);
    
    // Step 4: Apply migrations
    console.log('\n📤 Step 4: Applying migrations...');
    try {
      execSync('npx supabase db push', { stdio: 'inherit' });
      console.log('✅ Migrations applied successfully');
    } catch (error) {
      console.error('❌ Error applying migrations:', error.message);
      process.exit(1);
    }
    
    // Step 5: Generate TypeScript types
    console.log('\n📝 Step 5: Generating TypeScript types...');
    execSync('npx supabase gen types typescript --linked > schema.types.ts', { stdio: 'inherit' });
    console.log('✅ TypeScript types generated');

    console.log('\n🎉 SUCCESS! Your Supabase database has been completely reset and rebuilt.');
    console.log('The schema is now clean and matches your codebase.');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}, 5000);

console.log('\n⚠️ Make sure you have your database password ready for the linking step!'); 