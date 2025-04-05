/**
 * Environment Configuration
 * 
 * This file centralizes access to environment variables and provides
 * type-safe defaults for all environment configurations.
 */

/**
 * API configuration
 */
export const apiConfig = {
  /** Whether API mocking is enabled */
  isMockingEnabled: process.env.NEXT_PUBLIC_API_MOCKING === 'enabled',
  
  /** Base URL for API calls */
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3080/api',
};

/**
 * Application configuration
 */
export const appConfig = {
  /** Application name */
  name: process.env.NEXT_PUBLIC_APP_NAME || 'AI Fight Club',
  
  /** Application URL */
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

/**
 * Feature flags
 */
export const featureFlags = {
  /** Whether logging features are enabled */
  logging: process.env.NEXT_PUBLIC_FEATURE_LOGGING === 'true',
};

/**
 * Default UI settings
 */
export const uiConfig = {
  /** Default theme (system, light, dark) */
  defaultTheme: process.env.NEXT_PUBLIC_DEFAULT_THEME || 'system',
};

/**
 * Get environment name (development, production, test)
 */
export const getEnvironment = (): 'development' | 'production' | 'test' => {
  return (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
};

/**
 * Check if running in development environment
 */
export const isDevelopment = (): boolean => getEnvironment() === 'development';

/**
 * Check if running in production environment
 */
export const isProduction = (): boolean => getEnvironment() === 'production';

/**
 * Check if running in test environment
 */
export const isTest = (): boolean => getEnvironment() === 'test';
