'use strict';
/**
 * Application configuration
 *
 * Contains environment-specific configuration and references to domain-specific
 * configuration. This separates infrastructure concerns from domain knowledge.
 */
// Load domain-specific configurations
import personalityConfig from "@/core/personality/config/personalityConfig.js";
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
        // API tester UI path - serves static assets from the admin directory
        testerPath: process.env.API_TESTER_PATH || '/tester',
    },
    // CORS configuration
    cors: {
        // In production, require explicit allowed origins
        allowedOrigins: process.env.NODE_ENV === 'production'
            ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
            : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
        credentials: true,
        maxAge: 86400 // 24 hours
    },
    // Rate limiting configuration
    rateLimit: {
        // Enable/disable rate limiting globally
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        // Global rate limit settings (all routes)
        global: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per 15 minutes
            standardHeaders: true, // Include X-RateLimit-* headers
            legacyHeaders: false, // Disable the X-RateLimit-* headers
            message: 'Too many requests from this IP, please try again later',
            skip: process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true'
        },
        // Rate limit for auth routes (login, signup)
        auth: {
            windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
            max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10), // 10 requests per 15 minutes
            standardHeaders: true,
            legacyHeaders: false,
            message: 'Too many authentication attempts, please try again later'
        },
        // Rate limit for sensitive operations
        sensitive: {
            windowMs: parseInt(process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS || '3600000', 10), // 1 hour
            max: parseInt(process.env.SENSITIVE_RATE_LIMIT_MAX || '5', 10), // 5 requests per hour
            standardHeaders: true,
            legacyHeaders: false,
            message: 'Too many sensitive operations, please try again later'
        }
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
