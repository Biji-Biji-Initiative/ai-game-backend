#!/usr/bin/env node
/**
 * Manual Database Seeding Script
 * 
 * This script initializes the challenge configuration tables
 * and seeds them with initial data from seedData.js
 */
'use strict';

const path = require('path');
// Adjust dotenv path relative to the new script location
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Adjusted import paths 
const { initializeChallengeConfig } = require('../../src/core/challenge/config');
// Adjusted logger import path
const { challengeLogger } = require('../../src/core/infra/logging/domainLogger');
// Adjusted supabase import path
const { supabaseClient: supabase } = require('../../src/core/infra/db/supabaseClient');

/**
 * Seeds the database with initial challenge configuration data
 * @async
 * @returns {Promise<void>} Resolves when seeding is complete
 */
async function seed() {
  try {
    console.log('Starting manual seeding process...');
    // Pass dependencies directly
    await initializeChallengeConfig(supabase, challengeLogger, true); // true = shouldSeed
    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed(); 