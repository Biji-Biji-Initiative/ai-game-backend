/**
 * Core Modules Types Definition
 */

/**
 * Endpoint interface
 */
export interface Endpoint {
  id: string;
  method: string;
  path: string;
  name: string;
  description: string;
  category: string;
  parameters: EndpointParameter[];
  headers: Record<string, string>;
  requestBody: any;
  responseExample: any;
  requiresAuth: boolean;
  tags: string[];
  isCustom?: boolean;
}

/**
 * Endpoint Parameter interface
 */
export interface EndpointParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  type?: string;
  default?: any;
  enum?: any[];
}

/**
 * EndpointManager Options
 */
export interface EndpointManagerOptions {
  apiClient?: any;
  config?: any;
  maxRetries?: number;
  retryDelay?: number;
  useLocalEndpoints?: boolean;
  supportMultipleFormats?: boolean;
  endpointsFilePath?: string;
  dynamicEndpointsPath?: string;
  useDynamicEndpoints?: boolean;
}

/**
 * BackendLogsManager Options
 */
export interface BackendLogsManagerOptions {
  apiClient?: any;
  logsEndpoint?: string;
  maxLogsToFetch?: number;
  refreshInterval?: number | null;
  autoRefresh?: boolean;
}

/**
 * StatusManager Options
 */
export interface StatusManagerOptions {
  healthEndpoint?: string;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

/**
 * Variable Manager Options
 */
export interface VariableManagerOptions {
  persistVariables?: boolean;
  storageKey?: string;
  variableSyntax?: {
    prefix?: string;
    suffix?: string;
    jsonPathIndicator?: string;
  };
  initialVariables?: Record<string, any>;
}

/**
 * Domain State Manager Options
 */
export interface DomainStateManagerOptions {
  apiBasePath?: string;
  entityTypesEndpoint?: string;
  snapshotBeforeRequest?: boolean;
  snapshotAfterRequest?: boolean;
  snapshotDelay?: number;
}

/**
 * History Manager Options
 */
export interface HistoryManagerOptions {
  maxEntries?: number;
  persistHistory?: boolean;
  storageKey?: string;
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';
  compressionEnabled?: boolean;
  compressionThreshold?: number;
  storageQuotaWarningThreshold?: number;
} 