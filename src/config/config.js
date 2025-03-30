'use strict';
/**
 * Application configuration
 *
 * Contains environment-specific configuration and references to domain-specific
 * configuration. This separates infrastructure concerns from domain knowledge.
 */
// Load domain-specific configurations
import personalityConfig from '../core/personality/config/personalityConfig.js';
// Main application configuration
const config = {
    // Server configuration
    server: {
        port: process.env.NODE_ENV === 'production' ? 9000 : (process.env.PORT || 3000),
        environment: process.env.NODE_ENV || 'development',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    },
    // API configuration
    api: {
        // API version prefix (e.g., /api/v1)
        prefix: process.env.API_PREFIX || '/api/v1',
        // API documentation path
        docsPath: process.env.API_DOCS_PATH || '/api-docs',
        // API tester UI path
        testerPath: process.env.API_TESTER_PATH || '/tester',
    },
    // CORS configuration
    cors: {
        // In production, use env var for allowed origins; in dev, allow all
        allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
        credentials: true,
        maxAge: 86400 // 24 hours
    },
    // Supabase configuration
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY,
        tables: {
            users: 'users',
            challenges: 'challenges',
            responses: 'responses',
            insights: 'insights',
        },
    },
    // OpenAI API configuration
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
    },
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePaths: {
            error: process.env.LOG_ERROR_PATH || 'logs/error.log',
            combined: process.env.LOG_COMBINED_PATH || 'logs/combined.log',
        },
        console: process.env.LOG_CONSOLE !== 'false',
    },
    // User Journey configuration
    userJourney: {
        sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) || 30,
    },
    // Domain references - these allow easy access to domain-specific configuration
    // while keeping the actual definitions in their domain folders
    personality: {
        ...personalityConfig,
    },
    // Challenge config is now handled via database-driven repositories:
    // - challengeTypeRepository
    // - formatTypeRepository
    // - focusAreaConfigRepository
    // - difficultyLevelRepository
};

// Add computed properties for convenience
Object.defineProperties(config, {
    // Full API URL with base URL and prefix
    fullApiUrl: {
        get() {
            return `${this.server.baseUrl}${this.api.prefix}`;
        }
    },
    // Full Swagger docs URL
    fullDocsUrl: {
        get() {
            return `${this.server.baseUrl}${this.api.docsPath}`;
        }
    },
    // Full API Tester URL
    fullTesterUrl: {
        get() {
            return `${this.server.baseUrl}${this.api.testerPath}`;
        }
    },
    // Is development mode
    isDevelopment: {
        get() {
            return this.server.environment === 'development';
        }
    },
    // Is production mode
    isProduction: {
        get() {
            return this.server.environment === 'production';
        }
    },
    // Is testing mode
    isTesting: {
        get() {
            return this.server.environment === 'testing';
        }
    }
});

export default config;
