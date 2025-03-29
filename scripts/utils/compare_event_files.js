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
 * Compare files and return a summary of differences
 * @param {string} fixedFilePath - Path to the fixed original file
 * @param {string} currentFilePath - Path to the current file
 * @returns {Object} Comparison results
 */
function compareFiles(fixedFilePath, currentFilePath) {
  // Check if both files exist
  if (!fs.existsSync(fixedFilePath) || !fs.existsSync(currentFilePath)) {
    return {
      error: 'One or both files do not exist',
      fixedExists: fs.existsSync(fixedFilePath),
      currentExists: fs.existsSync(currentFilePath)
    };
  }

  try {
    // Read file contents
    const fixedContent = fs.readFileSync(fixedFilePath, 'utf8');
    const currentContent = fs.readFileSync(currentFilePath, 'utf8');

    // Basic comparison stats
    const fixedLines = fixedContent.split('\n').length;
    const currentLines = currentContent.split('\n').length;
    const sizeDifference = Math.abs(fixedContent.length - currentContent.length);
    const percentageDifference = (sizeDifference / Math.max(fixedContent.length, currentContent.length)) * 100;

    // Check if original has more comprehensive implementation
    const hasMoreFunctionality = fixedLines > currentLines * 1.5; // 50% more lines suggests more functionality
    const isPlaceholder = currentLines < 30 && currentContent.includes('// Basic event registration');

    // Line length check (complex files often have longer lines)
    const fixedAvgLineLength = fixedContent.length / fixedLines;
    const currentAvgLineLength = currentContent.length / currentLines;

    return {
      fixedLines,
      currentLines,
      sizeDifference,
      percentageDifference: percentageDifference.toFixed(2) + '%',
      hasMoreFunctionality,
      isPlaceholder,
      fixedAvgLineLength: Math.round(fixedAvgLineLength),
      currentAvgLineLength: Math.round(currentAvgLineLength),
      recommendation: hasMoreFunctionality || isPlaceholder 
        ? 'REPLACE - Fixed file has more functionality' 
        : 'KEEP - Current file appears adequate'
    };
  } catch (error) {
    return {
      error: `Error comparing files: ${error.message}`
    };
  }
}

/**
 * Process events files for a domain
 * @param {string} domain - The domain to process (e.g., 'challenge', 'user')
 */
function processDomain(domain) {
  console.log(`\n========== Processing domain: ${domain} ==========`);
  
  const eventsPath = path.join(srcPath, 'core', domain, 'events');
  
  // Check if the events directory exists
  if (!fs.existsSync(eventsPath)) {
    console.log(`  Events directory not found for domain: ${domain}`);
    return;
  }
  
  // Find all .fixed event files
  const fixedFiles = fs.readdirSync(eventsPath)
    .filter(file => file.endsWith('.js.fixed'));
  
  if (fixedFiles.length === 0) {
    console.log(`  No .fixed event files found for domain: ${domain}`);
    return;
  }
  
  // Process each file
  for (const fixedFileName of fixedFiles) {
    const currentFileName = fixedFileName.replace('.fixed', '');
    const fixedFilePath = path.join(eventsPath, fixedFileName);
    const currentFilePath = path.join(eventsPath, currentFileName);
    
    console.log(`\n  Comparing ${fixedFileName} with ${currentFileName}:`);
    const results = compareFiles(fixedFilePath, currentFilePath);
    
    if (results.error) {
      console.log(`  Error: ${results.error}`);
      continue;
    }
    
    console.log(`  Fixed file: ${results.fixedLines} lines, avg line length: ${results.fixedAvgLineLength}`);
    console.log(`  Current file: ${results.currentLines} lines, avg line length: ${results.currentAvgLineLength}`);
    console.log(`  Size difference: ${results.sizeDifference} bytes (${results.percentageDifference})`);
    console.log(`  Current file is a placeholder: ${results.isPlaceholder ? 'Yes' : 'No'}`);
    console.log(`  Fixed file has more functionality: ${results.hasMoreFunctionality ? 'Yes' : 'No'}`);
    console.log(`  Recommendation: ${results.recommendation}`);
  }
}

// Main execution
console.log('Starting event files comparison...');
domains.forEach(processDomain);
console.log('\nEvent files comparison complete!');
console.log('\nNext steps:');
console.log('1. Review the recommendations for each file');
console.log('2. Replace current files where the fixed files are recommended');
console.log('3. After confirming everything works, remove .original and .fixed files'); 