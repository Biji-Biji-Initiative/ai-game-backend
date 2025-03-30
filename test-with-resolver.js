#!/usr/bin/env node

/**
 * Script to run tests with @ import support
 * This script runs Jest or Mocha with the import resolver active
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
let testFramework = 'jest'; // Default to jest
let testArgs = [];

// Check for framework flag
const frameworkIndex = args.findIndex(arg => arg === '--framework' || arg === '-f');
if (frameworkIndex !== -1 && args.length > frameworkIndex + 1) {
  testFramework = args[frameworkIndex + 1];
  // Remove the framework args
  args.splice(frameworkIndex, 2);
}
testArgs = args;

// Get the root directory path
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;
const resolverPath = join(rootDir, 'src', 'importResolver.js');

console.log(`Running tests with framework: ${testFramework}`);
console.log(`Using import resolver: ${resolverPath}`);
console.log(`Test arguments: ${testArgs.join(' ') || '(none)'}`);

// Construct the command
let command;
let commandArgs = [];

if (testFramework === 'jest') {
  command = 'node';
  commandArgs = [
    `--experimental-loader=${resolverPath}`,
    join(rootDir, 'node_modules/.bin/jest'),
    ...testArgs
  ];
} else if (testFramework === 'mocha') {
  command = 'node';
  commandArgs = [
    `--experimental-loader=${resolverPath}`,
    join(rootDir, 'node_modules/.bin/mocha'),
    ...testArgs
  ];
} else {
  console.error(`Unsupported test framework: ${testFramework}`);
  process.exit(1);
}

// Run the command
console.log(`\nRunning: ${command} ${commandArgs.join(' ')}\n`);
const result = spawnSync(command, commandArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

// Exit with the same code as the command
process.exit(result.status); 