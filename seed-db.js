/**
 * Manual Database Seeding Script
 * 
 * This script initializes the challenge configuration tables
 * and seeds them with initial data from seedData.js
 */

require('dotenv').config();
const { supabase } = require('./src/lib/supabase');
const { initializeChallengeConfig } = require('./src/core/challenge/config');
const { challengeLogger } = require('./src/core/infra/logging/domainLogger');

async function seed() {
  try {
    console.log('Starting manual seeding process...');
    const repos = await initializeChallengeConfig(supabase, challengeLogger, true);
    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed(); 