/**
 * Application status enum
 * Used to track and communicate the current application state
 */
export enum AppStatus {
  Initializing = 'initializing',
  Ready = 'ready',
  Degraded = 'degraded',
  Error = 'error'
} 