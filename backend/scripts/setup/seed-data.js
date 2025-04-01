#!/usr/bin/env node
/**
 * Database Seeding Script
 * 
 * This script seeds the database with initial data for various configurations.
 * It can seed challenge configurations, users, or other test data depending on the options.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// Try to load environment variables
const envPath = process.env.NODE_ENV === 'test' 
  ? path.join(__dirname, '../../.env.test')
  : path.join(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(chalk.green(`Loaded environment from ${path.basename(envPath)}`));
} else {
  console.warn(chalk.yellow(`Warning: Environment file ${path.basename(envPath)} not found`));
  dotenv.config(); // Try to load from default .env
}

// Import dependencies
let container;
try {
  container = require('../../src/config/container');
} catch (error) {
  console.error(chalk.red('Error: Failed to load dependency injection container:'), error.message);
  process.exit(1);
}

console.log(chalk.blue('=== Database Seeding ==='));

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  challenges: args.includes('--challenges') || args.includes('-c'),
  users: args.includes('--users') || args.includes('-u'),
  all: args.includes('--all') || args.includes('-a') || args.length === 0, // Default if no args
  reset: args.includes('--reset') || args.includes('-r'), // Reset before seeding
};

/**
 * Seed challenge configuration data
 * @param {boolean} reset - Whether to reset existing data first
 */
async function seedChallengeConfig(reset = false) {
  try {
    console.log(chalk.cyan('Seeding challenge configuration data...'));
    
    const challengeConfigInitializer = container.get('challengeConfigInitializer');
    if (!challengeConfigInitializer) {
      console.error(chalk.red('Error: challengeConfigInitializer not found in container'));
      console.error(chalk.yellow('Make sure your DI container is properly configured'));
      return false;
    }
    
    const repos = await challengeConfigInitializer.initialize(true, reset); // true = should seed, reset if requested
    
    // Log the results
    const counts = {
      challengeTypes: await repos.challengeTypeRepository.findAll().then(types => types.length),
      formatTypes: await repos.formatTypeRepository.findAll().then(types => types.length),
      focusAreas: await repos.focusAreaRepository.findAll().then(areas => areas.length),
      difficultyLevels: await repos.difficultyLevelRepository.findAll().then(levels => levels.length)
    };
    
    console.log(chalk.green('✓ Challenge configuration seeded with:'));
    console.log(`  - ${counts.challengeTypes} challenge types`);
    console.log(`  - ${counts.formatTypes} format types`);
    console.log(`  - ${counts.focusAreas} focus areas`);
    console.log(`  - ${counts.difficultyLevels} difficulty levels`);
    
    return true;
  } catch (error) {
    console.error(chalk.red('✗ Failed to seed challenge configuration:'), error.message);
    return false;
  }
}

/**
 * Seed test user data
 * @param {boolean} reset - Whether to reset existing data first
 */
async function seedTestUsers(reset = false) {
  try {
    console.log(chalk.cyan('Seeding test user data...'));
    
    // Try to get the user creator or seeder from the DI container
    let userSeeder;
    try {
      userSeeder = container.get('userSeeder') || container.get('testUserCreator');
    } catch (error) {
      console.error(chalk.red('Error: userSeeder not found in container'));
      console.error(chalk.yellow('Make sure your DI container is properly configured'));
      return false;
    }
    
    // Create test users
    const result = await userSeeder.createTestUsers(reset);
    
    console.log(chalk.green(`✓ Created ${result.created || 0} test users`));
    if (result.skipped) {
      console.log(chalk.yellow(`  Skipped ${result.skipped} existing users`));
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red('✗ Failed to seed test users:'), error.message);
    return false;
  }
}

/**
 * Main seeding function
 */
async function seedData() {
  let success = true;
  
  // Seed challenge configuration if requested
  if (options.challenges || options.all) {
    if (!await seedChallengeConfig(options.reset)) {
      success = false;
    }
  }
  
  // Seed test users if requested
  if (options.users || options.all) {
    if (!await seedTestUsers(options.reset)) {
      success = false;
    }
  }
  
  console.log(chalk.cyan('\n-------------------------------'));
  if (success) {
    console.log(chalk.green.bold('✅ Data seeding completed successfully'));
  } else {
    console.error(chalk.red.bold('✗ Data seeding completed with errors'));
    process.exit(1);
  }
}

// Run the script when executed directly
if (require.main === module) {
  seedData().catch(error => {
    console.error(chalk.red('Unexpected error during seeding:'), error);
    process.exit(1);
  });
}

module.exports = {
  seedChallengeConfig,
  seedTestUsers,
  seedData
}; 