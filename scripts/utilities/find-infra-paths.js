#!/usr/bin/env node

/**
 * Find all files with problematic import paths
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the source directory
const SRC_DIR = path.join(__dirname, 'src');

// Find all JS files
const jsFiles = glob.sync('**/*.js', { cwd: SRC_DIR });

for (const file of jsFiles) {
  const filePath = path.join(SRC_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Look for problematic patterns in imports
  if (content.includes('../infra/logging') || 
      content.includes('../infra/infra') || 
      content.includes('infra/infra/')) {
    console.log(`Found problematic import in: ${file}`);
    
    // Extract all imports to check
    const importMatches = content.match(/import[\s\S]*?from\s+['"]([^'"]+)['"]/g) || [];
    for (const importMatch of importMatches) {
      if (importMatch.includes('infra/infra') || importMatch.includes('../infra/logging')) {
        console.log(`  Problem: ${importMatch.trim()}`);
      }
    }
  }
} 