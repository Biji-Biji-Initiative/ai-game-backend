/**
 * LogsViewer Component
 * Displays frontend and backend logs, with special handling for AI logs
 */

import { BackendLogsManager } from '../modules/backend-logs-manager';
import { logger } from '../utils/logger';

// Define log level type
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

// Define log entry interface
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlationId?: string;
  meta?: any;
  context?: any;
  service?: string;
  data?: any;
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
  private originalConsole: Record<string, any>;
  
  /**
   * Creates a new LogsViewer instance
   * @param options Configuration options
   */
  constructor(options: LogsViewerOptions = {}) {
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
      ...options
    };
    
    // Initialize properties
    this.container = document.getElementById(this.options.logsContainerId);
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
      debug: console.debug
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
      console.error('LogsViewer: Cannot find container element with ID', this.options.logsContainerId);
      return;
    }
    
    // Create frontend/backend tabs UI if both are enabled
    if (this.options.showFrontendLogs && this.options.showBackendLogs) {
      // Create tabs container
      const tabsContainer = document.createElement('div');
      tabsContainer.className = 'logs-tabs mb-4 border-b border-border';
      
      // Create frontend tab
      this.frontendLogsTab = document.createElement('button');
      this.frontendLogsTab.className = 'logs-tab px-4 py-2 mr-2';
      this.frontendLogsTab.textContent = 'Frontend Logs';
      this.frontendLogsTab.addEventListener('click', () => this.switchTab('frontend'));
      
      // Create backend tab
      this.backendLogsTab = document.createElement('button');
      this.backendLogsTab.className = 'logs-tab px-4 py-2';
      this.backendLogsTab.textContent = 'Backend Logs';
      this.backendLogsTab.addEventListener('click', () => this.switchTab('backend'));
      
      // Add tabs to container
      tabsContainer.appendChild(this.frontendLogsTab);
      tabsContainer.appendChild(this.backendLogsTab);
      
      // Add tabs container to main container
      this.container.appendChild(tabsContainer);
      
      // Create frontend logs container
      this.frontendLogsContainer = document.createElement('div');
      this.frontendLogsContainer.className = 'logs-container hidden';
      
      // Create frontend logs filter controls
      const frontendFiltersContainer = document.createElement('div');
      frontendFiltersContainer.className = 'logs-filter-container mb-4 flex items-center space-x-2';
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
      this.frontendLogsList = document.createElement('div');
      this.frontendLogsList.id = 'frontend-logs-list';
      this.frontendLogsList.className = 'logs-list overflow-y-auto max-h-[calc(100vh-300px)]';
      this.frontendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No frontend logs to display</div>';
      
      // Add everything to frontend container
      this.frontendLogsContainer.appendChild(frontendFiltersContainer);
      this.frontendLogsContainer.appendChild(this.frontendLogsList);
      
      // Create backend logs container
      this.backendLogsContainer = document.createElement('div');
      this.backendLogsContainer.className = 'logs-container';
      
      // Create backend logs filter controls
      const backendFiltersContainer = document.createElement('div');
      backendFiltersContainer.className = 'logs-filter-container mb-4';
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
          ${this.options.enableCorrelationIdFiltering ? 
            `<input type="text" id="backend-correlation-id" placeholder="Filter by correlation ID" class="w-1/3 px-2 py-1 border border-border rounded bg-bg">` : ''}
          <label class="flex items-center">
            <input type="checkbox" id="backend-auto-refresh" ${this.options.autoRefreshBackendLogs ? 'checked' : ''} class="mr-1"> Auto-refresh
          </label>
          <button id="clear-backend-logs-btn" class="px-2 py-1 bg-bg-sidebar text-text-muted hover:bg-bg-card rounded">Clear</button>
        </div>
      `;
      
      // Create backend logs list
      this.backendLogsList = document.createElement('div');
      this.backendLogsList.id = 'backend-logs-list';
      this.backendLogsList.className = 'logs-list overflow-y-auto max-h-[calc(100vh-350px)] mt-4';
      this.backendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No backend logs to display</div>';
      
      // Add everything to backend container
      this.backendLogsContainer.appendChild(backendFiltersContainer);
      this.backendLogsContainer.appendChild(this.backendLogsList);
      
      // Add both containers to main container
      this.container.appendChild(this.frontendLogsContainer);
      this.container.appendChild(this.backendLogsContainer);
      
      // Set up event listeners for filter controls
      this.setupFilterEventListeners();
      
      // Set active tab
      this.switchTab(this.activeTab);
    } else if (this.options.showBackendLogs) {
      // Only backend logs are enabled - simpler UI
      this.backendLogsContainer = this.container;
      
      // Create backend logs filter controls
      const filtersContainer = document.createElement('div');
      filtersContainer.className = 'logs-filter-container mb-4';
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
          ${this.options.enableCorrelationIdFiltering ? 
            `<input type="text" id="backend-correlation-id" placeholder="Filter by correlation ID" class="w-1/3 px-2 py-1 border border-border rounded bg-bg">` : ''}
          <label class="flex items-center">
            <input type="checkbox" id="backend-auto-refresh" ${this.options.autoRefreshBackendLogs ? 'checked' : ''} class="mr-1"> Auto-refresh
          </label>
          <button id="clear-backend-logs-btn" class="px-2 py-1 bg-bg-sidebar text-text-muted hover:bg-bg-card rounded">Clear</button>
        </div>
      `;
      
      // Create backend logs list
      this.backendLogsList = document.createElement('div');
      this.backendLogsList.id = 'backend-logs-list';
      this.backendLogsList.className = 'logs-list overflow-y-auto max-h-[calc(100vh-250px)] mt-4';
      this.backendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No logs to display</div>';
      
      // Add everything to container
      this.container.appendChild(filtersContainer);
      this.container.appendChild(this.backendLogsList);
      
      // Set up event listeners
      this.setupFilterEventListeners();
    } else if (this.options.showFrontendLogs) {
      // Only frontend logs are enabled - simpler UI
      this.frontendLogsContainer = this.container;
      
      // Create frontend logs filter controls
      const filtersContainer = document.createElement('div');
      filtersContainer.className = 'logs-filter-container mb-4';
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
      this.frontendLogsList = document.createElement('div');
      this.frontendLogsList.id = 'frontend-logs-list';
      this.frontendLogsList.className = 'logs-list overflow-y-auto max-h-[calc(100vh-200px)] mt-4';
      this.frontendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No logs to display</div>';
      
      // Add everything to container
      this.container.appendChild(filtersContainer);
      this.container.appendChild(this.frontendLogsList);
      
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
    this.backendLogsManager.on('logs:loaded', (_data: any) => {
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
        const checkbox = document.getElementById(`filter-${level}`);
        if (checkbox) {
          checkbox.addEventListener('change', () => this.renderFrontendLogs());
        }
      });
      
      // Search filter
      const searchInput = document.getElementById('frontend-logs-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => this.renderFrontendLogs());
      }
      
      // Clear button
      const clearButton = document.getElementById('clear-frontend-logs-btn');
      if (clearButton) {
        clearButton.addEventListener('click', () => this.clearFrontendLogs());
      }
    }
    
    // Backend logs filter event listeners
    if (this.options.showBackendLogs) {
      // Level filters
      ['debug', 'info', 'warning', 'error'].forEach(level => {
        const checkbox = document.getElementById(`backend-filter-${level}`);
        if (checkbox) {
          checkbox.addEventListener('change', () => this.renderBackendLogs());
        }
      });
      
      // Search filter
      const searchInput = document.getElementById('backend-logs-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => this.renderBackendLogs());
      }
      
      // Correlation ID filter
      const correlationIdInput = document.getElementById('backend-correlation-id');
      if (correlationIdInput) {
        correlationIdInput.addEventListener('input', () => this.renderBackendLogs());
      }
      
      // Refresh button
      const refreshButton = document.getElementById('refresh-backend-logs-btn');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => this.refreshBackendLogs());
      }
      
      // Auto-refresh checkbox
      const autoRefreshCheckbox = document.getElementById('backend-auto-refresh') as HTMLInputElement;
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
      const clearButton = document.getElementById('clear-backend-logs-btn');
      if (clearButton) {
        clearButton.addEventListener('click', () => this.clearBackendLogs());
      }
    }
  }
  
  /**
   * Switches between frontend and backend logs tabs
   * @param tab The tab to switch to
   */
  private switchTab(tab: 'frontend' | 'backend'): void {
    if (!this.options.showFrontendLogs || !this.options.showBackendLogs) {
      return;
    }
    
    this.activeTab = tab;
    
    // Update tab buttons
    if (this.frontendLogsTab && this.backendLogsTab) {
      this.frontendLogsTab.classList.toggle('border-b-2', tab === 'frontend');
      this.frontendLogsTab.classList.toggle('border-primary-500', tab === 'frontend');
      this.frontendLogsTab.classList.toggle('text-primary-500', tab === 'frontend');
      this.frontendLogsTab.classList.toggle('font-medium', tab === 'frontend');
      
      this.backendLogsTab.classList.toggle('border-b-2', tab === 'backend');
      this.backendLogsTab.classList.toggle('border-primary-500', tab === 'backend');
      this.backendLogsTab.classList.toggle('text-primary-500', tab === 'backend');
      this.backendLogsTab.classList.toggle('font-medium', tab === 'backend');
    }
    
    // Show/hide containers
    if (this.frontendLogsContainer && this.backendLogsContainer) {
      this.frontendLogsContainer.classList.toggle('hidden', tab !== 'frontend');
      this.backendLogsContainer.classList.toggle('hidden', tab !== 'backend');
    }
    
    // Render appropriate logs
    if (tab === 'frontend') {
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
      this.frontendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No logs match your filters</div>';
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
      const logElement = document.createElement('div');
      logElement.className = 'log-entry border-b border-border p-2';
      
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
        this.frontendLogsList.appendChild(logElement);
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
      this.backendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No logs match your filters</div>';
      return;
    }
    
    // Count AI logs and domain events for the counter badges
    const aiLogCount = filteredLogs.filter(log => this.isAiLog(log)).length;
    const domainEventCount = filteredLogs.filter(log => this.isDomainEventLog(log)).length;
    
    // Clear logs list
    this.backendLogsList.innerHTML = '';
    
    // Add counters if we have special logs
    if (aiLogCount > 0 || domainEventCount > 0) {
      const countersElement = document.createElement('div');
      countersElement.className = 'flex space-x-2 mb-2 text-xs';
      
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
      
      this.backendLogsList.appendChild(countersElement);
    }
    
    // Sort logs by timestamp (newest first)
    filteredLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
    
    // Render logs
    filteredLogs.forEach(log => {
      const logElement = document.createElement('div');
      logElement.className = 'log-entry border-b border-border p-2 mb-2';
      
      const formattedTime = new Date(log.timestamp).toLocaleTimeString();
      const formattedDate = new Date(log.timestamp).toLocaleDateString();
      
      // Check if this is an AI-related log
      const isAiLog = this.isAiLog(log);
      
      // Check if this is a domain event log
      const isDomainEvent = this.isDomainEventLog(log);
      
      const logType = isDomainEvent ? 'domain-event-log' : (isAiLog ? 'ai-log' : '');
      
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
          ${log.meta?.correlationId ? 
            `<span class="log-correlation-id bg-bg-sidebar px-1.5 py-0.5 rounded text-xs mr-2" title="${log.meta.correlationId}">ID: ${log.meta.correlationId.substring(0, 8)}...</span>` : 
            ''}
          ${log.service ? `<span class="log-service-badge bg-gray-500 text-white px-1.5 py-0.5 rounded text-xs mr-2">${log.service}</span>` : ''}
          ${isAiLog ? '<span class="ai-log-badge bg-green-600 text-white px-1.5 py-0.5 rounded text-xs mr-2">AI</span>' : ''}
          ${isDomainEvent ? '<span class="domain-event-badge bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs mr-2">Event</span>' : ''}
          <span class="expand-icon ml-auto bg-bg-sidebar rounded-full h-4 w-4 inline-flex items-center justify-center text-xs font-bold cursor-pointer">+</span>
        </div>
      `;
      
      let detailsHtml = '';
      
      // Only add details if we have expandable content
      if ((log.meta && Object.keys(log.meta).length > 0) || 
          (log.context && Object.keys(log.context).length > 0) || 
          isAiLog || 
          isDomainEvent) {
        
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
              
              ${log.context ? `
              <div class="log-tab-content hidden" data-tab="context">
                <pre class="text-xs bg-bg-sidebar p-2 rounded overflow-auto max-h-60">${this.formatJson(log.context)}</pre>
              </div>
              ` : ''}
              
              ${isAiLog ? `
              <div class="log-tab-content hidden" data-tab="ai">
                ${this.formatAiLogDetails(log)}
              </div>
              ` : ''}
              
              ${isDomainEvent ? `
              <div class="log-tab-content hidden" data-tab="event">
                ${this.formatDomainEventDetails(log)}
              </div>
              ` : ''}
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
        tab.addEventListener('click', (e) => {
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
        this.backendLogsList.appendChild(logElement);
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
      debug: document.getElementById('filter-debug') instanceof HTMLInputElement ? (document.getElementById('filter-debug') as HTMLInputElement).checked : true,
      info: document.getElementById('filter-info') instanceof HTMLInputElement ? (document.getElementById('filter-info') as HTMLInputElement).checked : true,
      warning: document.getElementById('filter-warning') instanceof HTMLInputElement ? (document.getElementById('filter-warning') as HTMLInputElement).checked : true,
      error: document.getElementById('filter-error') instanceof HTMLInputElement ? (document.getElementById('filter-error') as HTMLInputElement).checked : true
    };
    
    filteredLogs = filteredLogs.filter(log => {
      const level = log.level.toLowerCase();
      return levelFilters[level] || false;
    });
    
    // Apply search filter
    const searchInput = document.getElementById('frontend-logs-search') as HTMLInputElement;
    if (searchInput && searchInput.value.trim()) {
      const searchTerm = searchInput.value.trim().toLowerCase();
      filteredLogs = filteredLogs.filter(log => {
        return log.message.toLowerCase().includes(searchTerm) || 
              (log.correlationId && log.correlationId.toLowerCase().includes(searchTerm)) ||
              (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm));
      });
    }
    
    return filteredLogs;
  }
  
  /**
   * Gets filtered backend logs based on current filter settings
   * @param logs The logs to filter
   * @returns Array of filtered log entries
   */
  private getFilteredBackendLogs(logs: any[]): any[] {
    if (!logs || !Array.isArray(logs)) {
      return [];
    }
    
    let filteredLogs = [...logs];
    
    // Apply level filters
    const levelFilters: Record<string, boolean> = {
      debug: document.getElementById('backend-filter-debug') instanceof HTMLInputElement ? (document.getElementById('backend-filter-debug') as HTMLInputElement).checked : true,
      info: document.getElementById('backend-filter-info') instanceof HTMLInputElement ? (document.getElementById('backend-filter-info') as HTMLInputElement).checked : true,
      warning: document.getElementById('backend-filter-warning') instanceof HTMLInputElement ? (document.getElementById('backend-filter-warning') as HTMLInputElement).checked : true,
      error: document.getElementById('backend-filter-error') instanceof HTMLInputElement ? (document.getElementById('backend-filter-error') as HTMLInputElement).checked : true
    };
    
    filteredLogs = filteredLogs.filter(log => {
      const level = log.level ? log.level.toLowerCase() : 'info';
      return levelFilters[level] || false;
    });
    
    // Apply correlation ID filter if enabled
    if (this.options.enableCorrelationIdFiltering) {
      const correlationIdInput = document.getElementById('backend-correlation-id') as HTMLInputElement;
      if (correlationIdInput && correlationIdInput.value.trim()) {
        const correlationId = correlationIdInput.value.trim();
        filteredLogs = filteredLogs.filter(log => {
          return (log.meta?.correlationId && log.meta.correlationId.includes(correlationId)) ||
                  (log.correlationId && log.correlationId.includes(correlationId));
        });
      }
    }
    
    // Apply search filter if enabled
    if (this.options.enableSearchFiltering) {
      const searchInput = document.getElementById('backend-logs-search') as HTMLInputElement;
      if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filteredLogs = filteredLogs.filter(log => {
          return log.message.toLowerCase().includes(searchTerm) || 
                (log.service && log.service.toLowerCase().includes(searchTerm)) ||
                (log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchTerm)) ||
                (log.context && JSON.stringify(log.context).toLowerCase().includes(searchTerm));
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
  private formatJson(obj: any): string {
    if (!obj) return '';
    
    try {
      const formattedJson = JSON.stringify(obj, null, 2)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
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
        });
      
      return formattedJson;
    } catch (e) {
      console.error('Error formatting JSON:', e);
      return String(obj);
    }
  }
  
  /**
   * Formats AI log details for display
   * @param log The log entry
   * @returns Formatted HTML
   */
  private formatAiLogDetails(log: any): string {
    if (!log || !this.options.enableAiLogFormatting) {
      return '<p class="text-xs text-text-muted">No AI details available</p>';
    }
    
    try {
      // Check for prompt/completion specific fields in either log.data or log.meta
      const data = log.data || log.meta || {};
      
      if (!data.prompt && !data.completion && !data.messages) {
        return '<p class="text-xs text-text-muted">No AI details available</p>';
      }
      
      let html = '<div class="ai-log-details space-y-3">';
      
      // Add prompt if available
      if (data.prompt) {
        html += `
          <div class="prompt-section">
            <div class="font-medium text-xs mb-1">Prompt:</div>
            <div class="bg-bg-sidebar p-2 rounded text-xs whitespace-pre-wrap">${data.prompt}</div>
          </div>
        `;
      }
      
      // Add messages if available (for chat models)
      if (data.messages && Array.isArray(data.messages)) {
        html += `
          <div class="messages-section">
            <div class="font-medium text-xs mb-1">Messages:</div>
            <div class="space-y-2">
        `;
        
        data.messages.forEach((message: any, index: number) => {
          const role = message.role || 'unknown';
          const content = message.content || '';
          const roleColorClass = role === 'user' ? 'bg-blue-100 text-blue-800' : 
                                role === 'assistant' ? 'bg-green-100 text-green-800' : 
                                role === 'system' ? 'bg-purple-100 text-purple-800' : 
                                'bg-gray-100 text-gray-800';
          
          html += `
            <div class="message-item">
              <div class="font-medium text-xs inline-block ${roleColorClass} px-2 py-0.5 rounded mb-1">${role}</div>
              <div class="bg-bg-sidebar p-2 rounded text-xs whitespace-pre-wrap">${content}</div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      }
      
      // Add completion if available
      if (data.completion) {
        html += `
          <div class="completion-section">
            <div class="font-medium text-xs mb-1">Completion:</div>
            <div class="bg-bg-sidebar p-2 rounded text-xs whitespace-pre-wrap">${data.completion}</div>
          </div>
        `;
      }
      
      // Add model information if available
      if (data.model) {
        html += `
          <div class="model-info">
            <div class="font-medium text-xs inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded">Model: ${data.model}</div>
          </div>
        `;
      }
      
      // Add token count information if available
      if (data.usage) {
        html += `
          <div class="token-info flex flex-wrap gap-2">
            ${data.usage.prompt_tokens ? `<div class="font-medium text-xs inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Prompt tokens: ${data.usage.prompt_tokens}</div>` : ''}
            ${data.usage.completion_tokens ? `<div class="font-medium text-xs inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded">Completion tokens: ${data.usage.completion_tokens}</div>` : ''}
            ${data.usage.total_tokens ? `<div class="font-medium text-xs inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded">Total tokens: ${data.usage.total_tokens}</div>` : ''}
          </div>
        `;
      }
      
      html += '</div>';
      
      return html;
    } catch (e) {
      console.error('Error formatting AI log details:', e);
      return '<p class="text-xs text-text-muted">Error formatting AI log details</p>';
    }
  }
  
  /**
   * Formats domain event log details for display
   * @param log The log entry
   * @returns Formatted HTML
   */
  private formatDomainEventDetails(log: any): string {
    if (!log || !this.options.enableDomainEventFormatting) {
      return '<p class="text-xs text-text-muted">No event details available</p>';
    }
    
    try {
      // Check for event data in either log.data or log.meta
      const data = log.data || log.meta || {};
      
      if (!data.event && !data.eventType && !data.type) {
        return '<p class="text-xs text-text-muted">No event details available</p>';
      }
      
      const eventType = data.eventType || data.type || data.event || 'Unknown Event';
      const payload = data.payload || data.data || data;
      
      let html = `
        <div class="event-details space-y-3">
          <div class="event-type flex items-center">
            <div class="font-medium text-xs inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              ${eventType}
            </div>
            ${data.timestamp ? `<div class="text-xs text-text-muted ml-2">${new Date(data.timestamp).toLocaleString()}</div>` : ''}
          </div>
          
          <div class="event-payload">
            <div class="font-medium text-xs mb-1">Payload:</div>
            <pre class="text-xs bg-bg-sidebar p-2 rounded overflow-auto max-h-60">${this.formatJson(payload)}</pre>
          </div>
          
          ${data.source ? `
          <div class="event-source">
            <div class="font-medium text-xs mb-1">Source:</div>
            <div class="text-xs">${data.source}</div>
          </div>
          ` : ''}
          
          ${data.correlationId ? `
          <div class="event-correlation">
            <div class="font-medium text-xs mb-1">Correlation ID:</div>
            <div class="text-xs font-mono">${data.correlationId}</div>
          </div>
          ` : ''}
        </div>
      `;
      
      return html;
    } catch (e) {
      console.error('Error formatting domain event details:', e);
      return '<p class="text-xs text-text-muted">Error formatting event details</p>';
    }
  }
  
  /**
   * Determines if a log entry is an AI-related log
   * @param log The log entry to check
   * @returns True if the log is AI-related
   */
  private isAiLog(log: any): boolean {
    if (!log) return false;
    
    // Check message content for AI-related keywords
    const messageIndicators = [
      'openai',
      'gpt-',
      'ai response',
      'ai request',
      'ai completion',
      'llm',
      'model response',
      'prompt'
    ];
    
    if (log.message && typeof log.message === 'string') {
      for (const indicator of messageIndicators) {
        if (log.message.toLowerCase().includes(indicator)) {
          return true;
        }
      }
    }
    
    // Check data or meta for AI-specific fields
    const data = log.data || log.meta || {};
    
    if (data.model && typeof data.model === 'string' && data.model.includes('gpt-')) {
      return true;
    }
    
    if (data.prompt || data.completion || (data.messages && Array.isArray(data.messages))) {
      return true;
    }
    
    // Check service name
    if (log.service && typeof log.service === 'string') {
      const serviceIndicators = ['openai', 'ai', 'llm', 'gpt'];
      for (const indicator of serviceIndicators) {
        if (log.service.toLowerCase().includes(indicator)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Determines if a log entry is a domain event
   * @param log The log entry to check
   * @returns True if the log is a domain event
   */
  private isDomainEventLog(log: any): boolean {
    if (!log) return false;
    
    // Check message content for event-related keywords
    const messageIndicators = [
      'event emitted',
      'event received',
      'domain event',
      'event dispatched',
      'dispatching event',
      'event published',
      'event processed'
    ];
    
    if (log.message && typeof log.message === 'string') {
      for (const indicator of messageIndicators) {
        if (log.message.toLowerCase().includes(indicator)) {
          return true;
        }
      }
    }
    
    // Check data or meta for event-specific fields
    const data = log.data || log.meta || {};
    
    if (data.eventType || data.type || data.event) {
      return true;
    }
    
    // Check if message contains event name pattern
    const eventPatterns = [
      /Event\s+[A-Z][a-zA-Z]+Event/,
      /[A-Z][a-zA-Z]+Event/,
      /Event\s+[A-Z][a-zA-Z]+/
    ];
    
    if (log.message && typeof log.message === 'string') {
      for (const pattern of eventPatterns) {
        if (pattern.test(log.message)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Hooks into console methods to capture frontend logs
   */
  private hookConsole(): void {
    const addFrontendLog = (level: string, args: any[]) => {
      // Create log entry
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message: args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' '),
        correlationId: this.getCurrentCorrelationId(),
        data: args.length === 1 && typeof args[0] === 'object' ? args[0] : null
      };
      
      // Add to frontend logs
      this.frontendLogs.push(entry);
      
      // Limit number of logs
      if (this.frontendLogs.length > this.options.maxFrontendLogs) {
        this.frontendLogs.shift();
      }
      
      // Render if frontend tab is active
      if (this.activeTab === 'frontend') {
        this.renderFrontendLogs();
      }
    };
    
    // Override console methods
    console.debug = (...args: any[]) => {
      this.originalConsole.debug.apply(console, args);
      addFrontendLog('debug', args);
    };
    
    console.log = (...args: any[]) => {
      this.originalConsole.log.apply(console, args);
      addFrontendLog('info', args);
    };
    
    console.info = (...args: any[]) => {
      this.originalConsole.info.apply(console, args);
      addFrontendLog('info', args);
    };
    
    console.warn = (...args: any[]) => {
      this.originalConsole.warn.apply(console, args);
      addFrontendLog('warning', args);
    };
    
    console.error = (...args: any[]) => {
      this.originalConsole.error.apply(console, args);
      addFrontendLog('error', args);
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
   * Gets the current correlation ID from meta elements or localStorage
   */
  private getCurrentCorrelationId(): string | undefined {
    // Try to get from meta tag
    const metaCorrelationId = document.querySelector('meta[name="correlation-id"]');
    if (metaCorrelationId && metaCorrelationId.getAttribute('content')) {
      return metaCorrelationId.getAttribute('content') || undefined;
    }
    
    // Try to get from localStorage
    return localStorage.getItem('correlationId') || undefined;
  }
  
  /**
   * Starts auto-refresh for backend logs
   */
  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    
    if (this.options.refreshInterval > 0) {
      this.refreshIntervalId = window.setInterval(() => {
        this.refreshBackendLogs();
      }, this.options.refreshInterval);
    }
    
    // Update UI
    const autoRefreshCheckbox = document.getElementById('backend-auto-refresh') as HTMLInputElement;
    if (autoRefreshCheckbox) {
      autoRefreshCheckbox.checked = true;
    }
  }
  
  /**
   * Stops auto-refresh for backend logs
   */
  private stopAutoRefresh(): void {
    if (this.refreshIntervalId !== null) {
      window.clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    
    // Update UI
    const autoRefreshCheckbox = document.getElementById('backend-auto-refresh') as HTMLInputElement;
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
    this.frontendLogs.push(entry);
    
    // Limit number of logs
    if (this.frontendLogs.length > this.options.maxFrontendLogs) {
      this.frontendLogs.shift();
    }
    
    // Render if frontend tab is active
    if (this.activeTab === 'frontend') {
      this.renderFrontendLogs();
    }
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
  public getBackendLogs(): any[] | null {
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