/**
 * Manual Database Seeding Script
 * 
 * This script initializes the challenge configuration tables
 * and seeds them with initial data from seedData.js
 */

require('dotenv').config();
import { supabaseClient } from "../src/core/infra/db/supabaseClient.js";
import { initializeChallengeConfig } from "../src/core/challenge/config/index.js";
import { challengeLogger } from "../src/core/infra/logging/domainLogger.js";

// Initialize database configuration
const supabase = supabaseClient;
const logger = challengeLogger;

async function seed() {
  try {
    console.log('Starting manual seeding process...');
    // eslint-disable-next-line no-unused-vars
    const _repos = await initializeChallengeConfig(supabase, logger, true);
    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed(); 