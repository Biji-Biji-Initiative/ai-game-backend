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
import { Logger, ComponentLogger } from '../core/Logger';
import { ResponseViewer } from '../components/ResponseViewer';
import { DomainStateViewer } from '../components/DomainStateViewer';
import { VariableExtractor } from '../components/VariableExtractor';
import { FlowController } from '../controllers/FlowController';
import { NetworkService } from '../services/NetworkService';
import { LoggingService } from '../services/LoggingService';
import { DependencyContainer } from '../core/DependencyContainer';
import LogsViewer from '../components/LogsViewer';

/**
 * Base options interface for all components
 */
export interface ComponentOptions {
  debug?: boolean;
  logger?: ComponentLogger;
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
  storageService?: StorageService;
  eventBus: EventBus;
  logger: ComponentLogger;
}

/**
 * Options for endpoint manager
 */
export interface EndpointManagerOptions extends ComponentOptions {
  apiClient: APIClient;
  storageService?: StorageService;
  eventBus: EventBus;
  logger: ComponentLogger;
  useLocalEndpoints?: boolean;
  supportMultipleFormats?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  endpointsFilePath?: string;
  dynamicEndpointsPath?: string;
  useDynamicEndpoints?: boolean;
  useStorage?: boolean;
  endpointsUrl?: string;
  configManager?: ConfigManager;
}

/**
 * Options for variable manager
 */
export interface VariableManagerOptions extends ComponentOptions {
  storageService?: StorageService;
  eventBus: EventBus;
  logger: ComponentLogger;
  storageKey?: string;
  persistVariables?: boolean;
  persistToStorage?: boolean;
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
  apiClient?: APIClient;
  eventBus: EventBus;
  logger: ComponentLogger;
  apiBasePath?: string;
}

/**
 * Options for history manager
 */
export interface HistoryManagerOptions extends ComponentOptions {
  storageService?: StorageService;
  eventBus: EventBus;
  logger: ComponentLogger;
  maxEntries?: number;
  maxItems?: number;
  persistHistory?: boolean;
  storageKey?: string;
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';
}

/**
 * Options for status manager
 */
export interface StatusManagerOptions extends ComponentOptions {
  apiClient?: APIClient;
  eventBus: EventBus;
  logger: ComponentLogger;
  updateInterval?: number;
  refreshInterval?: number;
  statusEndpoint?: string;
  containerId?: string;
}

/**
 * Options for backend logs manager
 */
export interface BackendLogsManagerOptions extends ComponentOptions {
  apiClient?: APIClient;
  eventBus: EventBus;
  logger: ComponentLogger;
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
  uiManager: UIManager;
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
  variableExtractor?: VariableExtractor;
  dependencyContainer?: DependencyContainer;
}

/**
 * Options for OpenAPI service
 */
export interface OpenApiServiceOptions extends ComponentOptions {
  apiClient: APIClient;
  storageService?: StorageService;
  eventBus?: EventBus;
  configManager?: ConfigManager;
  networkService?: NetworkService;
  loggingService?: LoggingService;
}

/**
 * Options for UI manager
 */
export interface UIManagerOptions extends ComponentOptions {
  container?: HTMLElement;
  eventBus?: EventBus;
  theme?: 'light' | 'dark' | 'auto';
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
  domainStateManager: DomainStateManager;
  getCurrentRequest: () => Record<string, unknown>;
  eventBus: EventBus;
  logger: ComponentLogger;
  debug?: boolean;
}

/**
 * Options for variable extractor
 */
export interface VariableExtractorOptions extends ComponentOptions {
  container: HTMLElement;
  variableManager: VariableManager;
  eventBus: EventBus;
  logger: ComponentLogger;
  debug?: boolean;
}

/**
 * Options for flow controller
 */
export interface FlowControllerOptions extends ComponentOptions {
  apiClient: APIClient;
  endpointManager: EndpointManager;
  variableManager: VariableManager;
  historyManager: HistoryManager;
  eventBus?: EventBus;
}

/**
 * Options for response controller
 */
export interface ResponseControllerOptions extends ComponentOptions {
  responseViewer: ResponseViewer;
  flowController: FlowController;
  apiClient?: APIClient;
  eventBus?: EventBus;
}

/**
 * Options for user interface controller
 */
export interface UserInterfaceControllerOptions extends ComponentOptions {
  uiManager: UIManager;
  responseViewer: ResponseViewer;
  domainStateViewer: DomainStateViewer;
  variableExtractor: VariableExtractor;
  logsViewer: LogsViewer;
  eventBus?: EventBus;
}

/**
 * Options for logs viewer
 */
export interface LogsViewerOptions extends ComponentOptions {
  logsContainerId?: string;
  container?: HTMLElement;
  eventBus?: EventBus;
}
