/**
 * Combined Application Types
 * This file contains all the interfaces used across the application to fix type issues
 */

/**
 * Application type definitions
 */

import { ResponseViewer } from '../components/ResponseViewer';
import { DomainStateManager } from '../modules/domain-state-manager';
// Import types from modules.ts
import { DomainStateManagerOptions as ModulesDomainStateManagerOptions } from './modules';

/**
 * UI Manager Interface
 */
export interface IUIManager {
  // Elements
  container: HTMLElement | null;
  toastContainer: HTMLElement | null;
  loadingOverlay: HTMLElement | null;
  modalContainer: HTMLElement | null;
  
  // Initialization methods
  initElements(): void;
  initializeUI(): void;
  
  // Toast notifications
  showToast(options: ToastOptions): void;
  showSuccess(title: string, message: string, duration?: number): void;
  showError(title: string, message: string, duration?: number): void;
  showWarning(title: string, message: string, duration?: number): void;
  showInfo(title: string, message: string, duration?: number): void;
  
  // Loading indicators
  showLoading(message?: string): void;
  hideLoading(): void;
  
  // Modal dialogs
  showModal(options: ModalOptions): HTMLElement;
  closeModal(modalEl: HTMLElement): void;
  closeAllModals(): void;
  
  // Confirmation dialogs
  confirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void): void;
  
  // Theme and styling
  setTheme(theme: string): void;
  getTheme(): string;
}

/**
 * UI Manager Options
 */
export interface UIManagerOptions {
  containerId?: string;
  toastContainerId?: string;
  loadingOverlayId?: string;
  modalContainerId?: string;
  responseViewer?: any;
  showLoadingIndicator?: (show: boolean, message?: string) => void;
  onUiReady?: () => void;
  config?: any;
  debug?: boolean;
}

/**
 * Toast Options
 */
export interface ToastOptions {
  id?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  title?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  closable?: boolean;
  onClose?: () => void;
  dismissable?: boolean;
}

/**
 * Modal Options
 */
export interface ModalOptions {
  id?: string;
  title?: string;
  content?: string | HTMLElement;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  buttons?: ModalButton[];
  closable?: boolean;
  showClose?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  className?: string;
  customClass?: string;
}

/**
 * Modal Button
 */
export interface ModalButton {
  text: string;
  type?: 'primary' | 'secondary' | 'danger' | 'success' | 'info' | 'warning';
  onClick?: (modal: any) => void;
  closeOnClick?: boolean;
}

/**
 * Response Viewer Options
 */
export interface ResponseViewerOptions {
  containerId?: string;
  responseHeadersId?: string;
  responseBodyId?: string;
  responseStatusId?: string;
  prettyPrint?: boolean;
  syntaxHighlighting?: boolean;
  collapsibleSections?: boolean;
  maxDepth?: number;
  formatter?: any;
}

/**
 * Domain State Viewer Options
 */
export interface DomainStateViewerOptions {
  containerId?: string;
  stateManager?: DomainStateManager | any;
  showFilters?: boolean;
  showTimeline?: boolean;
  selectedEntityTypes?: string[];
  initialView?: 'graph' | 'tree' | 'table';
  enableExport?: boolean;
  maxItems?: number;
  compactView?: boolean;
  defaultEntityTypes?: string[];
}

/**
 * Variable Extractor Options
 */
export interface VariableExtractorOptions {
  containerId?: string;
  responseViewer?: ResponseViewer | any;
  domainStateManager?: DomainStateManager | any;
  apiClient?: any;
  variablePrefix?: string;
  suggestionsEnabled?: boolean;
  autoExtract?: boolean;
  maxSuggestions?: number;
}

/**
 * Flow Controller Options
 */
export interface FlowControllerOptions {
  containerId?: string;
  endpointManager: any;
  uiManager: IUIManager | any;
  variableManager: any;
  historyManager: any;
  apiClient?: any;
  autoInit?: boolean;
  appController?: any;
  config?: any;
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
  maxItems?: number;
}

/**
 * Domain State Manager Options
 * Extends the base interface from modules.ts
 */
export interface DomainStateManagerOptions extends ModulesDomainStateManagerOptions {
  apiClient?: any;
  localStorageKey?: string;
  autoSave?: boolean;
  diffingEnabled?: boolean;
  snapshotLimit?: number;
  debug?: boolean;
  viewer?: any;
}

/**
 * Variable Manager Options
 */
export interface VariableManagerOptions {
  storageKey?: string;
  persistVariables?: boolean;
  storageType?: 'localStorage' | 'sessionStorage';
  maxVariables?: number;
  variablePrefix?: string;
  variableSuffix?: string;
  variableSyntax?: {
    prefix: string;
    suffix: string;
    jsonPathIndicator?: string;
  };
  initialVariables?: Record<string, any>;
}

/**
 * Status Manager Options
 */
export interface StatusManagerOptions {
  containerId?: string;
  updateInterval?: number;
  apiClient?: any;
  statusEndpoint?: string;
  healthEndpoint?: string; // For backward compatibility
}

/**
 * Endpoint Manager Options
 */
export interface EndpointManagerOptions {
  useLocalEndpoints?: boolean;
  supportMultipleFormats?: boolean;
  apiClient?: any;
  endpointsPath?: string;
}

/**
 * Domain State Manager Interface
 */
export interface IDomainStateManager {
  // State management
  loadState(state: any): void;
  saveState(): void;
  getState(): any;
  clearState(): void;
  
  // Entity operations
  addEntity(type: string, data: any): string;
  updateEntity(id: string, data: any): boolean;
  deleteEntity(id: string): boolean;
  getEntity(id: string): any | null;
  getEntitiesByType(type: string): any[];
  
  // Snapshot operations
  takeBeforeSnapshot(entityTypes?: string[]): string | Promise<void>;
  takeAfterSnapshot(entityTypes?: string[]): Promise<string | void>;
  getSnapshot(id: string): any | null;
  getLatestSnapshot(): any | null;
  getDiffs(beforeId?: string, afterId?: string): any[] | Record<string, any>;
  
  // Events
  addEventListener(event: string, handler: (data: any) => void): void;
  removeEventListener(event: string, handler: (data: any) => void): void;
}

/**
 * Variable Extractor Interface
 */
export interface IVariableExtractor {
  // Core methods
  extractVariables(response: any): any[];
  getVariables(): any[];
  
  // Extraction helper methods
  extractFromJson(json: any, path?: string): any[];
  extractFromText(text: string): any[];
  extractFromHeaders(headers: Record<string, string>): any[];
  
  // Suggestion methods
  suggestVariables(response: any): any[];
  renderSuggestions(container: HTMLElement | any, suggestions: any[], onAdd: (suggestion: any) => void): void;
  showExtractionModal?(data: any): void;
  
  // UI methods
  render(): void;
  clear(): void;
  
  // Events
  addEventListener(event: string, handler: (data: any) => void): void;
  removeEventListener(event: string, handler: (data: any) => void): void;
}

/**
 * RequestBuilder types
 */
export interface RequestBuilderOptions {
  containerId?: string;
  uiManager?: IUIManager;
  onRequestDataChange?: (data: any) => void;
}

/**
 * Add Error with optional code property
 */
declare global {
  interface Error {
    code?: number;
    status?: number;
  }
} 