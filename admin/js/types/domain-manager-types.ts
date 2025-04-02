// Types improved by ts-improve-types
/**
 * Domain state manager types
 */

import { ApiClient } from '../services/api-client'; // Assuming ApiClient is here

/**
 * Domain State Manager Options
 */
export interface DomainStateManagerOptions {
  containerId?: string;
  apiClient?: ApiClient;
  localStorageKey?: string;
  autoSave?: boolean;
  diffingEnabled?: boolean;
  snapshotLimit?: number;
  debug?: boolean;
}
