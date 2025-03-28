/**
 * Initialize Challenge Configuration Database
 * 
 * This script runs the migrations to create the challenge configuration tables
 * and seeds the tables with initial data.
 */

require('dotenv').config();
const path = require('path');
const { runMigration } = require('./run-migrations');
const container = require('../src/config/container');
const { logger } = require('../src/core/infra/logging/logger');

// Migration file for challenge configuration
const CHALLENGE_CONFIG_MIGRATION = path.join(__dirname, '../migrations/challenge_config_tables.sql');

/**
 * Main function to run the initialization process
 */
async function initializeChallengeConfig() {
  try {
    logger.info('Starting challenge configuration database initialization');
    
    // Step 1: Run the migration to create tables
    logger.info('Running database migration for challenge configuration tables');
    await runMigration(CHALLENGE_CONFIG_MIGRATION);
    logger.info('Migration completed successfully');
    
    // Step 2: Seed the database with initial data
    logger.info('Seeding challenge configuration database with initial data');
    const challengeConfigInitializer = container.get('challengeConfigInitializer');
    const repos = await challengeConfigInitializer.initialize(true); // true = should seed
    
    // Step 3: Log the results
    const counts = {
      challengeTypes: await repos.challengeTypeRepository.findAll().then(types => types.length),
      formatTypes: await repos.formatTypeRepository.findAll().then(types => types.length),
      focusAreas: await repos.focusAreaRepository.findAll().then(areas => areas.length),
      difficultyLevels: await repos.difficultyLevelRepository.findAll().then(levels => levels.length)
    };
    
    logger.info('Challenge configuration database initialized successfully', counts);
    console.log('Challenge configuration initialized with:');
    console.log(`- ${counts.challengeTypes} challenge types`);
    console.log(`- ${counts.formatTypes} format types`);
    console.log(`- ${counts.focusAreas} focus areas`);
    console.log(`- ${counts.difficultyLevels} difficulty levels`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize challenge configuration database', { error: error.message });
    console.error('Error initializing challenge configuration database:', error.message);
    process.exit(1);
  }
}

// Run the script
initializeChallengeConfig(); 