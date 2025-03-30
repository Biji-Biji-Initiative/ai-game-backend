#!/usr/bin/env node

/**
 * Script to create a backup of the src directory before conversion
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const backupDir = join(rootDir, `src-backup-${timestamp}`);

console.log(`Creating backup of src directory: ${backupDir}`);

try {
  // Create a directory for the backup
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Use rsync to copy files (preserves structure and permissions)
  const command = `rsync -a "${srcDir}/" "${backupDir}/"`;
  console.log(`Running command: ${command}`);
  execSync(command, { stdio: 'inherit' });
  
  console.log(`\nBackup created successfully at: ${backupDir}`);
  console.log('You can now safely run the import conversion.');
  console.log(`If you need to restore, you can run: rsync -a "${backupDir}/" "${srcDir}/"`);
  
  // Create a restore script
  const restoreScriptPath = join(rootDir, 'restore-src.sh');
  const restoreScript = `#!/bin/bash
echo "Restoring src directory from backup: ${backupDir}"
rsync -a "${backupDir}/" "${srcDir}/"
echo "Restore complete!"
`;
  
  fs.writeFileSync(restoreScriptPath, restoreScript);
  fs.chmodSync(restoreScriptPath, 0o755); // Make executable
  
  console.log(`\nA restore script has been created at: ${restoreScriptPath}`);
} catch (error) {
  console.error('Error creating backup:', error.message);
  process.exit(1);
} 