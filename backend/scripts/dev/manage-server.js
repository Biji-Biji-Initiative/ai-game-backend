#!/usr/bin/env node
/**
 * Development Server Manager
 * 
 * This script provides improved process management for development server,
 * ensuring clean startup and shutdown, and preventing zombie processes.
 */

'use strict';

import { spawn } from 'child_process';
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

console.log(chalk.blue('=== Development Server Manager ==='));

// Kill any existing processes
function killExistingProcesses() {
  console.log(chalk.cyan('Checking for existing server processes...'));
  
  // Check for PID file
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
      if (pid) {
        console.log(chalk.yellow(`Found previous server process (PID: ${pid}), attempting to terminate...`));
        try {
          process.kill(pid, 'SIGTERM');
          console.log(chalk.green('SIGTERM signal sent to previous process'));
          
          // Allow time for graceful shutdown
          return new Promise((resolve) => {
            setTimeout(() => {
              try {
                // Check if process still exists
                process.kill(pid, 0);
                console.log(chalk.yellow('Process still running, sending SIGKILL...'));
                process.kill(pid, 'SIGKILL');
              } catch (e) {
                // Process no longer exists, which is good
                console.log(chalk.green('Previous process terminated successfully'));
              }
              
              // Clean up the PID file
              if (fs.existsSync(pidFile)) {
                fs.unlinkSync(pidFile);
              }
              
              resolve();
            }, 3000);
          });
        } catch (e) {
          // Process doesn't exist
          console.log(chalk.gray('Previous process not found - may have already terminated'));
          
          // Clean up the PID file
          fs.unlinkSync(pidFile);
        }
      }
    } catch (e) {
      console.error(chalk.red('Error reading/parsing PID file:'), e);
      
      // Clean up the PID file anyway
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    }
  } else {
    console.log(chalk.gray('No previous server process found'));
  }
  
  // Kill any lingering nodemon processes
  try {
    console.log(chalk.cyan('Checking for lingering nodemon processes...'));
    const result = spawn('pkill', ['-f', 'nodemon'], { stdio: 'pipe' });
    result.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('Successfully terminated lingering nodemon processes'));
      } else {
        console.log(chalk.gray('No lingering nodemon processes found'));
      }
    });
  } catch (e) {
    console.log(chalk.red('Error checking for nodemon processes:'), e);
  }
  
  // Kill any lingering node server processes
  try {
    console.log(chalk.cyan('Checking for lingering node server processes...'));
    const result = spawn('pkill', ['-f', 'node --trace-warnings src/index.js'], { stdio: 'pipe' });
    result.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('Successfully terminated lingering node server processes'));
      } else {
        console.log(chalk.gray('No lingering node server processes found'));
      }
    });
  } catch (e) {
    console.log(chalk.red('Error checking for node processes:'), e);
  }
  
  return Promise.resolve();
}

// Create a lock file to prevent multiple instances
function createLock() {
  if (fs.existsSync(lockFile)) {
    const lockTime = fs.statSync(lockFile).mtime;
    const now = new Date();
    const diff = now - lockTime;
    
    // If lock is older than 30 minutes, it's probably stale
    if (diff > 30 * 60 * 1000) {
      console.log(chalk.yellow('Found stale lock file, removing...'));
      fs.unlinkSync(lockFile);
    } else {
      console.log(chalk.red('Server manager already running! If you\'re sure it\'s not, delete .server.lock file'));
      process.exit(1);
    }
  }
  
  // Create lock file
  fs.writeFileSync(lockFile, new Date().toISOString());
}

// Release the lock
function releaseLock() {
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

// Start the server with nodemon
function startServer() {
  console.log(chalk.blue('\n=== Starting Server with Nodemon ==='));
  console.log(chalk.cyan('Using nodemon.json configuration...'));
  
  // Check if the swagger bundle exists, if not generate it
  const swaggerPath = path.join(rootDir, 'openapi-spec.json');
  if (!fs.existsSync(swaggerPath)) {
    console.log(chalk.yellow('OpenAPI spec not found, generating it...'));
    try {
      const result = spawn('npm', ['run', 'swagger:bundle'], { 
        stdio: 'inherit',
        shell: true,
        cwd: rootDir
      });
      
      // Wait for the swagger bundle to complete
      return new Promise((resolve) => {
        result.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.green('OpenAPI spec generated successfully'));
            startNodemon().then(resolve);
          } else {
            console.error(chalk.red('Failed to generate OpenAPI spec'));
            process.exit(1);
          }
        });
      });
    } catch (e) {
      console.error(chalk.red('Error generating OpenAPI spec:'), e);
      process.exit(1);
    }
  } else {
    return startNodemon();
  }
}

function startNodemon() {
  return new Promise((resolve) => {
    const nodemon = spawn('npx', ['nodemon'], {
      stdio: 'inherit',
      shell: true,
      cwd: rootDir
    });
    
    // Write the PID to file
    fs.writeFileSync(pidFile, nodemon.pid.toString());
    console.log(chalk.green(`Server process started with PID: ${nodemon.pid}`));
    
    // Handle nodemon process termination
    nodemon.on('close', (code) => {
      console.log(chalk.yellow(`Server process exited with code ${code}`));
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
      releaseLock();
      process.exit(code);
    });
    
    // Handle script termination
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\nReceived SIGINT, shutting down...'));
      nodemon.kill('SIGTERM');
    });
    
    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\nReceived SIGTERM, shutting down...'));
      nodemon.kill('SIGTERM');
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error(chalk.red('\nUncaught exception:'), err);
      nodemon.kill('SIGTERM');
      releaseLock();
      process.exit(1);
    });
    
    resolve();
  });
}

// Main execution
async function main() {
  try {
    createLock();
    await killExistingProcesses();
    await startServer();
  } catch (err) {
    console.error(chalk.red('Unexpected error:'), err);
    releaseLock();
    process.exit(1);
  }
}

main(); 