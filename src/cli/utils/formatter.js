/**
 * CLI Formatter Utility
 * Provides consistent formatting for CLI output
 */
const chalk = require('chalk');
const { logger } = require('../../core/infra/logging/logger');

/**
 * Format data for output to the console
 * @param {any} data - The data to format
 * @param {boolean} colorize - Whether to colorize the output
 * @returns {string} - The formatted data
 */
function formatOutput(data, colorize = false) {
  try {
    if (typeof data === 'object') {
      const formatted = JSON.stringify(data, null, 2);
      return colorize ? chalk.cyan(formatted) : formatted;
    }
    return String(data);
  } catch (error) {
    logger.error('Error formatting output', { error: error.message });
    return String(data);
  }
}

/**
 * Format a success message
 * @param {string} message - The message to format
 * @returns {string} - The formatted message
 */
function formatSuccess(message) {
  return chalk.green(message);
}

/**
 * Format an error message
 * @param {string} message - The message to format
 * @returns {string} - The formatted message
 */
function formatError(message) {
  return chalk.red(message);
}

/**
 * Format a section header
 * @param {string} header - The header to format
 * @returns {string} - The formatted header
 */
function formatHeader(header) {
  return chalk.blue(`=== ${header} ===`);
}

module.exports = {
  formatOutput,
  formatSuccess,
  formatError,
  formatHeader
};
