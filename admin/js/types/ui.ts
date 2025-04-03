// Types improved by ts-improve-types
/**
 * UI Component Types
 * Interfaces and types for UI components
 */

// Add necessary imports
import { ResponseViewer } from '../components/ResponseViewer';
import { DomainStateViewer } from '../ui/domain-state-viewer';
import { EventBus } from '../core/EventBus';
import { DomainStateManager } from '../modules/domain-state-manager';
import { APIClient } from '../api/api-client';
import { StorageService } from '../services/StorageService';

// UI Manager types
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
  showToast(option: ToastOptions): void;
  showSuccess(titl: string, message: string, duration?: number): void;
  showError(titl: string, message: string, duration?: number): void;
  showWarning(titl: string, message: string, duration?: number): void;
  showInfo(titl: string, message: string, duration?: number): void;

  // Loading indicators
  showLoading(message?: string): void;
  hideLoading(): void;

  // Modal dialogs
  showModal(option: ModalOptions): HTMLElement;
  closeModal(modalE: HTMLElement): void;
  closeAllModals(): void;

  // Confirmation dialogs
  confirm(titl: string, message: string, onConfirm: () => void, onCancel?: () => void): void;

  // Theme and styling
  setTheme(them: string): void;
  getTheme(): string;
}

/**
 * Toast notification options
 */
export interface ToastOptions {
  id?: string;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  closable?: boolean;
  dismissable?: boolean;
  onClose?: () => void;
  callback?: () => void;
}

/**
 * Modal dialog options
 */
export interface ModalOptions {
  id?: string;
  title?: string;
  content?: string | HTMLElement;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closable?: boolean;
  showClose?: boolean;
  customClass?: string;
  buttons?: Array<{
    text: string;
    type?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
    callback?: (modal: HTMLElement) => void;
    onClick?: (modal: HTMLElement) => void;
    closeOnClick?: boolean;
  }>;
  onClose?: () => void;
  onOpen?: () => void;
}

/**
 * UI Manager Options
 */
export interface UIManagerOptions {
  containerId?: string;
  toastContainerId?: string;
  loadingOverlayId?: string;
  modalContainerId?: string;
  responseViewer?: ResponseViewer | null;
  domainStateViewer?: DomainStateViewer | null;
  showLoadingIndicator?: (show: boolean, message?: string) => void;
  onUiReady?: () => void;
  config?: Record<string, unknown>;
  debug?: boolean;
  eventBus?: EventBus;
}

// ResponseViewer types
export interface ResponseViewerOptions {
  containerId: string;
  responseHeadersId: string;
  responseBodyId: string;
  responseStatusId: string;
  prettyPrint?: boolean;
  syntaxHighlighting?: boolean;
  collapsibleSections?: boolean;
  maxDepth?: number;
  formatter?: Window['JSONFormatter'];
  showCopyButton?: boolean;
  showDownloadButton?: boolean;
  showToggleFormat?: boolean;
  enableVirtualization?: boolean;
  maxHeight?: string;
}

// DomainStateViewer types
export interface DomainStateViewerOptions {
  containerId: string;
  stateManager: DomainStateManager;
  showFilters?: boolean;
  showTimeline?: boolean;
  selectedEntityTypes?: string[];
  initialView?: 'graph' | 'tree' | 'table';
  enableExport?: boolean;
  maxItems?: number;
  compactView?: boolean;
  defaultEntityTypes?: string[];
}

// VariableExtractor types
export interface VariableExtractorOptions {
  containerId: string;
  responseViewer: ResponseViewer;
  domainStateManager: DomainStateManager;
  apiClient?: APIClient;
  variablePrefix?: string;
  suggestionsEnabled?: boolean;
  autoExtract?: boolean;
  maxSuggestions?: number;
}

// History Manager types
export interface HistoryManagerOptions {
  maxEntries?: number;
  persistHistory?: boolean;
  storageKey?: string;
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';
  compressionEnabled?: boolean;
  compressionThreshold?: number;
  storageQuotaWarningThreshold?: number;
  maxItems?: number;
  storageService?: StorageService;
  eventBus?: EventBus;
}
