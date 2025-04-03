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
import { EndpointManager } from '../modules/endpoint-manager';
import { UIManager } from '../components/UIManagerNew';
import { VariableManager } from '../modules/variable-manager';
import { HistoryManager } from '../modules/history-manager';
import { AppController } from '../controllers/AppController';
import { EventBus } from '../core/EventBus';

/**
 * Application state interface
 */
export interface AppState {
  currentRequest: RequestInfo;
  lastResponse?: unknown;
  variables?: Record<string, unknown>;
  isLoading?: boolean;
}

/**
 * Request information interface
 */
export interface RequestInfo {
  method: string;
  url: string;
  path?: string;
  headers: Record<string, string>;
  requestBody?: unknown;
  auth?: {
    type: string;
    credentials: Record<string, string>;
  };
}

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
 * Domain State Manager interface
 */
export interface DomainStateManager {
  getState(domain: string): Record<string, unknown>;
  updateState(domain: string, data: Record<string, unknown>): void;
  clearState(domain: string): void;
  takeSnapshot(): Record<string, Record<string, unknown>>;
}

/**
 * Domain State Viewer component options
 */
export interface DomainStateViewerOptions extends ComponentOptions {
  container: HTMLElement;
  domainStateManager: DomainStateManager;
  getCurrentRequest: () => RequestInfo | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Response Viewer interface
 */
export interface ResponseViewer {
  showResponse(response: unknown): void;
  showError(error: ErrorData): void;
  clear(): void;
}

/**
 * Error data interface
 */
export interface ErrorData {
  message: string;
  code: number;
  details?: string;
  stack?: string;
}

/**
 * UI Manager component options
 */
export interface UIManagerOptions extends ComponentOptions {
  containerId: string;
  responseViewer: ResponseViewer;
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
  initialVariables?: Record<string, unknown>;
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
 * Flow Manager interface
 */
export interface FlowManager {
  loadFlows(): Promise<void>;
  getFlow(id: string): unknown;
  createFlow(flow: unknown): Promise<unknown>;
  updateFlow(flow: unknown): Promise<unknown>;
  deleteFlow(id: string): Promise<void>;
}

/**
 * Flow Controller options
 */
export interface FlowControllerOptions extends ComponentOptions {
  endpointManager: EndpointManager;
  uiManager: UIManager;
  variableManager: VariableManager;
  historyManager: HistoryManager;
  apiClient: APIClient;
  appController: AppController;
  eventBus?: EventBus;
  logger?: ComponentLogger;
}

/**
 * Auth Manager interface
 */
export interface AuthManager {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getAuthState(): unknown;
}

/**
 * App Controller options
 */
export interface AppControllerOptions extends ComponentOptions {
  configManager: ConfigManager;
  endpointManager: EndpointManager;
  historyManager: HistoryManager;
  variableManager: VariableManager;
  uiManager: UIManager;
  apiClient: APIClient;
  authManager: AuthManager;
  domainStateManager: DomainStateManager;
  flowController: FlowController | null;
  responseViewer: ResponseViewer;
  flowManager: FlowManager | null;
  logger: ComponentLogger;
}

/**
 * Flow Controller interface
 */
export interface FlowController {
  initialize(): Promise<void>;
  getCurrentFlow(): unknown;
  getStepStatuses(): Map<string, string>;
  isFlowRunning(): boolean;
}

/**
 * Variable Extractor interface
 */
export interface VariableExtractor {
  extractVariables(source: unknown, rules: Array<{ name: string; path: string }>): Record<string, unknown>;
  showExtractorUI(source: unknown): void;
  hideExtractorUI(): void;
}

/**
 * User Friendly UI options
 */
export interface UserFriendlyUIOptions extends ComponentOptions {
  container: HTMLElement;
  uiManager: UIManager;
  flowManager: FlowManager;
  variableExtractor: VariableExtractor;
  dependencyContainer: DependencyContainer;
  apiClient: APIClient;
}

/**
 * Variable Extractor options
 */
export interface VariableExtractorOptions extends ComponentOptions {
  container: HTMLElement;
  variableManager: VariableManager;
  domService?: DomService;
}

/**
 * Backend Logs Manager interface
 */
export interface BackendLogsManager {
  fetchLogs(): Promise<Array<Record<string, unknown>>>;
  clearLogs(): Promise<void>;
  startAutoRefresh(interval: number): void;
  stopAutoRefresh(): void;
}

/**
 * Logs Viewer options
 */
export interface LogsViewerOptions extends ComponentOptions {
  logsContainerId: string;
  backendLogsManager: BackendLogsManager;
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
