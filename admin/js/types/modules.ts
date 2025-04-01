/**
 * Module Types
 * Interfaces and types for application modules
 */

import { IUIManager } from '../components/UIManagerNew';

/**
 * Variable Manager Options
 */
export interface VariableManagerOptions {
  persistVariables?: boolean;
  storageKey?: string;
  variablePrefix?: string;
  variableSuffix?: string;
  maxVariables?: number;
  storageType?: 'localStorage' | 'sessionStorage';
  initialVariables?: Record<string, any>;
  variableSyntax?: {
    prefix: string;
    suffix: string;
    jsonPathIndicator?: string;
  };
}

/**
 * Status Manager Options
 */
export interface StatusManagerOptions {
  containerId?: string;
  updateInterval?: number;
  apiClient?: any;
  statusEndpoint?: string;
}

/**
 * Flow Controller Options
 */
export interface FlowControllerOptions {
  containerId?: string;
  uiManager?: any;
  variableManager?: any;
  endpointManager?: any;
  historyManager?: any;
  apiClient?: any;
  autoInit?: boolean;
  appController?: any;
  config?: any;
}

/**
 * Status Response
 */
export interface StatusResponse {
  status: string;
  services: {
    [key: string]: ServiceStatus;
  };
  timestamp: string;
}

/**
 * Service Status
 */
export interface ServiceStatus {
  status: string;
  message?: string;
  version?: string;
  uptime?: number;
}

/**
 * Variable shape
 */
export interface Variable {
  name: string;
  value: any;
  type?: string;
  description?: string;
  scope?: string;
}

/**
 * Endpoint definition
 */
export interface Endpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  description?: string;
  category?: string;
  headers?: Record<string, string>;
  parameters?: Record<string, any>;
  body?: any;
}

/**
 * Domain State Manager Options
 */
export interface DomainStateManagerOptions {
  apiClient?: any;
  localStorageKey?: string;
  autoSave?: boolean;
  diffingEnabled?: boolean;
  snapshotLimit?: number;
  debug?: boolean;
  viewer?: any;
} 