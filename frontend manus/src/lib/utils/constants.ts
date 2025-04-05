/**
 * Constants used throughout the application
 */

/**
 * Development mode flag
 */
export const IS_DEV_MODE = process.env.NODE_ENV === 'development';

/**
 * Production mode flag
 */
export const IS_PROD_MODE = process.env.NODE_ENV === 'production';

/**
 * Test mode flag
 */
export const IS_TEST_MODE = process.env.NODE_ENV === 'test';

/**
 * Feature flags for conditional enablement
 */
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_MOCK_API: true,
  ENABLE_NOTIFICATIONS: true,
};

/**
 * Application routes
 */
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  CHALLENGES: '/challenges',
  SETTINGS: '/settings',
};

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user-preferences',
  AUTH_TOKEN: 'auth-token',
  GAME_PROGRESS: 'game-progress',
}; 