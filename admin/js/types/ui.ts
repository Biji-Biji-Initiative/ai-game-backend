/**
 * UI Component Types
 * Interfaces and types for UI components
 */

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

export interface ModalButton {
  text: string;
  type?: 'primary' | 'secondary' | 'danger' | 'success' | 'info' | 'warning';
  onClick?: (modal: any) => void;
  closeOnClick?: boolean;
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
  formatter?: any;
}

// DomainStateViewer types
export interface DomainStateViewerOptions {
  containerId: string;
  stateManager: any;
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
  responseViewer: any;
  domainStateManager: any;
  apiClient?: any;
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
} 