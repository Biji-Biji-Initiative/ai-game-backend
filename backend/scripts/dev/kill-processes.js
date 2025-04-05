#!/usr/bin/env node
/**
 * Kill Server Processes Utility
 * 
 * This script forcefully terminates any lingering server processes
 * to ensure a clean slate before starting the server.
 */

'use strict';

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Get the directory name from the current module URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');
const pidFile = path.join(rootDir, '.server.pid');
const lockFile = path.join(rootDir, '.server.lock');

console.log(chalk.blue('=== Kill Server Processes Utility ==='));

// Clean up lock files
if (fs.existsSync(lockFile)) {
  console.log(chalk.yellow('Removing server lock file...'));
  fs.unlinkSync(lockFile);
}

if (fs.existsSync(pidFile)) {
  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    if (pid) {
      console.log(chalk.yellow(`Found server process with PID: ${pid}, attempting to terminate...`));
      try {
        process.kill(pid, 'SIGKILL');
        console.log(chalk.green(`Process ${pid} terminated`));
      } catch (e) {
        console.log(chalk.gray(`Process ${pid} not found or already terminated`));
      }
    }
  } catch (e) {
    console.error(chalk.red('Error reading PID file:'), e);
  }
  
  console.log(chalk.yellow('Removing server PID file...'));
  fs.unlinkSync(pidFile);
}

// Function to kill processes based on pattern
function killProcessesByPattern(pattern, description) {
  console.log(chalk.cyan(`Looking for ${description} processes...`));
  
  try {
    const output = execSync(`ps aux | grep "${pattern}" | grep -v grep`).toString();
    const lines = output.split('\n').filter(Boolean);
    
    if (lines.length > 0) {
      console.log(chalk.yellow(`Found ${lines.length} ${description} processes:`));
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[1]);
        
        if (pid) {
          try {
            process.kill(pid, 'SIGKILL');
            console.log(chalk.green(`  Terminated process ${pid}`));
          } catch (e) {
            console.log(chalk.red(`  Failed to terminate process ${pid}: ${e.message}`));
          }
        }
      });
    } else {
      console.log(chalk.gray(`No ${description} processes found`));
    }
  } catch (e) {
    // If grep doesn't find anything, it will exit with code 1
    if (e.status === 1) {
      console.log(chalk.gray(`No ${description} processes found`));
    } else {
      console.error(chalk.red(`Error searching for ${description} processes:`), e.message);
    }
  }
}

// Kill nodemon processes
killProcessesByPattern('nodemon', 'nodemon');

// Kill node server processes
killProcessesByPattern('node --trace-warnings src/index.js', 'server');

// Kill port processes
function killProcessOnPort(port) {
  console.log(chalk.cyan(`Checking if port ${port} is in use...`));
  
  try {
    const output = execSync(`lsof -i :${port} -t`).toString();
    const pids = output.split('\n').filter(Boolean);
    
    if (pids.length > 0) {
      console.log(chalk.yellow(`Found ${pids.length} processes using port ${port}:`));
      
      pids.forEach(pid => {
        try {
          process.kill(parseInt(pid), 'SIGKILL');
          console.log(chalk.green(`  Terminated process ${pid} using port ${port}`));
        } catch (e) {
          console.log(chalk.red(`  Failed to terminate process ${pid}: ${e.message}`));
        }
      });
    } else {
      console.log(chalk.gray(`No processes found using port ${port}`));
    }
  } catch (e) {
    // If lsof doesn't find anything, it will exit with a non-zero status
    console.log(chalk.gray(`No processes found using port ${port}`));
  }
}

// Check common server ports
killProcessOnPort(3081);
killProcessOnPort(3000);

console.log(chalk.green('\nAll server processes have been terminated')); 