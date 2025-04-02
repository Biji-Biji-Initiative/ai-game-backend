/**
 * Application Types
 * 
 * Centralized type definitions for component options and configuration
 */

import { APIClient } from '../api/api-client';
import { ConfigManager } from '../core/ConfigManager';
import { Logger, ComponentLogger } from '../core/Logger';
import { DependencyContainer } from '../core/DependencyContainer';
import { StorageService } from '../services/StorageService';
import { DomService } from '../services/DomService';

/**
 * Base component options interface
 */
export interface ComponentOptions {
  // Base options all components might need
  debug?: boolean;
}

/**
 * Response Viewer component options
 */
export interface ResponseViewerOptions extends ComponentOptions {
  containerId: string;
  responseHeadersId: string;
  responseBodyId: string;
  responseStatusId: string;
  formatJsonResponse?: boolean;
  showRawResponse?: boolean;
  maxHeadersDisplayed?: number;
}

/**
 * Domain State Viewer component options
 */
export interface DomainStateViewerOptions extends ComponentOptions {
  container: HTMLElement;
  domainStateManager: any; // DomainStateManager
  getCurrentRequest: () => any | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * UI Manager component options
 */
export interface UIManagerOptions extends ComponentOptions {
  containerId: string;
  responseViewer: any; // ResponseViewer
  toastContainerId: string;
  loadingOverlayId: string;
  modalContainerId: string;
  confirmationDialogId?: string;
  domService?: DomService;
}

/**
 * Endpoint Manager options
 */
export interface EndpointManagerOptions extends ComponentOptions {
  useLocalEndpoints: boolean;
  supportMultipleFormats: boolean;
  apiClient: APIClient;
  config: ConfigManager;
  maxRetries?: number;
  retryDelay?: number;
  endpointsFilePath?: string;
  dynamicEndpointsPath?: string;
  useDynamicEndpoints?: boolean;
  useStorage?: boolean;
  endpointsUrl?: string;
  storageService?: StorageService;
}

/**
 * Variable Manager options
 */
export interface VariableManagerOptions extends ComponentOptions {
  storageKey: string;
  persistVariables: boolean;
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';
  maxVariables?: number;
  variableSyntax?: {
    prefix: string;
    suffix: string;
    jsonPathIndicator: string;
  };
  initialVariables?: Record<string, any>;
  storageService?: StorageService;
}

/**
 * Domain State Manager options
 */
export interface DomainStateManagerOptions extends ComponentOptions {
  apiBasePath: string;
  shouldCache?: boolean;
  cacheExpiry?: number;
  apiClient?: APIClient;
}

/**
 * Status Manager options
 */
export interface StatusManagerOptions extends ComponentOptions {
  updateInterval: number;
  statusEndpoint: string;
  containerId: string;
  apiClient?: APIClient;
}

/**
 * History Manager options
 */
export interface HistoryManagerOptions extends ComponentOptions {
  maxEntries: number;
  persistHistory: boolean;
  storageKey: string;
  storageType: 'localStorage' | 'sessionStorage' | 'memory';
  storageService?: StorageService;
}

/**
 * Flow Controller options
 */
export interface FlowControllerOptions extends ComponentOptions {
  endpointManager: any; // EndpointManager
  uiManager: any; // UIManager
  variableManager: any; // VariableManager
  historyManager: any; // HistoryManager
  apiClient: APIClient;
  appController: any; // AppController
}

/**
 * App Controller options
 */
export interface AppControllerOptions extends ComponentOptions {
  configManager: ConfigManager;
  endpointManager: any; // EndpointManager
  historyManager: any; // HistoryManager
  variableManager: any; // VariableManager
  uiManager: any; // UIManager
  apiClient: APIClient;
  authManager: any; // AuthManager
  domainStateManager: any; // DomainStateManager
  flowController: any | null; // FlowController
  responseViewer: any; // ResponseViewer
  flowManager: any | null; // FlowManager
  logger: ComponentLogger;
}

/**
 * User Friendly UI options
 */
export interface UserFriendlyUIOptions extends ComponentOptions {
  container: HTMLElement;
  uiManager: any; // UIManager
  flowManager: any; // UserFriendlyFlowManager
  variableExtractor: any; // VariableExtractor
  dependencyContainer: DependencyContainer;
  apiClient: APIClient;
}

/**
 * Variable Extractor options
 */
export interface VariableExtractorOptions extends ComponentOptions {
  container: HTMLElement;
  variableManager: any; // VariableManager
  domService?: DomService;
}

/**
 * Logs Viewer options
 */
export interface LogsViewerOptions extends ComponentOptions {
  logsContainerId: string;
  backendLogsManager: any; // BackendLogsManager
  maxFrontendLogs: number;
  showFrontendLogs: boolean;
  showBackendLogs: boolean;
  enableAiLogFormatting: boolean;
  enableDomainEventFormatting: boolean;
  enableCorrelationIdFiltering: boolean;
  enableSearchFiltering: boolean;
  autoRefreshBackendLogs: boolean;
  refreshInterval: number;
  domService?: DomService;
}

/**
 * Backend Logs Manager options
 */
export interface BackendLogsManagerOptions extends ComponentOptions {
  logsEndpoint: string;
  apiClient?: APIClient;
  maxLogRetention?: number;
}

/**
 * Storage Service Factory options
 */
export interface StorageServiceFactoryOptions {
  storageType: 'localStorage' | 'sessionStorage' | 'memory';
  namespace?: string;
}

/**
 * Represents the information needed to make an API request
 */
export interface RequestInfo {
  method: string;
  url: string;
  path?: string;
  headers: Record<string, string>;
  requestBody?: unknown;
  auth?: unknown;
}
