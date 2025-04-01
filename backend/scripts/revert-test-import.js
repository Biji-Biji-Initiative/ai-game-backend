#!/usr/bin/env node

/**
 * Script to revert the test file from backup
 */

import * as fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Test file - using the currently open file
const testFile = join(__dirname, '..', 'src', 'core', 'common', 'valueObjects', 'index.js');
const backupFile = testFile + '.backup';

if (fs.existsSync(backupFile)) {
  console.log(`Restoring ${testFile} from backup...`);
  fs.copyFileSync(backupFile, testFile);
  console.log('File restored successfully!');
  console.log('Removing backup file...');
  fs.unlinkSync(backupFile);
  console.log('Backup file removed.');
} else {
  console.error(`Backup file not found: ${backupFile}`);
  process.exit(1);
} 