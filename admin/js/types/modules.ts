// Types improved by ts-improve-types
/**
 * Module Types
 * Interfaces and types for application modules
 */

import { IUIManager } from './ui';
import { APIClient } from '../api/api-client';
import { VariableManager } from '../modules/variable-manager';
import { EndpointManager } from '../modules/endpoint-manager';
import { HistoryManager } from '../modules/history-manager';
import { AppController } from '../controllers/AppController';
import { DomainStateViewer } from '../ui/domain-state-viewer';
import { EndpointParameter } from './endpoints.d';

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
  initialVariables?: Record<string, unknown>;
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
  apiClient?: APIClient;
  statusEndpoint?: string;
}

/**
 * Flow Controller Options
 */
export interface FlowControllerOptions {
  containerId?: string;
  uiManager?: IUIManager;
  variableManager?: VariableManager;
  endpointManager?: EndpointManager;
  historyManager?: HistoryManager;
  apiClient?: APIClient;
  autoInit?: boolean;
  appController?: AppController;
  config?: Record<string, unknown>;
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
  value: string;
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
  parameters?: EndpointParameter[];
  body?: unknown;
}

/**
 * Domain State Manager Options
 */
export interface DomainStateManagerOptions {
  apiClient?: APIClient;
  localStorageKey?: string;
  autoSave?: boolean;
  diffingEnabled?: boolean;
  snapshotLimit?: number;
  debug?: boolean;
  viewer?: DomainStateViewer;
}
