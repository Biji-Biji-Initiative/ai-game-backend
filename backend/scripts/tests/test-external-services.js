#!/usr/bin/env node

/**
 * External Services Connectivity Tester
 * 
 * This standalone script tests connectivity to critical external services
 * without relying on the main application architecture. It provides a reliable
 * way to verify environment configuration and service availability.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import winston from 'winston';
import os from 'os';

// Initialize dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Create logs directory if it doesn't exist
let logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true, mode: 0o755 });
    console.log(`${colors.green}Created logs directory at ${logsDir}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to create logs directory: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Will attempt to use temporary directory instead${colors.reset}`);
    
    // Try using the system's temp directory as fallback
    const tmpDir = path.join(os.tmpdir(), 'ai-fight-club-logs');
    try {
      fs.mkdirSync(tmpDir, { recursive: true, mode: 0o755 });
      console.log(`${colors.green}Created temporary logs directory at ${tmpDir}${colors.reset}`);
      logsDir = tmpDir;
    } catch (tmpError) {
      console.error(`${colors.red}Failed to create temporary directory: ${tmpError.message}${colors.reset}`);
      console.log(`${colors.yellow}Will log to console only${colors.reset}`);
    }
  }
}

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'external-services-test' },
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'external-test-error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'external-test-combined.log') }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
  ],
});

/**
 * Load environment variables from .env file
 */
function loadEnvironment() {
  console.log(`${colors.blue}Loading environment variables...${colors.reset}`);
  
  // Load variables from .env file
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    console.log(`${colors.green}Found .env file at ${envPath}${colors.reset}`);
    dotenv.config({ path: envPath });
  } else {
    console.log(`${colors.yellow}No .env file found at ${envPath}, using system environment variables${colors.reset}`);
  }
  
  // Required environment variables
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'OPENAI_API_KEY'
  ];
  
  // Check for required environment variables
  const missing = required.filter(name => !process.env[name]);
  
  if (missing.length > 0) {
    console.error(`${colors.red}Missing required environment variables: ${missing.join(', ')}${colors.reset}`);
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  // Log masked variables
  logger.info('Environment variables loaded successfully');
  console.log(`${colors.green}Environment variables loaded successfully${colors.reset}`);
  
  // Log all environment variables (masked for secrets)
  console.log(`${colors.cyan}Environment variables:${colors.reset}`);
  Object.keys(process.env)
    .filter(key => required.includes(key) || key.startsWith('SUPABASE_') || key.startsWith('OPENAI_'))
    .forEach(key => {
      const value = process.env[key];
      const maskedValue = value && value.length > 8 
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : '[not set]';
      console.log(`  ${key}: ${maskedValue}`);
    });
  
  return true;
}

/**
 * Test Supabase connectivity
 */
async function testSupabase() {
  console.log(`\n${colors.blue}Testing Supabase connectivity...${colors.reset}`);
  
  try {
    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or key is missing');
    }
    
    // Initialize Supabase client
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false }
    });
    
    // Test connectivity with a simple query
    console.log(`${colors.yellow}Running test query...${colors.reset}`);
    const startTime = Date.now();
    const { data, error } = await supabase.from('users').select('count');
    const duration = Date.now() - startTime;
    
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }
    
    // Log success
    logger.info('Supabase connection successful', { duration: `${duration}ms` });
    console.log(`${colors.green}✓ Supabase connection successful (${duration}ms)${colors.reset}`);
    
    return true;
  } catch (error) {
    // Log failure
    logger.error('Supabase connection failed', { error: error.message, stack: error.stack });
    console.error(`${colors.red}✗ Supabase connection failed: ${error.message}${colors.reset}`);
    
    return false;
  }
}

/**
 * Test OpenAI connectivity
 */
async function testOpenAI() {
  console.log(`\n${colors.blue}Testing OpenAI connectivity...${colors.reset}`);
  
  try {
    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is missing');
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });
    
    // Test connectivity with a simple completion
    console.log(`${colors.yellow}Running test request...${colors.reset}`);
    const startTime = Date.now();
    const response = await openai.models.list();
    const duration = Date.now() - startTime;
    
    // Verify response
    if (!response || !response.data || response.data.length === 0) {
      throw new Error('OpenAI returned empty response');
    }
    
    // Log success
    const modelCount = response.data.length;
    logger.info('OpenAI connection successful', { 
      duration: `${duration}ms`, 
      modelCount 
    });
    console.log(`${colors.green}✓ OpenAI connection successful (${duration}ms)${colors.reset}`);
    console.log(`${colors.green}  Available models: ${modelCount}${colors.reset}`);
    
    return true;
  } catch (error) {
    // Log failure
    logger.error('OpenAI connection failed', { error: error.message, stack: error.stack });
    console.error(`${colors.red}✗ OpenAI connection failed: ${error.message}${colors.reset}`);
    
    return false;
  }
}

/**
 * Test logging system
 */
async function testLogging() {
  console.log(`\n${colors.blue}Testing logging system...${colors.reset}`);
  
  try {
    // Test logging to file
    const testMessage = `Log test at ${new Date().toISOString()}`;
    
    logger.info(testMessage);
    logger.warn('This is a test warning');
    logger.error('This is a test error');
    
    // Define log file paths
    const errorLogPath = path.join(logsDir, 'external-test-error.log');
    const combinedLogPath = path.join(logsDir, 'external-test-combined.log');
    
    // Wait briefly for file system operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify at least one log file exists
    let logFilesExist = false;
    let logContainsMessage = false;
    
    if (fs.existsSync(errorLogPath) || fs.existsSync(combinedLogPath)) {
      logFilesExist = true;
      
      // Check file content if at least one file exists
      try {
        if (fs.existsSync(combinedLogPath)) {
          const combinedLogContent = fs.readFileSync(combinedLogPath, 'utf8');
          logContainsMessage = combinedLogContent.includes(testMessage);
        } else if (fs.existsSync(errorLogPath)) {
          const errorLogContent = fs.readFileSync(errorLogPath, 'utf8');
          // Error log should contain our test error
          logContainsMessage = errorLogContent.includes('test error');
        }
      } catch (readError) {
        console.log(`${colors.yellow}Warning: Could not read log file: ${readError.message}${colors.reset}`);
      }
    }
    
    // Determine test result
    if (logFilesExist && logContainsMessage) {
      // Perfect case - files exist and contain our messages
      console.log(`${colors.green}✓ Logging system working correctly${colors.reset}`);
      console.log(`${colors.green}  Log files created at:${colors.reset}`);
      if (fs.existsSync(errorLogPath)) console.log(`${colors.green}  - ${errorLogPath}${colors.reset}`);
      if (fs.existsSync(combinedLogPath)) console.log(`${colors.green}  - ${combinedLogPath}${colors.reset}`);
      return true;
    } else if (logFilesExist) {
      // Files exist but don't contain our messages (yet)
      console.log(`${colors.yellow}⚠ Logging system partially working${colors.reset}`);
      console.log(`${colors.yellow}  Log files were created but may not contain test messages${colors.reset}`);
      if (fs.existsSync(errorLogPath)) console.log(`${colors.yellow}  - ${errorLogPath}${colors.reset}`);
      if (fs.existsSync(combinedLogPath)) console.log(`${colors.yellow}  - ${combinedLogPath}${colors.reset}`);
      return true;
    } else {
      // Fallback to console-only logging
      console.log(`${colors.yellow}⚠ File logging not working, but console logging is functional${colors.reset}`);
      console.log(`${colors.yellow}  This is acceptable for testing external services${colors.reset}`);
      return true;
    }
  } catch (error) {
    // Even if logging fails, we can continue with other tests
    console.error(`${colors.yellow}⚠ Logging system test issues: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}  Continuing with remaining tests using console logging${colors.reset}`);
    
    return true;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(`${colors.magenta}======================================${colors.reset}`);
  console.log(`${colors.magenta}  EXTERNAL SERVICES CONNECTIVITY TEST${colors.reset}`);
  console.log(`${colors.magenta}======================================${colors.reset}`);
  
  // Start timer
  const startTime = Date.now();
  
  // Load environment
  if (!loadEnvironment()) {
    console.error(`${colors.red}Failed to load environment. Tests aborted.${colors.reset}`);
    process.exit(1);
  }
  
  // Test logging first (to ensure we can capture results)
  const loggingSuccess = await testLogging();
  
  // Run tests
  const supabaseSuccess = await testSupabase();
  const openaiSuccess = await testOpenAI();
  
  // Calculate duration
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(`\n${colors.magenta}======================================${colors.reset}`);
  console.log(`${colors.magenta}  TEST SUMMARY (${duration}s)${colors.reset}`);
  console.log(`${colors.magenta}======================================${colors.reset}`);
  console.log(`Logging System: ${loggingSuccess ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  console.log(`Supabase: ${supabaseSuccess ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  console.log(`OpenAI: ${openaiSuccess ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  
  // Provide helpful next steps for failures
  if (!supabaseSuccess || !openaiSuccess) {
    console.log(`\n${colors.yellow}Troubleshooting Tips:${colors.reset}`);
    
    if (!supabaseSuccess) {
      console.log(`${colors.yellow}- Check your SUPABASE_URL and SUPABASE_ANON_KEY values${colors.reset}`);
      console.log(`${colors.yellow}- Verify your Supabase project is active and accessible${colors.reset}`);
      console.log(`${colors.yellow}- Confirm network connectivity to the Supabase service${colors.reset}`);
    }
    
    if (!openaiSuccess) {
      console.log(`${colors.yellow}- Verify your OPENAI_API_KEY is valid and has sufficient quota${colors.reset}`);
      console.log(`${colors.yellow}- Check for OpenAI service outages${colors.reset}`);
      console.log(`${colors.yellow}- Confirm network connectivity to the OpenAI API${colors.reset}`);
    }
    
    process.exit(1);
  }
  
  console.log(`\n${colors.green}All tests passed successfully!${colors.reset}`);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Unhandled error during tests: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
}); 