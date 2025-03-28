/**
 * Delete Old Challenge Config
 * 
 * This script removes the old static configuration file
 * which has been replaced with the database-driven configuration.
 */

const fs = require('fs');
const path = require('path');

// Path to the old configuration file
const oldConfigFile = path.join(__dirname, 'src/core/challenge/config/challengeConfig.js');

console.log('Removing old static challenge configuration file...');

if (fs.existsSync(oldConfigFile)) {
  try {
    fs.unlinkSync(oldConfigFile);
    console.log(`Successfully deleted the old static config file: ${oldConfigFile}`);
  } catch (err) {
    console.error(`Error deleting the file: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log(`File does not exist or has already been deleted: ${oldConfigFile}`);
}

console.log('\nMigration to database-driven configuration complete!');
console.log('The challenge configuration is now managed through:');
console.log('- challengeTypeRepository');
console.log('- formatTypeRepository');
console.log('- focusAreaConfigRepository');
console.log('- difficultyLevelRepository');
console.log('\nThese repositories interact with the database tables:');
console.log('- challenge_types');
console.log('- format_types');
console.log('- challenge_focus_areas');
console.log('- difficulty_levels'); 