/**
 * PM2 Ecosystem Configuration
 * 
 * This file follows clean architecture principles for process management.
 * It provides proper environment configuration, error handling, and monitoring.
 */
module.exports = {
  apps: [
    {
      // Application Identity
      name: 'ai-fight-club-api',
      script: 'backend/src/index.js',
      
      // Deployment Configuration
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      
      // Process Management
      autorestart: true,
      max_memory_restart: '500M',
      
      // Environment Configuration - Development (default)
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        
        // Node.js module resolution
        NODE_PATH: 'backend',
        
        // Base URL configuration
        BASE_URL: 'http://localhost:3000',
        
        // API configuration
        API_PREFIX: '/api/v1',
        API_DOCS_PATH: '/api-docs',
        API_TESTER_PATH: '/tester',
        
        // Logging configuration
        LOG_LEVEL: 'debug',
        LOG_ERROR_PATH: 'backend/logs/error.log',
        LOG_COMBINED_PATH: 'backend/logs/combined.log',
        LOG_CONSOLE: 'true'
      },
      
      // Environment Configuration - Production
      env_production: {
        NODE_ENV: 'production',
        PORT: 9000,
        BASE_URL: 'https://api.ai-fight-club.com',
        LOG_LEVEL: 'info',
        
        // Node.js module resolution
        NODE_PATH: 'backend'
      },
      
      // Logging Configuration
      error_file: 'backend/logs/pm2_error.log',
      out_file: 'backend/logs/pm2_out.log',
      log_file: 'backend/logs/pm2_combined.log',
      combine_logs: true,
      time: true,
      
      // Startup Configuration
      min_uptime: 10000,
      max_restarts: 10,
      restart_delay: 5000,
      
      // Graceful Shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 30000
    },
    {
      // Admin Application
      name: 'ai-fight-club-admin',
      script: 'admin/server.js',
      
      // Deployment Configuration
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      
      // Add explicit args to ensure port is passed correctly
      args: "--port=4000",
      
      // Process Management
      autorestart: true,
      max_memory_restart: '300M',
      
      // Environment Configuration - Development (default)
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000,
        
        // Node.js module resolution
        NODE_PATH: 'admin',
        
        // Base URL configuration
        BASE_URL: 'http://localhost:4000',
        
        // Logging configuration
        LOG_LEVEL: 'debug',
        LOG_CONSOLE: 'true'
      },
      
      // Environment Configuration - Production
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        BASE_URL: 'https://admin.ai-fight-club.com',
        LOG_LEVEL: 'info',
        
        // Node.js module resolution
        NODE_PATH: 'admin'
      },
      
      // Logging Configuration
      error_file: 'admin/logs/pm2_error.log',
      out_file: 'admin/logs/pm2_out.log',
      log_file: 'admin/logs/pm2_combined.log',
      combine_logs: true,
      time: true,
      
      // Startup Configuration
      min_uptime: 10000,
      max_restarts: 10,
      restart_delay: 5000,
      
      // Graceful Shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 30000
    }
  ]
};