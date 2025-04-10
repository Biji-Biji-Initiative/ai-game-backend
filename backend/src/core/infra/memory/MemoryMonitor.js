'use strict';

/**
 * Memory Monitor for detecting memory leaks and high usage
 * This module provides tools to help identify memory issues without requiring
 * manual profiling. It periodically checks memory usage and reports potential issues.
 */

import v8 from 'node:v8';
import fs from 'node:fs/promises';
import fsSync from 'node:fs'; // Need sync for createWriteStream
import path from 'node:path';
import os from 'node:os';
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
// Using relative path for formatters as #app mapping might not be available everywhere
// import { formatBytes } from '#app/core/common/utils/formatters.js'; // Original import using #app
import { formatBytes } from '../../common/utils/formatters.js'; // Using relative path
import AppError from '#app/core/infra/errors/AppError.js';
import { formatMemoryUsage } from '#app/core/common/utils/formatters.js'; // Assuming formatters.js exists and exports this

// Default options
const DEFAULT_OPTIONS = {
    checkIntervalMs: 60000, // 1 minute
    heapThresholdMB: 500,   // Example threshold
    rssThresholdMB: 1000, // Alert if RSS exceeds 1000MB
    logDirectory: './logs', // Directory to store reports/snapshots
    logger: infraLogger.child({ service: 'MemoryMonitor' }), // Use the injected logger
    autoStart: true, // Automatically start monitoring on instantiation
    generateReportOnAlert: true, // Generate a heap report on alert
    generateSnapshotOnAlert: false, // Generate a heap snapshot on alert (can be large!)
    enabled: true, // Enable monitoring by default
    stopOnError: false // Continue monitoring even if an interval check fails
};

class MemoryMonitor {
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.intervalId = null;
        this.logger = this.options.logger;
        this.logPrefix = '[MemoryMonitor]';
        
        this.logger.info(`${this.logPrefix} Initializing with options:`, {
             interval: this.options.checkIntervalMs,
             heapThreshold: this.options.heapThresholdMB,
             enabled: this.options.enabled,
             stopOnError: this.options.stopOnError
        });
        
        // Validate options
        if (typeof this.options.checkIntervalMs !== 'number' || this.options.checkIntervalMs <= 0) {
            throw new AppError('checkIntervalMs must be a positive number', 500, { errorCode: 'CONFIG_ERROR' });
        }
        if (typeof this.options.heapThresholdMB !== 'number' || this.options.heapThresholdMB <= 0) {
            throw new AppError('heapThresholdMB must be a positive number', 500, { errorCode: 'CONFIG_ERROR' });
        }
        
        this.logger.info(
            `${this.logPrefix} Initialized. Check interval: ${this.options.checkIntervalMs / 1000}s, Heap Threshold: ${this.options.heapThresholdMB}MB`
        );
        
        if (this.options.autoStart) {
            this.start();
        }
    }
    
    /**
     * Start monitoring memory usage
     */
    start() {
        if (!this.options.enabled) {
            this.logger.info(`${this.logPrefix} Monitoring disabled by configuration.`);
            return;
        }
        if (this.intervalId) {
            this.logger.warn(`${this.logPrefix} Monitoring is already active.`);
            return;
        }
        
        this.logger.info(`${this.logPrefix} Starting memory monitoring check every ${this.options.checkIntervalMs / 1000} seconds.`);
        this.intervalId = setInterval(() => {
            this.checkMemoryUsage();
        }, this.options.checkIntervalMs);
    }
    
    /**
     * Stop monitoring memory usage
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.logger.info(`${this.logPrefix} Memory monitoring stopped.`);
        } else {
            this.logger.info(`${this.logPrefix} Monitoring was not active.`);
        }
    }
    
    /**
     * Check current memory usage and report issues
     */
    checkMemoryUsage() {
        try {
            const usage = process.memoryUsage();
            const heapUsedMB = usage.heapUsed / 1024 / 1024;
            
            this.logger.debug(`${this.logPrefix} Current memory usage: RSS=${formatBytes(usage.rss)}, HeapUsed=${formatBytes(usage.heapUsed)}, HeapTotal=${formatBytes(usage.heapTotal)}`);
            
            if (heapUsedMB > this.options.heapThresholdMB) {
                this.logger.warn(`${this.logPrefix} HEAP MEMORY THRESHOLD EXCEEDED: Used=${formatBytes(usage.heapUsed)}, Threshold=${this.options.heapThresholdMB}MB`);
                // Optionally trigger alerts or specific actions here
            }
        } catch (error) {
            const appError = (error instanceof AppError) ? error : new AppError('Error during memory check interval', 500, { cause: error, errorCode: 'MEMORY_CHECK_FAILURE' });
            this.logger.error(`${this.logPrefix} ${appError.message}`, { 
                error: appError,
                stack: appError.stack,
            });
             if (this.options.stopOnError) {
                 this.logger.error(`${this.logPrefix} Stopping monitoring due to error during check.`);
                 this.stop();
             }
        }
    }
    
    /**
     * Generates a V8 heap space statistics report.
     */
    async _generateHeapReport() {
        try {
            await fs.mkdir(this.options.logDirectory, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportPath = path.join(this.options.logDirectory, `heap-report-${timestamp}.txt`);
            
            let report = `Heap Report - ${new Date().toISOString()}${os.EOL}`;
            report += `---------------------------------${os.EOL}`;
            report += `Total Heap Size: ${formatBytes(v8.getHeapStatistics().total_heap_size)}${os.EOL}`;
            report += `Used Heap Size: ${formatBytes(v8.getHeapStatistics().used_heap_size)}${os.EOL}`;
            report += `Heap Size Limit: ${formatBytes(v8.getHeapStatistics().heap_size_limit)}${os.EOL}`;
            report += `---------------------------------${os.EOL}`;
            report += `Heap Space Statistics:${os.EOL}`;
            
            const heapSpaceStats = v8.getHeapSpaceStatistics();
            heapSpaceStats.forEach(space => {
                report += `  Space: ${space.space_name}${os.EOL}`;
                report += `    Size: ${formatBytes(space.space_size)}${os.EOL}`;
                report += `    Used: ${formatBytes(space.space_used_size)}${os.EOL}`;
                report += `    Available: ${formatBytes(space.space_available_size)}${os.EOL}`;
                report += `    Physical Size: ${formatBytes(space.physical_space_size)}${os.EOL}`;
            });
            
            await fs.writeFile(reportPath, report);
            this.logger.info(`${this.logPrefix} Memory report written to ${reportPath}`);
        } catch (error) {
            this.logger.error(`${this.logPrefix} Failed to generate heap report`, { error: error.message, stack: error.stack });
        }
    }
    
    /**
     * Generates a V8 heap snapshot.
     * WARNING: This can be a very large file and may pause the application.
     */
    async _generateHeapSnapshot() {
        try {
            await fs.mkdir(this.options.logDirectory, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const snapshotFile = path.join(this.options.logDirectory, `heap-snapshot-${timestamp}.heapsnapshot`);
            
            this.logger.warn(`${this.logPrefix} Generating heap snapshot (this may pause the application)...`, { file: snapshotFile });
            
            const snapshotStream = v8.getHeapSnapshot();
            const fileStream = fsSync.createWriteStream(snapshotFile);
            
            snapshotStream.pipe(fileStream);
            
            await new Promise((resolve, reject) => {
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            });
            
            this.logger.info(`${this.logPrefix} Heap snapshot written to ${snapshotFile}`);
        } catch (error) {
            this.logger.error(`${this.logPrefix} Failed to generate heap snapshot`, { error: error.message, stack: error.stack });
        }
    }

    /**
     * Get current memory usage details.
     * @returns {Object} Memory usage data (rss, heapTotal, heapUsed, external)
     */
    getCurrentMemoryUsage() {
        try {
            const usage = process.memoryUsage();
            return {
                rss: usage.rss, // Resident Set Size
                heapTotal: usage.heapTotal, // Total size of the V8 heap
                heapUsed: usage.heapUsed, // Used size of the V8 heap
                external: usage.external, // Memory used by C++ objects bound to JavaScript objects
            };
        } catch (error) {
            // Use AppError for errors originating within this module
            throw new AppError('Failed to get current memory usage', 500, { 
                cause: error, 
                errorCode: 'MEMORY_MONITOR_FAILURE' 
            }); 
        }
    }

    /**
     * Get human-readable memory usage string.
     * @returns {string} Formatted memory usage string.
     */
    getFormattedMemoryUsage() {
        try {
            const usage = this.getCurrentMemoryUsage();
            return `RSS: ${formatMemoryUsage(usage.rss)}, Heap Total: ${formatMemoryUsage(usage.heapTotal)}, Heap Used: ${formatMemoryUsage(usage.heapUsed)}, External: ${formatMemoryUsage(usage.external)}`;
        } catch (error) {
             // If getCurrentMemoryUsage throws AppError, just re-throw it
             if (error instanceof AppError) {
                 throw error;
             }
             // Wrap unexpected errors
             throw new AppError('Failed to format memory usage', 500, { 
                 cause: error, 
                 errorCode: 'MEMORY_FORMAT_FAILURE' 
             }); 
        }
    }

    /**
     * Start periodic memory usage logging.
     */
    startMonitoring() {
        if (!this.options.enabled) {
            this.logger.info(`${this.logPrefix} Monitoring disabled by configuration.`);
            return;
        }
        if (this.intervalId) {
            this.logger.warn(`${this.logPrefix} Monitoring is already active.`);
            return;
        }

        this.logger.info(`${this.logPrefix} Starting periodic memory monitoring every ${this.options.checkIntervalMs / 1000}s.`);
        this.intervalId = setInterval(() => {
            try {
                const usage = this.getCurrentMemoryUsage();
                this.logger.info(`${this.logPrefix} Current Usage - ${this.getFormattedMemoryUsage()}`);
                
                // Check against threshold
                if (usage.heapUsed > this.options.heapThresholdMB * usage.heapTotal) {
                    this.logger.warn(`${this.logPrefix} HIGH HEAP USAGE DETECTED! Used: ${formatMemoryUsage(usage.heapUsed)} > ${this.options.heapThresholdMB * 100}% of Total: ${formatMemoryUsage(usage.heapTotal)}`);
                    // Optional: Trigger an alert or event
                }
                if (usage.rss > this.options.rssThresholdMB * 1024 * 1024) {
                     this.logger.warn(`${this.logPrefix} HIGH RSS USAGE DETECTED! RSS: ${formatMemoryUsage(usage.rss)} > Threshold: ${this.options.rssThresholdMB}MB`);
                     // Optional: Trigger an alert or event
                }

            } catch (error) {
                // Use AppError for logging errors during interval execution
                const appError = (error instanceof AppError) ? error : new AppError('Error during memory monitoring interval', 500, { cause: error, errorCode: 'MEMORY_INTERVAL_FAILURE' });
                this.logger.error(appError.message, { 
                    error: appError,
                    stack: appError.stack
                });
                // Decide whether to stop monitoring on error
                if (this.options.stopOnError) {
                    this.logger.error(`${this.logPrefix} Stopping monitoring due to repeated errors.`);
                    this.stop();
                }
            }
        }, this.options.checkIntervalMs);
    }
}

// Create a singleton instance for the application
const memoryMonitor = new MemoryMonitor();

export { MemoryMonitor, memoryMonitor };
export default memoryMonitor; 