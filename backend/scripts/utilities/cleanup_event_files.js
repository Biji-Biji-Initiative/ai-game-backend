#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define the domains to process
const domains = [
  'adaptive',
  'challenge',
  'evaluation',
  'personality',
  'progress',
  'user',
  'userJourney',
  'focusArea',
  'common'
];

// Base path to the src directory
const srcPath = path.join(process.cwd(), 'src');

/**
 * Clean up temporary files for a domain
 */
function cleanupDomain(domain) {
  console.log(`\nCleaning up domain: ${domain}`);
  
  const eventsPath = path.join(srcPath, 'core', domain, 'events');
  
  // Check if events directory exists
  if (!fs.existsSync(eventsPath)) {
    console.log(`  Events directory not found for ${domain}`);
    return;
  }
  
  // Find all .original and .fixed files
  const originalFiles = fs.readdirSync(eventsPath)
    .filter(file => file.endsWith('.js.original'));
  
  const fixedFiles = fs.readdirSync(eventsPath)
    .filter(file => file.endsWith('.js.fixed'));
  
  // Remove .original files
  for (const file of originalFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`  Removed ${filePath}`);
    } catch (error) {
      console.error(`  Error removing ${filePath}:`, error);
    }
  }
  
  // Remove .fixed files
  for (const file of fixedFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`  Removed ${filePath}`);
    } catch (error) {
      console.error(`  Error removing ${filePath}:`, error);
    }
  }
}

// Main execution
console.log('Starting cleanup of temporary event files...');
domains.forEach(cleanupDomain);
console.log('\nCleanup complete!'); 