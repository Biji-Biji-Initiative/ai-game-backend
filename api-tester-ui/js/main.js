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

// Setup backend logs manager event listeners
function setupBackendLogsManagerListeners() {
  backendLogsManager.addEventListener('logs:loading', (data) => {
    Logger.debug('Loading backend logs', data);
    elements.refreshBackendLogsBtn.textContent = 'Loading...';
    elements.refreshBackendLogsBtn.disabled = true;
  });
  
  backendLogsManager.addEventListener('logs:loaded', (data) => {
    Logger.info('Backend logs loaded', { 
      count: data.logs.length,
      source: data.source
    });
    
    // Update UI
    elements.refreshBackendLogsBtn.textContent = 'Refresh Backend Logs';
    elements.refreshBackendLogsBtn.disabled = false;
    
    // Count domain events in loaded logs
    const domainEventCount = data.logs.filter(log => Logger.isDomainEventLog(log)).length;
    
    // Render the logs if backend tab is active
    if (appState.activeLogsTab === 'backend') {
      Logger.renderBackendLogs();
    }
    
    // Show notification for manual refreshes
    if (data.source === 'manual' || data.source === 'refresh') {
      const message = `Loaded ${data.count} backend logs` + 
        (domainEventCount > 0 ? ` (including ${domainEventCount} domain events)` : '');
      showNotification(message, 'success');
    }
  });
  
  backendLogsManager.addEventListener('logs:error', (data) => {
    Logger.error('Error loading backend logs', data);
    elements.refreshBackendLogsBtn.textContent = 'Refresh Backend Logs';
    elements.refreshBackendLogsBtn.disabled = false;
    showNotification('Failed to load backend logs', 'error');
  });
  
  backendLogsManager.addEventListener('logs:autoRefreshStarted', (data) => {
    Logger.info('Auto-refresh started for backend logs', data);
    showNotification(`Auto-refreshing backend logs every ${data.interval/1000} seconds`, 'info');
  });
  
  backendLogsManager.addEventListener('logs:autoRefreshStopped', () => {
    Logger.info('Auto-refresh stopped for backend logs');
    showNotification('Auto-refresh stopped for backend logs', 'info');
  });
}

// Process endpoints from the endpoint manager into flows
function processEndpointsFromManager() {
  // Get categories and their endpoints from the manager
  const categories = endpointManager.getCategories();
  
  // Convert to app's flow format
  appState.flows = categories.map(category => ({
    id: category.toLowerCase().replace(/\s+/g, '-'),
    name: category,
    endpoints: endpointManager.getEndpointsByCategory(category)
  })).sort((a, b) => a.name.localeCompare(b.name));
  
  Logger.debug('Processed endpoints into flows', { 
    flowCount: appState.flows.length,
    totalEndpoints: endpointManager.getEndpointCount()
  });
}

// Show loading indicator
function showLoading(message = 'Loading...') {
  elements.loadingIndicator.textContent = message;
  elements.loadingIndicator.classList.add('visible');
}

// Hide loading indicator
function hideLoading() {
  elements.loadingIndicator.classList.remove('visible');
}

// Show error banner
function showErrorBanner(message) {
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.innerHTML = `
    <span class="error-icon">⚠️</span>
    <span class="error-message">${message}</span>
    <button class="close-btn">×</button>
  `;
  
  banner.querySelector('.close-btn').addEventListener('click', () => {
    banner.remove();
  });
  
  document.body.appendChild(banner);
  
  // Auto remove after 15 seconds
  setTimeout(() => {
    if (document.body.contains(banner)) {
      banner.remove();
    }
  }, 15000);
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Render the flow menu
function renderFlows() {
  elements.flowMenu.innerHTML = '';
  
  appState.flows.forEach(flow => {
    const flowItem = document.createElement('div');
    flowItem.className = 'flow-item';
    flowItem.dataset.flowId = flow.id;
    flowItem.textContent = flow.name;
    
    flowItem.addEventListener('click', () => selectFlow(flow));
    
    elements.flowMenu.appendChild(flowItem);
  });
  
  Logger.debug('Rendered flow menu');
}

// Select a flow
function selectFlow(flow) {
  // Update UI
  document.querySelectorAll('.flow-item').forEach(item => {
    item.classList.remove('active');
  });
  
  document.querySelector(`.flow-item[data-flow-id="${flow.id}"]`).classList.add('active');
  
  // Update state
  appState.currentFlow = flow;
  appState.steps = flow.endpoints;
  appState.currentStep = null;
  
  // Render steps
  renderSteps();
  
  // Hide step details
  elements.stepDetails.classList.add('hidden');
  
  Logger.info(`Selected flow: ${flow.name}`, { flowId: flow.id, stepsCount: flow.endpoints.length });
}

// Render steps for the selected flow
function renderSteps() {
  elements.flowSteps.innerHTML = '';
  
  appState.steps.forEach((step, index) => {
    const stepCard = document.createElement('div');
    stepCard.className = 'step-card';
    stepCard.dataset.stepIndex = index;
    
    // Check if this step has a result
    const hasResult = appState.stepResults[step.path];
    if (hasResult) {
      stepCard.classList.add('complete');
    }
    
    stepCard.innerHTML = `
      <div class="step-card-content">
        <div class="step-number">Step ${index + 1}</div>
        <h3>${step.name}</h3>
      </div>
      <div class="step-status ${hasResult ? 'status-complete' : 'status-pending'}">
        ${hasResult ? 'Complete' : 'Pending'}
      </div>
    `;
    
    stepCard.addEventListener('click', () => selectStep(index));
    
    elements.flowSteps.appendChild(stepCard);
  });
  
  Logger.debug('Rendered steps for flow', { flowName: appState.currentFlow?.name });
}

// Select a step
function selectStep(index) {
  const step = appState.steps[index];
  
  // Update UI
  document.querySelectorAll('.step-card').forEach(card => {
    card.classList.remove('active');
  });
  
  document.querySelector(`.step-card[data-step-index="${index}"]`).classList.add('active');
  
  // Update state
  appState.currentStep = step;
  
  // Show step details
  elements.stepDetails.classList.remove('hidden');
  elements.stepTitle.textContent = step.name;
  elements.stepDescription.textContent = step.description || '';
  
  // Generate form inputs
  generateFormInputs(step);
  
  // Show previous results if available
  const result = appState.stepResults[step.path];
  if (result) {
    showResult(result.status, result.data);
  } else {
    elements.resultPanel.classList.add('hidden');
  }
  
  Logger.info(`Selected step: ${step.name}`, { 
    stepPath: step.path, 
    stepMethod: step.method,
    hasParams: !!step.parameters?.length,
    hasBody: !!step.requestBody
  });
}

// Generate form inputs based on the step
function generateFormInputs(step) {
  elements.formInputs.innerHTML = '';
  
  // Handle path parameters
  if (step.parameters && step.parameters.length > 0) {
    const pathParamsDiv = document.createElement('div');
    pathParamsDiv.className = 'form-section';
    pathParamsDiv.innerHTML = `<h4>Path Parameters</h4>`;
    
    step.parameters.forEach(param => {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      
      formGroup.innerHTML = `
        <label for="param-${param.name}">${param.name} ${param.required ? '*' : ''}</label>
        <input type="text" id="param-${param.name}" name="${param.name}" 
               placeholder="${param.description || ''}" 
               ${param.required ? 'required' : ''}>
        <div class="variable-suggestions"></div>
      `;
      
      pathParamsDiv.appendChild(formGroup);
    });
    
    elements.formInputs.appendChild(pathParamsDiv);
  }
  
  // Handle request body
  if (step.requestBody) {
    const requestBodyDiv = document.createElement('div');
    requestBodyDiv.className = 'form-section';
    requestBodyDiv.innerHTML = `<h4>Request Body</h4>`;
    
    // Extract schema from request body
    let schema = null;
    let example = null;
    
    if (step.requestBody.content && step.requestBody.content['application/json']) {
      schema = step.requestBody.content['application/json'].schema;
      example = step.requestBody.content['application/json'].example;
    }
    
    if (schema || example) {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      
      const exampleJson = example || generateExampleFromSchema(schema);
      const prettyJson = JSON.stringify(exampleJson, null, 2);
      
      formGroup.innerHTML = `
        <label for="request-body">Body ${step.requestBody.required ? '*' : ''}</label>
        <textarea id="request-body" name="requestBody" 
                  placeholder="Enter JSON body"
                  ${step.requestBody.required ? 'required' : ''}>${prettyJson}</textarea>
        <div class="variable-suggestions"></div>
      `;
      
      requestBodyDiv.appendChild(formGroup);
      elements.formInputs.appendChild(requestBodyDiv);
    }
  }
  
  // Add headers input
  const headersDiv = document.createElement('div');
  headersDiv.className = 'form-section';
  headersDiv.innerHTML = `<h4>Headers</h4>`;
  
  const headersFormGroup = document.createElement('div');
  headersFormGroup.className = 'form-group';
  
  headersFormGroup.innerHTML = `
    <label for="headers">Custom Headers (JSON format)</label>
    <textarea id="headers" name="headers" 
              placeholder='{"Content-Type": "application/json"}'></textarea>
    <div class="variable-suggestions"></div>
  `;
  
  headersDiv.appendChild(headersFormGroup);
  elements.formInputs.appendChild(headersDiv);
  
  // If no inputs are required, show a message
  if (elements.formInputs.children.length === 0) {
    elements.formInputs.innerHTML = `
      <div class="empty-form-message">
        <p>No input required for this step. Just click "Run This Step" to proceed.</p>
      </div>
    `;
  }
  
  // Initialize variable highlighting and suggestions for all inputs
  setupVariableHighlighting();
  
  Logger.debug('Generated form inputs for step', { stepName: step.name });
}

// Setup variable highlighting and suggestions for form inputs
function setupVariableHighlighting() {
  // Get all text inputs and textareas
  const inputs = elements.formInputs.querySelectorAll('input[type="text"], textarea');
  
  inputs.forEach(input => {
    // Add input event to highlight variables as they're typed
    input.addEventListener('input', () => highlightVariablesInInput(input));
    
    // Add focus event to show variable suggestions
    input.addEventListener('focus', () => showVariableSuggestions(input));
    
    // Initial highlighting
    highlightVariablesInInput(input);
    
    // Set up Ctrl+Space for variable autocomplete
    input.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        showVariableSuggestions(input, true);
      }
    });
  });
}

// Generate example JSON from schema
function generateExampleFromSchema(schema) {
  if (!schema) return {};
  
  if (schema.example) {
    return schema.example;
  }
  
  if (schema.type === 'object') {
    const example = {};
    
    if (schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        const prop = schema.properties[key];
        
        if (prop.example) {
          example[key] = prop.example;
        } else if (prop.type === 'string') {
          example[key] = 'example';
        } else if (prop.type === 'number') {
          example[key] = 0;
        } else if (prop.type === 'boolean') {
          example[key] = false;
        } else if (prop.type === 'array') {
          example[key] = [];
        } else if (prop.type === 'object') {
          example[key] = generateExampleFromSchema(prop);
        }
      });
    }
    
    return example;
  }
  
  return {};
}

// Highlight variables in an input or textarea
function highlightVariablesInInput(input) {
  if (!input || !input.value) return;
  
  // Check if we have any variables
  if (!variableManager.containsVariables(input.value)) {
    return;
  }
  
  // For input fields, add a special class and data attribute
  if (input.tagName === 'INPUT') {
    input.classList.add('contains-variables');
    input.dataset.containsVariables = 'true';
    
    // Count variables
    const variableNames = variableManager.extractVariableNames(input.value);
    
    // Add a counter badge after the input if not already present
    let badge = input.nextElementSibling;
    if (!badge || !badge.classList.contains('variable-count-badge')) {
      badge = document.createElement('div');
      badge.className = 'variable-count-badge';
      input.parentNode.insertBefore(badge, input.nextSibling);
    }
    
    badge.textContent = `${variableNames.length} ${variableNames.length === 1 ? 'variable' : 'variables'}`;
    
    // Check if variables exist and update styling
    updateVariableValidityStyle(input, variableNames);
  }
  // For textareas, we need more complex handling
  else if (input.tagName === 'TEXTAREA') {
    input.classList.add('contains-variables');
    input.dataset.containsVariables = 'true';
    
    // Extract variable names
    const variableNames = variableManager.extractVariableNames(input.value);
    
    // Add a counter badge after the textarea if not already present
    let badge = input.nextElementSibling;
    if (!badge || !badge.classList.contains('variable-count-badge')) {
      badge = document.createElement('div');
      badge.className = 'variable-count-badge';
      input.parentNode.insertBefore(badge, input.nextSibling);
    }
    
    badge.textContent = `${variableNames.length} ${variableNames.length === 1 ? 'variable' : 'variables'}`;
    
    // Check if variables exist and update styling
    updateVariableValidityStyle(input, variableNames);
  }
}

// Update input styling based on variable validity
function updateVariableValidityStyle(input, variableNames) {
  let allValid = true;
  
  // Check if all variables exist
  for (const name of variableNames) {
    if (!variableManager.hasVariable(name)) {
      allValid = false;
      break;
    }
  }
  
  // Update styling
  if (allValid && variableNames.length > 0) {
    input.classList.add('variables-valid');
    input.classList.remove('variables-invalid');
  } else if (variableNames.length > 0) {
    input.classList.add('variables-invalid');
    input.classList.remove('variables-valid');
  } else {
    input.classList.remove('variables-valid', 'variables-invalid');
  }
}

// Show variable suggestions for the input
function showVariableSuggestions(input, forceShow = false) {
  // Find the suggestions container
  const suggestionsContainer = input.parentNode.querySelector('.variable-suggestions');
  if (!suggestionsContainer) return;
  
  // Get all available variables
  const variables = variableManager.getVariables();
  const variableKeys = Object.keys(variables);
  
  // Don't show suggestions if there are no variables (unless forced)
  if (variableKeys.length === 0 && !forceShow) {
    suggestionsContainer.innerHTML = '';
    return;
  }
  
  // Show "no variables" message if forced to show but no variables exist
  if (variableKeys.length === 0 && forceShow) {
    suggestionsContainer.innerHTML = '<div class="no-variables-message">No variables available. Create variables by extracting from previous responses.</div>';
    return;
  }
  
  // Generate suggestions UI
  suggestionsContainer.innerHTML = '<div class="variables-dropdown">' + 
    '<div class="variables-dropdown-header">Available Variables (click to insert)</div>' + 
    '<div class="variables-list"></div>' + 
  '</div>';
  
  const variablesList = suggestionsContainer.querySelector('.variables-list');
  
  // Add each variable as a suggestion
  variableKeys.forEach(key => {
    const value = variables[key];
    
    const variableItem = document.createElement('div');
    variableItem.className = 'variable-item';
    
    // Format value for display
    let displayValue = value;
    if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
    }
    
    // Truncate long values
    const truncatedValue = typeof displayValue === 'string' && displayValue.length > 30
      ? displayValue.substring(0, 30) + '...'
      : displayValue;
    
    variableItem.innerHTML = `
      <div class="variable-name">${key}</div>
      <div class="variable-preview">${truncatedValue}</div>
    `;
    
    // Add click handler to insert the variable
    variableItem.addEventListener('click', () => {
      const variableSyntax = variableManager.options.variableSyntax;
      const variableRef = `${variableSyntax.prefix}${key}${variableSyntax.suffix}`;
      
      // For a regular input field
      if (input.tagName === 'INPUT') {
        input.value = input.value + variableRef;
      }
      // For textareas, insert at cursor position
      else if (input.tagName === 'TEXTAREA') {
        const startPos = input.selectionStart;
        const endPos = input.selectionEnd;
        input.value = input.value.substring(0, startPos) + variableRef + input.value.substring(endPos);
        input.selectionStart = input.selectionEnd = startPos + variableRef.length;
      }
      
      // Update highlighting
      highlightVariablesInInput(input);
      
      // Close suggestions
      suggestionsContainer.innerHTML = '';
      
      // Focus back on the input
      input.focus();
    });
    
    variablesList.appendChild(variableItem);
  });
  
  // Add click outside handler to close suggestions
  document.addEventListener('click', function closeHandler(e) {
    if (!suggestionsContainer.contains(e.target) && e.target !== input) {
      suggestionsContainer.innerHTML = '';
      document.removeEventListener('click', closeHandler);
    }
  });
}

// Get form values
function getFormValues() {
  const formData = {
    params: {},
    headers: {},
    body: null
  };
  
  // Get path parameters
  const paramInputs = elements.formInputs.querySelectorAll('input[name]');
  paramInputs.forEach(input => {
    formData.params[input.name] = input.value;
  });
  
  // Get headers
  const headersInput = elements.formInputs.querySelector('#headers');
  if (headersInput && headersInput.value) {
    try {
      formData.headers = JSON.parse(headersInput.value);
    } catch (error) {
      Logger.warn('Failed to parse headers JSON', { error: error.message });
      // Show a notification
      showNotification('Headers must be valid JSON', 'warning');
    }
  }
  
  // Get request body
  const bodyInput = elements.formInputs.querySelector('#request-body');
  if (bodyInput && bodyInput.value) {
    try {
      formData.body = JSON.parse(bodyInput.value);
    } catch (error) {
      // If it's not valid JSON, treat it as string
      formData.body = bodyInput.value;
    }
  }
  
  return formData;
}

// Run the current step
async function runStep() {
  if (!appState.currentStep) {
    Logger.error('No step selected to run');
    return;
  }
  
  // Generate a new correlation ID for this request
  appState.currentCorrelationId = `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Show loading indicator
  showLoading(`Running ${appState.currentStep.method} ${appState.currentStep.path}...`);
  
  // Get form values
  const formData = getFormValues();
  
  // Create a request object
  const request = {
    method: appState.currentStep.method,
    path: appState.currentStep.path,
    headers: formData.headers || {},
    body: formData.body || null,
    params: formData.params || {}
  };
  
  // Store the current request for domain state viewer
  appState.currentRequest = request;
  // Make the current request available to the domain state viewer via window
  window.currentRequest = request;
  
  // Process variables in the request
  const processedRequest = variableManager.processRequest(request);
  
  // Log the request
  Logger.info(`Running ${processedRequest.method} ${processedRequest.path}`, {
    correlationId: appState.currentCorrelationId,
    request: processedRequest,
    step: appState.currentStep.name
  });
  
  try {
    // Create the full URL
    const url = processedRequest.path;
    
    // Build fetch options
    const fetchOptions = {
      method: processedRequest.method,
      headers: {
        'Content-Type': 'application/json',
        ...processedRequest.headers
      }
    };
    
    // Add body if present
    if (processedRequest.body) {
      fetchOptions.body = typeof processedRequest.body === 'string' 
        ? processedRequest.body 
        : JSON.stringify(processedRequest.body);
    }
    
    // Add correlation ID to headers if not already present
    if (!fetchOptions.headers['X-Correlation-ID']) {
      fetchOptions.headers['X-Correlation-ID'] = appState.currentCorrelationId;
    }
    
    // Add auth token if available
    if (appState.authToken) {
      fetchOptions.headers['Authorization'] = `Bearer ${appState.authToken}`;
    }
    
    // Make the request
    const response = await fetch(url, fetchOptions);
    
    // Get headers
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Try to parse the response as JSON
    let data;
    let rawText;
    
    try {
      rawText = await response.text();
      
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        // Not JSON, use raw text
        data = rawText;
      }
    } catch (textError) {
      Logger.error('Failed to read response body', { error: textError });
      data = 'Failed to read response body';
    }
    
    // Create the complete response object
    const result = {
      status: response.status,
      statusText: response.statusText,
      headers,
      data,
      rawText
    };
    
    // Check if the response includes an auth token
    if (data && data.token) {
      appState.authToken = data.token;
      localStorage.setItem('authToken', data.token);
      Logger.info('Auth token captured from response', { tokenPrefix: data.token.substring(0, 10) + '...' });
    }
    
    // Store the result for the current step
    appState.stepResults[appState.currentStep.path] = result;
    
    // Update UI to show the result
    showResult(result.status, result.data);
    
    // Mark the step card as complete
    const stepCard = document.querySelector(`.step-card[data-step-index="${appState.steps.indexOf(appState.currentStep)}"]`);
    if (stepCard) {
      stepCard.classList.add('complete');
      stepCard.querySelector('.step-status').className = 'step-status status-complete';
      stepCard.querySelector('.step-status').textContent = 'Complete';
    }
    
    // Store the current response for variable extraction
    appState.currentResponse = data;
    
    // Update the variable extractor with the response data
    if (appState.variableExtractor) {
      appState.variableExtractor.setResponseData(data);
    }
    
    // Take after snapshot for domain state if available
    if (appState.domainStateViewer && appState.domainStateManager) {
      appState.domainStateViewer.takeAfterSnapshot(processedRequest);
    }
    
    Logger.info(`Step completed with status ${result.status}`, {
      correlationId: appState.currentCorrelationId,
      response: {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers
      }
    });
    
    // Log response data separately for debugging
    Logger.debug('Response data', {
      correlationId: appState.currentCorrelationId,
      data: result.data
    });
    
    return result;
  } catch (error) {
    // Show error
    showError(error, response?.status, data);
    
    Logger.error('Step execution failed', {
      correlationId: appState.currentCorrelationId,
      error: error.message,
      stack: error.stack,
      request: processedRequest
    });
    
    return null;
  } finally {
    hideLoading();
  }
}

// Show the result
function showResult(status, data) {
  // Get HTTP status text
  const statusText = getStatusText(status);
  
  // Determine if it's an error status
  const isError = status >= 400;
  
  // Show the result panel
  elements.resultPanel.classList.remove('hidden');
  
  // Update the status display
  elements.resultStatus.textContent = `${status} ${statusText}`;
  elements.resultStatus.className = `result-status ${isError ? 'error' : 'success'}`;
  
  // Clear any existing error container
  const errorContainer = elements.resultPanel.querySelector('.error-container');
  if (errorContainer) {
    errorContainer.classList.add('hidden');
  }
  
  // Add view backend logs button if we have a correlation ID
  if (appState.currentCorrelationId) {
    // Remove any existing backend logs button first
    const existingBtn = elements.resultPanel.querySelector('.view-backend-logs-btn');
    if (existingBtn) {
      existingBtn.remove();
    }
    
    // Remove any existing domain events button
    const existingEventsBtn = elements.resultPanel.querySelector('.view-domain-events-btn');
    if (existingEventsBtn) {
      existingEventsBtn.remove();
    }
    
    // Create the view logs button
    const viewLogsBtn = document.createElement('button');
    viewLogsBtn.className = 'btn btn-secondary view-backend-logs-btn';
    viewLogsBtn.innerHTML = `<span class="logs-icon">🔍</span> View Backend Logs (ID: ${appState.currentCorrelationId.substring(0, 8)}...)`;
    viewLogsBtn.title = `Show backend logs for correlation ID: ${appState.currentCorrelationId}`;
    
    // Add click handler to show logs panel and filter by this correlation ID
    viewLogsBtn.addEventListener('click', () => {
      // Show logs panel if not already visible
      if (!elements.logsPanel.classList.contains('visible')) {
        toggleLogsPanel();
      }
      
      // Switch to backend logs tab
      switchLogsTab('backend');
      
      // Set the correlation ID filter and trigger a refresh
      elements.backendCorrelationId.value = appState.currentCorrelationId;
      
      // Refresh logs with this correlation ID
      refreshBackendLogs();
    });
    
    // Create the view domain events button
    const viewEventsBtn = document.createElement('button');
    viewEventsBtn.className = 'btn btn-outline-secondary view-domain-events-btn';
    viewEventsBtn.innerHTML = `<span class="events-icon">⚡</span> View Domain Events`;
    viewEventsBtn.title = 'Show domain events associated with this request';
    
    // Add click handler to show logs panel and filter domain events for this correlation ID
    viewEventsBtn.addEventListener('click', () => {
      // Show logs panel if not already visible
      if (!elements.logsPanel.classList.contains('visible')) {
        toggleLogsPanel();
      }
      
      // Switch to backend logs tab
      switchLogsTab('backend');
      
      // Set the correlation ID filter
      elements.backendCorrelationId.value = appState.currentCorrelationId;
      
      // Refresh logs with this correlation ID
      refreshBackendLogs().then(() => {
        // Get domain events filter button
        const domainEventsFilterBtn = document.querySelector('.domain-events-filter');
        
        // Activate the domain events filter if it exists
        if (domainEventsFilterBtn && !domainEventsFilterBtn.classList.contains('active')) {
          domainEventsFilterBtn.click();
        }
      });
    });
    
    // Add the buttons to the result panel
    elements.resultStatus.after(viewEventsBtn);
    elements.resultStatus.after(viewLogsBtn);
  }
  
  // Update the response viewer with the full response
  if (appState.responseViewer) {
    appState.responseViewer.setResponse(appState.currentResponse || {
      status,
      statusText,
      data,
      headers: {}
    });
  }
  
  // If it's an error status, display in the error format as well
  if (isError) {
    const error = new Error(`HTTP Error: ${status} ${statusText}`);
    showError(error, status, data);
  }
}

// Helper function to get HTTP status text
function getStatusText(status) {
  const statusTexts = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    307: 'Temporary Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported'
  };
  
  return statusTexts[status] || 'Unknown Status';
}

// Display JSON result with formatting
function displayJsonResult(data) {
  try {
    const formatter = new JSONFormatter(data, 2, {
      animateOpen: true,
      animateClose: true,
      theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
    });
    
    elements.resultContent.innerHTML = '';
    elements.resultContent.appendChild(formatter.render());
  } catch (error) {
    // Fallback to pre-formatted JSON if JSONFormatter fails
    elements.resultContent.innerHTML = `
      <pre class="result-json">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    `;
  }
}

// Helper to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Show authentication result with token
function showAuthResult(data) {
  const result = data.data;
  const token = result.token;
  
  // Create enhanced result display
  const resultHtml = `
    <div class="auth-result">
      <div class="auth-result-header">
        <div class="auth-result-title">Authentication Successful</div>
      </div>
      <div class="auth-result-body">
        <div class="token-display">
          <h4>Auth Token</h4>
          <div class="token-box">${token || "No token provided"}</div>
          <div class="token-info">
            <p><strong>Note:</strong> This token ${determineTokenType(token)}</p>
            <p>The token has been stored and will be used automatically for future requests requiring authentication.</p>
          </div>
        </div>
        
        <h4>Complete Response</h4>
        <div class="json-viewer">${formatJson(result)}</div>
      </div>
    </div>
  `;
  
  elements.resultContent.innerHTML = resultHtml;
  
  // Log the result
  Logger.info(`Authentication successful. Token received and stored`, { 
    tokenLength: token ? token.length : 0,
    tokenType: determineTokenType(token)
  });
}

// Determine if a token is a real JWT or a mock token
function determineTokenType(token) {
  if (!token) return "is missing";
  
  // Check if it's a valid JWT structure (3 parts separated by dots)
  const jwtParts = token.split('.');
  if (jwtParts.length === 3) {
    try {
      // Try to decode the middle part (payload)
      const payload = JSON.parse(atob(jwtParts[1]));
      const exp = payload.exp;
      
      // Check if it has an expiration date
      if (exp) {
        const expiryDate = new Date(exp * 1000);
        return `appears to be a valid JWT token that expires on ${expiryDate.toLocaleString()}`;
      }
      
      return "appears to be a valid JWT token";
    } catch (e) {
      return "has a JWT-like structure but couldn't be decoded";
    }
  }
  
  // Check if it's clearly a mock token
  if (token.includes('mock') || token.includes('test') || token.length < 20) {
    return "is a mock/test token (not valid for production use)";
  }
  
  return "has an unknown format";
}

// Add helpful error message based on error type
function appendErrorHelp(errorMessage) {
  const helpDiv = document.createElement('div');
  helpDiv.className = 'error-help';
  
  let helpText = '';
  
  // Ensure errorMessage is a string before using string methods
  if (!errorMessage || typeof errorMessage !== 'string') {
    if (errorMessage && errorMessage.message) {
      errorMessage = errorMessage.message;
    } else {
      errorMessage = 'Unknown error occurred';
    }
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    helpText = `
      <h4>Connection Timeout</h4>
      <p>The server took too long to respond. This might be due to:</p>
      <ul>
        <li>Heavy server load</li>
        <li>Network connectivity issues</li>
        <li>Complex query that needs more time to process</li>
      </ul>
      <p>Try again in a few moments or check if the backend server is running.</p>
    `;
  } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    helpText = `
      <h4>Resource Not Found</h4>
      <p>The API endpoint could not be found. This might be due to:</p>
      <ul>
        <li>The endpoint path may be incorrect</li>
        <li>The backend server may not have this route configured</li>
      </ul>
      <p>Check that your API is running and the endpoint path is correct.</p>
    `;
  } else if (errorMessage.includes('pattern') || errorMessage.includes('validation')) {
    helpText = `
      <h4>Validation Error</h4>
      <p>Your input data didn't match the expected format. Check these common issues:</p>
      <ul>
        <li>Email may be in an invalid format</li>
        <li>Password may not meet strength requirements</li>
        <li>Required fields may be missing</li>
        <li>Data types may be incorrect (numbers vs strings)</li>
      </ul>
    `;
  } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    helpText = `
      <h4>Authentication Error</h4>
      <p>You don't have permission to access this resource. Make sure you:</p>
      <ul>
        <li>Are logged in (complete the signup/login step first)</li>
        <li>Have the correct authorization token</li>
        <li>Have the necessary permissions for this action</li>
      </ul>
    `;
  }
  
  if (helpText) {
    helpDiv.innerHTML = helpText;
    elements.resultPanel.appendChild(helpDiv);
  }
}

// Clear form
function clearForm() {
  const inputs = elements.formInputs.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.value = '';
  });
  
  elements.resultPanel.classList.add('hidden');
  Logger.debug('Form cleared');
}

// Toggle the logs panel
function toggleLogsPanel() {
  elements.logsPanel.classList.toggle('visible');
  
  if (elements.logsPanel.classList.contains('visible')) {
    // Update active tab content
    if (appState.activeLogsTab === 'frontend') {
      Logger.renderFrontendLogs();
    } else {
      // Fetch backend logs if tab is active
      refreshBackendLogs();
    }
  }
}

// Switch between logs tabs
function switchLogsTab(tab) {
  // Update active tab state
  appState.activeLogsTab = tab;
  
  // Update tab UI
  elements.frontendLogsTab.classList.toggle('active', tab === 'frontend');
  elements.backendLogsTab.classList.toggle('active', tab === 'backend');
  
  // Show appropriate container
  elements.frontendLogsContainer.classList.toggle('active', tab === 'frontend');
  elements.backendLogsContainer.classList.toggle('active', tab === 'backend');
  
  // Render appropriate logs
  if (tab === 'frontend') {
    Logger.renderFrontendLogs();
  } else {
    // If backend logs are empty, fetch them
    if (backendLogsManager.getLogs().length === 0) {
      refreshBackendLogs();
    } else {
      Logger.renderBackendLogs();
    }
  }
}

// Refresh backend logs
async function refreshBackendLogs() {
  try {
    // Get filter values
    const correlationId = elements.backendCorrelationId.value.trim() || null;
    const search = elements.backendLogsSearch.value.trim() || null;
    
    // Fetch logs with filters
    return await backendLogsManager.fetchLogs({
      correlationId,
      search,
      limit: 200
    });
    
    // Rendering is handled by the event listener
  } catch (error) {
    Logger.error('Failed to refresh backend logs', { error });
    showNotification('Failed to fetch backend logs', 'error');
    throw error; // Rethrow to allow proper error handling in promise chains
  }
}

// Handle auto-refresh toggle
function toggleBackendLogsAutoRefresh() {
  const isAutoRefresh = elements.backendAutoRefresh.checked;
  
  if (isAutoRefresh) {
    // Use a shorter interval (5 seconds) for auto-refresh
    backendLogsManager.startAutoRefresh(5000);
    
    // Show indicator that auto-refresh is active
    const refreshButton = elements.refreshBackendLogsBtn;
    refreshButton.classList.add('auto-refreshing');
    
    // Add a small indicator to the button
    if (!refreshButton.querySelector('.auto-refresh-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'auto-refresh-indicator';
      indicator.textContent = '↻';
      refreshButton.appendChild(indicator);
    }
    
    // Add a visual indicator in the logs header
    const logsHeader = elements.logsPanel.querySelector('.logs-header h2');
    if (logsHeader && !logsHeader.querySelector('.auto-refresh-badge')) {
      const badge = document.createElement('span');
      badge.className = 'auto-refresh-badge';
      badge.textContent = 'Auto-refresh ON';
      badge.title = 'Logs auto-refresh every 5 seconds';
      logsHeader.appendChild(badge);
    }
    
    showNotification('Auto-refresh enabled - logs will update every 5 seconds', 'info');
  } else {
    backendLogsManager.stopAutoRefresh();
    
    // Remove auto-refresh indicators
    elements.refreshBackendLogsBtn.classList.remove('auto-refreshing');
    
    const indicator = elements.refreshBackendLogsBtn.querySelector('.auto-refresh-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    // Remove the header badge
    const badge = elements.logsPanel.querySelector('.auto-refresh-badge');
    if (badge) {
      badge.remove();
    }
    
    showNotification('Auto-refresh disabled', 'info');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Run step button
  elements.runStepBtn.addEventListener('click', runStep);
  
  // Clear form button
  elements.clearFormBtn.addEventListener('click', clearForm);
  
  // Show logs button
  elements.showLogsBtn.addEventListener('click', toggleLogsPanel);
  
  // Close logs button
  elements.closeLogsBtn.addEventListener('click', toggleLogsPanel);
  
  // Clear logs button
  elements.clearLogsBtn.addEventListener('click', () => {
    if (appState.activeLogsTab === 'frontend') {
      Logger.clearLogs();
    } else {
      backendLogsManager.clearLogs();
      Logger.renderBackendLogs();
    }
  });
  
  // Copy logs button
  elements.copyLogsBtn.addEventListener('click', Logger.copyLogsToClipboard.bind(Logger));
  
  // Log filter changes
  elements.filterDebug.addEventListener('change', () => Logger.renderFrontendLogs());
  elements.filterInfo.addEventListener('change', () => Logger.renderFrontendLogs());
  elements.filterWarning.addEventListener('change', () => Logger.renderFrontendLogs());
  elements.filterError.addEventListener('change', () => Logger.renderFrontendLogs());
  elements.logsSearch.addEventListener('input', () => Logger.renderFrontendLogs());
  
  // Backend log filter changes
  elements.backendFilterDebug.addEventListener('change', () => Logger.renderBackendLogs());
  elements.backendFilterInfo.addEventListener('change', () => Logger.renderBackendLogs());
  elements.backendFilterWarning.addEventListener('change', () => Logger.renderBackendLogs());
  elements.backendFilterError.addEventListener('change', () => Logger.renderBackendLogs());
  elements.backendLogsSearch.addEventListener('input', () => Logger.renderBackendLogs());
  elements.backendCorrelationId.addEventListener('input', () => Logger.renderBackendLogs());
  
  // Toggle auto-refresh
  elements.backendAutoRefresh.addEventListener('change', toggleBackendLogsAutoRefresh);
  
  // Refresh backend logs button
  elements.refreshBackendLogsBtn.addEventListener('click', refreshBackendLogs);
  
  // Log tabs
  elements.frontendLogsTab.addEventListener('click', () => switchLogsTab('frontend'));
  elements.backendLogsTab.addEventListener('click', () => switchLogsTab('backend'));
  
  // Theme toggle
  elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    elements.themeToggle.querySelector('.theme-icon').textContent = 
      document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  });
  
  // Add event listener for refreshing endpoints
  if (elements.refreshEndpointsBtn) {
    elements.refreshEndpointsBtn.addEventListener('click', async () => {
      try {
        showLoading('Refreshing endpoints...');
        await endpointManager.refreshEndpoints();
        // processEndpointsFromManager and renderFlows will be called by the event listeners
      } catch (error) {
        Logger.error('Failed to refresh endpoints', { error });
        showErrorBanner('Failed to refresh endpoints');
        hideLoading();
      }
    });
  }
}

// Setup variable manager listeners
function setupVariableManagerListeners() {
  variableManager.addEventListener('variable:set', (data) => {
    Logger.debug('Variable set', { 
      name: data.name, 
      value: data.value 
    });
    
    // Update the sidebar
    updateVariablesSidebar();
  });
  
  variableManager.addEventListener('variable:deleted', (data) => {
    Logger.debug('Variable deleted', { name: data.name });
    
    // Update the sidebar
    updateVariablesSidebar();
  });
  
  variableManager.addEventListener('variables:cleared', () => {
    Logger.debug('All variables cleared');
    
    // Update the sidebar
    updateVariablesSidebar();
  });
  
  variableManager.addEventListener('variables:loaded', (data) => {
    Logger.debug('Variables loaded from storage', { count: data.count });
    
    // Update the sidebar
    updateVariablesSidebar();
  });
}

// Initialize the variable extractor
function initVariableExtractor() {
  // Create the variable extractor if logs panel is present
  if (elements.logsPanel) {
    // Add a container for the variable extractor
    const variableExtractorContainer = document.createElement('div');
    variableExtractorContainer.id = 'variable-extractor-container';
    elements.logsPanel.appendChild(variableExtractorContainer);
    
    // Initialize the variable extractor
    appState.variableExtractor = new VariableExtractor({
      variableManager: variableManager,
      container: variableExtractorContainer
    });
    
    Logger.debug('Variable extractor initialized');
  }
}

// Initialize the response viewer
function initResponseViewer() {
  if (!elements.resultContent) return;
  
  // Create the response viewer with enhanced options
  appState.responseViewer = new ResponseViewer({
    container: elements.resultContent,
    previewSandboxed: true,
    jsonMaxDepth: 10,
    jsonMaxLines: 5000,
    enableVirtualization: true,
    enableSearch: true,
    enableCollapsible: true
  });
  
  // Add keyboard shortcut hint for search
  const shortcutHint = document.createElement('div');
  shortcutHint.className = 'response-shortcut-hint';
  shortcutHint.innerHTML = 'Tip: Press <span class="keyboard-shortcut">Ctrl+F</span> to search in response';
  elements.resultPanel.appendChild(shortcutHint);
  
  Logger.debug('Response viewer initialized with enhanced features');
}

// Show error message
function showError(error, status, data) {
  let errorMessage = error.message || 'An unknown error occurred';
  let statusCode = status || (error.response ? error.response.status : null);
  let errorData = data || (error.response ? error.response.data : null);
  let validationErrors = [];
  
  // Create the error container if it doesn't exist
  if (!elements.resultPanel.querySelector('.error-container')) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    elements.resultContent.after(errorContainer);
  }
  
  const errorContainer = elements.resultPanel.querySelector('.error-container');
  
  // Try to extract validation errors from response data
  if (errorData) {
    if (errorData.errors && Array.isArray(errorData.errors)) {
      validationErrors = errorData.errors;
    } else if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
      validationErrors = errorData.validationErrors;
    } else if (errorData.message && typeof errorData.message === 'string') {
      errorMessage = errorData.message;
    }
  }
  
  // Build the error HTML
  let errorHtml = `
    <div class="error-header">
      <h4>Error${statusCode ? ` (${statusCode})` : ''}</h4>
    </div>
    <div class="error-message">${errorMessage}</div>
  `;
  
  // Add validation errors if any
  if (validationErrors.length > 0) {
    errorHtml += `
      <div class="validation-errors">
        <h5>Validation Errors</h5>
        <ul>
          ${validationErrors.map(err => {
            // Try to get the field name and message
            const field = err.field || err.param || err.path || '';
            const message = err.message || err.msg || err.reason || JSON.stringify(err);
            
            // Highlight the field in the form if it exists
            highlightFormField(field);
            
            return `<li><strong>${field}:</strong> ${message}</li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }
  
  // Add technical details if available
  if (error.stack) {
    errorHtml += `
      <div class="error-details">
        <details>
          <summary>Technical Details</summary>
          <pre>${error.stack}</pre>
        </details>
      </div>
    `;
  }
  
  // Show the error container
  errorContainer.innerHTML = errorHtml;
  errorContainer.classList.remove('hidden');
  
  // Show the result panel with error status
  elements.resultPanel.classList.remove('hidden');
  elements.resultStatus.textContent = 'Error';
  elements.resultStatus.className = 'result-status error';
  
  // Clear the result content (since we're showing an error)
  elements.resultContent.innerHTML = '';
}

// Highlight a form field that has a validation error
function highlightFormField(fieldPath) {
  if (!fieldPath) return;
  
  // Try to find the form field
  const formField = elements.formInputs.querySelector(`[name="${fieldPath}"]`);
  if (formField) {
    // Add error class
    formField.classList.add('field-error');
    
    // Add a listener to remove the error class when the field is changed
    const clearError = () => {
      formField.classList.remove('field-error');
      formField.removeEventListener('input', clearError);
      formField.removeEventListener('change', clearError);
    };
    
    formField.addEventListener('input', clearError);
    formField.addEventListener('change', clearError);
    
    // Scroll to the field
    formField.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Setup status manager event listeners
function setupStatusManagerListeners() {
  statusManager.addEventListener('status:loading', () => {
    Logger.debug('Loading system status information');
  });
  
  statusManager.addEventListener('status:loaded', (data) => {
    Logger.info('System status loaded', {
      status: data.status.overall,
      dependencies: data.status.dependencies.length
    });
    
    // Update environment indicator based on status
    updateEnvironmentIndicator(data.status.environment.mode);
  });
  
  statusManager.addEventListener('status:error', (data) => {
    Logger.error('Error loading system status', data);
  });
  
  statusManager.addEventListener('status:autoRefreshStarted', (data) => {
    Logger.debug(`Auto-refresh started for system status: every ${data.interval/1000} seconds`);
  });
}

// Update environment indicator based on mode
function updateEnvironmentIndicator(mode) {
  const envIndicator = document.getElementById('env-indicator');
  if (!envIndicator) return;
  
  // Clear existing classes and set text
  envIndicator.className = 'env-indicator';
  envIndicator.textContent = (mode || 'unknown').toUpperCase();
  
  // Add mode-specific class
  const lowerMode = (mode || '').toLowerCase();
  envIndicator.classList.add(lowerMode);
  
  // Special treatment for production mode
  if (lowerMode === 'production') {
    envIndicator.innerHTML = `<span class="env-badge">PROD</span>`;
    
    // Update the title to indicate production
    const title = document.querySelector('.logo h1');
    if (title) {
      title.textContent = 'API Tester (Production)';
    }
    
    Logger.warn('Running in PRODUCTION mode - use caution when testing');
  } else if (lowerMode === 'development') {
    Logger.info('Running in DEVELOPMENT mode');
  } else if (lowerMode === 'test') {
    Logger.info('Running in TEST mode');
  }
}

// Function to create and add the variables panel to the sidebar
function initVariablesSidebar() {
  // Create the panel container
  const variablesPanel = document.createElement('div');
  variablesPanel.className = 'variables-panel';
  variablesPanel.innerHTML = `
    <h3>
      Variables
      <span class="panel-badge">0</span>
    </h3>
    <div class="variables-panel-body">
      <div class="variables-panel-list">
        <div class="variables-panel-empty">
          No variables defined yet
        </div>
      </div>
      <div class="variables-panel-footer">
        <button type="button" class="btn btn-sm btn-secondary" id="manage-variables-btn">
          Manage Variables
        </button>
      </div>
    </div>
  `;
  
  // Add to the flow sidebar, after the flow menu
  elements.flowSidebar.appendChild(variablesPanel);
  
  // Store references to new elements
  elements.variablesPanel = variablesPanel;
  elements.variablesPanelList = variablesPanel.querySelector('.variables-panel-list');
  elements.variablesPanelBadge = variablesPanel.querySelector('.panel-badge');
  elements.manageVariablesBtn = variablesPanel.querySelector('#manage-variables-btn');
  
  // Add event listener for manage variables button
  elements.manageVariablesBtn.addEventListener('click', () => {
    // Show the logs panel with the variable extractor visible
    toggleLogsPanel();
    
    // Wait for the animation to complete
    setTimeout(() => {
      // Scroll to the variable extractor
      const variableExtractorEl = document.querySelector('.variable-extractor');
      if (variableExtractorEl) {
        variableExtractorEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  });
  
  // Initial render of variables
  updateVariablesSidebar();
}

// Update the variables sidebar with current variables
function updateVariablesSidebar() {
  if (!elements.variablesPanelList) return;
  
  const variables = variableManager.getVariables();
  const variableKeys = Object.keys(variables);
  
  // Update badge count
  elements.variablesPanelBadge.textContent = variableKeys.length;
  
  // If no variables, show empty message
  if (variableKeys.length === 0) {
    elements.variablesPanelList.innerHTML = `
      <div class="variables-panel-empty">
        No variables defined yet
      </div>
    `;
    return;
  }
  
  // Otherwise, render each variable
  elements.variablesPanelList.innerHTML = '';
  
  variableKeys.forEach(key => {
    const value = variables[key];
    
    // Format value for display
    let displayValue = value;
    if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
    }
    
    // Truncate long values
    const truncatedValue = typeof displayValue === 'string' && displayValue.length > 20
      ? displayValue.substring(0, 20) + '...'
      : displayValue;
    
    const variableItem = document.createElement('div');
    variableItem.className = 'panel-variable-item';
    variableItem.innerHTML = `
      <div class="panel-variable-name" title="${key}">${key}</div>
      <div class="panel-variable-value" title="${displayValue}">${truncatedValue}</div>
      <div class="panel-variable-actions">
        <button type="button" class="panel-variable-action copy-var" title="Copy variable reference">📋</button>
        <button type="button" class="panel-variable-action delete-var" title="Delete variable">🗑️</button>
      </div>
    `;
    
    // Add event listeners
    variableItem.querySelector('.copy-var').addEventListener('click', () => {
      const variableSyntax = variableManager.options.variableSyntax;
      const variableRef = `${variableSyntax.prefix}${key}${variableSyntax.suffix}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(variableRef)
        .then(() => {
          showNotification(`Copied ${variableRef} to clipboard`, 'success');
        })
        .catch(err => {
          console.error('Failed to copy variable reference:', err);
          showNotification('Failed to copy to clipboard', 'error');
        });
    });
    
    variableItem.querySelector('.delete-var').addEventListener('click', () => {
      variableManager.deleteVariable(key);
      showNotification(`Deleted variable ${key}`, 'info');
    });
    
    elements.variablesPanelList.appendChild(variableItem);
  });
}

// Initialize domain state manager and viewer
function initDomainStateViewer() {
  // Create DOM container for domain state viewer
  const domainStateContainer = document.createElement('div');
  domainStateContainer.id = 'domain-state-container';
  
  // Insert it after the variables panel
  const variablesPanel = document.getElementById('variables-panel');
  if (variablesPanel) {
    variablesPanel.parentNode.insertBefore(domainStateContainer, variablesPanel.nextSibling);
  } else {
    // Fallback
    elements.resultPanel.parentNode.appendChild(domainStateContainer);
  }
  
  // Create domain state manager
  appState.domainStateManager = new DomainStateManager({
    apiBasePath: '/api/v1/api-tester'
  });
  
  // Initialize domain state manager
  appState.domainStateManager.init();
  
  // Create domain state viewer
  appState.domainStateViewer = new DomainStateViewer({
    container: domainStateContainer,
    domainStateManager: appState.domainStateManager
  });
  
  Logger.info('Domain State Viewer initialized');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);
