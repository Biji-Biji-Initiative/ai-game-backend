/**
 * Database Connection Utilities - COMPATIBILITY LAYER
 * 
 * IMPORTANT: This file exists for backward compatibility only.
 * All new code should import directly from src/core/infra/db/databaseConnection.js
 * 
 * This is a compatibility layer that forwards all calls to the proper
 * infrastructure implementation in core/infra/db/databaseConnection.js.
 */

const databaseConnection = require('../../../core/infra/db/databaseConnection');

// Re-export everything from the infrastructure layer implementation
module.exports = databaseConnection; 