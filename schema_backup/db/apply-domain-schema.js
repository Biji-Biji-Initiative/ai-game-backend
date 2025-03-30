/**
 * Domain-Specific Database Schema Application Script
 * 
 * This script applies the database schema for a specific domain to your Supabase project.
 * It reads the domain's schema.sql file and executes it against your Supabase database.
 * 
 * Usage:
 *   node db/apply-domain-schema.js user
 *   node db/apply-domain-schema.js challenge
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Check for domain argument
const domain = process.argv[2];
if (!domain) {
  console.error('ERROR: Missing domain argument.');
  console.error('Usage: node db/apply-domain-schema.js <domain>');
  console.error('Example: node db/apply-domain-schema.js user');
  process.exit(1);
}

// Check if domain directory exists
const domainPath = path.join(__dirname, 'domains', domain);
if (!fs.existsSync(domainPath)) {
  console.error(`ERROR: Domain '${domain}' does not exist.`);
  console.error(`Path not found: ${domainPath}`);
  process.exit(1);
}

// Check if schema.sql exists
const schemaPath = path.join(domainPath, 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error(`ERROR: Schema file not found for domain '${domain}'.`);
  console.error(`Expected file: ${schemaPath}`);
  process.exit(1);
}

// Check environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('ERROR: Missing Supabase configuration.');
  console.error('Please set SUPABASE_URL and SUPABASE_KEY in your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function applyDomainSchema() {
  try {
    console.log(`Reading schema file for domain '${domain}'...`);
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
        }
      } catch (err) {
        console.error(`Exception executing statement ${i + 1}:`, err.message);
      }
    }

    console.log(`Schema for domain '${domain}' applied successfully!`);
  } catch (error) {
    console.error(`Error applying schema for domain '${domain}':`, error);
    process.exit(1);
  }
}

// Execute the function
console.log(`Starting database schema application for domain '${domain}'...`);
applyDomainSchema()
  .then(() => {
    console.log(`Schema application for domain '${domain}' complete!`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 