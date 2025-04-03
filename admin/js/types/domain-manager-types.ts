// Types improved by ts-improve-types
/**
 * Domain state manager types
 */

import { APIClient } from '../api/api-client'; // Fixed import from correct location

/**
 * Domain State Manager Options
 */
export interface DomainStateManagerOptions {
  containerId?: string;
  apiClient?: APIClient;
  localStorageKey?: string;
  autoSave?: boolean;
  diffingEnabled?: boolean;
  snapshotLimit?: number;
  debug?: boolean;
}
