#!/usr/bin/env node
/**
 * Fix Test Imports Script
 * 
 * This script updates all test files that are importing from loadEnv.js
 * to use the new testConfig.js module instead, fixing circular dependencies.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Find all test files
async function findTestFiles() {
  return glob('tests/**/*.test.js', { cwd: rootDir });
}

// Check if a file imports from loadEnv.js
function importsFromLoadEnv(content) {
  return content.includes("import testEnv from") && 
         content.includes("loadEnv.js") ||
         content.includes("import { getTestConfig, hasRequiredVars } from '../loadEnv.js'") ||
         content.includes("import * as testEnv from '../loadEnv.js'");
}

// Update the file content to use testConfig.js
function updateImports(content) {
  // Replace direct imports
  let updatedContent = content.replace(
    /import testEnv from "\.\.\/\.\.\/loadEnv\.js";/g,
    'import { getTestConfig, hasRequiredVars } from "../../config/testConfig.js";'
  );
  
  // Replace imports with different path depths
  updatedContent = updatedContent.replace(
    /import testEnv from "\.\.\/loadEnv\.js";/g, 
    'import { getTestConfig, hasRequiredVars } from "../config/testConfig.js";'
  );
  
  // Replace destructured imports
  updatedContent = updatedContent.replace(
    /import \{ getTestConfig, hasRequiredVars \} from '\.\.\/loadEnv\.js';/g,
    "import { getTestConfig, hasRequiredVars } from '../config/testConfig.js';"
  );
  
  // Replace namespaced imports
  updatedContent = updatedContent.replace(
    /import \* as testEnv from '\.\.\/loadEnv\.js';/g,
    "import { getTestConfig, hasRequiredVars } from '../config/testConfig.js';"
  );
  
  // Replace method calls
  updatedContent = updatedContent.replace(
    /testEnv\.hasRequiredVars/g,
    'hasRequiredVars'
  );
  
  updatedContent = updatedContent.replace(
    /testEnv\.getTestConfig/g,
    'getTestConfig'
  );
  
  updatedContent = updatedContent.replace(
    /testEnv.default.hasRequiredVars/g,
    'hasRequiredVars'
  );
  
  updatedContent = updatedContent.replace(
    /testEnv.default.getTestConfig/g,
    'getTestConfig'
  );
  
  return updatedContent;
}

async function main() {
  try {
    const testFiles = await findTestFiles();
    let updatedCount = 0;
    
    console.log(`Found ${testFiles.length} test files to check...`);
    
    for (const file of testFiles) {
      const filePath = path.join(rootDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (importsFromLoadEnv(content)) {
        const updatedContent = updateImports(content);
        
        if (updatedContent !== content) {
          fs.writeFileSync(filePath, updatedContent);
          console.log(`✅ Updated: ${file}`);
          updatedCount++;
        }
      }
    }
    
    console.log(`\nUpdated ${updatedCount} test files to use config/testConfig.js`);
    
    if (updatedCount > 0) {
      console.log('\nNext steps:');
      console.log('1. Run the tests to verify the changes: npm run test:e2e');
      console.log('2. Fix any remaining issues manually if needed');
    }
  } catch (error) {
    console.error('Error updating test files:', error);
    process.exit(1);
  }
}

main(); 