#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// Try to import optional dependencies, use fallbacks if not available
let supabaseClient;
let openaiClient;
try {
  const { createClient } = require('@supabase/supabase-js');
  supabaseClient = createClient;
} catch (error) {
  console.warn(chalk.yellow('⚠️ @supabase/supabase-js not found. Supabase connection check will be skipped.'));
}

try {
  const { OpenAI } = require('openai');
  openaiClient = OpenAI;
} catch (error) {
  console.warn(chalk.yellow('⚠️ openai package not found. OpenAI connection check will be skipped.'));
}

const rootDir = path.join(__dirname, '../..');
const envPath = path.resolve(rootDir, '.env');
const envTestPath = path.resolve(rootDir, '.env.test');
const envExamplePath = path.resolve(rootDir, '.env.example');

console.log(chalk.blue('=== Environment Setup & Validation ==='));

/** Ensures a .env file exists, creating from example if needed */
function ensureEnvFile(targetPath, examplePath, name) {
  if (fs.existsSync(targetPath)) {
    console.log(chalk.green(`✓ ${name} file found at ${path.relative(rootDir, targetPath)}`));
    return true;
  }
  if (fs.existsSync(examplePath)) {
    console.log(chalk.yellow(`⚠️ ${name} file not found. Creating from example...`));
    try {
      fs.copyFileSync(examplePath, targetPath);
      console.log(chalk.green(`✓ Created ${name} at ${path.relative(rootDir, targetPath)}`));
      console.log(chalk.yellow(`   Please review and update ${name} with your actual credentials.`));
      return true;
    } catch (error) {
      console.error(chalk.red(`✗ Failed to create ${name} from example:`), error.message);
      return false;
    }
  } else {
    console.error(chalk.red(`✗ ${name} file not found, and no example file exists at ${path.relative(rootDir, examplePath)}`));
    return false;
  }
}

/** Validates essential variables are present */
function validateEnvVars(config, requiredVars) {
  const missing = requiredVars.filter(key => !config[key]);
  if (missing.length > 0) {
    console.error(chalk.red(`✗ Missing required environment variables: ${missing.join(', ')}`));
    console.error(chalk.red('   Please check your .env or .env.test file.'));
    return false;
  }
  console.log(chalk.green('✓ All required environment variables are present.'));
  return true;
}

/** Checks Supabase connection */
async function checkSupabaseConnection(url, key) {
  console.log(chalk.blue('\n🔌 Checking Supabase connection...'));
  if (!url || !key) {
    console.log(chalk.yellow('   Skipping Supabase check: Credentials missing.'));
    return false;
  }
  
  if (!supabaseClient) {
    console.log(chalk.yellow('   Skipping Supabase check: @supabase/supabase-js not installed.'));
    return false;
  }
  
  try {
    const supabase = supabaseClient(url, key, { auth: { persistSession: false } });
    // Perform a minimal query
    const { error } = await supabase.rpc('get_pg_version').catch(err => ({ error: err }));
    if (error) {
      // Try a simple query if RPC fails
      const { error: queryError } = await supabase.from('_types').select('*').limit(1).catch(err => ({ error: err }));
      if (queryError) {
        throw queryError;
      }
    }
    console.log(chalk.green('✓ Supabase connection successful.'));
    return true;
  } catch (error) {
    console.error(chalk.red('✗ Supabase connection failed:'), error.message);
    return false;
  }
}

/** Checks OpenAI connection */
async function checkOpenAIConnection(apiKey) {
  console.log(chalk.blue('\n🧠 Checking OpenAI connection...'));
  if (!apiKey) {
    console.log(chalk.yellow('   Skipping OpenAI check: API key missing.'));
    return false;
  }
  
  if (!openaiClient) {
    console.log(chalk.yellow('   Skipping OpenAI check: openai package not installed.'));
    return false;
  }
  
  try {
    const openai = new openaiClient({ apiKey });
    // List models as a simple test
    await openai.models.list();
    console.log(chalk.green('✓ OpenAI connection successful.'));
    return true;
  } catch (error) {
    console.error(chalk.red('✗ OpenAI connection failed:'), error.message);
    return false;
  }
}

/** Main setup function */
async function main() {
  let overallSuccess = true;

  // 1. Ensure .env files exist
  if (!ensureEnvFile(envPath, envExamplePath, '.env')) {
    overallSuccess = false;
  }
  if (!ensureEnvFile(envTestPath, envExamplePath, '.env.test')) {
    overallSuccess = false;
  }

  // 2. Load .env for validation (prefer .env.test if running tests, else .env)
  const targetEnvPath = process.env.NODE_ENV === 'test' ? envTestPath : envPath;
  if (!fs.existsSync(targetEnvPath)) {
    console.error(chalk.red(`Target env file (${path.basename(targetEnvPath)}) not found. Cannot proceed.`));
    process.exit(1);
  }
  const config = dotenv.parse(fs.readFileSync(targetEnvPath));

  // 3. Validate required variables
  const required = ['SUPABASE_URL', 'OPENAI_API_KEY'];
  // Require ANON_KEY or KEY for Supabase
  const hasSupabaseKey = config['SUPABASE_KEY'] || config['SUPABASE_ANON_KEY'];
  if (!hasSupabaseKey) {
    required.push('SUPABASE_KEY or SUPABASE_ANON_KEY');
  }

  if (!validateEnvVars(config, required)) {
    overallSuccess = false;
  }

  // 4. Check Connections
  const supabaseKey = config['SUPABASE_KEY'] || config['SUPABASE_ANON_KEY'];
  if (!await checkSupabaseConnection(config['SUPABASE_URL'], supabaseKey)) {
    overallSuccess = false;
  }
  if (!await checkOpenAIConnection(config['OPENAI_API_KEY'])) {
    overallSuccess = false;
  }

  console.log(chalk.cyan('\n-------------------------------'));
  if (overallSuccess) {
    console.log(chalk.green.bold('✅ Environment setup and validation successful!'));
  } else {
    console.error(chalk.red.bold('✗ Environment setup failed. Please address the issues above.'));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('\nUnexpected error during setup:'), error);
  process.exit(1);
}); 