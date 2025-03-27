/**
 * Configuration Module
 * 
 * Centralized configuration for the application.
 * This file is required by various services including openaiService.js.
 */

// Load environment variables
require('dotenv').config();

// Default configuration
const config = {
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
    defaultMaxTokens: parseInt(process.env.OPENAI_DEFAULT_MAX_TOKENS || '500', 10),
    defaultTemperature: parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE || '0.7'),
  },
  
  // Application environment
  environment: process.env.NODE_ENV || 'development',
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  }
};

module.exports = config;
