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
 * Fixes duplicate async keywords in a file
 * @param {string} filePath - Path to the file to fix
 * @returns {boolean} True if the file was fixed, false otherwise
 */
function fixAsyncKeywords(filePath) {
  console.log(`Processing: ${filePath}`);
  
  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it has the problem
    if (!content.includes('async async')) {
      console.log(`No duplicate async keywords found in ${filePath}`);
      return false;
    }
    
    // Fix: Replace multiple async keywords with a single one
    const fixedContent = content.replace(/async\s+async(\s+async)*/g, 'async');
    
    // Write the fixed content to a new file (without .original extension)
    const newFilePath = filePath.replace('.original', '.fixed');
    fs.writeFileSync(newFilePath, fixedContent, 'utf8');
    
    console.log(`Fixed file saved to: ${newFilePath}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Process events files for a domain
 * @param {string} domain - The domain to process (e.g., 'challenge', 'user')
 */
function processDomain(domain) {
  console.log(`Processing domain: ${domain}`);
  
  const eventsPath = path.join(srcPath, 'core', domain, 'events');
  
  // Check if the events directory exists
  if (!fs.existsSync(eventsPath)) {
    console.log(`Events directory not found for domain: ${domain}`);
    return;
  }
  
  // Find all .original event files
  const files = fs.readdirSync(eventsPath)
    .filter(file => file.endsWith('.js.original'))
    .map(file => path.join(eventsPath, file));
  
  if (files.length === 0) {
    console.log(`No .original event files found for domain: ${domain}`);
    return;
  }
  
  // Process each file
  for (const file of files) {
    fixAsyncKeywords(file);
  }
}

// Main execution
console.log('Starting event files fix process...');
domains.forEach(processDomain);
console.log('Event files fix process complete!');
console.log('Next steps:');
console.log('1. Review the .fixed files to ensure they are correct');
console.log('2. Compare with the existing .js files to decide which to keep');
console.log('3. Replace the .js files if needed and remove the .original files'); 