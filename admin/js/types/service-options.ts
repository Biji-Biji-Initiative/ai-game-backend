// Types improved by ts-improve-types
/**
 * Service option interfaces
 */

import { APIClient } from '../api/api-client';
import { EventBus } from '../core/EventBus';
import { ConfigManager } from '../core/ConfigManager';
import { EndpointManager } from '../modules/endpoint-manager';
import { VariableManager } from '../modules/variable-manager';
import { HistoryManager } from '../modules/history-manager';
import { StorageService } from '../services/StorageService';
import { AppController } from './app-controller';
import { UIManager } from '../components/UIManagerNew';
import { DomainStateManager } from '../modules/domain-state-manager';
import { UserFriendlyFlowManager } from '../modules/user-friendly-flow-manager';

/**
 * Base options interface for all components
 */
export interface ComponentOptions {
  debug?: boolean;
  logger?: any; // Logger interface
}

/**
 * Auth manager options
 */
export interface AuthManagerOptions extends ComponentOptions {
  apiClient?: APIClient;
  storageKey?: string;
  tokenExpiryBuffer?: number;
  refreshTokenUrl?: string;
  loginUrl?: string;
  logoutUrl?: string;
}

/**
 * Options for endpoint manager
 */
export interface EndpointManagerOptions extends ComponentOptions {
  apiClient: APIClient;
  storageService?: StorageService;
  eventBus?: EventBus;
  useLocalEndpoints?: boolean;
  supportMultipleFormats?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  endpointsFilePath?: string;
  dynamicEndpointsPath?: string;
  useDynamicEndpoints?: boolean;
  useStorage?: boolean;
  endpointsUrl?: string;
  config?: ConfigManager; // Required by EndpointManager
}

/**
 * Options for variable manager
 */
export interface VariableManagerOptions extends ComponentOptions {
  storageService?: StorageService;
  eventBus?: EventBus;
  storageKey?: string;
  persistVariables?: boolean;
  variableSyntax?: {
    prefix: string;
    suffix: string;
    jsonPathIndicator: string;
  };
}

/**
 * Options for domain state manager
 */
export interface DomainStateManagerOptions extends ComponentOptions {
  apiClient: APIClient;
  eventBus?: EventBus;
  apiBasePath?: string;
}

/**
 * Options for history manager
 */
export interface HistoryManagerOptions extends ComponentOptions {
  storageService?: StorageService;
  eventBus?: EventBus;
  maxEntries?: number;
  persistHistory?: boolean;
  storageKey?: string;
  storageType?: "localStorage" | "sessionStorage" | "memory";
}

/**
 * Options for status manager
 */
export interface StatusManagerOptions extends ComponentOptions {
  apiClient: APIClient;
  eventBus?: EventBus;
  updateInterval?: number;
  statusEndpoint?: string;
  containerId?: string;
}

/**
 * Options for backend logs manager
 */
export interface BackendLogsManagerOptions extends ComponentOptions {
  apiClient: APIClient;
  eventBus?: EventBus;
  logsEndpoint?: string;
}

/**
 * Options for user friendly flow manager
 */
export interface UserFriendlyFlowManagerOptions extends ComponentOptions {
  apiClient: APIClient;
  endpointManager: EndpointManager;
  variableManager: VariableManager;
  historyManager: HistoryManager;
  uiManager?: UIManager;
}

/**
 * Options for user friendly UI
 */
export interface UserFriendlyUIOptions extends ComponentOptions {
  apiClient: APIClient;
  endpointManager: EndpointManager;
  variableManager: VariableManager;
  historyManager: HistoryManager;
  appController: AppController;
  userFriendlyFlowManager?: UserFriendlyFlowManager;
  container?: HTMLElement;
  uiManager?: UIManager;
  flowManager?: UserFriendlyFlowManager;
  variableExtractor?: any;
  dependencyContainer?: any;
}

/**
 * Options for response viewer
 */
export interface ResponseViewerOptions extends ComponentOptions {
  container?: HTMLElement;
  responseHeadersId?: string;
  responseBodyId?: string;
  responseStatusId?: string;
  containerId?: string;
  debug?: boolean;
}

/**
 * Options for domain state viewer
 */
export interface DomainStateViewerOptions extends ComponentOptions {
  container: HTMLElement;
  domainStateManager?: DomainStateManager;
  getCurrentRequest?: () => any;
  debug?: boolean;
}

/**
 * Options for variable extractor
 */
export interface VariableExtractorOptions extends ComponentOptions {
  container: HTMLElement;
  variableManager?: VariableManager;
  debug?: boolean;
} 