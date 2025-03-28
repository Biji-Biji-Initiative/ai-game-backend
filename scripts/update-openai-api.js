#!/usr/bin/env node

/**
 * Update OpenAI API References
 * 
 * This script updates all test files to use the OpenAI Responses API
 * instead of the Chat Completions API.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths to search for files
const SEARCH_PATHS = [
  'tests',
  'src', 
  'dev-scripts'
];

// File patterns to include
const FILE_PATTERNS = [
  '*.js',
  '*.ts'
];

// Replacement rules
const REPLACEMENTS = [
  {
    pattern: /openAIMock\.chat\.completions\.create/g,
    replacement: 'openAIMock.responses.create'
  },
  {
    pattern: /mockOpenAI\.chat\.completions\.create/g,
    replacement: 'mockOpenAI.responses.create'
  },
  {
    pattern: /openaiClient\.chat\.completions\.create/g,
    replacement: 'openaiClient.responses.create'
  },
  {
    pattern: /openai\.chat\.completions\.create/g,
    replacement: 'openai.responses.create'
  },
  {
    pattern: /this\.openaiClient\.chat\.completions\.create/g,
    replacement: 'this.openaiClient.responses.create'
  },
  {
    pattern: /this\.sdk\.chat\.completions\.create/g,
    replacement: 'this.sdk.responses.create'
  },
  {
    pattern: /\/v1\/chat\/completions/g,
    replacement: '/v1/responses'
  },
  {
    pattern: /\${this.baseURL}\/chat\/completions/g,
    replacement: '${this.baseURL}/responses'
  }
];

// Find all files matching the pattern
function findFiles() {
  const filePatternArgs = FILE_PATTERNS.map(pattern => `-name "${pattern}"`).join(' -o ');
  const searchPathsStr = SEARCH_PATHS.join(' ');
  
  const command = `find ${searchPathsStr} -type f \\( ${filePatternArgs} \\)`;
  console.log(`Running: ${command}`);
  
  const output = execSync(command).toString();
  return output.trim().split('\n').filter(Boolean);
}

// Update a file with the replacements
function updateFile(filePath) {
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const { pattern, replacement } of REPLACEMENTS) {
    const originalContent = content;
    content = content.replace(pattern, replacement);
    
    if (content !== originalContent) {
      modified = true;
      console.log(`  - Replaced "${pattern.toString()}" with "${replacement}"`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Updated: ${filePath}`);
    return true;
  } else {
    console.log(`  No changes needed in: ${filePath}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('Starting OpenAI API updates...');
  
  try {
    const files = findFiles();
    console.log(`Found ${files.length} files to process`);
    
    let updatedCount = 0;
    
    for (const file of files) {
      const updated = updateFile(file);
      if (updated) {
        updatedCount++;
      }
    }
    
    console.log(`\nUpdate complete: ${updatedCount} files were modified`);
  } catch (error) {
    console.error('Error updating files:', error);
    process.exit(1);
  }
}

main(); 