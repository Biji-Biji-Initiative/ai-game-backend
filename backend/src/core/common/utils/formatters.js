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
 * Utility formatters for consistent data presentation
 */

/**
 * Formats a number as currency (e.g., $123.45).
 * @param {number|string} value The value to format.
 * @returns {string} Formatted currency string.
 */
export const formatCurrency = (value) => {
  // Basic implementation, consider using Intl.NumberFormat for real applications
  return `$${Number(value).toFixed(2)}`;
};

/**
 * Formats a Date object or date string into YYYY-MM-DD format.
 * @param {Date|string} date The date to format.
 * @returns {string} Formatted date string.
 */
export const formatDateISO = (date) => {
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch (e) {
    return 'Invalid Date';
  }
};

/**
 * Formats a Date object or date string into YYYY-MM-DD HH:MM:SS format.
 * @param {Date|string} date The date to format.
 * @returns {string} Formatted date-time string.
 */
export const formatDateTime = (date) => {
  try {
    return new Date(date).toISOString().replace('T', ' ').substring(0, 19);
  } catch (e) {
    return 'Invalid Date Time';
  }
};

/**
 * Formats a number to a fixed number of decimal places.
 * @param {number|string} num The number to format.
 * @param {number} [precision=0] The number of decimal places.
 * @returns {string} Formatted number string.
 */
export const formatNumber = (num, precision = 0) => {
  return Number(num).toFixed(precision);
};

/**
 * Formats a number (0-1) as a percentage string (e.g., 75.00%).
 * @param {number|string} value The value (0-1) to format.
 * @returns {string} Formatted percentage string.
 */
export const formatPercent = (value) => {
  return `${(Number(value) * 100).toFixed(2)}%`;
};

/**
 * Formats memory usage in a human-readable format (KB, MB, GB).
 * @param {number} bytes The number of bytes.
 * @returns {string} Human-readable memory string.
 */
export const formatMemoryUsage = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Default export of all formatters
 */
export default {
    formatBytes,
    formatDate,
    formatDuration,
    formatCurrency,
    formatDateISO,
    formatDateTime,
    formatNumber,
    formatPercent,
    formatMemoryUsage
}; 