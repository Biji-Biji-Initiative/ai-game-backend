#!/usr/bin/env node

/**
 * Fix OpenAI API Parameters
 * 
 * This script updates OpenAI API calls in focus area tests to use the
 * correct parameters compatible with the latest OpenAI models.
 * 
 * Usage: node scripts/fix-openai-params.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Files to update
const FILES_TO_UPDATE = [
  path.join(__dirname, '../tests/external/openai/focusArea.external.test.js')
];

// Patterns to fix
const PATTERNS = [
  // Fix response_format property
  { 
    from: /response_format\s*:\s*{\s*type\s*:\s*['"]json_object['"]\s*}/g, 
    to: `response_format: { type: 'json_object' }, model: 'gpt-4-turbo-preview'` 
  },
  // Fix model specification
  { 
    from: /model\s*:\s*['"]gpt-4['"]/g, 
    to: `model: 'gpt-4-turbo-preview'` 
  },
  // Fix model specification for newer models
  { 
    from: /model\s*:\s*['"]gpt-4o['"]/g, 
    to: `model: 'gpt-4-turbo-preview'` 
  }
];

/**
 * Process a single file
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} True if file was modified
 */
async function processFile(filePath) {
  try {
    console.log(`Processing file: ${path.relative(__dirname, filePath)}`);
    
    const content = await readFile(filePath, 'utf8');
    let modified = false;
    let newContent = content;

    // Apply each replacement pattern
    for (const pattern of PATTERNS) {
      if (pattern.from.test(newContent)) {
        newContent = newContent.replace(pattern.from, pattern.to);
        modified = true;
      }
    }

    // Write the file back if it was modified
    if (modified) {
      await writeFile(filePath, newContent, 'utf8');
      console.log(`✅ Updated OpenAI parameters in: ${path.relative(__dirname, filePath)}`);
      return true;
    } else {
      console.log(`⚠️ No OpenAI parameters to update in: ${path.relative(__dirname, filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Fixing OpenAI API parameters in tests...');
  let modifiedCount = 0;

  for (const filePath of FILES_TO_UPDATE) {
    if (await processFile(filePath)) {
      modifiedCount++;
    }
  }

  console.log(`\n✨ Done! Modified ${modifiedCount} files.`);
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 