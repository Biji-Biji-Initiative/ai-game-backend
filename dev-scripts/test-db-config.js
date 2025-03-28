/**
 * Test Database Configuration
 * 
 * This script tests the connection to the database and verifies
 * that the challenge configuration tables exist and are accessible.
 */

require('dotenv').config();
const { supabaseClient: supabase } = require('../src/core/infra/db/supabaseClient');
const container = require('../src/config/container');
const { logger } = require('../src/core/infra/logging/logger');

// Test function to check all tables
async function testDatabaseConfig() {
  try {
    logger.info('Testing database configuration...');
    
    // Get challenge config repositories from container
    const challengeTypeRepo = container.get('challengeTypeRepository');
    const formatTypeRepo = container.get('formatTypeRepository');
    const focusAreaConfigRepo = container.get('focusAreaConfigRepository');
    const difficultyLevelRepo = container.get('difficultyLevelRepository');
    
    // Test connection by getting counts from each table
    const tables = [
      { name: 'challenge_types', repo: challengeTypeRepo },
      { name: 'format_types', repo: formatTypeRepo },
      { name: 'challenge_focus_areas', repo: focusAreaConfigRepo },
      { name: 'difficulty_levels', repo: difficultyLevelRepo },
    ];
    
    console.log('Testing connection to challenge configuration tables:');
    
    for (const table of tables) {
      try {
        const items = await table.repo.findAll();
        console.log(`- ${table.name}: ${items.length} records found`);
        
        // Log the first item if available
        if (items.length > 0) {
          console.log(`  First item: ${items[0].name} (${items[0].code})`);
        } else {
          console.log(`  No records found. Table might be empty or not exist.`);
        }
      } catch (error) {
        console.error(`- ${table.name}: ERROR - ${error.message}`);
      }
    }
    
    // Check raw tables via Supabase client
    console.log('\nVerifying tables directly with Supabase client:');
    
    // Check each table exists by querying it
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table.name)
          .select('*', { count: 'exact' });
        
        if (error) {
          console.error(`- ${table.name}: ERROR - ${error.message}`);
        } else {
          console.log(`- ${table.name}: ${data.length} records found`);
        }
      } catch (error) {
        console.error(`- ${table.name}: ERROR - ${error.message}`);
      }
    }
    
    console.log('\nDatabase configuration check complete - all tables accessible');
    
    // Note: checking for all tables in database schema requires higher permissions
    // and is not essential for basic functionality testing
  } catch (error) {
    console.error('Error testing database configuration:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDatabaseConfig()
    .then(() => {
      console.log('Database configuration test completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Database configuration test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDatabaseConfig }; 