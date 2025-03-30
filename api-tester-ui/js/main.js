// Import the bundled endpoints
import { bundledEndpoints } from './data/bundled-endpoints.js';

// Main app state
const appState = {
  flows: [],
  currentFlow: null,
  steps: [],
  currentStep: null,
  authToken: localStorage.getItem('authToken') || null,
  stepResults: {},
  logs: []
};

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
  // Log panel elements
  logsPanel: document.getElementById('logs-panel'),
  logsContent: document.getElementById('logs-content'),
  logsList: document.getElementById('logs-list'),
  showLogsBtn: document.getElementById('show-logs-btn'),
  closeLogsBtn: document.getElementById('close-logs-btn'),
  clearLogsBtn: document.getElementById('clear-logs-btn'),
  copyLogsBtn: document.getElementById('copy-logs-btn'),
  logsSearch: document.getElementById('logs-search'),
  filterDebug: document.getElementById('filter-debug'),
  filterInfo: document.getElementById('filter-info'),
  filterWarning: document.getElementById('filter-warning'),
  filterError: document.getElementById('filter-error')
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
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    // Add to our in-memory logs
    appState.logs.push(logEntry);
    
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
      this.renderLogs();
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
          timestamp: new Date().toISOString()
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
  
  // Get filtered logs based on current filter settings
  getFilteredLogs() {
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
  
  // Render logs to the logs panel
  renderLogs() {
    const logs = this.getFilteredLogs();
    
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
        </div>
        <div class="log-message">${log.message}</div>
        ${log.data ? `<div class="log-data">${JSON.stringify(log.data, null, 2)}</div>` : ''}
      `;
      
      elements.logsList.appendChild(logElement);
    });
  },
  
  // Clear all logs
  clearLogs() {
    appState.logs = [];
    this.renderLogs();
  },
  
  // Copy logs to clipboard
  copyLogsToClipboard() {
    const logs = this.getFilteredLogs();
    const logText = logs.map(log => {
      return `[${log.timestamp}] [${log.level}] ${log.message}\n${log.data ? JSON.stringify(log.data, null, 2) : ''}`;
    }).join('\n\n');
    
    navigator.clipboard.writeText(logText)
      .then(() => {
        // Show a brief notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-success';
        notification.textContent = 'Logs copied to clipboard';
        document.body.appendChild(notification);
        
        // Remove after 2 seconds
        setTimeout(() => {
          notification.remove();
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy logs:', err);
      });
  }
};

// Initialize the app
function init() {
  // Process endpoints into flows
  processEndpoints();
  
  // Render flows
  renderFlows();
  
  // Set up event listeners
  setupEventListeners();
  
  // Check for dark mode preference
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    elements.themeToggle.querySelector('.theme-icon').textContent = '☀️';
  }
  
  Logger.info('App initialized successfully');
}

// Process endpoints into flows
function processEndpoints() {
  // Group endpoints by category (flow)
  const flowsMap = {};
  
  bundledEndpoints.endpoints.forEach(endpoint => {
    const category = endpoint.category || 'Uncategorized';
    
    if (!flowsMap[category]) {
      flowsMap[category] = [];
    }
    
    flowsMap[category].push(endpoint);
  });
  
  // Convert to array and sort
  appState.flows = Object.keys(flowsMap)
    .map(category => ({
      id: category.toLowerCase().replace(/\s+/g, '-'),
      name: category,
      endpoints: flowsMap[category]
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  Logger.debug('Processed endpoints into flows', { flowCount: appState.flows.length });
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
      `;
      
      requestBodyDiv.appendChild(formGroup);
      elements.formInputs.appendChild(requestBodyDiv);
    }
  }
  
  // If no inputs are required, show a message
  if (elements.formInputs.children.length === 0) {
    elements.formInputs.innerHTML = `
      <div class="empty-form-message">
        <p>No input required for this step. Just click "Run This Step" to proceed.</p>
      </div>
    `;
  }
  
  Logger.debug('Generated form inputs for step', { stepName: step.name });
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

// Run the current step with retry logic
async function runStep() {
  const step = appState.currentStep;
  if (!step) return;
  
  // Show loading
  elements.loadingIndicator.style.display = 'flex';
  elements.runStepBtn.disabled = true;
  
  Logger.info(`Running step: ${step.name}`, { path: step.path, method: step.method });
  
  // Get request body if present
  let requestBody = null;
  if (['POST', 'PUT', 'PATCH'].includes(step.method)) {
    const requestBodyElem = document.getElementById('request-body');
    if (requestBodyElem) {
      try {
        // Validate JSON
        requestBody = requestBodyElem.value;
        JSON.parse(requestBody); // Just for validation
      } catch (e) {
        const errorMsg = 'Invalid JSON in request body';
        Logger.error(errorMsg, { error: e.message, body: requestBodyElem.value });
        showResult('error', { error: errorMsg });
        elements.loadingIndicator.style.display = 'none';
        elements.runStepBtn.disabled = false;
        return;
      }
    }
  }
  
  // Prepare URL with path parameters
  let url = step.path;
  if (step.parameters && step.parameters.length > 0) {
    step.parameters.forEach(param => {
      const value = document.getElementById(`param-${param.name}`).value;
      if (value) {
        url = url.replace(`{${param.name}}`, value);
      }
    });
  }
  
  // Retry logic configuration
  const maxRetries = 2;
  const retryDelay = 1000; // 1 second
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Prepare request options
      const options = {
        method: step.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // Add auth token if available
      if (appState.authToken) {
        options.headers['Authorization'] = `Bearer ${appState.authToken}`;
      }
      
      // Add request body if needed
      if (requestBody) {
        options.body = requestBody;
      }
      
      // Log the request attempt
      Logger.info(`API request attempt ${attempt + 1}/${maxRetries + 1}`, { 
        url, 
        method: options.method,
        headers: { ...options.headers, Authorization: options.headers.Authorization ? 'Bearer [REDACTED]' : undefined },
        bodyLength: options.body ? options.body.length : 0
      });
      
      // Set timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      options.signal = controller.signal;
      
      // Send request
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      // Handle different response status codes
      if (response.status === 504) {
        throw new Error('Gateway Timeout - Server took too long to respond');
      }
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        data = { rawResponse: text };
        Logger.warn('Received non-JSON response', { contentType, text });
      }
      
      // Log the response
      Logger.info(`API response received (${response.status})`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers]),
        data: data
      });
      
      // Check for auth token in response
      if (data.data && data.data.token) {
        appState.authToken = data.data.token;
        localStorage.setItem('authToken', data.data.token);
        Logger.info('Auth token received and stored');
      }
      
      // Store result
      appState.stepResults[step.path] = {
        status: response.ok ? 'success' : 'error',
        data: data
      };
      
      // Update UI
      showResult(response.ok ? 'success' : 'error', data);
      
      // Update step UI
      renderSteps();
      
      // If we got here, we succeeded - break out of the retry loop
      break;
      
    } catch (error) {
      // Log the error with detailed information
      Logger.error(`API request failed on attempt ${attempt + 1}/${maxRetries + 1}`, {
        url,
        method: step.method,
        error: error.toString(),
        stack: error.stack,
        name: error.name,
        message: error.message
      });
      
      if (attempt < maxRetries) {
        // Wait before retrying
        Logger.info(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // Show error after all retries failed
        let errorMessage = error.message;
        
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. The server took too long to respond.';
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Unable to connect to the server. Please check your connection.';
        }
        
        showResult('error', { 
          error: errorMessage,
          details: 'All retry attempts failed. Please try again later or contact support.'
        });
      }
    }
  }
  
  // Hide loading and re-enable button
  elements.loadingIndicator.style.display = 'none';
  elements.runStepBtn.disabled = false;
}

// Show result
function showResult(status, data) {
  elements.resultPanel.classList.remove('hidden');
  
  elements.resultStatus.className = `result-status status-${status}`;
  elements.resultStatus.textContent = status === 'success' ? '✅ Success' : '❌ Error';
  
  // Check if this is an OpenAI test result
  if (status === 'success' && data.data && data.data.metadata && data.data.metadata.model) {
    showOpenAIResult(data);
    return;
  }
  
  // Check if this is an authentication response with a token
  if (status === 'success' && data.data && data.data.token) {
    showAuthResult(data);
    return;
  }
  
  elements.resultContent.textContent = JSON.stringify(data, null, 2);
  
  // Log the result
  Logger.info(`Step result: ${status}`, { data });
  
  // If this is an error, show additional help based on error type
  if (status === 'error' && data.error) {
    appendErrorHelp(data.error);
  }
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
    Logger.renderLogs();
  }
}

// Set up event listeners
function setupEventListeners() {
  // Main UI buttons
  elements.runStepBtn.addEventListener('click', runStep);
  elements.clearFormBtn.addEventListener('click', clearForm);
  
  // Theme toggle
  elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    elements.themeToggle.querySelector('.theme-icon').textContent = isDarkMode ? '☀️' : '🌙';
    Logger.debug(`Theme changed to ${isDarkMode ? 'dark' : 'light'} mode`);
  });
  
  // Logs panel controls
  elements.showLogsBtn.addEventListener('click', toggleLogsPanel);
  elements.closeLogsBtn.addEventListener('click', toggleLogsPanel);
  elements.clearLogsBtn.addEventListener('click', () => Logger.clearLogs());
  elements.copyLogsBtn.addEventListener('click', () => Logger.copyLogsToClipboard());
  
  // Log filters
  elements.filterDebug.addEventListener('change', () => Logger.renderLogs());
  elements.filterInfo.addEventListener('change', () => Logger.renderLogs());
  elements.filterWarning.addEventListener('change', () => Logger.renderLogs());
  elements.filterError.addEventListener('change', () => Logger.renderLogs());
  
  // Log search
  elements.logsSearch.addEventListener('input', () => {
    // Debounce search to avoid lag
    clearTimeout(elements.logsSearch._timer);
    elements.logsSearch._timer = setTimeout(() => {
      Logger.renderLogs();
    }, 300);
  });
  
  // Add global error handler for uncaught exceptions
  window.addEventListener('error', (event) => {
    Logger.error('Uncaught error', {
      message: event.message,
      source: event.filename,
      lineNo: event.lineno,
      colNo: event.colno,
      error: event.error?.stack || 'Unknown error'
    });
    return false;
  });
  
  // Add global promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled promise rejection', {
      reason: event.reason?.message || 'Unknown reason',
      stack: event.reason?.stack || 'No stack trace'
    });
    return false;
  });
  
  // Add keyboard shortcut for logs panel (Alt+L)
  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.key === 'l') {
      toggleLogsPanel();
    }
  });
}

// Check application environment and update indicator
async function checkEnvironment() {
  const envIndicator = document.getElementById('env-indicator');
  
  try {
    const response = await fetch('/api/v1/health');
    
    if (response.ok) {
      const data = await response.json();
      const mode = data.mode || data.data?.mode || 'unknown';
      
      // Update the indicator
      envIndicator.textContent = mode.toUpperCase();
      envIndicator.classList.add(mode.toLowerCase());
      
      // Add special production badge if in production mode
      if (mode.toLowerCase() === 'production') {
        envIndicator.innerHTML = `<span class="env-badge">PROD</span>`;
        envIndicator.classList.add('production');
        document.querySelector('.logo h1').textContent = 'API Tester (Production)';
        Logger.info(`Application running in ${mode} mode`);
      } else {
        // Log the environment
        Logger.info(`Application running in ${mode} mode`);
        
        // Add special warning if in development mode
        if (mode.toLowerCase() === 'development') {
          Logger.warn('Running in DEVELOPMENT mode - some features may use mocks instead of real services');
        }
      }
    } else {
      envIndicator.textContent = 'UNKNOWN';
      Logger.error('Failed to detect environment');
    }
  } catch (error) {
    envIndicator.textContent = 'ERROR';
    Logger.error('Error detecting environment', error);
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);
