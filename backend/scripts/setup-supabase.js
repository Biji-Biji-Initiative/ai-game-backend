const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

/**
 * This script will:
 * 1. Check if Supabase CLI is installed
 * 2. Verify Supabase credentials are available
 * 3. Apply the migration to create a fresh schema
 */

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIGRATION_FILE = 'clean-schema-migration.sql';

// Verify prerequisites
console.log('Checking prerequisites...');

// Check if Supabase CLI is installed
try {
  const version = execSync('npx supabase --version').toString().trim();
  console.log(`✅ Supabase CLI is installed (version ${version})`);
} catch (error) {
  console.error('❌ Supabase CLI is not installed or not accessible.');
  console.error('Please install it using: npm install -g supabase');
  process.exit(1);
}

// Check if migration file exists
if (!fs.existsSync(MIGRATION_FILE)) {
  console.error(`❌ Migration file "${MIGRATION_FILE}" not found.`);
  process.exit(1);
}
console.log(`✅ Found migration file: ${MIGRATION_FILE}`);

// Check Supabase credentials
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase credentials not found in .env file.');
  console.error('Please make sure your .env file contains:');
  console.error('  SUPABASE_URL=<your-supabase-url>');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
  process.exit(1);
}
console.log('✅ Supabase credentials found in .env file');

// Extract project reference from URL
const projectRef = SUPABASE_URL.split('https://')[1].split('.')[0];
console.log(`📦 Detected project reference: ${projectRef}`);

// Link to Supabase project
console.log('\n🔗 Linking to Supabase project...');
try {
  execSync(`npx supabase link --project-ref ${projectRef}`, { stdio: 'inherit' });
  console.log('✅ Successfully linked to Supabase project');
} catch (error) {
  console.error('❌ Failed to link to Supabase project.');
  console.error('You may need to run this command manually:');
  console.error(`npx supabase link --project-ref ${projectRef}`);
  process.exit(1);
}

// Apply the migration
console.log('\n🚀 Applying migration...');
console.log('⚠️ This will RESET your Supabase database. All existing data will be lost!');
console.log('Press Ctrl+C to cancel (you have 5 seconds)...');

// Wait 5 seconds before proceeding
setTimeout(() => {
  try {
    // Apply the migration
    console.log('\n📝 Applying migration file...');
    const connectionString = `postgresql://postgres.${projectRef}:${process.env.POSTGRES_PASSWORD || 'password'}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;
    
    // Construct the psql command to apply the migration
    const command = `
      cat ${MIGRATION_FILE} | 
      PGPASSWORD=${process.env.POSTGRES_PASSWORD || 'password'} psql "${connectionString}"
    `;
    
    console.log('Running migration...');
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Migration applied successfully!');
    
    // Generate TypeScript types
    console.log('\n📄 Generating TypeScript types from schema...');
    execSync(`npx supabase gen types typescript --linked > schema.types.ts`, { stdio: 'inherit' });
    console.log('✅ TypeScript types generated successfully!');
    
    console.log('\n🎉 Schema setup complete!');
    console.log('Your Supabase database now has a fresh schema based on your codebase.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('You may need to apply the migration manually:');
    console.error(`1. Connect to your database`);
    console.error(`2. Run the SQL commands in ${MIGRATION_FILE}`);
  }
}, 5000);

// Print warning message immediately
console.log('\n⚠️ IMPORTANT: Before running this migration, make sure:');
console.log('1. You have a backup of your data if needed');
console.log('2. You have properly set POSTGRES_PASSWORD in your .env file');
console.log('3. You are connected to the correct Supabase project\n'); 