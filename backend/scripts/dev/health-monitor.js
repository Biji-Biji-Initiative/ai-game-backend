#!/usr/bin/env node
/**
 * Health Monitoring Script
 * 
 * This script periodically checks the health of the server using the health endpoint.
 * It can be run as a standalone process or integrated with monitoring systems.
 */

'use strict';

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

// Configuration variables
const CONFIG = {
  baseUrl: process.env.SERVER_URL || 'http://localhost:3081',
  healthEndpoint: '/api/v1/health',
  checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000, // 1 minute default
  retryAttempts: parseInt(process.env.HEALTH_CHECK_RETRIES) || 3,
  retryDelay: parseInt(process.env.HEALTH_CHECK_RETRY_DELAY) || 5000,
  notifyAfterFailures: parseInt(process.env.HEALTH_CHECK_NOTIFY_AFTER) || 2,
  alertLogFile: path.join(rootDir, 'logs', 'health-alerts.log'),
  outputFile: process.env.HEALTH_CHECK_OUTPUT || path.join(rootDir, 'logs', 'health-status.json'),
  outputFormat: process.env.HEALTH_CHECK_FORMAT || 'json',
  exitOnCritical: process.env.HEALTH_CHECK_EXIT_ON_CRITICAL === 'true' || false,
};

// Ensure logs directory exists
if (!fs.existsSync(path.join(rootDir, 'logs'))) {
  fs.mkdirSync(path.join(rootDir, 'logs'), { recursive: true });
}

// Current status tracking
let currentStatus = {
  lastCheck: null,
  status: 'unknown',
  consecutiveFailures: 0,
  lastFailureReason: null,
  checks: {
    server: null,
    database: null,
    openai: null
  }
};

/**
 * Perform health check against the server
 */
async function checkHealth() {
  const url = `${CONFIG.baseUrl}${CONFIG.healthEndpoint}`;
  
  console.log(chalk.blue(`[${new Date().toISOString()}] Checking health at ${url}`));
  
  let attempt = 0;
  let success = false;
  let response = null;
  let error = null;
  
  // Try multiple attempts before giving up
  while (attempt < CONFIG.retryAttempts && !success) {
    if (attempt > 0) {
      console.log(chalk.yellow(`Retry attempt ${attempt}/${CONFIG.retryAttempts}...`));
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
    }
    
    try {
      // Make the request with a timeout
      response = await axios.get(url, { 
        timeout: 10000,
        validateStatus: null // Allow non-2xx responses
      });
      
      if (response.status === 200) {
        success = true;
      } else {
        error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
      }
    } catch (err) {
      error = err;
      console.log(chalk.red(`Attempt ${attempt + 1} failed: ${err.message}`));
    }
    
    attempt++;
  }
  
  // Update status
  currentStatus.lastCheck = new Date().toISOString();
  
  if (success) {
    currentStatus.status = 'healthy';
    currentStatus.consecutiveFailures = 0;
    currentStatus.lastFailureReason = null;
    
    // Parse response data
    try {
      if (response.data && response.data.status === 'ok') {
        const healthData = response.data.health || {};
        currentStatus.checks.server = healthData.server || 'ok';
        currentStatus.checks.database = healthData.database || 'unknown';
        currentStatus.checks.openai = healthData.openai || 'unknown';
        
        console.log(chalk.green('✅ Health check passed!'));
        console.log(chalk.cyan(`   Server: ${currentStatus.checks.server}`));
        console.log(chalk.cyan(`   Database: ${currentStatus.checks.database}`));
        console.log(chalk.cyan(`   OpenAI: ${currentStatus.checks.openai}`));
      } else {
        console.log(chalk.yellow('⚠️ Health check returned unexpected data format'));
        console.log(response.data);
      }
    } catch (err) {
      console.log(chalk.yellow(`Error parsing health data: ${err.message}`));
    }
  } else {
    currentStatus.status = 'unhealthy';
    currentStatus.consecutiveFailures++;
    currentStatus.lastFailureReason = error ? error.message : 'Unknown error';
    
    console.log(chalk.red(`❌ Health check failed: ${currentStatus.lastFailureReason}`));
    console.log(chalk.red(`   Consecutive failures: ${currentStatus.consecutiveFailures}`));
    
    // Should we alert?
    if (currentStatus.consecutiveFailures >= CONFIG.notifyAfterFailures) {
      await triggerAlert();
    }
    
    // Should we exit?
    if (CONFIG.exitOnCritical && currentStatus.consecutiveFailures >= CONFIG.retryAttempts * 2) {
      console.log(chalk.bgRed.white('CRITICAL: Exiting due to too many failures.'));
      process.exit(1);
    }
  }
  
  // Save current status
  saveStatus();
}

/**
 * Trigger an alert due to failed health checks
 */
async function triggerAlert() {
  const alertMessage = `
=======================================================
⚠️ SERVER HEALTH CHECK ALERT ⚠️
-------------------------------------------------------
Time: ${new Date().toISOString()}
Consecutive failures: ${currentStatus.consecutiveFailures}
Last error: ${currentStatus.lastFailureReason}
Server: ${CONFIG.baseUrl}${CONFIG.healthEndpoint}
=======================================================
`;
  
  console.log(chalk.bgRed.white(alertMessage));
  
  // Log to alert file
  try {
    fs.appendFileSync(CONFIG.alertLogFile, 
      `${new Date().toISOString()} - ALERT: ${currentStatus.consecutiveFailures} failures. ${currentStatus.lastFailureReason}\n`);
  } catch (err) {
    console.error(`Failed to write to alert log: ${err.message}`);
  }
  
  // Here you would add code to send an alert via email, Slack, etc.
  // For example:
  // await sendSlackNotification(alertMessage);
  // await sendEmailAlert(alertMessage);
}

/**
 * Save current status to a file
 */
function saveStatus() {
  try {
    const statusData = {
      ...currentStatus,
      meta: {
        version: '1.0',
        serverUrl: CONFIG.baseUrl,
        generatedAt: new Date().toISOString()
      }
    };
    
    if (CONFIG.outputFormat === 'json') {
      fs.writeFileSync(CONFIG.outputFile, JSON.stringify(statusData, null, 2));
    } else {
      // Simple text output
      const statusText = `
Server Health Status:
- Last Check: ${statusData.lastCheck}
- Status: ${statusData.status}
- Consecutive Failures: ${statusData.consecutiveFailures}
- Last Failure: ${statusData.lastFailureReason || 'N/A'}
- Server: ${statusData.checks.server || 'unknown'}
- Database: ${statusData.checks.database || 'unknown'} 
- OpenAI: ${statusData.checks.openai || 'unknown'}
      `;
      fs.writeFileSync(CONFIG.outputFile, statusText);
    }
  } catch (err) {
    console.error(`Failed to save status: ${err.message}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.green('=== Server Health Monitor ==='));
  console.log(`Monitoring ${CONFIG.baseUrl}${CONFIG.healthEndpoint}`);
  console.log(`Check interval: ${CONFIG.checkInterval}ms`);
  console.log(`Alert after ${CONFIG.notifyAfterFailures} consecutive failures`);
  
  // Do initial check
  await checkHealth();
  
  // Start periodic checks
  setInterval(checkHealth, CONFIG.checkInterval);
  
  // Keep the process alive
  process.stdin.resume();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\nHealth monitor shutting down...'));
    process.exit(0);
  });
}

// Start the monitor
main().catch(err => {
  console.error('Fatal error in health monitor:', err);
  process.exit(1);
}); 