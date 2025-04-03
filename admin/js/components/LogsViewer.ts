// Types improved by ts-improve-types
/**
 * LogsViewer Component
 * Displays frontend and backend logs, with special handling for AI logs
 */

import { BackendLogsManager } from '../modules/backend-logs-manager';
import { Logger } from '../core/Logger';
import { DomService, BrowserDomService } from '../services/DomService';
import { StorageService, LocalStorageService } from '../services/StorageService';
import { EventBus } from '../core/EventBus';

// Define log level type
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

// Define log entry interface
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlationId?: string;
  meta?: Record<string, unknown>;
  context?: Record<string, unknown>;
  service?: string;
  data?: Record<string, unknown>;
  role?: string;
  content?: string;
}

// Define options interface
export interface LogsViewerOptions {
  logsContainerId?: string;
  backendLogsManager?: BackendLogsManager | null;
  maxFrontendLogs?: number;
  showFrontendLogs?: boolean;
  showBackendLogs?: boolean;
  enableAiLogFormatting?: boolean;
  enableDomainEventFormatting?: boolean;
  enableCorrelationIdFiltering?: boolean;
  enableSearchFiltering?: boolean;
  autoRefreshBackendLogs?: boolean;
  refreshInterval?: number;
  domService?: DomService;
  storageService?: StorageService;
  eventBus?: EventBus;
}

// Extension of DomService to add missing methods needed by this component
interface ExtendedDomService extends DomService {
  /**
   * Adds a CSS class to an element
   * @param element Element to add class to
   * @param className Class name to add
   */
  addClass?(element: HTMLElement, className: string): void;
}

/**
 * LogsViewer class
 * Displays and manages logs in the UI
 */
export class LogsViewer {
  private options: Required<LogsViewerOptions>;
  private container: HTMLElement | null;
  private frontendLogsTab: HTMLElement | null;
  private backendLogsTab: HTMLElement | null;
  private frontendLogsContainer: HTMLElement | null;
  private backendLogsContainer: HTMLElement | null;
  private frontendLogsList: HTMLElement | null;
  private backendLogsList: HTMLElement | null;
  private activeTab: 'frontend' | 'backend';
  private frontendLogs: LogEntry[];
  private refreshIntervalId: number | null;
  private backendLogsManager: BackendLogsManager | null;
  private originalConsole: Record<string, Function>;
  private domService: ExtendedDomService;
  private storageService: StorageService;
  private eventBus: EventBus;
  private logger = Logger.getLogger('LogsViewer');

  /**
   * Creates a new LogsViewer instance
   * @param options Configuration options
   */
  constructor(option: LogsViewerOptions = {}) {
    // Set default options
    this.options = {
      logsContainerId: 'logs-container',
      backendLogsManager: null,
      maxFrontendLogs: 1000,
      showFrontendLogs: true,
      showBackendLogs: true,
      enableAiLogFormatting: true,
      enableDomainEventFormatting: true,
      enableCorrelationIdFiltering: true,
      enableSearchFiltering: true,
      autoRefreshBackendLogs: false,
      refreshInterval: 10000, // 10 seconds
      domService: new BrowserDomService(),
      storageService: option.storageService || new LocalStorageService(), // Default to LocalStorageService
      eventBus: option.eventBus || EventBus.getInstance(),
      ...option,
    };

    // Initialize properties
    this.domService = this.options.domService as ExtendedDomService;
    
    // Add missing addClass method if not present
    if (!this.domService.addClass) {
      this.domService.addClass = (element: HTMLElement, className: string) => {
        element.classList.add(className);
      };
    }
    
    this.storageService = this.options.storageService;
    this.eventBus = this.options.eventBus;
    this.container = this.domService.getElementById(this.options.logsContainerId);
    this.frontendLogsTab = null;
    this.backendLogsTab = null;
    this.frontendLogsContainer = null;
    this.backendLogsContainer = null;
    this.frontendLogsList = null;
    this.backendLogsList = null;
    this.activeTab = 'backend';
    this.frontendLogs = [];
    this.refreshIntervalId = null;
    this.backendLogsManager = this.options.backendLogsManager;
    this.originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Initialize UI
    this.initializeUI();

    // Initialize backend logs manager
    this.initializeBackendLogsManager();

    // Hook into console methods to capture frontend logs
    if (this.options.showFrontendLogs) {
      this.hookConsole();
    }
  }

  /**
   * Initializes the UI elements
   */
  private initializeUI(): void {
    if (!this.container) {
      this.logger.error('Cannot find container element with ID', this.options.logsContainerId);
      return;
    }

    // Create frontend/backend tabs UI if both are enabled
    if (this.options.showFrontendLogs && this.options.showBackendLogs) {
      // Create tabs container
      const tabsContainer = this.domService.createElement('div');
      this.domService.setAttributes(tabsContainer, { className: 'logs-tabs mb-4 border-b border-border' });

      // Create frontend tab
      this.frontendLogsTab = this.domService.createElement('button');
      this.domService.setAttributes(this.frontendLogsTab, { className: 'logs-tab px-4 py-2 mr-2' });
      this.domService.setTextContent(this.frontendLogsTab, 'Frontend Logs');
      this.frontendLogsTab.addEventListener('click', () => this.switchTab('frontend'));

      // Create backend tab
      this.backendLogsTab = this.domService.createElement('button');
      this.domService.setAttributes(this.backendLogsTab, { className: 'logs-tab px-4 py-2' });
      this.domService.setTextContent(this.backendLogsTab, 'Backend Logs');
      this.backendLogsTab.addEventListener('click', () => this.switchTab('backend'));

      // Add tabs to container
      this.domService.appendChild(tabsContainer, this.frontendLogsTab);
      this.domService.appendChild(tabsContainer, this.backendLogsTab);

      // Add tabs container to main container
      this.domService.appendChild(this.container, tabsContainer);

      // Create frontend logs container
      this.frontendLogsContainer = this.domService.createElement('div');
      this.domService.setAttributes(this.frontendLogsContainer, { className: 'logs-container hidden' });

      // Create frontend logs filter controls
      const frontendFiltersContainer = this.domService.createElement('div');
      this.domService.setAttributes(frontendFiltersContainer, { className: 'logs-filter-container mb-4 flex items-center space-x-2' });
      frontendFiltersContainer.innerHTML = `
        <div class="flex space-x-2">
          <label class="flex items-center">
            <input type="checkbox" id="filter-debug" checked class="mr-1"> DEBUG
          </label>
          <label class="flex items-center">
            <input type="checkbox" id="filter-info" checked class="mr-1"> INFO
          </label>
          <label class="flex items-center">
            <input type="checkbox" id="filter-warning" checked class="mr-1"> WARNING
          </label>
          <label class="flex items-center">
            <input type="checkbox" id="filter-error" checked class="mr-1"> ERROR
          </label>
        </div>
        <div class="flex-1">
          <input type="text" id="frontend-logs-search" placeholder="Search logs..." class="w-full px-2 py-1 border border-border rounded bg-bg">
        </div>
        <button id="clear-frontend-logs-btn" class="px-2 py-1 bg-bg-sidebar text-text-muted hover:bg-bg-card rounded">Clear</button>
      `;

      // Create frontend logs list
      this.frontendLogsList = this.domService.createElement('div');
      this.domService.setAttributes(this.frontendLogsList, { id: 'frontend-logs-list' });
      this.domService.setAttributes(this.frontendLogsList, { className: 'logs-list overflow-y-auto max-h-[calc(100vh: any-300px)]' });
      this.frontendLogsList.innerHTML =
        '<div class="text-center text-text-muted p-4">No frontend logs to display</div>';

      // Add everything to frontend container
      this.domService.appendChild(this.frontendLogsContainer, frontendFiltersContainer);
      this.domService.appendChild(this.frontendLogsContainer, this.frontendLogsList);

      // Create backend logs container
      this.backendLogsContainer = this.domService.createElement('div');
      this.domService.setAttributes(this.backendLogsContainer, { className: 'logs-container' });

      // Create backend logs filter controls
      const backendFiltersContainer = this.domService.createElement('div');
      this.domService.setAttributes(backendFiltersContainer, { className: 'logs-filter-container mb-4' });
      backendFiltersContainer.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex space-x-2">
            <label class="flex items-center">
              <input type="checkbox" id="backend-filter-debug" checked class="mr-1"> DEBUG
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="backend-filter-info" checked class="mr-1"> INFO
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="backend-filter-warning" checked class="mr-1"> WARNING
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="backend-filter-error" checked class="mr-1"> ERROR
            </label>
          </div>
          <button id="refresh-backend-logs-btn" class="px-2 py-1 bg-primary-600 text-white hover:bg-primary-700 rounded">Refresh</button>
        </div>
        <div class="flex space-x-2">
          <input type="text" id="backend-logs-search" placeholder="Search logs..." class="flex-1 px-2 py-1 border border-border rounded bg-bg">
          ${
            this.options.enableCorrelationIdFiltering
              ? '<input type="text" id="backend-correlation-id" placeholder="Filter by correlation ID" class="w-1/3 px-2 py-1 border border-border rounded bg-bg">'
              : ''
          }
          <label class="flex items-center">
            <input type="checkbox" id="backend-auto-refresh" ${this.options.autoRefreshBackendLogs ? 'checked' : ''} class="mr-1"> Auto-refresh
          </label>
          <button id="clear-backend-logs-btn" class="px-2 py-1 bg-bg-sidebar text-text-muted hover:bg-bg-card rounded">Clear</button>
        </div>
      `;

      // Create backend logs list
      this.backendLogsList = this.domService.createElement('div');
      this.domService.setAttributes(this.backendLogsList, { id: 'backend-logs-list' });
      this.domService.setAttributes(this.backendLogsList, { className: 'logs-list overflow-y-auto max-h-[calc(100vh: any-350px)] mt-4' });
      this.backendLogsList.innerHTML =
        '<div class="text-center text-text-muted p-4">No backend logs to display</div>';

      // Add everything to backend container
      this.domService.appendChild(this.backendLogsContainer, backendFiltersContainer);
      this.domService.appendChild(this.backendLogsContainer, this.backendLogsList);

      // Add both containers to main container
      this.domService.appendChild(this.container, this.frontendLogsContainer);
      this.domService.appendChild(this.container, this.backendLogsContainer);

      // Set up event listeners for filter controls
      this.setupFilterEventListeners();

      // Set active tab
      this.switchTab(this.activeTab);
    } else if (this.options.showBackendLogs) {
      // Only backend logs are enabled - simpler UI
      this.backendLogsContainer = this.container;

      // Create backend logs filter controls
      const filtersContainer = this.domService.createElement('div');
      this.domService.setAttributes(filtersContainer, { className: 'logs-filter-container mb-4' });
      filtersContainer.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex space-x-2">
            <label class="flex items-center">
              <input type="checkbox" id="backend-filter-debug" checked class="mr-1"> DEBUG
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="backend-filter-info" checked class="mr-1"> INFO
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="backend-filter-warning" checked class="mr-1"> WARNING
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="backend-filter-error" checked class="mr-1"> ERROR
            </label>
          </div>
          <button id="refresh-backend-logs-btn" class="px-2 py-1 bg-primary-600 text-white hover:bg-primary-700 rounded">Refresh</button>
        </div>
        <div class="flex space-x-2">
          <input type="text" id="backend-logs-search" placeholder="Search logs..." class="flex-1 px-2 py-1 border border-border rounded bg-bg">
          ${
            this.options.enableCorrelationIdFiltering
              ? '<input type="text" id="backend-correlation-id" placeholder="Filter by correlation ID" class="w-1/3 px-2 py-1 border border-border rounded bg-bg">'
              : ''
          }
          <label class="flex items-center">
            <input type="checkbox" id="backend-auto-refresh" ${this.options.autoRefreshBackendLogs ? 'checked' : ''} class="mr-1"> Auto-refresh
          </label>
          <button id="clear-backend-logs-btn" class="px-2 py-1 bg-bg-sidebar text-text-muted hover:bg-bg-card rounded">Clear</button>
        </div>
      `;

      // Create backend logs list
      this.backendLogsList = this.domService.createElement('div');
      this.domService.setAttributes(this.backendLogsList, { id: 'backend-logs-list' });
      this.domService.setAttributes(this.backendLogsList, { className: 'logs-list overflow-y-auto max-h-[calc(100vh: any-250px)] mt-4' });
      this.backendLogsList.innerHTML =
        '<div class="text-center text-text-muted p-4">No logs to display</div>';

      // Add everything to container
      this.domService.appendChild(this.container, filtersContainer);
      this.domService.appendChild(this.container, this.backendLogsList);

      // Set up event listeners
      this.setupFilterEventListeners();
    } else if (this.options.showFrontendLogs) {
      // Only frontend logs are enabled - simpler UI
      this.frontendLogsContainer = this.container;

      // Create frontend logs filter controls
      const filtersContainer = this.domService.createElement('div');
      this.domService.setAttributes(filtersContainer, { className: 'logs-filter-container mb-4' });
      filtersContainer.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex space-x-2">
            <label class="flex items-center">
              <input type="checkbox" id="filter-debug" checked class="mr-1"> DEBUG
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="filter-info" checked class="mr-1"> INFO
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="filter-warning" checked class="mr-1"> WARNING
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="filter-error" checked class="mr-1"> ERROR
            </label>
          </div>
          <button id="clear-frontend-logs-btn" class="px-2 py-1 bg-bg-sidebar text-text-muted hover:bg-bg-card rounded">Clear</button>
        </div>
        <div class="mt-2">
          <input type="text" id="frontend-logs-search" placeholder="Search logs..." class="w-full px-2 py-1 border border-border rounded bg-bg">
        </div>
      `;

      // Create frontend logs list
      this.frontendLogsList = this.domService.createElement('div');
      this.domService.setAttributes(this.frontendLogsList, { id: 'frontend-logs-list' });
      this.domService.setAttributes(this.frontendLogsList, { className: 'logs-list overflow-y-auto max-h-[calc(100vh: any-200px)] mt-4' });
      this.frontendLogsList.innerHTML =
        '<div class="text-center text-text-muted p-4">No logs to display</div>';

      // Add everything to container
      this.domService.appendChild(this.container, filtersContainer);
      this.domService.appendChild(this.container, this.frontendLogsList);

      // Set up event listeners
      this.setupFilterEventListeners();
    }
  }

  /**
   * Initializes backend logs manager
   */
  private initializeBackendLogsManager(): void {
    if (!this.backendLogsManager || !this.options.showBackendLogs) {
      return;
    }

    // Listen for logs loaded event
    this.backendLogsManager.on('logs:loaded', (data: LogEntry[] | Record<string, unknown>) => {
      this.renderBackendLogs();
    });

    // Set up auto-refresh
    if (this.options.autoRefreshBackendLogs && this.options.refreshInterval > 0) {
      this.startAutoRefresh();
    }

    // Initial fetch
    this.refreshBackendLogs();
  }

  /**
   * Sets up event listeners for filters
   */
  private setupFilterEventListeners(): void {
    // Frontend logs filter event listeners
    if (this.options.showFrontendLogs) {
      // Level filters
      ['debug', 'info', 'warning', 'error'].forEach(level => {
        const checkbox = this.domService.getElementById(`filter-${level}`);
        if (checkbox) {
          checkbox.addEventListener('change', () => this.renderFrontendLogs());
        }
      });

      // Search filter
      const searchInput = this.domService.getElementById('frontend-logs-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => this.renderFrontendLogs());
      }

      // Clear button
      const clearButton = this.domService.getElementById('clear-frontend-logs-btn');
      if (clearButton) {
        clearButton.addEventListener('click', () => this.clearFrontendLogs());
      }
    }

    // Backend logs filter event listeners
    if (this.options.showBackendLogs) {
      // Level filters
      ['debug', 'info', 'warning', 'error'].forEach(level => {
        const checkbox = this.domService.getElementById(`backend-filter-${level}`);
        if (checkbox) {
          checkbox.addEventListener('change', () => this.renderBackendLogs());
        }
      });

      // Search filter
      const searchInput = this.domService.getElementById('backend-logs-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => this.renderBackendLogs());
      }

      // Correlation ID filter
      const correlationIdInput = this.domService.getElementById('backend-correlation-id');
      if (correlationIdInput) {
        correlationIdInput.addEventListener('input', () => this.renderBackendLogs());
      }

      // Refresh button
      const refreshButton = this.domService.getElementById('refresh-backend-logs-btn');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => this.refreshBackendLogs());
      }

      // Auto-refresh checkbox
      const autoRefreshCheckbox = this.domService.getElementById(
        'backend-auto-refresh',
      ) as HTMLInputElement;
      if (autoRefreshCheckbox) {
        autoRefreshCheckbox.addEventListener('change', () => {
          if (autoRefreshCheckbox.checked) {
            this.startAutoRefresh();
          } else {
            this.stopAutoRefresh();
          }
        });
      }

      // Clear button
      const clearButton = this.domService.getElementById('clear-backend-logs-btn');
      if (clearButton) {
        clearButton.addEventListener('click', () => this.clearBackendLogs());
      }
    }
  }

  /**
   * Switches between frontend and backend logs tabs
   * @param tab The tab to switch to
   */
  private switchTab(ta: 'frontend' | 'backend'): void {
    if (!this.options.showFrontendLogs || !this.options.showBackendLogs) {
      return;
    }

    this.activeTab = ta;

    // Update tab buttons
    if (this.frontendLogsTab && this.backendLogsTab) {
      this.frontendLogsTab.classList.toggle('border-b-2', ta === 'frontend');
      this.frontendLogsTab.classList.toggle('border-primary-500', ta === 'frontend');
      this.frontendLogsTab.classList.toggle('text-primary-500', ta === 'frontend');
      this.frontendLogsTab.classList.toggle('font-medium', ta === 'frontend');

      this.backendLogsTab.classList.toggle('border-b-2', ta === 'backend');
      this.backendLogsTab.classList.toggle('border-primary-500', ta === 'backend');
      this.backendLogsTab.classList.toggle('text-primary-500', ta === 'backend');
      this.backendLogsTab.classList.toggle('font-medium', ta === 'backend');
    }

    // Show/hide containers
    if (this.frontendLogsContainer && this.backendLogsContainer) {
      this.frontendLogsContainer.classList.toggle('hidden', ta !== 'frontend');
      this.backendLogsContainer.classList.toggle('hidden', ta !== 'backend');
    }

    // Render appropriate logs
    if (ta === 'frontend') {
      this.renderFrontendLogs();
    } else {
      this.renderBackendLogs();
    }
  }

  /**
   * Renders frontend logs based on current filters
   */
  private renderFrontendLogs(): void {
    if (!this.frontendLogsList || !this.options.showFrontendLogs) {
      return;
    }

    // Apply filters
    const filteredLogs = this.getFilteredFrontendLogs();

    if (filteredLogs.length === 0) {
      this.frontendLogsList.innerHTML =
        '<div class="text-center text-text-muted p-4">No logs match your filters</div>';
      return;
    }

    // Clear logs list
    this.frontendLogsList.innerHTML = '';

    // Sort logs by timestamp (newest first)
    filteredLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    // Render logs
    filteredLogs.forEach(log => {
      const logElement = this.domService.createElement('div');
      this.domService.setAttributes(logElement, { className: 'log-entry border-b border-border p-2' });

      const formattedTime = new Date(log.timestamp).toLocaleTimeString();
      const formattedDate = new Date(log.timestamp).toLocaleDateString();

      logElement.innerHTML = `
        <div class="log-entry-header flex items-center text-xs text-text-muted mb-1">
          <span class="log-level log-level-${log.level} px-1 py-0.5 rounded text-white mr-2" style="background-color: ${this.getLevelColor(log.level)}">
            ${log.level}
          </span>
          <span class="log-timestamp mr-2">${formattedDate} ${formattedTime}</span>
          ${log.correlationId ? `<span class="log-correlation-id bg-bg-sidebar px-1.5 py-0.5 rounded text-xs" title="${log.correlationId}">ID: ${log.correlationId.substring(0, 8)}...</span>` : ''}
        </div>
        <div class="log-message text-sm">${log.message}</div>
        ${log.data ? `<div class="log-data mt-1 bg-bg-sidebar p-2 rounded text-xs font-mono">${this.formatJson(log.data)}</div>` : ''}
      `;

      if (this.frontendLogsList) {
        this.domService.appendChild(this.frontendLogsList, logElement);
      }
    });
  }

  /**
   * Renders backend logs based on current filters
   */
  private renderBackendLogs(): void {
    if (!this.backendLogsList || !this.backendLogsManager || !this.options.showBackendLogs) {
      return;
    }

    // Get logs from backend logs manager
    const logs = this.backendLogsManager.getLogs();

    // Apply filters
    const filteredLogs = this.getFilteredBackendLogs(logs);

    if (filteredLogs.length === 0) {
      this.backendLogsList.innerHTML =
        '<div class="text-center text-text-muted p-4">No logs match your filters</div>';
      return;
    }

    // Count AI logs and domain events for the counter badges
    const aiLogCount = filteredLogs.filter(log => this.isAiLog(log)).length;
    const domainEventCount = filteredLogs.filter(log => this.isDomainEventLog(log)).length;

    // Clear logs list
    this.backendLogsList.innerHTML = '';

    // Add counters if we have special logs
    if (aiLogCount > 0 || domainEventCount > 0) {
      const countersElement = this.domService.createElement('div');
      this.domService.setAttributes(countersElement, { className: 'flex space-x-2 mb-2 text-xs' });

      if (aiLogCount > 0) {
        countersElement.innerHTML += `
          <div class="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded flex items-center">
            <span class="font-medium mr-1">${aiLogCount}</span> AI logs
          </div>
        `;
      }

      if (domainEventCount > 0) {
        countersElement.innerHTML += `
          <div class="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded flex items-center">
            <span class="font-medium mr-1">${domainEventCount}</span> Domain events
          </div>
        `;
      }

      this.domService.appendChild(this.backendLogsList, countersElement);
    }

    // Sort logs by timestamp (newest first)
    filteredLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    // Render logs
    filteredLogs.forEach(log => {
      const logElement = this.domService.createElement('div');
      this.domService.setAttributes(logElement, { className: 'log-entry border-b border-border p-2 mb-2' });

      const formattedTime = new Date(log.timestamp).toLocaleTimeString();
      const formattedDate = new Date(log.timestamp).toLocaleDateString();

      // Check if this is an AI-related log
      const isAiLog = this.isAiLog(log);

      // Check if this is a domain event log
      const isDomainEvent = this.isDomainEventLog(log);

      const logType = isDomainEvent ? 'domain-event-log' : isAiLog ? 'ai-log' : '';

      // Add classes safely
      if (isAiLog) {
        logElement.classList.add('border-l-2', 'border-l-green-500', 'bg-green-50/10');
      } else if (isDomainEvent) {
        logElement.classList.add('border-l-2', 'border-l-blue-500', 'bg-blue-50/10');
      }

      // Create expandable/collapsible log entry
      const headerHtml = `
        <div class="log-entry-header flex flex-wrap items-center text-xs text-text-muted mb-1">
          <span class="log-level log-level-${log.level} px-1 py-0.5 rounded text-white mr-2" style="background-color: ${this.getLevelColor(log.level)}">
            ${log.level}
          </span>
          <span class="log-timestamp mr-2">${formattedDate} ${formattedTime}</span>
          ${
            log.meta?.correlationId
              ? `<span class="log-correlation-id bg-bg-sidebar px-1.5 py-0.5 rounded text-xs mr-2" title="${String(log.meta.correlationId)}">ID: ${String(log.meta.correlationId).substring(0, 8)}...</span>`
              : ''
          }
          ${log.service ? `<span class="log-service-badge bg-gray-500 text-white px-1.5 py-0.5 rounded text-xs mr-2">${log.service}</span>` : ''}
          ${isAiLog ? '<span class="ai-log-badge bg-green-600 text-white px-1.5 py-0.5 rounded text-xs mr-2">AI</span>' : ''}
          ${isDomainEvent ? '<span class="domain-event-badge bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs mr-2">Event</span>' : ''}
          <span class="expand-icon ml-auto bg-bg-sidebar rounded-full h-4 w-4 inline-flex items-center justify-center text-xs font-bold cursor-pointer">+</span>
        </div>
      `;

      let detailsHtml = '';

      // Only add details if we have expandable content
      if (
        (log.meta && Object.keys(log.meta).length > 0) ||
        (log.context && Object.keys(log.context).length > 0) ||
        isAiLog ||
        isDomainEvent
      ) {
        detailsHtml = `
          <div class="log-details hidden mt-2">
            <div class="log-details-tabs flex border-b border-border">
              <button class="log-tab active py-1 px-3 text-xs" data-tab="meta">Metadata</button>
              ${log.context ? '<button class="log-tab py-1 px-3 text-xs" data-tab="context">Context</button>' : ''}
              ${isAiLog ? '<button class="log-tab py-1 px-3 text-xs" data-tab="ai">AI Details</button>' : ''}
              ${isDomainEvent ? '<button class="log-tab py-1 px-3 text-xs" data-tab="event">Event Details</button>' : ''}
            </div>
            
            <div class="log-details-content mt-2">
              <div class="log-tab-content active" data-tab="meta">
                ${log.meta ? `<div class="log-meta"><pre class="text-xs bg-bg-sidebar p-2 rounded overflow-auto max-h-60">${this.formatJson(log.meta)}</pre></div>` : '<p class="text-xs text-text-muted">No metadata available</p>'}
                ${log.service ? `<div class="log-service mt-1"><strong class="text-xs">Service:</strong> ${log.service}</div>` : ''}
              </div>
              
              ${
                log.context
                  ? `
                <div class="log-tab-content hidden" data-tab="context">
                  <pre class="text-xs bg-bg-sidebar p-2 rounded overflow-auto max-h-60">${this.formatJson(log.context)}</pre>
                </div>
                `
                  : ''
              }
              
              ${
                isAiLog
                  ? `
                <div class="log-tab-content hidden" data-tab="ai">
                  ${this.formatAiLogDetails(log)}
                </div>
                `
                  : ''
              }
              
              ${
                isDomainEvent
                  ? `
                <div class="log-tab-content hidden" data-tab="event">
                  ${this.formatDomainEventDetails(log)}
                </div>
                `
                  : ''
              }
            </div>
          </div>
        `;
      }

      // Add message
      const messageHtml = `<div class="log-message text-sm">${log.message}</div>`;

      // Combine all parts
      logElement.innerHTML = headerHtml + messageHtml + detailsHtml;

      // Add click handlers for expanding/collapsing
      const header = logElement.querySelector('.log-entry-header');
      const details = logElement.querySelector('.log-details');
      const expandIcon = logElement.querySelector('.expand-icon');

      if (header && details && expandIcon) {
        header.addEventListener('click', () => {
          details.classList.toggle('hidden');
          expandIcon.textContent = details.classList.contains('hidden') ? '+' : '-';
        });
      }

      // Add tab switching functionality
      const tabs = logElement.querySelectorAll('.log-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', e => {
          e.stopPropagation(); // Prevent header click handler from firing

          // Update active tab
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          // Show corresponding content
          const tabContents = logElement.querySelectorAll('.log-tab-content');
          const targetTab = tab.getAttribute('data-tab');

          tabContents.forEach(content => {
            content.classList.toggle('hidden', content.getAttribute('data-tab') !== targetTab);
            content.classList.toggle('active', content.getAttribute('data-tab') === targetTab);
          });
        });
      });

      if (this.backendLogsList) {
        this.domService.appendChild(this.backendLogsList, logElement);
      }
    });
  }

  /**
   * Gets filtered frontend logs based on current filter settings
   * @returns Array of filtered log entries
   */
  private getFilteredFrontendLogs(): LogEntry[] {
    let filteredLogs = [...this.frontendLogs];

    // Apply level filters
    const levelFilters: Record<string, boolean> = {
      debug:
        this.domService.getElementById('filter-debug') instanceof HTMLInputElement
          ? (this.domService.getElementById('filter-debug') as HTMLInputElement).checked
          : true,
      info:
        this.domService.getElementById('filter-info') instanceof HTMLInputElement
          ? (this.domService.getElementById('filter-info') as HTMLInputElement).checked
          : true,
      warning:
        this.domService.getElementById('filter-warning') instanceof HTMLInputElement
          ? (this.domService.getElementById('filter-warning') as HTMLInputElement).checked
          : true,
      error:
        this.domService.getElementById('filter-error') instanceof HTMLInputElement
          ? (this.domService.getElementById('filter-error') as HTMLInputElement).checked
          : true,
    };

    filteredLogs = filteredLogs.filter(log => {
      const level = log.level.toLowerCase();
      return levelFilters[level] || false;
    });

    // Apply search filter
    const searchInput = this.domService.getElementById('frontend-logs-search') as HTMLInputElement;
    if (searchInput && searchInput.value.trim()) {
      const searchTerm = searchInput.value.trim().toLowerCase();
      filteredLogs = filteredLogs.filter(log => {
        return (
          log.message.toLowerCase().includes(searchTerm) ||
          (log.correlationId && log.correlationId.toLowerCase().includes(searchTerm)) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
        );
      });
    }

    return filteredLogs;
  }

  /**
   * Gets filtered backend logs based on current filter settings
   * @param logs The logs to filter
   * @returns Array of filtered log entries
   */
  private getFilteredBackendLogs(logs: LogEntry[]): LogEntry[] {
    if (!logs || !Array.isArray(logs)) {
      return [];
    }

    // Filter by level
    const levelFilters = {
      debug: this.domService.getElementById('backend-filter-debug') as HTMLInputElement,
      info: this.domService.getElementById('backend-filter-info') as HTMLInputElement,
      warning: this.domService.getElementById('backend-filter-warning') as HTMLInputElement,
      error: this.domService.getElementById('backend-filter-error') as HTMLInputElement,
    };

    let filteredLogs = logs.filter(log => {
      const level = log.level.toLowerCase();
      // Handle the level string index safely
      if (level === 'debug') return levelFilters.debug?.checked ?? true;
      if (level === 'info') return levelFilters.info?.checked ?? true;
      if (level === 'warning') return levelFilters.warning?.checked ?? true;
      if (level === 'error') return levelFilters.error?.checked ?? true;
      return true; // Default to showing unknown levels
    });

    // Apply correlation ID filter if enabled
    if (this.options.enableCorrelationIdFiltering) {
      const correlationIdInput = this.domService.getElementById(
        'backend-correlation-id',
      ) as HTMLInputElement;
      if (correlationIdInput && correlationIdInput.value.trim()) {
        const correlationId = correlationIdInput.value.trim();
        filteredLogs = filteredLogs.filter(log => {
          return (
            (log.meta?.correlationId && String(log.meta.correlationId).includes(correlationId)) ||
            (log.correlationId && log.correlationId.includes(correlationId))
          );
        });
      }
    }

    // Apply search filter if enabled
    if (this.options.enableSearchFiltering) {
      const searchInput = this.domService.getElementById('backend-logs-search') as HTMLInputElement;
      if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filteredLogs = filteredLogs.filter(log => {
          return (
            log.message.toLowerCase().includes(searchTerm) ||
            (log.service && log.service.toLowerCase().includes(searchTerm)) ||
            (log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchTerm)) ||
            (log.context && JSON.stringify(log.context).toLowerCase().includes(searchTerm))
          );
        });
      }
    }

    return filteredLogs;
  }

  /**
   * Gets color for a log level
   * @param level The log level
   * @returns CSS color value for the level
   */
  private getLevelColor(level: string): string {
    switch (level.toUpperCase()) {
      case 'DEBUG':
        return '#6b7280'; // Gray
      case 'INFO':
        return '#3b82f6'; // Blue
      case 'WARNING':
        return '#f59e0b'; // Amber
      case 'ERROR':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Formats JSON for display
   * @param obj Object to format
   * @returns Formatted string
   */
  private formatJson(ob: Record<string, unknown>): string {
    if (!ob) return '';

    try {
      const formattedJson = JSON.stringify(ob, null, 2)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(
          /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true: any|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
          match => {
            let cls = 'text-blue-600 dark:text-blue-400';
            if (/^"/.test(match)) {
              if (/:$/.test(match)) {
                cls = 'text-gray-800 dark:text-gray-300 font-medium';
              } else {
                cls = 'text-green-600 dark:text-green-400';
              }
            } else if (/true|false/.test(match)) {
              cls = 'text-purple-600 dark:text-purple-400';
            } else if (/null/.test(match)) {
              cls = 'text-gray-500 dark:text-gray-500';
            }
            return `<span class="${cls}">${match}</span>`;
          },
        );

      return formattedJson;
    } catch (e) {
      this.logger.error('Error formatting JSON:', e);
      return String(ob);
    }
  }

  /**
   * Formats AI log details for display
   * @param log The log entry
   * @returns Formatted HTML
   */
  private formatAiLogDetails(log: LogEntry): string {
    if (!log || !this.options.enableAiLogFormatting) {
      return '<p class="text-xs text-text-muted">No AI details available</p>';
    }

    let details = '';
    if ('role' in log && 'content' in log && log.role && log.content) {
      details += `<div class="log-ai-role">${log.role}</div>`;
      details += `<div class="log-ai-content">${log.content}</div>`;
    }
    return details;
  }

  /**
   * Formats domain event log details for display
   * @param log The log entry
   * @returns Formatted HTML
   */
  private formatDomainEventDetails(log: LogEntry): string {
    if (!log || !this.options.enableDomainEventFormatting) {
      return '<p class="text-xs text-text-muted">No event details available</p>';
    }

    try {
      // Check for event data in either log.data or log.meta
      const data = log.data || log.meta || {};

      if (!data.event && !data.eventType && !data.type) {
        return '<p class="text-xs text-text-muted">No event details available</p>';
      }

      const eventType = String(data.eventType || data.type || data.event || 'Unknown Event');
      const payload = data.payload || data.data || data;

      const timestamp = data.timestamp ? new Date(String(data.timestamp)).toLocaleString() : '';

      const html = `
        <div class="event-details space-y-3">
          <div class="event-type flex items-center">
            <div class="font-medium text-xs inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              ${eventType}
            </div>
            ${timestamp ? `<div class="text-xs text-text-muted ml-2">${timestamp}</div>` : ''}
          </div>
          
          <div class="event-payload">
            <div class="font-medium text-xs mb-1">Payload:</div>
            <pre class="text-xs bg-bg-sidebar p-2 rounded overflow-auto max-h-60">${this.formatJson(payload as Record<string, unknown>)}</pre>
          </div>
          
          ${
            data.source
              ? `
            <div class="event-source">
              <div class="font-medium text-xs mb-1">Source:</div>
              <div class="text-xs">${String(data.source)}</div>
            </div>
            `
              : ''
          }
          
          ${
            data.correlationId
              ? `
            <div class="event-correlation">
              <div class="font-medium text-xs mb-1">Correlation ID:</div>
              <div class="text-xs font-mono">${String(data.correlationId)}</div>
            </div>
            `
              : ''
          }
        </div>
      `;

      return html;
    } catch (e) {
      this.logger.error('Error formatting domain event details:', e);
      return '<p class="text-xs text-text-muted">Error formatting event details</p>';
    }
  }

  /**
   * Determines if a log entry is an AI-related log
   * @param log The log entry to check
   * @returns True if the log is AI-related
   */
  private isAiLog(log: LogEntry): boolean {
    return log && typeof log === 'object' && 'role' in log && 'content' in log;
  }

  /**
   * Determines if a log entry is a domain event
   * @param log The log entry to check
   * @returns True if the log is a domain event
   */
  private isDomainEventLog(log: LogEntry): boolean {
    return log && typeof log === 'object' && 'data' in log && typeof log.data === 'object';
  }

  /**
   * Hooks into console methods to capture frontend logs
   */
  private hookConsole(): void {
    const addFrontendLog = (level: string, ...args: unknown[]) => {
      const timestamp = new Date().toISOString();
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ');

      const logEntry: LogEntry = {
        timestamp,
        level,
        message,
        correlationId: this.getCurrentCorrelationId(),
      };

      this.addLog(logEntry);
    };

    // Type assertion for console methods
    (console.debug as Function) = (...args: unknown[]) => {
      (this.originalConsole.debug as Function)?.apply(console, args);
      addFrontendLog(LogLevel.DEBUG, ...args);
    };

    (console.info as Function) = (...args: unknown[]) => {
      (this.originalConsole.info as Function)?.apply(console, args);
      addFrontendLog(LogLevel.INFO, ...args);
    };

    (console.warn as Function) = (...args: unknown[]) => {
      (this.originalConsole.warn as Function)?.apply(console, args);
      addFrontendLog(LogLevel.WARNING, ...args);
    };

    (console.error as Function) = (...args: unknown[]) => {
      (this.originalConsole.error as Function)?.apply(console, args);
      addFrontendLog(LogLevel.ERROR, ...args);
    };
  }

  /**
   * Restores original console methods
   */
  private unhookConsole(): void {
    // Cast the original console methods back to their proper types
    console.log = this.originalConsole.log as typeof console.log;
    console.info = this.originalConsole.info as typeof console.info;
    console.warn = this.originalConsole.warn as typeof console.warn;
    console.error = this.originalConsole.error as typeof console.error;
    console.debug = this.originalConsole.debug as typeof console.debug;
  }

  /**
   * Gets the current correlation ID from meta elements or storage
   */
  private getCurrentCorrelationId(): string | undefined {
    // Try to get from meta tag
    const metaCorrelationId = this.domService.querySelector('meta[name="correlation-id"]');
    if (metaCorrelationId && metaCorrelationId.getAttribute('content')) {
      return metaCorrelationId.getAttribute('content') || undefined;
    }

    // Try to get from storage service
    if (this.storageService) {
      return this.storageService.get<string>('correlationId') || undefined;
    }
    
    // Fallback if no storage service
    this.logger.warn('No StorageService available, cannot get correlationId');
    return undefined;
  }

  /**
   * Starts auto-refresh for backend logs
   */
  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    if (this.options.refreshInterval > 0) {
      // Using window.setInterval directly as it's challenging to fully abstract timer functionality
      // In a real implementation, we would create a TimerService abstraction
      this.refreshIntervalId = window.setInterval(() => {
        this.refreshBackendLogs();
      }, this.options.refreshInterval);
      
      this.logger.debug('Started auto-refresh with interval', this.options.refreshInterval);
    }

    // Update UI
    const autoRefreshCheckbox = this.domService.getElementById('backend-auto-refresh') as HTMLInputElement;
    if (autoRefreshCheckbox) {
      autoRefreshCheckbox.checked = true;
    }
  }

  /**
   * Stops auto-refresh for backend logs
   */
  private stopAutoRefresh(): void {
    if (this.refreshIntervalId !== null) {
      // Using window.clearInterval directly as it's challenging to fully abstract timer functionality
      // In a real implementation, we would create a TimerService abstraction
      window.clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
      
      this.logger.debug('Stopped auto-refresh');
    }

    // Update UI
    const autoRefreshCheckbox = this.domService.getElementById('backend-auto-refresh') as HTMLInputElement;
    if (autoRefreshCheckbox) {
      autoRefreshCheckbox.checked = false;
    }
  }

  /**
   * Public method to refresh backend logs
   */
  public refreshBackendLogs(): void {
    if (this.backendLogsManager) {
      this.backendLogsManager.fetchLogs();
    }
  }

  /**
   * Public method to clear frontend logs
   */
  public clearFrontendLogs(): void {
    this.frontendLogs = [];
    this.renderFrontendLogs();
  }

  /**
   * Public method to clear backend logs
   */
  public clearBackendLogs(): void {
    if (this.backendLogsManager) {
      this.backendLogsManager.clearLogs();
      this.renderBackendLogs();
    }
  }

  /**
   * Public method to add a log entry programmatically
   * @param entry LogEntry to add
   */
  public addLog(entry: LogEntry): void {
    if (!entry) return;

    this.frontendLogs.push(entry);
    if (this.frontendLogs.length > this.options.maxFrontendLogs) {
      this.frontendLogs.shift();
    }
    this.renderFrontendLogs();
  }

  /**
   * Public method to get all frontend logs
   * @returns Array of log entries
   */
  public getFrontendLogs(): LogEntry[] {
    return [...this.frontendLogs];
  }

  /**
   * Public method to get all backend logs
   * @returns Array of log entries or null if not available
   */
  public getBackendLogs(): LogEntry[] | null {
    if (this.backendLogsManager) {
      return this.backendLogsManager.getLogs();
    }
    return null;
  }

  /**
   * Public method to destroy the LogsViewer
   * Cleans up event listeners and restores console
   */
  public destroy(): void {
    // Restore console
    this.unhookConsole();

    // Stop auto-refresh
    this.stopAutoRefresh();

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Reset properties
    this.frontendLogsTab = null;
    this.backendLogsTab = null;
    this.frontendLogsContainer = null;
    this.backendLogsContainer = null;
    this.frontendLogsList = null;
    this.backendLogsList = null;
    this.frontendLogs = [];
    this.backendLogsManager = null;
  }
}

export default LogsViewer;
