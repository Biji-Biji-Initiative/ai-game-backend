import { jest } from '@jest/globals';
import { expect } from 'chai';
import { validateConfig } from '@src/config/schemas/configSchema.js';

describe('Configuration Validation', () => {
  // Save original env and console
  const originalEnv = process.env;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalProcessExit = process.exit;
  
  beforeEach(() => {
    // Mock console methods
    console.error = jest.fn();
    console.warn = jest.fn();
    process.exit = jest.fn();
    
    // Reset env for each test
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    // Restore console and process.exit
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    process.exit = originalProcessExit;
    
    // Restore env
    process.env = originalEnv;
  });
  
  it('should validate a valid configuration', () => {
    const validConfig = {
      server: {
        port: 3000,
        environment: 'development',
        baseUrl: 'http://localhost:3000'
      },
      api: {
        prefix: '/api/v1',
        docsPath: '/api-docs',
        testerPath: '/tester'
      },
      cors: {
        allowedOrigins: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Request-Id'],
        credentials: true,
        maxAge: 86400
      },
      rateLimit: {
        enabled: true,
        global: {
          windowMs: 900000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many requests'
        },
        auth: {
          windowMs: 900000,
          max: 10,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many auth attempts'
        },
        sensitive: {
          windowMs: 3600000,
          max: 5,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many sensitive operations'
        }
      },
      supabase: {
        url: 'https://example.supabase.co',
        key: 'super-secret-key',
        tables: {
          users: 'users',
          challenges: 'challenges',
          responses: 'responses',
          insights: 'insights'
        }
      },
      openai: {
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o'
      },
      logging: {
        level: 'info',
        filePaths: {
          error: 'logs/error.log',
          combined: 'logs/combined.log'
        },
        console: true
      },
      userJourney: {
        sessionTimeoutMinutes: 30
      },
      personality: {}
    };
    
    expect(() => validateConfig(validConfig)).to.not.throw();
    const validated = validateConfig(validConfig);
    expect(validated).to.deep.equal(validConfig);
  });
  
  it('should validate a configuration with array for CORS origins', () => {
    const validConfig = {
      server: {
        port: 3000,
        environment: 'development',
        baseUrl: 'http://localhost:3000'
      },
      api: {
        prefix: '/api/v1',
        docsPath: '/api-docs',
        testerPath: '/tester'
      },
      cors: {
        allowedOrigins: ['http://localhost:3000', 'https://myapp.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Request-Id'],
        credentials: true,
        maxAge: 86400
      },
      rateLimit: {
        enabled: true,
        global: {
          windowMs: 900000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many requests'
        },
        auth: {
          windowMs: 900000,
          max: 10,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many auth attempts'
        },
        sensitive: {
          windowMs: 3600000,
          max: 5,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many sensitive operations'
        }
      },
      supabase: {
        url: 'https://example.supabase.co',
        key: 'super-secret-key',
        tables: {
          users: 'users',
          challenges: 'challenges',
          responses: 'responses',
          insights: 'insights'
        }
      },
      openai: {
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o'
      },
      logging: {
        level: 'info',
        filePaths: {
          error: 'logs/error.log',
          combined: 'logs/combined.log'
        },
        console: true
      },
      userJourney: {
        sessionTimeoutMinutes: 30
      },
      personality: {}
    };
    
    expect(() => validateConfig(validConfig)).to.not.throw();
  });
  
  it('should reject a configuration with invalid port', () => {
    const invalidConfig = {
      server: {
        port: -1, // Invalid port
        environment: 'development',
        baseUrl: 'http://localhost:3000'
      },
      api: {
        prefix: '/api/v1',
        docsPath: '/api-docs',
        testerPath: '/tester'
      },
      cors: {
        allowedOrigins: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        exposedHeaders: ['X-Request-Id'],
        credentials: true,
        maxAge: 86400
      },
      rateLimit: {
        enabled: true,
        global: {
          windowMs: 900000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many requests'
        },
        auth: {
          windowMs: 900000,
          max: 10,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many auth attempts'
        },
        sensitive: {
          windowMs: 3600000,
          max: 5,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many sensitive operations'
        }
      },
      supabase: {
        url: 'https://example.supabase.co',
        key: 'super-secret-key',
        tables: {
          users: 'users',
          challenges: 'challenges',
          responses: 'responses',
          insights: 'insights'
        }
      },
      openai: {
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o'
      },
      logging: {
        level: 'info',
        filePaths: {
          error: 'logs/error.log',
          combined: 'logs/combined.log'
        },
        console: true
      },
      userJourney: {
        sessionTimeoutMinutes: 30
      },
      personality: {}
    };
    
    expect(() => validateConfig(invalidConfig)).to.throw();
  });
  
  it('should reject a configuration with invalid environment', () => {
    const invalidConfig = {
      server: {
        port: 3000,
        environment: 'invalid-env', // Invalid environment
        baseUrl: 'http://localhost:3000'
      },
      api: {
        prefix: '/api/v1',
        docsPath: '/api-docs',
        testerPath: '/tester'
      },
      cors: {
        allowedOrigins: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        exposedHeaders: ['X-Request-Id'],
        credentials: true,
        maxAge: 86400
      },
      rateLimit: {
        enabled: true,
        global: {
          windowMs: 900000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many requests'
        },
        auth: {
          windowMs: 900000,
          max: 10,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many auth attempts'
        },
        sensitive: {
          windowMs: 3600000,
          max: 5,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many sensitive operations'
        }
      },
      supabase: {
        url: 'https://example.supabase.co',
        key: 'super-secret-key',
        tables: {
          users: 'users',
          challenges: 'challenges',
          responses: 'responses',
          insights: 'insights'
        }
      },
      openai: {
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o'
      },
      logging: {
        level: 'info',
        filePaths: {
          error: 'logs/error.log',
          combined: 'logs/combined.log'
        },
        console: true
      },
      userJourney: {
        sessionTimeoutMinutes: 30
      },
      personality: {}
    };
    
    expect(() => validateConfig(invalidConfig)).to.throw();
  });
  
  it('should reject a configuration with missing required fields', () => {
    const invalidConfig = {
      server: {
        port: 3000,
        environment: 'development',
        // Missing baseUrl
      },
      api: {
        prefix: '/api/v1',
        docsPath: '/api-docs',
        testerPath: '/tester'
      },
      cors: {
        allowedOrigins: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        exposedHeaders: ['X-Request-Id'],
        credentials: true,
        maxAge: 86400
      },
      rateLimit: {
        enabled: true,
        global: {
          windowMs: 900000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many requests'
        },
        auth: {
          windowMs: 900000,
          max: 10,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many auth attempts'
        },
        sensitive: {
          windowMs: 3600000,
          max: 5,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many sensitive operations'
        }
      },
      supabase: {
        url: 'https://example.supabase.co',
        key: 'super-secret-key',
        tables: {
          users: 'users',
          challenges: 'challenges',
          responses: 'responses',
          insights: 'insights'
        }
      },
      openai: {
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o'
      },
      logging: {
        level: 'info',
        filePaths: {
          error: 'logs/error.log',
          combined: 'logs/combined.log'
        },
        console: true
      },
      userJourney: {
        sessionTimeoutMinutes: 30
      },
      personality: {}
    };
    
    expect(() => validateConfig(invalidConfig)).to.throw();
  });
  
  it('should format validation errors correctly', () => {
    const invalidConfig = {
      server: {
        port: -1, // Invalid port
        environment: 'invalid-env', // Invalid environment
        baseUrl: 'not-a-url' // Invalid URL
      },
      api: {
        prefix: 'no-leading-slash', // Missing leading slash
        docsPath: '/api-docs',
        testerPath: '/tester'
      },
      // Other fields...
      cors: {
        allowedOrigins: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        exposedHeaders: ['X-Request-Id'],
        credentials: true,
        maxAge: 86400
      },
      rateLimit: {
        enabled: true,
        global: {
          windowMs: 900000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many requests'
        },
        auth: {
          windowMs: 900000,
          max: 10,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many auth attempts'
        },
        sensitive: {
          windowMs: 3600000,
          max: 5,
          standardHeaders: true,
          legacyHeaders: false,
          message: 'Too many sensitive operations'
        }
      },
      supabase: {
        url: 'not-a-url', // Invalid URL
        key: 'super-secret-key',
        tables: {
          users: 'users',
          challenges: 'challenges',
          responses: 'responses',
          insights: 'insights'
        }
      },
      openai: {
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o'
      },
      logging: {
        level: 'debug',
        filePaths: {
          error: 'logs/error.log',
          combined: 'logs/combined.log'
        },
        console: true
      },
      userJourney: {
        sessionTimeoutMinutes: 30
      },
      personality: {}
    };
    
    try {
      validateConfig(invalidConfig);
      // Should not reach here
      expect(false).to.be.true;
    } catch (error) {
      // Check error message formatting
      expect(error.message).to.contain('Configuration validation failed');
      expect(error.message).to.contain('server.port');
      expect(error.message).to.contain('server.environment');
      expect(error.message).to.contain('server.baseUrl');
      expect(error.message).to.contain('api.prefix');
      expect(error.message).to.contain('supabase.url');
    }
  });
}); 