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
   * Fetches status from the health endpoint
   * @returns {Promise<Object>} - The status data
   */
  async fetchStatus() {
    this.isLoading = true;
    this.error = null;
    
    this.emit('status:loading', {
      endpoint: this.options.healthEndpoint
    });
    
    try {
      const response = await fetch(this.options.healthEndpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch health status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the health data
      this.status = this.processHealthData(data);
      
      // Update UI
      this.updateUI();
      
      this.isLoading = false;
      
      this.emit('status:loaded', {
        status: this.status
      });
      
      return this.status;
    } catch (error) {
      this.isLoading = false;
      this.error = error;
      
      // Set status to unhealthy on error
      this.status.overall = 'unhealthy';
      
      // Update UI to show error
      this.updateUI();
      
      this.emit('status:error', {
        error: error.message
      });
      
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
    // Update status indicator
    if (this.elements.dot) {
      this.elements.dot.className = 'status-dot';
      if (this.status.overall === 'healthy' || this.status.overall === 'ok') {
        this.elements.dot.classList.add('healthy');
      } else if (this.status.overall === 'degraded' || this.status.overall === 'warning') {
        this.elements.dot.classList.add('degraded');
      } else if (this.status.overall === 'unhealthy' || this.status.overall === 'error') {
        this.elements.dot.classList.add('unhealthy');
      }
    }
    
    // Update status text
    if (this.elements.text) {
      let statusText = 'Unknown';
      
      if (this.status.overall === 'healthy' || this.status.overall === 'ok') {
        statusText = 'Healthy';
      } else if (this.status.overall === 'degraded' || this.status.overall === 'warning') {
        statusText = 'Degraded';
      } else if (this.status.overall === 'unhealthy' || this.status.overall === 'error') {
        statusText = 'Unhealthy';
      }
      
      this.elements.text.textContent = statusText;
    }
    
    // Update modal status
    if (this.elements.modalStatus) {
      this.elements.modalStatus.className = '';
      let statusText = 'Unknown';
      
      if (this.status.overall === 'healthy' || this.status.overall === 'ok') {
        this.elements.modalStatus.classList.add('healthy');
        statusText = 'Healthy';
      } else if (this.status.overall === 'degraded' || this.status.overall === 'warning') {
        this.elements.modalStatus.classList.add('degraded');
        statusText = 'Degraded';
      } else if (this.status.overall === 'unhealthy' || this.status.overall === 'error') {
        this.elements.modalStatus.classList.add('unhealthy');
        statusText = 'Unhealthy';
      }
      
      this.elements.modalStatus.textContent = statusText;
    }
    
    // Update last updated time
    if (this.elements.lastUpdated && this.status.lastUpdated) {
      const formattedTime = this.status.lastUpdated.toLocaleTimeString();
      this.elements.lastUpdated.textContent = formattedTime;
    }
    
    // Update dependency list
    if (this.elements.dependencyList) {
      if (this.status.dependencies.length === 0) {
        this.elements.dependencyList.innerHTML = `
          <div class="empty-dependency-message">No dependencies reported by the system.</div>
        `;
      } else {
        this.elements.dependencyList.innerHTML = '';
        
        this.status.dependencies.forEach(dep => {
          const depItem = document.createElement('div');
          depItem.className = 'dependency-item';
          
          let statusClass = '';
          if (dep.status === 'healthy' || dep.status === 'ok') {
            statusClass = 'healthy';
          } else if (dep.status === 'degraded' || dep.status === 'warning') {
            statusClass = 'degraded';
          } else if (dep.status === 'unhealthy' || dep.status === 'error') {
            statusClass = 'unhealthy';
          }
          
          depItem.innerHTML = `
            <div class="dependency-name">
              ${dep.name}
            </div>
            <div class="dependency-status">
              <span class="dependency-status-dot ${statusClass}"></span>
              ${dep.status.charAt(0).toUpperCase() + dep.status.slice(1)}
              ${dep.message ? `<span class="dependency-message">(${dep.message})</span>` : ''}
            </div>
          `;
          
          this.elements.dependencyList.appendChild(depItem);
        });
      }
    }
    
    // Update environment info
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
} 