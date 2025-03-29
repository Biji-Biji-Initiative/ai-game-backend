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
  'focusArea'
  // 'common' is excluded as it doesn't have a fixed file
];

// Base path to the src directory
const srcPath = path.join(process.cwd(), 'src');

/**
 * Replace current file with fixed version
 */
function replaceFile(domain, fileName) {
  const eventsPath = path.join(srcPath, 'core', domain, 'events');
  const fixedFilePath = path.join(eventsPath, `${fileName}.fixed`);
  const currentFilePath = path.join(eventsPath, fileName);
  
  try {
    // Check if fixed file exists
    if (!fs.existsSync(fixedFilePath)) {
      console.log(`  Error: Fixed file not found for ${domain}/${fileName}`);
      return false;
    }
    
    // Read the fixed content
    const fixedContent = fs.readFileSync(fixedFilePath, 'utf8');
    
    // Create backup of current file if needed
    if (fs.existsSync(currentFilePath)) {
      console.log(`  Creating backup of current file: ${currentFilePath}.bak`);
      fs.copyFileSync(currentFilePath, `${currentFilePath}.bak`);
    }
    
    // Replace current file with fixed version
    console.log(`  Replacing ${currentFilePath} with fixed version`);
    fs.writeFileSync(currentFilePath, fixedContent, 'utf8');
    
    return true;
  } catch (error) {
    console.error(`  Error replacing ${fileName} in ${domain}:`, error);
    return false;
  }
}

/**
 * Process a domain
 */
function processDomain(domain) {
  console.log(`\nProcessing domain: ${domain}`);
  
  const eventsPath = path.join(srcPath, 'core', domain, 'events');
  
  // Check if events directory exists
  if (!fs.existsSync(eventsPath)) {
    console.log(`  Events directory not found for ${domain}`);
    return;
  }
  
  // Find all .fixed files
  const fixedFiles = fs.readdirSync(eventsPath)
    .filter(file => file.endsWith('.js.fixed'))
    .map(file => file.replace('.fixed', ''));
  
  if (fixedFiles.length === 0) {
    console.log(`  No fixed files found for ${domain}`);
    return;
  }
  
  // Replace each file
  for (const fileName of fixedFiles) {
    replaceFile(domain, fileName);
  }
}

// Main execution
console.log('Starting event files replacement...');
domains.forEach(processDomain);
console.log('\nEvent files replacement complete!');
console.log('\nNext steps:');
console.log('1. Test the application to ensure the event handlers work correctly');
console.log('2. Remove .original and .fixed files if everything works'); 