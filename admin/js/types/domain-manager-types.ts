/**
 * Domain state manager types
 */

/**
 * Domain State Manager Options
 */
export interface DomainStateManagerOptions {
  containerId?: string;
  apiClient?: any;
  localStorageKey?: string;
  autoSave?: boolean;
  diffingEnabled?: boolean;
  snapshotLimit?: number;
  debug?: boolean;
} 