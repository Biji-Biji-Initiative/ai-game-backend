'use strict';

/**
 * Utility functions for formatting various data types
 */

/**
 * Formats a number as a file size with appropriate units (KB, MB, GB)
 * @param {number} bytes - The size in bytes
 * @param {number} [decimals=2] - Number of decimal places to show
 * @returns {string} Formatted size with units
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Formats a date as an ISO string or custom format
 * @param {Date|string|number} date - The date to format
 * @param {string} [format='iso'] - Output format ('iso', 'short', 'long')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'iso') {
    const d = date instanceof Date ? date : new Date(date);
    
    switch (format) {
        case 'iso':
            return d.toISOString();
        case 'short':
            return d.toLocaleDateString();
        case 'long':
            return d.toLocaleString();
        default:
            return d.toISOString();
    }
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param {number} ms - Duration in milliseconds
 * @param {boolean} [showMilliseconds=false] - Whether to include milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(ms, showMilliseconds = false) {
    if (ms < 1000 && showMilliseconds) {
        return `${ms}ms`;
    }
    
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    let result = '';
    
    if (hours > 0) {
        result += `${hours}h `;
    }
    
    if (minutes > 0 || hours > 0) {
        result += `${minutes}m `;
    }
    
    result += `${seconds}s`;
    
    return result.trim();
}

/**
 * Default export of all formatters
 */
export default {
    formatBytes,
    formatDate,
    formatDuration
}; 