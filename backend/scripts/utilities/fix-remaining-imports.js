#!/usr/bin/env node

/**
 * Script to fix remaining $0 patterns
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// List specific files that still need fixing
const specificFiles = [
  'tests/domain/challenge/evaluationRepository.test.js',
  'tests/domain/evaluation/evaluation.model.test.js',
  'tests/domain/evaluation/repositories/evaluationRepository.test.js',
  'tests/domain/evaluation/services/evaluation-service-system-messages.test.js',
  'tests/integration/challenge/evaluation.model.test.js',
  'tests/integration/responses-api/focusArea.responses-api.test.js'
];

// Let's get other files with $0 as well
async function findRemainingFiles() {
  const command = 'grep -r "\\$0" --include="*.js" . | grep -v "fix-imports\\.js" | grep -v "fix-remaining-imports\\.js" | grep -v "node_modules" | awk -F: \'{print $1}\' | sort | uniq';
  
  try {
    const { stdout } = await exec(command);
    const files = stdout.split('\n')
      .filter(file => file.trim() && !file.includes('node_modules'))
      .filter(file => fs.existsSync(file) && fs.statSync(file).isFile());
    
    return [...new Set([...specificFiles, ...files])];
  } catch (error) {
    console.warn(`Warning: grep command failed: ${error.message}`);
    return specificFiles; // Fallback to specific files
  }
}

async function fixFile(filePath) {
  try {
    console.log(`Processing file: ${filePath}`);
    const content = await readFileAsync(filePath, 'utf8');
    
    if (!content.includes('$0')) {
      console.log(`No $0 found in ${filePath}`);
      return false;
    }
    
    // Fix the proxyquire pattern that's most common in the remaining files
    let newContent = content.replace(
      /const proxyquire = \{ noCallThru: proxyquire\$0 \}\.noCallThru\(\);/g,
      'const proxyquireNoCallThru = proxyquire.noCallThru();'
    );
    
    // Fix config pattern in focusArea.responses-api.test.js
    newContent = newContent.replace(
      /\(\{ config: config\$0 \}\.config\(\)\);/g,
      'config.config();'
    );
    
    if (newContent !== content) {
      await writeFileAsync(filePath, newContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

async function main() {
  const filesToProcess = await findRemainingFiles();
  console.log(`Found ${filesToProcess.length} files to process`);
  
  let modifiedCount = 0;
  
  for (const file of filesToProcess) {
    const wasModified = await fixFile(file);
    if (wasModified) {
      modifiedCount++;
    }
  }
  
  console.log(`Done! Modified ${modifiedCount} files.`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 