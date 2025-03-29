'use strict';

/**
 * Configuration Module
 *
 * Centralized configuration for the application.
 * Re-exports the main config from config.js.
 */

// Load the main configuration
const config = require('./config');

// Export the configuration
module.exports = config;
