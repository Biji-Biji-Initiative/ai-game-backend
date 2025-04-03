/**
 * Status Manager Module
 * Handles fetching and displaying system status information
 */

/**
 * Class for managing system status
 */
export class StatusManager {
  /**
   * Creates a new StatusManager instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      healthEndpoint: '/api/v1/health',
      refreshInterval: 30000, // Default: refresh every 30 seconds
      ...options
    };
    
    this.status = {
      overall: 'unknown',
      dependencies: [],
      environment: {},
      lastUpdated: null
    };
    
    this.isLoading = false;
    this.error = null;
    this.listeners = new Map();
    this.refreshIntervalId = null;
    
    // Elements
    this.elements = {
      panel: document.getElementById('status-panel'),
      dot: document.getElementById('status-dot'),
      text: document.getElementById('status-text'),
      detailsBtn: document.getElementById('status-details-btn'),
      modal: document.getElementById('status-modal'),
      modalClose: document.getElementById('status-modal-close'),
      modalStatus: document.getElementById('modal-status'),
      lastUpdated: document.getElementById('status-last-updated'),
      dependencyList: document.getElementById('dependency-list'),
      envMode: document.getElementById('env-mode'),
      envVersion: document.getElementById('env-version'),
      envNode: document.getElementById('env-node'),
      refreshBtn: document.getElementById('refresh-status-btn')
    };
    
    // Initialize
    this.bindEvents();
    
    // Start auto-refresh if enabled
    if (this.options.refreshInterval) {
      this.startAutoRefresh();
    }
  }
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Show modal on panel click
    if (this.elements.panel) {
      this.elements.panel.addEventListener('click', () => this.showModal());
    }
    
    // Close modal on close button click
    if (this.elements.modalClose) {
      this.elements.modalClose.addEventListener('click', () => this.hideModal());
    }
    
    // Close modal on click outside
    if (this.elements.modal) {
      this.elements.modal.addEventListener('click', (e) => {
        if (e.target === this.elements.modal) {
          this.hideModal();
        }
      });
    }
    
    // Refresh status on button click
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener('click', () => this.refreshStatus());
    }
  }
  
  /**
   * Adds an event listener
   * @param {string} event - The event name
   * @param {Function} callback - The callback function
   */
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  /**
   * Removes an event listener
   * @param {string} event - The event name
   * @param {Function} callback - The callback function to remove
   */
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Emits an event to all registered listeners
   * @param {string} event - The event name
   * @param {Object} data - The event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
  
  /**
   * Starts auto-refreshing status at the specified interval
   * @param {number} interval - Refresh interval in ms
   */
  startAutoRefresh(interval) {
    // Clear existing interval if any
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
    
    // Set new interval
    const refreshInterval = interval || this.options.refreshInterval;
    if (refreshInterval) {
      this.refreshIntervalId = setInterval(() => {
        this.fetchStatus().catch(error => {
          console.error('Auto-refresh status error:', error);
        });
      }, refreshInterval);
      
      this.emit('status:autoRefreshStarted', { interval: refreshInterval });
    }
  }
  
  /**
   * Stops auto-refreshing status
   */
  stopAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
      
      this.emit('status:autoRefreshStopped');
    }
  }
  
  /**
   * Fetches the current system status
   */
  async fetchStatus() {
    try {
      this.emit('status:loading');

      // Configure headers with authentication
      const headers = {};
      
      // Add auth token if available
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      // Add API key if available
      const apiKey = localStorage.getItem('apiKey');
      if (apiKey) {
        headers['x-api-key'] = apiKey;
        headers['api-key'] = apiKey;
        headers['X-Api-Key'] = apiKey;
      }

      const response = await fetch(this.options.healthEndpoint, {
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.status = data;

      // Ensure we have a dependencies array to render
      if (!this.status.dependencies) {
        this.status.dependencies = [];
      }

      this.emit('status:updated', data);
      
      // Render the status in our UI
      this.renderStatus();
      
      // Return the data
      return data;
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      this.emit('status:error', { error: errorMessage });
      console.warn('Failed to fetch system status:', error);
      
      // Try to render status with error
      this.renderStatus(errorMessage);
      
      throw error;
    }
  }
  
  /**
   * Process health endpoint data into a standard format
   * @param {Object} data - The health endpoint data
   * @returns {Object} - Standardized status object
   */
  processHealthData(data) {
    // Default structure
    const status = {
      overall: 'unknown',
      dependencies: [],
      environment: {},
      lastUpdated: new Date()
    };
    
    // Handle different health endpoint formats
    
    // If using directly returned data
    if (data.status) {
      status.overall = data.status.toLowerCase();
    }
    
    // If using data.data structure common in our API
    if (data.data) {
      if (data.data.status) {
        status.overall = data.data.status.toLowerCase();
      }
      
      // Process dependencies
      if (data.data.dependencies && Array.isArray(data.data.dependencies)) {
        status.dependencies = data.data.dependencies.map(dep => ({
          name: dep.name || 'Unknown',
          status: (dep.status || 'unknown').toLowerCase(),
          message: dep.message || null,
          details: dep.details || null
        }));
      }
      
      // Process environment info
      if (data.data.environment) {
        status.environment = {
          mode: data.data.environment.mode || data.data.mode || 'development',
          version: data.data.environment.version || data.data.version || 'unknown',
          node: data.data.environment.node || data.data.nodeVersion || process.version || 'unknown'
        };
      } else {
        status.environment = {
          mode: data.data.mode || 'development',
          version: data.data.version || 'unknown',
          node: data.data.nodeVersion || process.version || 'unknown'
        };
      }
    }
    
    return status;
  }
  
  /**
   * Updates the UI with the current status
   */
  updateUI() {
    if (!this.elements.dot || !this.elements.text) return;
    
    // Remove existing status classes
    this.elements.dot.classList.remove('healthy', 'unhealthy');
    
    // Update status dot and text based on overall status
    if (this.status.overall === 'healthy') {
      this.elements.dot.classList.add('healthy');
      this.elements.text.textContent = 'Healthy';
    } else if (this.status.overall === 'unhealthy') {
      this.elements.dot.classList.add('unhealthy');
      this.elements.text.textContent = 'Unhealthy';
    } else {
      this.elements.text.textContent = 'Unknown';
    }
    
    // Update modal content if it exists
    if (this.elements.modalStatus) {
      this.elements.modalStatus.textContent = this.capitalizeFirstLetter(this.status.overall);
    }
    
    // Update last updated time
    if (this.elements.lastUpdated && this.status.lastUpdated) {
      this.elements.lastUpdated.textContent = new Date(this.status.lastUpdated).toLocaleString();
    }
    
    // Update dependency list
    if (this.elements.dependencyList) {
      this.renderDependencies();
    }
    
    // Update environment info
    if (this.status.environment) {
      if (this.elements.envMode) {
        this.elements.envMode.textContent = this.status.environment.mode || 'Unknown';
      }
      if (this.elements.envVersion) {
        this.elements.envVersion.textContent = this.status.environment.version || 'Unknown';
      }
      if (this.elements.envNode) {
        this.elements.envNode.textContent = this.status.environment.node || 'Unknown';
      }
    }
  }
  
  /**
   * Shows the status modal
   */
  showModal() {
    if (this.elements.modal) {
      this.elements.modal.classList.add('visible');
      
      // Refresh status when showing modal
      this.refreshStatus();
    }
  }
  
  /**
   * Hides the status modal
   */
  hideModal() {
    if (this.elements.modal) {
      this.elements.modal.classList.remove('visible');
    }
  }
  
  /**
   * Refreshes the status
   * @returns {Promise<Object>} - The refreshed status
   */
  async refreshStatus() {
    try {
      const status = await this.fetchStatus();
      return status;
    } catch (error) {
      console.error('Failed to refresh status:', error);
      throw error;
    }
  }
  
  /**
   * Gets the current status
   * @returns {Object} - The current status
   */
  getStatus() {
    return { ...this.status };
  }
  
  /**
   * Gets the loading state
   * @returns {boolean} - Whether status is loading
   */
  getIsLoading() {
    return this.isLoading;
  }
  
  /**
   * Gets the last error
   * @returns {Error|null} - The last error
   */
  getError() {
    return this.error;
  }
  
  /**
   * Capitalizes the first letter of a string
   * @param {string} string - The string to capitalize
   * @returns {string} - The capitalized string
   */
  capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  /**
   * Renders the status in the UI
   * @param {string} errorMessage - Optional error message to display
   */
  renderStatus(errorMessage = null) {
    try {
      // Find status container
      const statusContainer = document.querySelector('.system-status');
      if (!statusContainer) return;
      
      // Find status indicator
      const statusIndicator = statusContainer.querySelector('.status-indicator');
      if (!statusIndicator) return;
      
      if (errorMessage) {
        // Show error state
        statusIndicator.className = 'status-indicator status-unhealthy';
        statusIndicator.textContent = 'Unhealthy';
        
        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'status-error';
        errorElement.textContent = errorMessage;
        
        // Replace any existing error message
        const existingError = statusContainer.querySelector('.status-error');
        if (existingError) {
          existingError.replaceWith(errorElement);
        } else {
          statusIndicator.after(errorElement);
        }
        return;
      }
      
      // Get overall status
      const overall = this.status?.overall?.toLowerCase() || 'unknown';
      
      // Update status indicator
      statusIndicator.className = `status-indicator status-${overall}`;
      statusIndicator.textContent = this.capitalizeFirstLetter(overall);
      
      // Remove any error messages
      const existingError = statusContainer.querySelector('.status-error');
      if (existingError) {
        existingError.remove();
      }
      
      // Update dependencies list if it exists
      this.renderDependencies();
      
      // Update environment info if available
      if (this.status?.environment) {
        this.renderEnvironment(this.status.environment);
      }
    } catch (error) {
      console.error('Error rendering status:', error);
    }
  }
  
  /**
   * Renders the dependencies section
   */
  renderDependencies() {
    try {
      const dependenciesContainer = document.querySelector('.dependencies-list');
      if (!dependenciesContainer) return;
      
      // Clear existing dependencies
      dependenciesContainer.innerHTML = '';
      
      // Get dependencies array safely
      const dependencies = this.status?.dependencies || [];
      
      if (dependencies.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-dependencies';
        emptyMessage.textContent = 'No dependencies information available';
        dependenciesContainer.appendChild(emptyMessage);
        return;
      }
      
      // Sort dependencies - critical first, then by status (unhealthy first)
      const sortedDeps = [...dependencies].sort((a, b) => {
        // Critical dependencies first
        if (a.critical !== b.critical) {
          return a.critical ? -1 : 1;
        }
        
        // Then sort by status (unhealthy first)
        const statusPriority = { 'unhealthy': 0, 'degraded': 1, 'healthy': 2, 'unknown': 3 };
        const aStatus = a.status?.toLowerCase() || 'unknown';
        const bStatus = b.status?.toLowerCase() || 'unknown';
        
        return (statusPriority[aStatus] || 3) - (statusPriority[bStatus] || 3);
      });
      
      // Create dependency items
      sortedDeps.forEach(dep => {
        const item = document.createElement('div');
        item.className = 'dependency-item';
        
        const status = (dep.status || 'unknown').toLowerCase();
        
        item.innerHTML = `
          <div class="dependency-header">
            <span class="dependency-name">${dep.name || 'Unknown'}</span>
            <span class="dependency-status status-${status}">${this.capitalizeFirstLetter(status)}</span>
            ${dep.critical ? '<span class="dependency-critical">Critical</span>' : ''}
          </div>
          ${dep.message ? `<div class="dependency-message">${dep.message}</div>` : ''}
          ${dep.latency ? `<div class="dependency-latency">Latency: ${dep.latency}ms</div>` : ''}
        `;
        
        dependenciesContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Error rendering dependencies:', error);
    }
  }
  
  /**
   * Renders the environment information
   * @param {Object} env - Environment information object
   */
  renderEnvironment(env) {
    try {
      const envContainer = document.querySelector('.environment-info');
      if (!envContainer) return;
      
      const mode = env.mode || 'unknown';
      const version = env.version || 'unknown';
      const node = env.node || 'unknown';
      
      envContainer.innerHTML = `
        <div class="env-item">
          <span class="env-label">Mode:</span>
          <span class="env-value env-mode">${mode}</span>
        </div>
        <div class="env-item">
          <span class="env-label">Version:</span>
          <span class="env-value">${version}</span>
        </div>
        <div class="env-item">
          <span class="env-label">Node:</span>
          <span class="env-value">${node}</span>
        </div>
      `;
      
      // Also update the environment indicator in the header if it exists
      if (typeof updateEnvironmentIndicator === 'function') {
        updateEnvironmentIndicator(mode);
      }
    } catch (error) {
      console.error('Error rendering environment info:', error);
    }
  }
} 