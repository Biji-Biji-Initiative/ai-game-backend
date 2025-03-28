/**
 * Application configuration
 * 
 * Contains environment-specific configuration and references to domain-specific
 * configuration. This separates infrastructure concerns from domain knowledge.
 */

// Domain-specific configuration
const personalityConfig = require('../core/personality/config/personalityConfig');
// Note: challengeConfig is now database-driven through repositories

// Main application configuration
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    tables: {
      users: 'users',
      challenges: 'challenges',
      responses: 'responses',
      insights: 'insights'
    }
  },
  
  // OpenAI API configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePaths: {
      error: 'error.log',
      combined: 'combined.log'
    }
  },
  
  // Domain references - these allow easy access to domain-specific configuration
  // while keeping the actual definitions in their domain folders
  personality: {
    ...personalityConfig
  }
  
  // Challenge config is now handled via database-driven repositories:
  // - challengeTypeRepository
  // - formatTypeRepository
  // - focusAreaConfigRepository
  // - difficultyLevelRepository
};

module.exports = config;
