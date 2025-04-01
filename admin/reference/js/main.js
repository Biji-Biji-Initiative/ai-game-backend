// Import the bundled endpoints
import { bundledEndpoints } from './data/bundled-endpoints.js';
import { EndpointManager } from './modules/endpoint-manager.js';
import { BackendLogsManager } from './modules/backend-logs-manager.js';
import { VariableManager } from './modules/variable-manager.js';
import { VariableExtractor } from './ui/variable-extractor.js';
import { ResponseViewer } from './ui/response-viewer.js';
import { StatusManager } from './modules/status-manager.js';

// Import domain state modules
import DomainStateManager from './modules/domain-state-manager.js';
import { DomainStateViewer } from './ui/domain-state-viewer.js';

// Main app state
const appState = {
  flows: [],
  currentFlow: null,
  steps: [],
  currentStep: null,
  authToken: localStorage.getItem('authToken') || null,
  stepResults: {},
  logs: [],
  backendLogs: [],
  activeLogsTab: 'frontend', // 'frontend' or 'backend'
  currentCorrelationId: null,
  currentResponse: null, // Store the current response for variable extraction
  domainStateManager: null,
  domainStateViewer: null,
  currentRequest: null,  // We'll store the current request here for domain state snapshots
};

// Create an endpoint manager instance
const endpointManager = new EndpointManager({
  // Set bundled endpoints as fallback
  useLocalEndpoints: true,
  // Configure dynamic endpoint path
  dynamicEndpointsPath: '/api/v1/api-tester/endpoints',
  // Enable dynamic endpoint loading
  useDynamicEndpoints: true
});

// Set the bundled endpoints as fallback
endpointManager.setBundledEndpoints(bundledEndpoints);

// Create a backend logs manager
const backendLogsManager = new BackendLogsManager({
  logsEndpoint: '/api/v1/api-tester/logs',
  maxLogsToFetch: 200,
  refreshInterval: null // We'll control this with a checkbox
});

// Create status manager
const statusManager = new StatusManager({
  healthEndpoint: '/api/v1/health',
  refreshInterval: 30000 // Refresh every 30 seconds
});

// Create a variable manager for context passing between steps
const variableManager = new VariableManager({
  persistVariables: true,
  storageKey: 'api_tester_variables',
  variableSyntax: {
    prefix: '{{',
    suffix: '}}',
    jsonPathIndicator: '$.'
  }
});

// Variable extractor will be initialized after DOM is loaded

// DOM Elements
const elements = {
  flowMenu: document.getElementById('flow-menu'),
  flowSteps: document.getElementById('flow-steps'),
  stepDetails: document.getElementById('step-details'),
  stepTitle: document.getElementById('step-title'),
  stepDescription: document.getElementById('step-description'),
  formInputs: document.getElementById('form-inputs'),
  runStepBtn: document.getElementById('run-step-btn'),
  clearFormBtn: document.getElementById('clear-form-btn'),
  resultPanel: document.getElementById('result-panel'),
  resultStatus: document.getElementById('result-status'),
  resultContent: document.getElementById('result-content'),
  loadingIndicator: document.getElementById('loading-indicator'),
  themeToggle: document.getElementById('theme-toggle'),
  refreshEndpointsBtn: document.getElementById('refresh-endpoints-btn'),
  // Log panel elements
  logsPanel: document.getElementById('logs-panel'),
  logsContent: document.getElementById('logs-content'),
  // Frontend logs tab
  frontendLogsTab: document.getElementById('frontend-logs-tab'),
  frontendLogsContainer: document.getElementById('frontend-logs-container'),
  logsList: document.getElementById('logs-list'),
  // Backend logs tab
  backendLogsTab: document.getElementById('backend-logs-tab'),
  backendLogsContainer: document.getElementById('backend-logs-container'),
  backendLogsList: document.getElementById('backend-logs-list'),
  refreshBackendLogsBtn: document.getElementById('refresh-backend-logs-btn'),
  backendLogsSearch: document.getElementById('backend-logs-search'),
  backendCorrelationId: document.getElementById('backend-correlation-id'),
  backendAutoRefresh: document.getElementById('backend-auto-refresh'),
  // Log controls
  showLogsBtn: document.getElementById('show-logs-btn'),
  closeLogsBtn: document.getElementById('close-logs-btn'),
  clearLogsBtn: document.getElementById('clear-logs-btn'),
  copyLogsBtn: document.getElementById('copy-logs-btn'),
  logsSearch: document.getElementById('logs-search'),
  filterDebug: document.getElementById('filter-debug'),
  filterInfo: document.getElementById('filter-info'),
  filterWarning: document.getElementById('filter-warning'),
  filterError: document.getElementById('filter-error'),
  // Backend log filters
  backendFilterDebug: document.getElementById('backend-filter-debug'),
  backendFilterInfo: document.getElementById('backend-filter-info'),
  backendFilterWarning: document.getElementById('backend-filter-warning'),
  backendFilterError: document.getElementById('backend-filter-error'),
  variablesPanel: document.getElementById('variables-panel')
};

// Logger setup
const Logger = {
  // Log levels
  LEVELS: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR'
  },
  
  // Maximum number of logs to keep
  MAX_LOGS: 100,
  
  // Add a log entry
  log(level, message, data = null) {
    // Generate correlation ID for this log entry if needed
    const correlationId = (data && data.correlationId) ? 
      data.correlationId : 
      appState.currentCorrelationId || `log_${Date.now()}`;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      correlationId
    };
    
    // Add to our in-memory logs
    appState.logs.push(logEntry);
    
    // Store the current correlation ID for later logs
    if (!appState.currentCorrelationId) {
      appState.currentCorrelationId = correlationId;
    }
    
    // Trim logs if they exceed maximum
    if (appState.logs.length > this.MAX_LOGS) {
      appState.logs = appState.logs.slice(-this.MAX_LOGS);
    }
    
    // Also log to console for development
    const logMethod = level === this.LEVELS.ERROR ? 'error' : 
                     level === this.LEVELS.WARNING ? 'warn' : 
                     level === this.LEVELS.INFO ? 'info' : 'log';
    
    console[logMethod](`[${level}] ${message}`, data || '');
    
    // Update the logs panel if it's open
    if (elements.logsPanel.classList.contains('visible')) {
      this.renderFrontendLogs();
    }
    
    // Send to server if it's an error or warning
    if (level === this.LEVELS.ERROR || level === this.LEVELS.WARNING) {
      this.sendToServer(logEntry);
    }
    
    return logEntry;
  },
  
  // Shorthand methods
  debug(message, data) {
    return this.log(this.LEVELS.DEBUG, message, data);
  },
  
  info(message, data) {
    return this.log(this.LEVELS.INFO, message, data);
  },
  
  warn(message, data) {
    return this.log(this.LEVELS.WARNING, message, data);
  },
  
  error(message, data) {
    return this.log(this.LEVELS.ERROR, message, data);
  },
  
  // Send logs to the server
  async sendToServer(logEntry) {
    try {
      // Add user and session context
      const logWithContext = {
        ...logEntry,
        userContext: {
          flow: appState.currentFlow?.name || null,
          step: appState.currentStep?.name || null,
          path: appState.currentStep?.path || null,
          timestamp: new Date().toISOString(),
          correlationId: logEntry.correlationId
        }
      };
      
      // Send to backend log endpoint
      await fetch('/api/v1/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appState.authToken ? { 'Authorization': `Bearer ${appState.authToken}` } : {})
        },
        body: JSON.stringify(logWithContext)
      });
    } catch (err) {
      // Don't use logger here to avoid infinite recursion
      console.error('Failed to send logs to server:', err);
    }
  },
  
  // Get filtered frontend logs based on current filter settings
  getFilteredFrontendLogs() {
    let logs = [...appState.logs];
    
    // Apply level filters
    const levelFilters = {
      DEBUG: elements.filterDebug.checked,
      INFO: elements.filterInfo.checked,
      WARNING: elements.filterWarning.checked,
      ERROR: elements.filterError.checked
    };
    
    logs = logs.filter(log => levelFilters[log.level]);
    
    // Apply search filter
    const searchTerm = elements.logsSearch.value.toLowerCase();
    if (searchTerm) {
      logs = logs.filter(log => {
        const messageMatch = log.message.toLowerCase().includes(searchTerm);
        const dataMatch = log.data ? JSON.stringify(log.data).toLowerCase().includes(searchTerm) : false;
        return messageMatch || dataMatch;
      });
    }
    
    return logs;
  },
  
  // Render frontend logs to the logs panel
  renderFrontendLogs() {
    const logs = this.getFilteredFrontendLogs();
    
    if (logs.length === 0) {
      elements.logsList.innerHTML = `<div class="empty-logs">No logs to display.</div>`;
      return;
    }
    
    elements.logsList.innerHTML = '';
    
    // Sort logs by timestamp, newest first
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    logs.forEach(log => {
      const logElement = document.createElement('div');
      logElement.className = 'log-entry';
      
      const formattedTime = new Date(log.timestamp).toLocaleTimeString();
      const formattedDate = new Date(log.timestamp).toLocaleDateString();
      
      logElement.innerHTML = `
        <div class="log-entry-header">
          <span class="log-level log-level-${log.level}">${log.level}</span>
          <span class="log-timestamp">${formattedDate} ${formattedTime}</span>
          ${log.correlationId ? `<span class="log-correlation-id" title="${log.correlationId}">ID: ${log.correlationId.substring(0, 8)}...</span>` : ''}
        </div>
        <div class="log-message">${log.message}</div>
        ${log.data ? `<div class="log-data">${JSON.stringify(log.data, null, 2)}</div>` : ''}
      `;
      
      elements.logsList.appendChild(logElement);
    });
  },

  // Function to detect if a log entry is for a domain event
  isDomainEventLog(log) {
    if (!log) return false;
    
    // Check various patterns that indicate a domain event
    const isDomainEvent = 
      // Check in message
      (log.message && (
        log.message.includes('Publishing domain event') ||
        log.message.includes('Published domain event') ||
        log.message.includes('Domain event') ||
        log.message.includes('event published') ||
        log.message.includes('event recorded')
      )) ||
      // Check in metadata or context
      (log.meta?.eventType || log.meta?.eventId || log.context?.eventType || log.context?.eventId) ||
      // Check for specific event types mentioned in context
      (log.context && log.context.eventType && 
       typeof log.context.eventType === 'string' && 
       (log.context.eventType.includes('.created') || 
        log.context.eventType.includes('.updated') || 
        log.context.eventType.includes('.completed')));
    
    return isDomainEvent;
  },
  
  // Function to format domain event details for display
  formatDomainEventDetails(log) {
    if (!log) return '<p>No domain event details found</p>';
    
    try {
      // Extract event type and data from the log
      let eventType = '';
      let eventData = {};
      let eventId = '';
      let eventSource = '';
      
      // Look in various places where the event information might be stored
      if (log.context) {
        eventType = log.context.eventType || '';
        eventData = log.context.eventData || log.context.payload || {};
        eventId = log.context.eventId || '';
        eventSource = log.context.source || log.context.domain || '';
      }
      
      if (log.meta) {
        eventType = eventType || log.meta.eventType || '';
        eventData = eventData || log.meta.eventData || log.meta.payload || {};
        eventId = eventId || log.meta.eventId || '';
        eventSource = eventSource || log.meta.source || log.meta.domain || '';
      }
      
      // Extract from message if available
      if (log.message && !eventType) {
        const eventTypeMatch = log.message.match(/event[:\s]+([a-z_.]+)/i);
        if (eventTypeMatch && eventTypeMatch[1]) {
          eventType = eventTypeMatch[1];
        }
      }
      
      // Format the output
      let content = `
        <div class="domain-event-details">
          ${eventType ? `<div class="event-type"><strong>Event Type:</strong> ${eventType}</div>` : ''}
          ${eventId ? `<div class="event-id"><strong>Event ID:</strong> ${eventId}</div>` : ''}
          ${eventSource ? `<div class="event-source"><strong>Source:</strong> ${eventSource}</div>` : ''}
          
          <div class="event-payload">
            <h4>Event Payload</h4>
            <pre>${JSON.stringify(eventData, null, 2) || '{}'}</pre>
          </div>
          
          <div class="event-flow">
            <h4>Event Flow</h4>
            <div class="event-flow-diagram">
              <div class="event-flow-step">
                <div class="event-flow-node">Entity</div>
                <div class="event-flow-arrow">↓</div>
                <div class="event-flow-desc">Changes state</div>
              </div>
              <div class="event-flow-step">
                <div class="event-flow-node">Repository</div>
                <div class="event-flow-arrow">↓</div>
                <div class="event-flow-desc">Persists changes</div>
              </div>
              <div class="event-flow-step">
                <div class="event-flow-node">Event Bus</div>
                <div class="event-flow-arrow">↓</div>
                <div class="event-flow-desc">Publishes event</div>
              </div>
              <div class="event-flow-step">
                <div class="event-flow-node">Subscribers</div>
                <div class="event-flow-desc">React to event</div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      return content;
    } catch (error) {
      console.error('Error formatting domain event details:', error);
      return `<p>Error formatting domain event details: ${error.message}</p>`;
    }
  },

  // Render backend logs to the logs panel
  renderBackendLogs() {
    // Get backend logs from the BackendLogsManager
    const logs = backendLogsManager.getLogs();

    // Apply filters
    const filteredLogs = logs.filter(log => {
      // Filter by level
      const levelFilters = {
        DEBUG: elements.backendFilterDebug.checked,
        INFO: elements.backendFilterInfo.checked,
        WARNING: elements.backendFilterWarning.checked,
        ERROR: elements.backendFilterError.checked
      };
      
      if (!levelFilters[log.level]) return false;
      
      // Filter by correlation ID
      const correlationId = elements.backendCorrelationId.value.trim();
      if (correlationId && (!log.meta?.correlationId || !log.meta.correlationId.includes(correlationId))) {
        return false;
      }
      
      // Filter by search term
      const searchTerm = elements.backendLogsSearch.value.toLowerCase().trim();
      if (searchTerm) {
        const logText = JSON.stringify(log).toLowerCase();
        if (!logText.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
    
    if (filteredLogs.length === 0) {
      elements.backendLogsList.innerHTML = `<div class="empty-logs">No backend logs match your filters.</div>`;
      return;
    }
    
    // Count domain events
    const domainEventCount = filteredLogs.filter(log => this.isDomainEventLog(log)).length;
    
    // Add domain event counter at the top if there are any
    if (domainEventCount > 0) {
      const counterEl = document.createElement('div');
      counterEl.className = 'domain-event-counter';
      counterEl.innerHTML = `
        <div class="domain-event-badge">${domainEventCount}</div>
        <span>Domain Events found in logs</span>
      `;
      elements.backendLogsList.innerHTML = '';
      elements.backendLogsList.appendChild(counterEl);
    } else {
      elements.backendLogsList.innerHTML = '';
    }
    
    // Sort logs by timestamp, newest first
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    filteredLogs.forEach(log => {
      const logElement = document.createElement('div');
      logElement.className = 'log-entry';
      
      const formattedTime = new Date(log.timestamp).toLocaleTimeString();
      const formattedDate = new Date(log.timestamp).toLocaleDateString();
      
      // Check if this is an AI-related log
      const isAiLog = 
        (log.context?.promptType || log.context?.modelName || log.meta?.service === 'OpenAIClientAdapter' ||
         log.message?.includes('OpenAI') || log.message?.includes('prompt') || 
         log.message?.includes('completion') || log.message?.includes('AI'));
      
      // Check if this is a domain event log
      const isDomainEvent = this.isDomainEventLog(log);
      
      const logType = isDomainEvent ? 'domain-event-log' : (isAiLog ? 'ai-log' : '');
      
      // Create a expandable/collapsible log entry
      logElement.innerHTML = `
        <div class="log-entry-header ${logType}">
          <span class="log-level log-level-${log.level}">${log.level}</span>
          <span class="log-timestamp">${formattedDate} ${formattedTime}</span>
          ${log.meta?.correlationId ? 
            `<span class="log-correlation-id" title="${log.meta.correlationId}">ID: ${log.meta.correlationId.substring(0, 8)}...</span>` : 
            ''}
          ${log.service ? `<span class="log-service-badge">${log.service}</span>` : ''}
          ${isAiLog ? '<span class="ai-log-badge">AI</span>' : ''}
          ${isDomainEvent ? '<span class="domain-event-badge">Event</span>' : ''}
          <span class="expand-icon">+</span>
        </div>
        <div class="log-message">${log.message}</div>
        <div class="log-details hidden">
          <div class="log-details-tabs">
            <button class="log-tab active" data-tab="meta">Metadata</button>
            ${log.context ? '<button class="log-tab" data-tab="context">Context</button>' : ''}
            ${isAiLog ? '<button class="log-tab" data-tab="ai">AI Details</button>' : ''}
            ${isDomainEvent ? '<button class="log-tab" data-tab="event">Event Details</button>' : ''}
          </div>
          
          <div class="log-details-content">
            <div class="log-tab-content active" data-tab="meta">
              ${log.meta ? `<div class="log-meta"><pre>${JSON.stringify(log.meta, null, 2)}</pre></div>` : '<p>No metadata available</p>'}
              ${log.service ? `<div class="log-service"><strong>Service:</strong> ${log.service}</div>` : ''}
              ${log.filename ? `<div class="log-filename"><strong>File:</strong> ${log.filename}</div>` : ''}
              ${log.hostname ? `<div class="log-hostname"><strong>Host:</strong> ${log.hostname}</div>` : ''}
            </div>
            
            ${log.context ? `
              <div class="log-tab-content" data-tab="context">
                <pre>${JSON.stringify(log.context, null, 2)}</pre>
              </div>
            ` : ''}
            
            ${isAiLog ? `
              <div class="log-tab-content" data-tab="ai">
                ${this.formatAiLogDetails(log)}
              </div>
            ` : ''}
            
            ${isDomainEvent ? `
              <div class="log-tab-content" data-tab="event">
                ${this.formatDomainEventDetails(log)}
              </div>
            ` : ''}
          </div>
        </div>
      `;
      
      // Add click handler for expanding/collapsing
      const header = logElement.querySelector('.log-entry-header');
      const details = logElement.querySelector('.log-details');
      const expandIcon = logElement.querySelector('.expand-icon');
      
      header.addEventListener('click', () => {
        details.classList.toggle('hidden');
        expandIcon.textContent = details.classList.contains('hidden') ? '+' : '-';
      });
      
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
            content.classList.toggle('active', content.getAttribute('data-tab') === targetTab);
          });
        });
      });
      
      elements.backendLogsList.appendChild(logElement);
    });
    
    // Add a filter button specifically for domain events
    const filterActions = document.querySelector('.logs-filter');
    if (filterActions && !filterActions.querySelector('.domain-events-filter')) {
      const filterButton = document.createElement('button');
      filterButton.className = 'btn btn-secondary domain-events-filter';
      filterButton.innerHTML = '<span class="filter-icon">⚡</span> Show Domain Events Only';
      filterButton.title = 'Filter logs to show only domain events';
      
      filterButton.addEventListener('click', () => {
        // Toggle active state
        filterButton.classList.toggle('active');
        
        // Get all log entries
        const logEntries = elements.backendLogsList.querySelectorAll('.log-entry');
        
        if (filterButton.classList.contains('active')) {
          // Only show domain events
          filterButton.innerHTML = '<span class="filter-icon">⚡</span> Show All Logs';
          logEntries.forEach(entry => {
            if (!entry.querySelector('.domain-event-badge')) {
              entry.style.display = 'none';
            }
          });
        } else {
          // Show all logs
          filterButton.innerHTML = '<span class="filter-icon">⚡</span> Show Domain Events Only';
          logEntries.forEach(entry => {
            entry.style.display = '';
          });
        }
      });
      
      filterActions.appendChild(filterButton);
    }
  },
  
  // Format AI-specific log details
  formatAiLogDetails(log) {
    // Default content if no AI-specific info is found
    let content = '<p>No AI-specific details found in this log entry</p>';
    
    if (!log) return content;
    
    try {
      // Check context for AI info
      if (log.context) {
        const ctx = log.context;
        
        if (ctx.promptType || ctx.modelName || ctx.prompt || ctx.completion) {
          content = `
            <div class="ai-log-details">
              ${ctx.modelName ? `<div class="ai-model"><strong>Model:</strong> ${ctx.modelName}</div>` : ''}
              ${ctx.promptType ? `<div class="ai-prompt-type"><strong>Prompt Type:</strong> ${ctx.promptType}</div>` : ''}
              
              ${ctx.prompt ? `
                <div class="ai-prompt">
                  <h4>Prompt</h4>
                  <pre>${typeof ctx.prompt === 'string' ? ctx.prompt : JSON.stringify(ctx.prompt, null, 2)}</pre>
                </div>
              ` : ''}
              
              ${ctx.completion ? `
                <div class="ai-completion">
                  <h4>Completion</h4>
                  <pre>${typeof ctx.completion === 'string' ? ctx.completion : JSON.stringify(ctx.completion, null, 2)}</pre>
                </div>
              ` : ''}
              
              ${ctx.tokens ? `
                <div class="ai-tokens">
                  <strong>Tokens:</strong> ${ctx.tokens.total || 0} 
                  (Prompt: ${ctx.tokens.prompt || 0}, Completion: ${ctx.tokens.completion || 0})
                </div>
              ` : ''}
            </div>
          `;
        }
      }
      
      // Look for OpenAI data in meta or context
      if (log.meta && log.meta.openai) {
        const openaiData = log.meta.openai;
        content = `
          <div class="ai-log-details">
            ${openaiData.model ? `<div class="ai-model"><strong>Model:</strong> ${openaiData.model}</div>` : ''}
            ${openaiData.requestId ? `<div class="ai-request-id"><strong>Request ID:</strong> ${openaiData.requestId}</div>` : ''}
            
            ${openaiData.prompt ? `
              <div class="ai-prompt">
                <h4>Prompt</h4>
                <pre>${typeof openaiData.prompt === 'string' ? openaiData.prompt : JSON.stringify(openaiData.prompt, null, 2)}</pre>
              </div>
            ` : ''}
            
            ${openaiData.response ? `
              <div class="ai-completion">
                <h4>Response</h4>
                <pre>${typeof openaiData.response === 'string' ? openaiData.response : JSON.stringify(openaiData.response, null, 2)}</pre>
              </div>
            ` : ''}
          </div>
        `;
      }
      
      return content;
    } catch (error) {
      console.error('Error formatting AI log details:', error);
      return `<p>Error formatting AI details: ${error.message}</p>`;
    }
  },
  
  // Clear all logs
  clearLogs() {
    appState.logs = [];
    this.renderFrontendLogs();
  },
  
  // Copy logs to clipboard
  copyLogsToClipboard() {
    const logs = appState.activeLogsTab === 'frontend' ? 
      this.getFilteredFrontendLogs() : 
      backendLogsManager.getLogs();
    
    const logText = logs.map(log => {
      return `[${log.timestamp}] [${log.level}] ${log.message}\n${log.data ? JSON.stringify(log.data, null, 2) : ''}`;
    }).join('\n\n');
    
    navigator.clipboard.writeText(logText)
      .then(() => {
        showNotification('Logs copied to clipboard', 'success');
      })
      .catch(err => {
        console.error('Failed to copy logs:', err);
        showNotification('Failed to copy logs', 'error');
      });
  }
};

// Initialize the app
async function init() {
  Logger.info('Initializing API Tester UI');
  
  // Show loading indicator
  showLoading('Initializing API Tester UI...');
  
  // Set up endpoint manager event listeners
  setupEndpointManagerListeners();
  
  // Set up backend logs manager event listeners
  setupBackendLogsManagerListeners();
  
  // Set up status manager event listeners
  setupStatusManagerListeners();
  
  // Set up variable manager event listeners
  setupVariableManagerListeners();
  
  try {
    // Load endpoints
    await endpointManager.loadEndpoints();
    
    // Fetch system status
    statusManager.fetchStatus().catch(error => {
      Logger.warn('Failed to fetch initial system status', { error: error.message });
    });
    
    // Process endpoints into flows once they're loaded
    processEndpointsFromManager();
    
    // Render flows
    renderFlows();
    
    // Initialize variable extractor
    initVariableExtractor();
    
    // Initialize variables sidebar
    initVariablesSidebar();
    
    // Initialize response viewer
    initResponseViewer();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
      elements.themeToggle.querySelector('.theme-icon').textContent = '☀️';
    }
    
    Logger.info('App initialized successfully', {
      endpointCount: endpointManager.getEndpointCount(),
      flowCount: appState.flows.length
    });
  } catch (error) {
    Logger.error('Failed to initialize app', { error });
    showErrorBanner('Failed to load endpoints. Check console for details.');
  } finally {
    hideLoading();
  }
  
  // Initialize domain state viewer
  initDomainStateViewer();
}

// Setup endpoint manager event listeners
function setupEndpointManagerListeners() {
  endpointManager.addEventListener('endpoints:loading', (data) => {
    Logger.debug(`Loading endpoints from ${data.path}`, data);
    showLoading(`Loading endpoints from ${data.type} source...`);
  });
  
  endpointManager.addEventListener('endpoints:loaded', (data) => {
    Logger.info(`Endpoints loaded from ${data.source} source`, { 
      categories: data.categories.length, 
      endpoints: data.endpoints.length 
    });
    hideLoading();
    
    // Refresh UI if we were already displaying flows
    if (appState.flows.length > 0) {
      processEndpointsFromManager();
      renderFlows();
      
      // Show notification
      showNotification('Endpoints refreshed successfully', 'success');
    }
  });
  
  endpointManager.addEventListener('endpoints:error', (data) => {
    Logger.error('Error loading endpoints', data);
    hideLoading();
    showErrorBanner(`Failed to load endpoints: ${data.message}`);
  });
  
  endpointManager.addEventListener('endpoints:retry', (data) => {
    Logger.warn(`Retrying endpoint load (${data.retryCount}/${data.maxRetries})`, data);
    showLoading(`Retrying endpoint load (${data.retryCount}/${data.maxRetries})...`);
  });
}
