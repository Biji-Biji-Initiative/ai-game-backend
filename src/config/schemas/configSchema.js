import { z } from "zod";

/**
 * Schema for validating application configuration
 * This ensures that the configuration object loaded from environment variables
 * has all required properties and correct data types
 */

// Server configuration schema
const serverSchema = z.object({
  port: z.number().int().positive(),
  environment: z.enum(['development', 'testing', 'production']),
  baseUrl: z.string().url()
});

// API configuration schema
const apiSchema = z.object({
  prefix: z.string().startsWith('/'),
  docsPath: z.string().startsWith('/'),
  testerPath: z.string().startsWith('/')
});

// CORS configuration schema
const corsSchema = z.object({
  allowedOrigins: z.union([
    z.string().min(1),
    z.array(z.string())
  ]),
  methods: z.array(z.string()),
  allowedHeaders: z.array(z.string()),
  exposedHeaders: z.array(z.string()),
  credentials: z.boolean(),
  maxAge: z.number().int().positive()
});

// Rate limiting configuration schema
const rateLimitConfigSchema = z.object({
  windowMs: z.number().int().positive(),
  max: z.number().int().positive(),
  standardHeaders: z.boolean(),
  legacyHeaders: z.boolean(),
  message: z.string()
}).partial({ 
  skip: z.boolean() 
});

const rateLimitSchema = z.object({
  enabled: z.boolean(),
  global: rateLimitConfigSchema,
  auth: rateLimitConfigSchema,
  sensitive: rateLimitConfigSchema
});

// Supabase configuration schema
const supabaseSchema = z.object({
  url: z.string().url().or(z.string().length(0).optional()),
  key: z.string().min(1).or(z.string().length(0).optional()),
  tables: z.object({
    users: z.string(),
    challenges: z.string(),
    responses: z.string(),
    insights: z.string()
  })
});

// OpenAI configuration schema
const openaiSchema = z.object({
  apiKey: z.string().min(1).or(z.string().length(0).optional()),
  defaultModel: z.string()
});

// Logging configuration schema
const loggingSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']),
  filePaths: z.object({
    error: z.string(),
    combined: z.string()
  }),
  console: z.boolean()
});

// User Journey configuration schema
const userJourneySchema = z.object({
  sessionTimeoutMinutes: z.number().int().positive()
});

// Personality configuration schema
const personalitySchema = z.object({}).passthrough(); // Allow any properties for now

// Main configuration schema
export const configSchema = z.object({
  server: serverSchema,
  api: apiSchema,
  cors: corsSchema,
  rateLimit: rateLimitSchema,
  supabase: supabaseSchema,
  openai: openaiSchema,
  logging: loggingSchema,
  userJourney: userJourneySchema,
  personality: personalitySchema
}).strict();

/**
 * Validates the configuration object against the schema
 * 
 * @param {Object} config - The configuration object to validate
 * @returns {Object} The validated configuration object
 * @throws {Error} If validation fails
 */
export function validateConfig(config) {
  try {
    const validatedConfig = configSchema.parse(config);
    return validatedConfig;
  } catch (error) {
    // Format the error message for better readability
    const formattedError = formatValidationError(error);
    
    // Throw a new error with the formatted message
    throw new Error(
      `Configuration validation failed:\n${formattedError}`
    );
  }
}

/**
 * Formats a Zod validation error into a readable string
 * 
 * @param {import('zod').ZodError} error - The Zod validation error
 * @returns {string} Formatted error message
 */
function formatValidationError(error) {
  if (!error.errors || !Array.isArray(error.errors)) {
    return error.message;
  }
  
  return error.errors.map(err => {
    const path = err.path.join('.');
    return `- ${path}: ${err.message}`;
  }).join('\n');
}

export default {
  configSchema,
  validateConfig
}; 