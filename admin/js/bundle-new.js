(() => {
  // js/modules/endpoint-manager.ts
  var EndpointManager = class {
    /**
     * Creates a new EndpointManager instance
     * @param options - Configuration options
     */
    constructor(options = {}) {
      this.options = {
        apiClient: null,
        config: null,
        maxRetries: 3,
        retryDelay: 2e3,
        // milliseconds
        useLocalEndpoints: true,
        // Whether to fallback to bundled endpoints if fetch fails
        supportMultipleFormats: true,
        // Whether to support multiple endpoint formats
        endpointsFilePath: "data/endpoints.json",
        // Standardized path for endpoints
        dynamicEndpointsPath: "/api/v1/api-tester/endpoints",
        // Dynamic endpoints from backend
        useDynamicEndpoints: true,
        // Whether to use dynamic endpoints from backend
        ...options
      };
      this.apiClient = this.options.apiClient;
      this.config = this.options.config;
      this.endpoints = [];
      this.categories = /* @__PURE__ */ new Map();
      this.listeners = /* @__PURE__ */ new Map();
      this.loaded = false;
      this.retryCount = 0;
      this.bundledEndpoints = null;
    }
    /**
     * Adds an event listener
     * @param event - The event name
     * @param callback - The callback function
     */
    addEventListener(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.push(callback);
      }
    }
    /**
     * Removes an event listener
     * @param event - The event name
     * @param callback - The callback function to remove
     */
    removeEventListener(event, callback) {
      if (this.listeners.has(event)) {
        const listeners = this.listeners.get(event);
        if (listeners) {
          const index = listeners.indexOf(callback);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        }
      }
    }
    /**
     * Emits an event to all registered listeners
     * @param event - The event name
     * @param data - The event data
     */
    emit(event, data = null) {
      if (this.listeners.has(event)) {
        const listeners = this.listeners.get(event);
        if (listeners) {
          listeners.forEach((callback) => callback(data));
        }
      }
    }
    /**
     * Sets bundled endpoints to use as fallback
     * @param endpoints - The bundled endpoints
     */
    setBundledEndpoints(endpoints) {
      this.bundledEndpoints = endpoints;
    }
    /**
     * Loads endpoints from the standardized JSON file or dynamic backend endpoint
     * @returns The loaded endpoints
     */
    async loadEndpoints() {
      if (this.options.useDynamicEndpoints) {
        try {
          return await this.loadDynamicEndpoints();
        } catch (error) {
          console.warn("Failed to load dynamic endpoints:", error);
          console.log("Falling back to static endpoints");
          return await this.loadStaticEndpoints();
        }
      } else {
        return await this.loadStaticEndpoints();
      }
    }
    /**
     * Loads endpoints from the backend API
     * @returns The loaded endpoints
     */
    async loadDynamicEndpoints() {
      const dynamicEndpointsPath = this.options.dynamicEndpointsPath;
      try {
        this.emit("endpoints:loading", { path: dynamicEndpointsPath, type: "dynamic" });
        if (!dynamicEndpointsPath) {
          throw new Error("Dynamic endpoints path is not defined");
        }
        const response = await fetch(dynamicEndpointsPath);
        if (!response.ok) {
          throw new Error(`Failed to load dynamic endpoints: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        this.processEndpoints(data);
        this.loaded = true;
        this.retryCount = 0;
        this.emit("endpoints:loaded", {
          endpoints: this.endpoints,
          categories: Array.from(this.categories.entries()),
          source: "dynamic"
        });
        return this.endpoints;
      } catch (error) {
        console.error("Error loading dynamic endpoints:", error);
        this.emit("endpoints:error", {
          error,
          message: error instanceof Error ? error.message : String(error),
          source: "dynamic"
        });
        throw error;
      }
    }
    /**
     * Loads endpoints from the static JSON file
     * @returns The loaded endpoints
     */
    async loadStaticEndpoints() {
      const endpointsFilePath = this.options.endpointsFilePath;
      try {
        this.emit("endpoints:loading", { path: endpointsFilePath, type: "static" });
        if (!endpointsFilePath) {
          throw new Error("Endpoints file path is not defined");
        }
        const response = await fetch(endpointsFilePath);
        if (!response.ok) {
          throw new Error(`Failed to load static endpoints: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        this.processEndpoints(data);
        this.loaded = true;
        this.retryCount = 0;
        this.emit("endpoints:loaded", {
          endpoints: this.endpoints,
          categories: Array.from(this.categories.entries()),
          source: "static"
        });
        return this.endpoints;
      } catch (error) {
        console.error("Error loading static endpoints:", error);
        if (this.retryCount < (this.options.maxRetries || 0)) {
          this.retryCount++;
          this.emit("endpoints:retry", {
            error,
            retryCount: this.retryCount,
            maxRetries: this.options.maxRetries
          });
          await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay || 2e3));
          return this.loadStaticEndpoints();
        }
        if (this.options.useLocalEndpoints && this.bundledEndpoints) {
          console.log("Using bundled endpoints as fallback");
          this.processEndpoints(this.bundledEndpoints);
          this.loaded = true;
          this.emit("endpoints:loaded", {
            endpoints: this.endpoints,
            categories: Array.from(this.categories.entries()),
            source: "fallback"
          });
          return this.endpoints;
        }
        this.emit("endpoints:error", {
          error,
          message: error instanceof Error ? error.message : String(error),
          source: "static"
        });
        throw error;
      }
    }
    /**
     * Processes the loaded endpoints data
     * @param data - The loaded endpoints data
     */
    processEndpoints(data) {
      this.endpoints = [];
      this.categories.clear();
      if (this.options.supportMultipleFormats) {
        if (Array.isArray(data)) {
          this.processEndpointsArray(data);
        } else if (data && Array.isArray(data.endpoints)) {
          this.processEndpointsArray(data.endpoints);
        } else if (data && typeof data === "object" && !Array.isArray(data)) {
          this.processEndpointsObject(data);
        } else {
          throw new Error("Invalid endpoints data format - could not detect format");
        }
      } else {
        if (!data || !Array.isArray(data.endpoints)) {
          throw new Error("Invalid endpoints data format - expected {endpoints: [...]}");
        }
        this.processEndpointsArray(data.endpoints);
      }
    }
    /**
     * Processes an array of endpoints
     * @param endpoints - The array of endpoints
     */
    processEndpointsArray(endpoints) {
      if (!Array.isArray(endpoints)) {
        throw new Error("Expected endpoints to be an array");
      }
      endpoints.forEach((endpoint, index) => {
        if (!endpoint || typeof endpoint !== "object") {
          console.warn("Skipping invalid endpoint at index", index, endpoint);
          return;
        }
        const path = endpoint.path || endpoint.url || endpoint.endpoint;
        const name = endpoint.name || endpoint.title || endpoint.label || path;
        if (!path) {
          console.warn("Skipping endpoint without path:", endpoint);
          return;
        }
        const processedEndpoint = {
          id: endpoint.id || `endpoint-${this.endpoints.length + 1}`,
          method: endpoint.method || "GET",
          path,
          name,
          description: endpoint.description || "",
          category: endpoint.category || endpoint.group || "Uncategorized",
          parameters: endpoint.parameters || endpoint.params || [],
          headers: endpoint.headers || {},
          requestBody: endpoint.requestBody || endpoint.body || null,
          responseExample: endpoint.responseExample || endpoint.example || null,
          requiresAuth: endpoint.requiresAuth || endpoint.authenticated || false,
          tags: endpoint.tags || []
        };
        this.endpoints.push(processedEndpoint);
        if (!this.categories.has(processedEndpoint.category)) {
          this.categories.set(processedEndpoint.category, []);
        }
        const categoryEndpoints = this.categories.get(processedEndpoint.category);
        if (categoryEndpoints) {
          categoryEndpoints.push(processedEndpoint);
        }
      });
    }
    /**
     * Processes an object with categories
     * @param data - The endpoints object
     */
    processEndpointsObject(data) {
      const dataWithoutEndpoints = { ...data };
      delete dataWithoutEndpoints.endpoints;
      Object.entries(dataWithoutEndpoints).forEach(([category, endpoints]) => {
        if (!Array.isArray(endpoints)) {
          console.warn(`Skipping invalid category ${category}: expected array but got`, typeof endpoints);
          return;
        }
        if (!this.categories.has(category)) {
          this.categories.set(category, []);
        }
        endpoints.forEach((endpoint, index) => {
          if (!endpoint || typeof endpoint !== "object") {
            console.warn(`Skipping invalid endpoint in category ${category} at index`, index, endpoint);
            return;
          }
          endpoint.category = category;
          const path = endpoint.path || endpoint.url || endpoint.endpoint;
          const name = endpoint.name || endpoint.title || endpoint.label || path;
          if (!path) {
            console.warn(`Skipping endpoint without path in category ${category}:`, endpoint);
            return;
          }
          const processedEndpoint = {
            id: endpoint.id || `endpoint-${this.endpoints.length + 1}`,
            method: endpoint.method || "GET",
            path,
            name,
            description: endpoint.description || "",
            category,
            parameters: endpoint.parameters || endpoint.params || [],
            headers: endpoint.headers || {},
            requestBody: endpoint.requestBody || endpoint.body || null,
            responseExample: endpoint.responseExample || endpoint.example || null,
            requiresAuth: endpoint.requiresAuth || endpoint.authenticated || false,
            tags: endpoint.tags || []
          };
          this.endpoints.push(processedEndpoint);
          const categoryEndpoints = this.categories.get(category);
          if (categoryEndpoints) {
            categoryEndpoints.push(processedEndpoint);
          }
        });
      });
    }
    /**
     * Refreshes endpoints by loading them again
     * @returns The loaded endpoints
     */
    async refreshEndpoints() {
      this.retryCount = 0;
      this.emit("endpoints:refreshing", null);
      try {
        const endpoints = await this.loadEndpoints();
        this.emit("endpoints:refreshed", {
          endpoints: this.endpoints,
          categories: Array.from(this.categories.entries())
        });
        return endpoints;
      } catch (error) {
        this.emit("endpoints:refresh-error", {
          error,
          message: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
    /**
     * Gets all loaded endpoints
     * @returns The loaded endpoints
     */
    getEndpoints() {
      return [...this.endpoints];
    }
    /**
     * Gets endpoints by category
     * @param category - The category name
     * @returns The endpoints in the category
     */
    getEndpointsByCategory(category) {
      const endpoints = this.categories.get(category);
      return endpoints ? [...endpoints] : [];
    }
    /**
     * Gets all categories
     * @returns The categories
     */
    getCategories() {
      return Array.from(this.categories.keys());
    }
    /**
     * Gets an endpoint by ID
     * @param id - The endpoint ID
     * @returns The endpoint or null if not found
     */
    getEndpointById(id) {
      return this.endpoints.find((endpoint) => endpoint.id === id) || null;
    }
    /**
     * Gets an endpoint by path and method
     * @param path - The endpoint path
     * @param method - The endpoint method
     * @returns The endpoint or null if not found
     */
    getEndpointByPathAndMethod(path, method) {
      return this.endpoints.find(
        (endpoint) => endpoint.path === path && endpoint.method === method
      ) || null;
    }
    /**
     * Searches for endpoints matching a query
     * @param query - The search query
     * @param options - Search options
     * @returns The matching endpoints
     */
    searchEndpoints(query, options = {}) {
      const searchOptions = {
        fields: ["name", "path", "description", "category", "tags"],
        caseSensitive: false,
        exactMatch: false,
        ...options
      };
      if (!query) {
        return this.getEndpoints();
      }
      const normalizedQuery = searchOptions.caseSensitive ? query : query.toLowerCase();
      return this.endpoints.filter((endpoint) => {
        for (const field of searchOptions.fields) {
          const value = this.getFieldValue(endpoint, field);
          if (value === void 0 || value === null) {
            continue;
          }
          if (Array.isArray(value)) {
            for (const item of value) {
              const normalizedItem = searchOptions.caseSensitive ? String(item) : String(item).toLowerCase();
              if (searchOptions.exactMatch ? normalizedItem === normalizedQuery : normalizedItem.includes(normalizedQuery)) {
                return true;
              }
            }
          } else {
            const normalizedValue = searchOptions.caseSensitive ? String(value) : String(value).toLowerCase();
            if (searchOptions.exactMatch ? normalizedValue === normalizedQuery : normalizedValue.includes(normalizedQuery)) {
              return true;
            }
          }
        }
        return false;
      });
    }
    /**
     * Helper method to safely get field value from an endpoint
     */
    getFieldValue(endpoint, field) {
      return endpoint[field];
    }
    /**
     * Adds a custom endpoint
     * @param endpoint - The endpoint to add
     * @returns The added endpoint
     */
    addCustomEndpoint(endpoint) {
      if (!endpoint || !endpoint.path) {
        throw new Error("Invalid endpoint: missing path");
      }
      const customEndpoint = {
        id: endpoint.id || `custom-endpoint-${Date.now()}`,
        method: endpoint.method || "GET",
        path: endpoint.path,
        name: endpoint.name || endpoint.path,
        description: endpoint.description || "",
        category: endpoint.category || "Custom Endpoints",
        parameters: endpoint.parameters || [],
        headers: endpoint.headers || {},
        requestBody: endpoint.requestBody || null,
        responseExample: endpoint.responseExample || null,
        requiresAuth: endpoint.requiresAuth || false,
        tags: endpoint.tags || ["custom"],
        isCustom: true
      };
      this.endpoints.push(customEndpoint);
      if (!this.categories.has(customEndpoint.category)) {
        this.categories.set(customEndpoint.category, []);
      }
      const categoryEndpoints = this.categories.get(customEndpoint.category);
      if (categoryEndpoints) {
        categoryEndpoints.push(customEndpoint);
      }
      this.emit("endpoints:custom-added", customEndpoint);
      return customEndpoint;
    }
    /**
     * Removes a custom endpoint
     * @param id - The endpoint ID
     * @returns Whether the endpoint was removed
     */
    removeCustomEndpoint(id) {
      const endpoint = this.getEndpointById(id);
      if (!endpoint || !endpoint.isCustom) {
        return false;
      }
      this.endpoints = this.endpoints.filter((e) => e.id !== id);
      if (this.categories.has(endpoint.category)) {
        const categoryEndpoints = this.categories.get(endpoint.category);
        if (categoryEndpoints) {
          this.categories.set(
            endpoint.category,
            categoryEndpoints.filter((e) => e.id !== id)
          );
          if (this.categories.get(endpoint.category)?.length === 0) {
            this.categories.delete(endpoint.category);
          }
        }
      }
      this.emit("endpoints:custom-removed", endpoint);
      return true;
    }
    /**
     * Checks whether endpoints are loaded
     * @returns Whether endpoints are loaded
     */
    isLoaded() {
      return this.loaded;
    }
    /**
     * Gets the number of loaded endpoints
     * @returns The number of endpoints
     */
    getEndpointCount() {
      return this.endpoints.length;
    }
    /**
     * Sets the dynamic endpoints path
     * @param path - The new path for dynamic endpoints
     */
    setDynamicEndpointsPath(path) {
      if (!path) {
        throw new Error("Dynamic endpoints path cannot be empty");
      }
      this.options.dynamicEndpointsPath = path;
      this.emit("endpoints:config-changed", {
        property: "dynamicEndpointsPath",
        value: path
      });
    }
    /**
     * Gets the current dynamic endpoints path
     * @returns The current dynamic endpoints path
     */
    getDynamicEndpointsPath() {
      return this.options.dynamicEndpointsPath || "";
    }
  };

  // js/modules/backend-logs-manager.ts
  var BackendLogsManager = class {
    /**
     * Creates a new BackendLogsManager instance
     * @param options - Configuration options
     */
    constructor(options = {}) {
      this.options = {
        apiClient: null,
        logsEndpoint: "/api/v1/api-tester/logs",
        maxLogsToFetch: 500,
        refreshInterval: null,
        // If set, auto-refresh logs at this interval (ms)
        autoRefresh: false,
        ...options
      };
      this.apiClient = this.options.apiClient;
      this.logs = [];
      this.isLoadingLogs = false;
      this.lastError = null;
      this.listeners = /* @__PURE__ */ new Map();
      this.refreshIntervalId = null;
      if (this.options.autoRefresh && this.options.refreshInterval) {
        this.startAutoRefresh();
      }
    }
    /**
     * Adds an event listener
     * @param event - The event name
     * @param callback - The callback function
     */
    addEventListener(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.push(callback);
      }
    }
    /**
     * Removes an event listener
     * @param event - The event name
     * @param callback - The callback function to remove
     */
    removeEventListener(event, callback) {
      if (this.listeners.has(event)) {
        const listeners = this.listeners.get(event);
        if (listeners) {
          const index = listeners.indexOf(callback);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        }
      }
    }
    /**
     * Emits an event to all registered listeners
     * @param event - The event name
     * @param data - The event data
     */
    emit(event, data = null) {
      if (this.listeners.has(event)) {
        const listeners = this.listeners.get(event);
        if (listeners) {
          listeners.forEach((callback) => callback(data));
        }
      }
    }
    /**
     * Fetches logs from the backend
     * @param options - Fetch options
     * @returns The fetched logs
     */
    async fetchLogs(options = {}) {
      const fetchOptions = {
        correlationId: options.correlationId || null,
        level: options.level || null,
        limit: options.limit || this.options.maxLogsToFetch,
        search: options.search || null,
        ...options
      };
      this.isLoadingLogs = true;
      this.emit("logs:loading", { options: fetchOptions });
      try {
        const url = new URL(this.options.logsEndpoint, window.location.origin);
        if (fetchOptions.correlationId) url.searchParams.append("correlationId", fetchOptions.correlationId);
        if (fetchOptions.level) url.searchParams.append("level", fetchOptions.level);
        if (fetchOptions.limit) url.searchParams.append("limit", String(fetchOptions.limit));
        if (fetchOptions.search) url.searchParams.append("search", fetchOptions.search);
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.status || data.status !== "success" || !data.data || !Array.isArray(data.data.logs)) {
          throw new Error("Invalid response format");
        }
        this.logs = data.data.logs;
        this.lastError = null;
        this.emit("logs:loaded", {
          logs: this.logs,
          count: this.logs.length,
          source: options.source || "manual",
          logFile: data.data.logFile
        });
        return this.logs;
      } catch (error) {
        this.lastError = error instanceof Error ? error : new Error(String(error));
        this.emit("logs:error", {
          error: this.lastError,
          message: this.lastError.message
        });
        throw this.lastError;
      } finally {
        this.isLoadingLogs = false;
      }
    }
    /**
     * Refreshes logs by fetching them again
     * @param options - Refresh options
     * @returns The refreshed logs
     */
    async refreshLogs(options = {}) {
      this.emit("logs:refreshing", options);
      try {
        return await this.fetchLogs({
          ...options,
          source: "refresh"
        });
      } catch (error) {
        throw error;
      }
    }
    /**
     * Starts auto-refreshing logs at the specified interval
     * @param interval - Refresh interval in ms
     */
    startAutoRefresh(interval) {
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
      }
      const refreshInterval = interval || this.options.refreshInterval;
      if (refreshInterval) {
        this.refreshIntervalId = window.setInterval(() => {
          this.refreshLogs({ source: "auto" }).catch((error) => {
            console.error("Auto-refresh logs error:", error);
          });
        }, refreshInterval);
        this.emit("logs:autoRefreshStarted", { interval: refreshInterval });
      }
    }
    /**
     * Stops auto-refreshing logs
     */
    stopAutoRefresh() {
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
        this.emit("logs:autoRefreshStopped");
      }
    }
    /**
     * Filters logs based on criteria
     * @param filters - Filter criteria
     * @returns Filtered logs
     */
    filterLogs(filters = {}) {
      return this.logs.filter((log) => {
        if (filters.level) {
          if (Array.isArray(filters.level)) {
            if (!filters.level.includes(log.level)) {
              return false;
            }
          } else if (log.level !== filters.level) {
            return false;
          }
        }
        if (filters.correlationId && log.correlationId !== filters.correlationId) {
          return false;
        }
        if (filters.search) {
          const searchText = filters.search.toLowerCase();
          const messageMatch = log.message && log.message.toLowerCase().includes(searchText);
          const contextMatch = log.context && JSON.stringify(log.context).toLowerCase().includes(searchText);
          if (!messageMatch && !contextMatch) {
            return false;
          }
        }
        if (filters.startTime) {
          const startTime = typeof filters.startTime === "string" ? new Date(filters.startTime) : filters.startTime;
          const logTime = new Date(log.timestamp);
          if (logTime < startTime) {
            return false;
          }
        }
        if (filters.endTime) {
          const endTime = typeof filters.endTime === "string" ? new Date(filters.endTime) : filters.endTime;
          const logTime = new Date(log.timestamp);
          if (logTime > endTime) {
            return false;
          }
        }
        return true;
      });
    }
    /**
     * Gets all logs
     * @returns All logs
     */
    getLogs() {
      return [...this.logs];
    }
    /**
     * Checks if logs are currently being loaded
     * @returns Whether logs are being loaded
     */
    getIsLoading() {
      return this.isLoadingLogs;
    }
    /**
     * Gets the last error that occurred
     * @returns The last error or null
     */
    getLastError() {
      return this.lastError;
    }
    /**
     * Gets logs with a specific correlation ID
     * @param correlationId The correlation ID to filter by
     * @returns Logs with the specified correlation ID
     */
    getLogsByCorrelationId(correlationId) {
      return this.logs.filter((log) => log.correlationId === correlationId);
    }
    /**
     * Clears all logs
     */
    clearLogs() {
      this.logs = [];
      this.emit("logs:cleared");
    }
  };

  // js/modules/status-manager.ts
  var StatusManager = class extends EventTarget {
    /**
     * Constructor
     * @param options Configuration options
     */
    constructor(options = {}) {
      super();
      this.isLoading = false;
      this.error = null;
      this.refreshIntervalId = null;
      this.options = {
        healthEndpoint: "/api/v1/health",
        refreshInterval: 3e4,
        // 30 seconds
        autoRefresh: true,
        ...options
      };
      this.status = {
        overall: "unknown"
      };
      this.elements = {
        panel: document.getElementById("status-panel"),
        dot: document.getElementById("status-dot"),
        text: document.getElementById("status-text"),
        modal: document.getElementById("status-modal"),
        modalClose: document.getElementById("status-modal-close"),
        modalStatus: document.getElementById("status-modal-status"),
        modalDetails: document.getElementById("status-modal-details"),
        refreshBtn: document.getElementById("status-refresh-btn")
      };
      this.initUI();
      if (this.options.refreshInterval && this.options.autoRefresh) {
        this.startAutoRefresh();
      }
    }
    /**
     * Initialize UI elements and event listeners
     */
    initUI() {
      if (this.elements.panel) {
        this.elements.panel.addEventListener("click", () => this.showModal());
      }
      if (this.elements.modalClose) {
        this.elements.modalClose.addEventListener("click", () => this.hideModal());
      }
      if (this.elements.modal) {
        this.elements.modal.addEventListener("click", (e) => {
          if (e.target === this.elements.modal) {
            this.hideModal();
          }
        });
      }
      if (this.elements.refreshBtn) {
        this.elements.refreshBtn.addEventListener("click", () => this.refreshStatus());
      }
    }
    /**
     * Start auto-refresh status checks
     * @param interval Refresh interval in milliseconds
     */
    startAutoRefresh(interval) {
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
      }
      const refreshInterval = interval || this.options.refreshInterval;
      if (refreshInterval) {
        this.refreshIntervalId = window.setInterval(() => {
          this.refreshStatus();
        }, refreshInterval);
        this.dispatchEvent(new CustomEvent("status:autoRefreshStarted", {
          detail: { interval: refreshInterval }
        }));
      }
    }
    /**
     * Stop auto-refresh status checks
     */
    stopAutoRefresh() {
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
        this.dispatchEvent(new CustomEvent("status:autoRefreshStopped"));
      }
    }
    /**
     * Refresh API status
     */
    async refreshStatus() {
      this.isLoading = true;
      this.error = null;
      this.dispatchEvent(new CustomEvent("status:refreshing", {
        detail: {
          endpoint: this.options.healthEndpoint
        }
      }));
      try {
        const endpoint = this.options.healthEndpoint || "/api/v1/health";
        const response = await fetch(endpoint);
        const data = await response.json();
        this.status = this.processHealthData(data);
        this.updateStatusUI();
        this.isLoading = false;
        this.dispatchEvent(new CustomEvent("status:updated", {
          detail: {
            status: this.status
          }
        }));
        return this.status;
      } catch (error) {
        this.isLoading = false;
        this.error = error;
        this.status.overall = "unhealthy";
        this.updateStatusUI();
        this.dispatchEvent(new CustomEvent("status:error", {
          detail: {
            error: error.message
          }
        }));
        return this.status;
      }
    }
    /**
     * Process health data from API response
     * @param data Health data from API
     * @returns Processed status info
     */
    processHealthData(data) {
      const status = {
        overall: "unknown"
      };
      if (typeof data === "object" && data !== null) {
        if (data.status) {
          status.overall = data.status.toLowerCase();
        } else if (data.health) {
          status.overall = data.health.toLowerCase();
        }
        if (data.version) {
          status.version = data.version;
        }
        if (data.environment) {
          status.environment = data.environment;
        }
        if (data.message) {
          status.message = data.message;
        }
        if (data.timestamp) {
          status.timestamp = data.timestamp;
        }
        if (data.dependencies && Array.isArray(data.dependencies)) {
          status.dependencies = data.dependencies.map((dep) => ({
            name: dep.name,
            status: (dep.status || dep.health || "unknown").toLowerCase(),
            message: dep.message
          }));
        } else if (data.data && data.data.dependencies && Array.isArray(data.data.dependencies)) {
          status.dependencies = data.data.dependencies.map((dep) => ({
            name: dep.name,
            status: (dep.status || dep.health || "unknown").toLowerCase(),
            message: dep.message
          }));
        }
      }
      return status;
    }
    /**
     * Update the status UI elements
     */
    updateStatusUI() {
      if (this.elements.dot) {
        this.elements.dot.className = "status-dot";
        if (this.status.overall === "healthy" || this.status.overall === "ok") {
          this.elements.dot.classList.add("healthy");
        } else if (this.status.overall === "degraded" || this.status.overall === "warning") {
          this.elements.dot.classList.add("degraded");
        } else if (this.status.overall === "unhealthy" || this.status.overall === "error") {
          this.elements.dot.classList.add("unhealthy");
        }
      }
      if (this.elements.text) {
        let statusText = "Unknown";
        if (this.status.overall === "healthy" || this.status.overall === "ok") {
          statusText = "Healthy";
        } else if (this.status.overall === "degraded" || this.status.overall === "warning") {
          statusText = "Degraded";
        } else if (this.status.overall === "unhealthy" || this.status.overall === "error") {
          statusText = "Unhealthy";
        }
        this.elements.text.textContent = statusText;
      }
      if (this.elements.modalStatus) {
        this.elements.modalStatus.className = "";
        if (this.status.overall === "healthy" || this.status.overall === "ok") {
          this.elements.modalStatus.classList.add("healthy");
          this.elements.modalStatus.textContent = "Healthy";
        } else if (this.status.overall === "degraded" || this.status.overall === "warning") {
          this.elements.modalStatus.classList.add("degraded");
          this.elements.modalStatus.textContent = "Degraded";
        } else if (this.status.overall === "unhealthy" || this.status.overall === "error") {
          this.elements.modalStatus.classList.add("unhealthy");
          this.elements.modalStatus.textContent = "Unhealthy";
        } else {
          this.elements.modalStatus.classList.add("unknown");
          this.elements.modalStatus.textContent = "Unknown";
        }
      }
      if (this.elements.modalDetails && this.status) {
        let detailsHtml = "";
        if (this.status.version) {
          detailsHtml += `<div><strong>Version:</strong> ${this.status.version}</div>`;
        }
        if (this.status.environment) {
          detailsHtml += `<div><strong>Environment:</strong> ${this.status.environment}</div>`;
        }
        if (this.status.message) {
          detailsHtml += `<div><strong>Message:</strong> ${this.status.message}</div>`;
        }
        if (this.status.dependencies && this.status.dependencies.length > 0) {
          detailsHtml += '<div class="dependencies-section">';
          detailsHtml += "<h3>Dependencies</h3>";
          detailsHtml += '<div class="dependencies-list">';
          this.status.dependencies.forEach((dep) => {
            detailsHtml += `
            <div class="dependency-item">
              <div class="dependency-status ${dep.status}"></div>
              <div class="dependency-name">${dep.name}</div>
              <div class="dependency-message">${dep.message || ""}</div>
            </div>
          `;
          });
          detailsHtml += "</div></div>";
        }
        if (this.error) {
          detailsHtml += `
          <div class="error-section">
            <h3>Error</h3>
            <div class="error-message">${this.error.message}</div>
          </div>
        `;
        }
        this.elements.modalDetails.innerHTML = detailsHtml;
      }
    }
    /**
     * Show status modal
     */
    showModal() {
      if (this.elements.modal) {
        this.elements.modal.classList.add("active");
        this.dispatchEvent(new CustomEvent("status:modalShown"));
      }
    }
    /**
     * Hide status modal
     */
    hideModal() {
      if (this.elements.modal) {
        this.elements.modal.classList.remove("active");
        this.dispatchEvent(new CustomEvent("status:modalHidden"));
      }
    }
    /**
     * Get current status
     * @returns Current status info
     */
    getStatus() {
      return { ...this.status };
    }
    /**
     * Get loading state
     * @returns Whether status is loading
     */
    getIsLoading() {
      return this.isLoading;
    }
    /**
     * Get error
     * @returns Current error or null
     */
    getError() {
      return this.error;
    }
  };

  // js/modules/variable-manager.ts
  var VariableManager = class extends EventTarget {
    /**
     * Constructor
     * @param options Configuration options
     */
    constructor(options = {}) {
      super();
      this.variables = {};
      this.options = {
        persistVariables: true,
        storageKey: "api_tester_variables",
        variableSyntax: {
          prefix: "{{",
          suffix: "}}",
          jsonPathIndicator: "$"
        },
        ...options
      };
      this.loadVariables();
    }
    /**
     * Load variables from local storage if persistence is enabled
     */
    loadVariables() {
      if (this.options.persistVariables && this.options.storageKey) {
        try {
          const storedVars = localStorage.getItem(this.options.storageKey);
          if (storedVars) {
            this.variables = JSON.parse(storedVars);
            console.log("Loaded variables from storage:", Object.keys(this.variables).length);
            this.dispatchEvent(new CustomEvent("variables:loaded", {
              detail: { variables: this.variables }
            }));
          }
        } catch (error) {
          console.error("Failed to load variables from storage:", error);
        }
      }
      if (this.options.initialVariables) {
        this.setVariables(this.options.initialVariables);
      }
    }
    /**
     * Save variables to local storage if persistence is enabled
     */
    saveVariables() {
      if (this.options.persistVariables && this.options.storageKey) {
        try {
          localStorage.setItem(this.options.storageKey, JSON.stringify(this.variables));
        } catch (error) {
          console.error("Failed to save variables to storage:", error);
        }
      }
    }
    /**
     * Get a variable value by name
     * @param name Variable name
     * @returns Variable value or undefined if not found
     */
    getVariable(name) {
      return this.variables[name];
    }
    /**
     * Get all variables
     * @returns Object containing all variables
     */
    getVariables() {
      return { ...this.variables };
    }
    /**
     * Set a variable value
     * @param name Variable name
     * @param value Variable value
     */
    setVariable(name, value) {
      this.variables[name] = value;
      this.saveVariables();
      this.dispatchEvent(new CustomEvent("variable:set", {
        detail: { name, value }
      }));
    }
    /**
     * Set multiple variables at once
     * @param vars Object containing variable name-value pairs
     */
    setVariables(vars) {
      this.variables = {
        ...this.variables,
        ...vars
      };
      this.saveVariables();
      this.dispatchEvent(new CustomEvent("variables:updated", {
        detail: { variables: vars }
      }));
    }
    /**
     * Delete a variable
     * @param name Variable name
     */
    deleteVariable(name) {
      delete this.variables[name];
      this.saveVariables();
      this.dispatchEvent(new CustomEvent("variable:deleted", {
        detail: { name }
      }));
    }
    /**
     * Clear all variables
     */
    clearVariables() {
      this.variables = {};
      this.saveVariables();
      this.dispatchEvent(new CustomEvent("variables:cleared"));
    }
    /**
     * Replace variable placeholders in a string with their values
     * @param input Input string containing variable placeholders
     * @returns String with variables replaced with their values
     */
    replaceVariables(input) {
      if (!input || typeof input !== "string") {
        return input;
      }
      const { prefix, suffix } = this.options.variableSyntax || { prefix: "{{", suffix: "}}" };
      const variablePattern = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(.*?)${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
      return input.replace(variablePattern, (match, varName) => {
        const value = this.getVariable(varName.trim());
        return value !== void 0 ? String(value) : match;
      });
    }
    /**
     * Check if a string contains variable references
     * @param input The string to check
     * @returns True if the string contains variable references
     */
    containsVariables(input) {
      if (!input || typeof input !== "string") {
        return false;
      }
      const { prefix, suffix } = this.options.variableSyntax || { prefix: "{{", suffix: "}}" };
      const variablePattern = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(.*?)${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
      return variablePattern.test(input);
    }
    /**
     * Extract variable names from a string
     * @param input String containing variable references
     * @returns Array of variable names found in the string
     */
    extractVariableNames(input) {
      if (!input || typeof input !== "string") {
        return [];
      }
      const { prefix, suffix } = this.options.variableSyntax || { prefix: "{{", suffix: "}}" };
      const variablePattern = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(.*?)${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
      const matches = input.match(variablePattern) || [];
      return matches.map((match) => {
        return match.substring(prefix.length, match.length - suffix.length).trim();
      });
    }
    /**
     * Extract variables from a response object using JSONPath expressions
     * @param response Response object
     * @param extractionRules Rules for extraction (variable name to path mapping)
     * @returns Map of variable names to extracted values
     */
    extractVariablesFromResponse(response, extractionRules) {
      const extractedVars = /* @__PURE__ */ new Map();
      for (const rule of extractionRules) {
        try {
          const value = this.extractValueFromResponse(response, rule.path);
          if (value !== void 0) {
            extractedVars.set(rule.name, value);
            this.setVariable(rule.name, value);
          } else if (rule.defaultValue !== void 0) {
            extractedVars.set(rule.name, rule.defaultValue);
            this.setVariable(rule.name, rule.defaultValue);
          }
        } catch (error) {
          console.error(`Error extracting variable ${rule.name} with path ${rule.path}:`, error);
        }
      }
      return extractedVars;
    }
    /**
     * Extract variables from JSON using object paths
     * @param data Source data object
     * @param paths Object mapping variable names to path expressions
     * @returns Object containing extracted variables
     */
    extractVariablesFromJson(data, paths) {
      const result = {};
      for (const [varName, path] of Object.entries(paths)) {
        try {
          const value = this.extractValueFromResponse(data, path);
          if (value !== void 0) {
            result[varName] = value;
            this.setVariable(varName, value);
          }
        } catch (error) {
          console.error(`Error extracting variable ${varName} with path ${path}:`, error);
        }
      }
      return result;
    }
    /**
     * Extract a value from a response using a JSONPath expression
     * @param response Response object
     * @param path JSONPath expression
     * @returns Extracted value or undefined if not found
     */
    extractValueFromResponse(response, path) {
      if (!response || !path) return void 0;
      const jsonPathIndicator = this.options.variableSyntax?.jsonPathIndicator || "$";
      if (!path.startsWith(jsonPathIndicator)) {
        return void 0;
      }
      try {
        const normalizedPath = path.substring(jsonPathIndicator.length);
        if (normalizedPath === "") {
          return response;
        }
        const segments = this.parsePathSegments(normalizedPath);
        let current = response;
        for (const segment of segments) {
          if (current === void 0 || current === null) {
            return void 0;
          }
          if (segment.match(/^\[\d+\]$/)) {
            const index = parseInt(segment.substring(1, segment.length - 1), 10);
            if (Array.isArray(current) && index >= 0 && index < current.length) {
              current = current[index];
            } else {
              return void 0;
            }
          } else {
            current = current[segment];
          }
        }
        return current;
      } catch (error) {
        console.error(`Error extracting value with path ${path}:`, error);
        return void 0;
      }
    }
    /**
     * Parse a JSONPath string into segments, accounting for array indexing
     * @param path JSONPath string (without the $ prefix)
     * @returns Array of path segments
     */
    parsePathSegments(path) {
      if (!path || path === ".") return [];
      const segments = [];
      let currentSegment = "";
      let inBracket = false;
      const normalizedPath = path.startsWith(".") ? path.substring(1) : path;
      for (let i = 0; i < normalizedPath.length; i++) {
        const char = normalizedPath[i];
        if (char === "[" && !inBracket) {
          if (currentSegment) {
            segments.push(currentSegment);
            currentSegment = "";
          }
          currentSegment += char;
          inBracket = true;
        } else if (char === "]" && inBracket) {
          currentSegment += char;
          segments.push(currentSegment);
          currentSegment = "";
          inBracket = false;
        } else if (char === "." && !inBracket) {
          if (currentSegment) {
            segments.push(currentSegment);
            currentSegment = "";
          }
        } else {
          currentSegment += char;
        }
      }
      if (currentSegment) {
        segments.push(currentSegment);
      }
      return segments;
    }
  };

  // js/modules/history-manager.ts
  var HistoryManager = class extends EventTarget {
    /**
     * Constructor
     * @param options Configuration options
     */
    constructor(options = {}) {
      super();
      this.history = [];
      this.options = {
        maxEntries: 50,
        persistHistory: true,
        storageKey: "api_tester_history",
        storageType: "localStorage",
        compressionEnabled: true,
        compressionThreshold: 1e5,
        // 100KB
        storageQuotaWarningThreshold: 0.8,
        // 80% of available storage
        ...options
      };
      this.loadHistory();
    }
    /**
     * Load history from storage
     */
    loadHistory() {
      try {
        if (this.options.storageType === "localStorage") {
          const storageKey = this.options.storageKey || "api_tester_history";
          const storedHistory = localStorage.getItem(storageKey);
          if (storedHistory) {
            if (storedHistory.startsWith("COMPRESSED:")) {
              this.history = JSON.parse(storedHistory.substring(11));
            } else {
              this.history = JSON.parse(storedHistory);
            }
            this.dispatchEvent(new CustomEvent("history:loaded", {
              detail: { history: this.history }
            }));
          }
        } else if (this.options.storageType === "sessionStorage") {
          const storageKey = this.options.storageKey || "api_tester_history";
          const storedHistory = sessionStorage.getItem(storageKey);
          if (storedHistory) {
            if (storedHistory.startsWith("COMPRESSED:")) {
              this.history = JSON.parse(storedHistory.substring(11));
            } else {
              this.history = JSON.parse(storedHistory);
            }
            this.dispatchEvent(new CustomEvent("history:loaded", {
              detail: { history: this.history }
            }));
          }
        }
      } catch (error) {
        console.error("Failed to load history:", error);
        this.history = [];
      }
    }
    /**
     * Save history to storage
     */
    saveHistory() {
      if (!this.options.persistHistory) return;
      try {
        const historyStr = JSON.stringify(this.history);
        const storageKey = this.options.storageKey || "api_tester_history";
        if (this.options.storageType === "localStorage") {
          localStorage.setItem(storageKey, historyStr);
        } else if (this.options.storageType === "sessionStorage") {
          sessionStorage.setItem(storageKey, historyStr);
        }
      } catch (error) {
        console.error("Failed to save history:", error);
        this.options.storageType = "memory";
      }
    }
    /**
     * Add a new entry to the history
     * @param requestInfo Request information
     * @param responseData Response data
     */
    addEntry(requestInfo, responseData) {
      const entry = {
        id: this.generateId(),
        timestamp: Date.now(),
        method: requestInfo.method || "GET",
        path: this.extractPathFromUrl(requestInfo.url),
        url: requestInfo.url,
        status: responseData.status || 0,
        success: responseData.status >= 200 && responseData.status < 300,
        duration: responseData.duration || 0,
        request: {
          headers: this.sanitizeHeaders(requestInfo.headers || {}),
          params: requestInfo.params,
          body: requestInfo.body
        },
        response: {
          headers: this.sanitizeHeaders(responseData.headers || {}),
          data: responseData.data,
          size: this.calculateSize(responseData.data)
        }
      };
      this.history.unshift(entry);
      const maxEntries = this.options.maxEntries || 50;
      if (this.history.length > maxEntries) {
        this.history = this.history.slice(0, maxEntries);
      }
      this.saveHistory();
      this.dispatchEvent(new CustomEvent("history:changed", {
        detail: { history: this.history }
      }));
    }
    /**
     * Get all history entries
     * @returns Array of history entries
     */
    getHistory() {
      return [...this.history];
    }
    /**
     * Get a history entry by ID
     * @param id Entry ID
     * @returns History entry or null if not found
     */
    getEntryById(id) {
      return this.history.find((entry) => entry.id === id) || null;
    }
    /**
     * Delete a history entry
     * @param id Entry ID
     * @returns Whether the entry was deleted
     */
    deleteEntry(id) {
      const initialLength = this.history.length;
      this.history = this.history.filter((entry) => entry.id !== id);
      if (this.history.length !== initialLength) {
        this.saveHistory();
        this.dispatchEvent(new CustomEvent("history:changed", {
          detail: { history: this.history }
        }));
        return true;
      }
      return false;
    }
    /**
     * Clear all history
     */
    clearHistory() {
      this.history = [];
      this.saveHistory();
      this.dispatchEvent(new CustomEvent("history:cleared"));
      this.dispatchEvent(new CustomEvent("history:changed", {
        detail: { history: this.history }
      }));
    }
    /**
     * Extract path from URL
     * @param url URL to extract path from
     * @returns URL path
     */
    extractPathFromUrl(url) {
      try {
        const urlObj = new URL(url);
        return urlObj.pathname;
      } catch (error) {
        return url;
      }
    }
    /**
     * Sanitize headers
     * @param headers Headers object
     * @returns Sanitized headers object
     */
    sanitizeHeaders(headers) {
      const sanitized = {};
      Object.keys(headers).forEach((key) => {
        sanitized[key.toLowerCase()] = headers[key];
      });
      return sanitized;
    }
    /**
     * Generate a unique ID
     * @returns Unique ID
     */
    generateId() {
      return "h_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    }
    /**
     * Calculate size of data in bytes
     * @param data Data to calculate size of
     * @returns Size in bytes
     */
    calculateSize(data) {
      if (!data) return 0;
      try {
        return JSON.stringify(data).length;
      } catch (error) {
        return 0;
      }
    }
  };

  // js/controllers/FlowController.ts
  var FlowController = class {
    /**
     * Constructor
     * @param options FlowController options
     */
    constructor(options) {
      this.flows = [];
      this.activeFlow = null;
      this.activeStepIndex = -1;
      this.isRunning = false;
      this.endpointManager = options.endpointManager;
      this.uiManager = options.uiManager;
      this.variableManager = options.variableManager;
      this.historyManager = options.historyManager;
      this.loadFlows();
    }
    /**
     * Initialize the flow controller
     */
    initialize() {
      this.setupEventListeners();
      this.renderFlows();
    }
    /**
     * Load flows from storage
     */
    loadFlows() {
      try {
        const savedFlows = localStorage.getItem("api_admin_flows");
        if (savedFlows) {
          this.flows = JSON.parse(savedFlows);
        } else {
          this.createDefaultFlow();
        }
      } catch (error) {
        console.error("Failed to load flows:", error);
        this.flows = [];
        this.createDefaultFlow();
      }
    }
    /**
     * Create a default flow
     */
    createDefaultFlow() {
      const defaultFlow = {
        id: this.generateId(),
        name: "Default Flow",
        description: "A default flow with basic API operations",
        steps: [
          {
            id: this.generateId(),
            name: "Get API Status",
            description: "Check if the API is up and running",
            method: "GET",
            url: "/api/v1/health"
          }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.flows.push(defaultFlow);
      this.saveFlows();
    }
    /**
     * Save flows to storage
     */
    saveFlows() {
      try {
        localStorage.setItem("api_admin_flows", JSON.stringify(this.flows));
      } catch (error) {
        console.error("Failed to save flows:", error);
        this.uiManager.showError("Failed to save flows. Local storage may be full.");
      }
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
      document.addEventListener("click", (e) => {
        const target = e.target;
        if (target.closest(".flow-item")) {
          const flowItem = target.closest(".flow-item");
          const flowId = flowItem.dataset.flowId;
          if (flowId) {
            this.selectFlow(flowId);
          }
        }
      });
    }
    /**
     * Select a flow
     * @param flowId Flow ID
     */
    selectFlow(flowId) {
      const flow = this.flows.find((f) => f.id === flowId);
      if (flow) {
        this.activeFlow = flow;
        this.activeStepIndex = -1;
        this.renderActiveFlow();
      }
    }
    /**
     * Render flows in the UI
     */
    renderFlows() {
      const flowMenu = document.getElementById("flow-menu");
      if (!flowMenu) return;
      flowMenu.innerHTML = "";
      this.flows.forEach((flow) => {
        const flowItem = document.createElement("div");
        flowItem.className = `flow-item p-2 my-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${this.activeFlow?.id === flow.id ? "bg-primary-100 dark:bg-primary-900" : ""}`;
        flowItem.dataset.flowId = flow.id;
        const flowName = document.createElement("div");
        flowName.className = "font-medium";
        flowName.textContent = flow.name;
        const flowDesc = document.createElement("div");
        flowDesc.className = "text-xs text-gray-500 dark:text-gray-400";
        flowDesc.textContent = flow.description || "";
        flowItem.appendChild(flowName);
        flowItem.appendChild(flowDesc);
        flowMenu.appendChild(flowItem);
      });
      const newFlowButton = document.createElement("button");
      newFlowButton.className = "btn btn-sm btn-secondary w-full mt-2";
      newFlowButton.textContent = "+ New Flow";
      newFlowButton.addEventListener("click", () => this.createFlow());
      flowMenu.appendChild(newFlowButton);
    }
    /**
     * Render the active flow
     */
    renderActiveFlow() {
      if (!this.activeFlow) return;
      const flowContainer = document.getElementById("flow-details");
      if (!flowContainer) return;
      flowContainer.innerHTML = "";
      const header = document.createElement("div");
      header.className = "flex justify-between items-center mb-4";
      const title = document.createElement("h2");
      title.className = "text-xl font-bold";
      title.textContent = this.activeFlow.name;
      const actions = document.createElement("div");
      actions.className = "flex gap-2";
      const runButton = document.createElement("button");
      runButton.className = "btn btn-sm btn-primary";
      runButton.textContent = "Run Flow";
      runButton.addEventListener("click", () => this.runActiveFlow());
      const editButton = document.createElement("button");
      editButton.className = "btn btn-sm btn-secondary";
      editButton.textContent = "Edit Flow";
      editButton.addEventListener("click", () => this.editActiveFlow());
      actions.appendChild(runButton);
      actions.appendChild(editButton);
      header.appendChild(title);
      header.appendChild(actions);
      const description = document.createElement("p");
      description.className = "text-gray-600 dark:text-gray-400 mb-4";
      description.textContent = this.activeFlow.description || "No description provided";
      const stepsContainer = document.createElement("div");
      stepsContainer.className = "mt-6";
      const stepsTitle = document.createElement("h3");
      stepsTitle.className = "text-lg font-semibold mb-2";
      stepsTitle.textContent = "Steps";
      stepsContainer.appendChild(stepsTitle);
      const stepsList = document.createElement("div");
      stepsList.className = "space-y-3";
      if (this.activeFlow.steps.length === 0) {
        const emptySteps = document.createElement("div");
        emptySteps.className = "text-gray-500 dark:text-gray-400 text-center p-4 border border-dashed rounded";
        emptySteps.textContent = "No steps defined. Add a step to get started.";
        stepsList.appendChild(emptySteps);
      } else {
        this.activeFlow.steps.forEach((step, index) => {
          const stepItem = document.createElement("div");
          stepItem.className = "card";
          stepItem.dataset.stepId = step.id;
          const stepHeader = document.createElement("div");
          stepHeader.className = "flex justify-between items-center";
          const stepTitle = document.createElement("div");
          stepTitle.className = "font-medium";
          stepTitle.textContent = `${index + 1}. ${step.name}`;
          const stepActions = document.createElement("div");
          stepActions.className = "flex gap-1";
          const editStepBtn = document.createElement("button");
          editStepBtn.className = "text-xs px-2 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300";
          editStepBtn.textContent = "Edit";
          editStepBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.editStep(step.id);
          });
          const deleteStepBtn = document.createElement("button");
          deleteStepBtn.className = "text-xs px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300";
          deleteStepBtn.textContent = "Delete";
          deleteStepBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.deleteStep(step.id);
          });
          stepActions.appendChild(editStepBtn);
          stepActions.appendChild(deleteStepBtn);
          stepHeader.appendChild(stepTitle);
          stepHeader.appendChild(stepActions);
          const stepDetails = document.createElement("div");
          stepDetails.className = "mt-2 text-sm";
          if (step.description) {
            const stepDesc = document.createElement("div");
            stepDesc.className = "text-gray-600 dark:text-gray-400 mb-2";
            stepDesc.textContent = step.description;
            stepDetails.appendChild(stepDesc);
          }
          const methodUrl = document.createElement("div");
          methodUrl.className = "font-mono text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded";
          if (step.method && (step.url || step.endpoint)) {
            methodUrl.textContent = `${step.method} ${step.url || `[Endpoint: ${step.endpoint}]`}`;
          } else {
            methodUrl.textContent = "No method or URL defined";
          }
          stepDetails.appendChild(methodUrl);
          stepItem.appendChild(stepHeader);
          stepItem.appendChild(stepDetails);
          stepsList.appendChild(stepItem);
        });
      }
      stepsContainer.appendChild(stepsList);
      const addStepBtn = document.createElement("button");
      addStepBtn.className = "btn btn-sm btn-outline mt-4 w-full";
      addStepBtn.textContent = "+ Add Step";
      addStepBtn.addEventListener("click", () => this.showAddStepModal());
      stepsContainer.appendChild(addStepBtn);
      flowContainer.appendChild(header);
      flowContainer.appendChild(description);
      flowContainer.appendChild(stepsContainer);
    }
    /**
     * Show modal to add a new step
     */
    showAddStepModal() {
      this.addStep({
        name: "New Step",
        method: "GET",
        url: "/api/v1/example"
      });
    }
    /**
     * Edit the active flow
     */
    editActiveFlow() {
      if (!this.activeFlow) return;
      console.log("Edit flow:", this.activeFlow);
      const newName = prompt("Flow name:", this.activeFlow.name);
      if (newName) {
        this.activeFlow.name = newName;
        const newDescription = prompt("Flow description:", this.activeFlow.description || "");
        this.activeFlow.description = newDescription || "";
        this.activeFlow.updatedAt = Date.now();
        this.saveFlows();
        this.renderFlows();
        this.renderActiveFlow();
      }
    }
    /**
     * Edit a step
     * @param stepId Step ID
     */
    editStep(stepId) {
      if (!this.activeFlow) return;
      const step = this.activeFlow.steps.find((s) => s.id === stepId);
      if (!step) return;
      const newName = prompt("Step name:", step.name);
      if (newName) {
        step.name = newName;
        const newDescription = prompt("Step description:", step.description || "");
        step.description = newDescription || "";
        const newMethod = prompt("HTTP Method (GET, POST, PUT, DELETE):", step.method || "GET");
        step.method = newMethod || "GET";
        const newUrl = prompt("URL or path:", step.url || "");
        step.url = newUrl || "";
        this.activeFlow.updatedAt = Date.now();
        this.saveFlows();
        this.renderActiveFlow();
      }
    }
    /**
     * Create a new flow
     */
    createFlow() {
      const newFlow = {
        id: this.generateId(),
        name: "New Flow",
        description: "A new API flow",
        steps: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.flows.push(newFlow);
      this.saveFlows();
      this.renderFlows();
    }
    /**
     * Delete a flow
     * @param flowId Flow ID
     */
    deleteFlow(flowId) {
      const index = this.flows.findIndex((f) => f.id === flowId);
      if (index !== -1) {
        this.flows.splice(index, 1);
        this.saveFlows();
        if (this.activeFlow?.id === flowId) {
          this.activeFlow = this.flows.length > 0 ? this.flows[0] : null;
          this.activeStepIndex = -1;
        }
        this.renderFlows();
      }
    }
    /**
     * Add a step to the active flow
     * @param step Flow step
     */
    addStep(step) {
      if (!this.activeFlow) return;
      const newStep = {
        id: this.generateId(),
        name: step.name || "New Step",
        ...step
      };
      this.activeFlow.steps.push(newStep);
      this.activeFlow.updatedAt = Date.now();
      this.saveFlows();
      this.renderActiveFlow();
    }
    /**
     * Update a step in the active flow
     * @param stepId Step ID
     * @param updates Step updates
     */
    updateStep(stepId, updates) {
      if (!this.activeFlow) return;
      const stepIndex = this.activeFlow.steps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        this.activeFlow.steps[stepIndex] = {
          ...this.activeFlow.steps[stepIndex],
          ...updates
        };
        this.activeFlow.updatedAt = Date.now();
        this.saveFlows();
        this.renderActiveFlow();
      }
    }
    /**
     * Delete a step from the active flow
     * @param stepId Step ID
     */
    deleteStep(stepId) {
      if (!this.activeFlow) return;
      const stepIndex = this.activeFlow.steps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        this.activeFlow.steps.splice(stepIndex, 1);
        this.activeFlow.updatedAt = Date.now();
        this.saveFlows();
        this.renderActiveFlow();
      }
    }
    /**
     * Run the active flow
     */
    async runActiveFlow() {
      if (!this.activeFlow || this.isRunning) return;
      this.isRunning = true;
      this.activeStepIndex = -1;
      try {
        for (let i = 0; i < this.activeFlow.steps.length; i++) {
          this.activeStepIndex = i;
          this.renderActiveFlow();
          const step = this.activeFlow.steps[i];
          if (step.skipIf && this.evaluateSkipCondition(step.skipIf)) {
            console.log(`Skipping step: ${step.name}`);
            continue;
          }
          const result = await this.executeStep(step);
          this.processStepResult(step, result);
          if (step.delay && step.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, step.delay));
          }
        }
        this.activeStepIndex = -1;
        this.uiManager.showSuccess("Flow executed successfully");
      } catch (error) {
        console.error("Flow execution failed:", error);
        this.uiManager.showError(`Flow execution failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.isRunning = false;
        this.renderActiveFlow();
      }
    }
    /**
     * Execute a flow step
     * @param step Flow step
     * @returns Step result
     */
    async executeStep(step) {
      let url = step.url || "";
      url = this.variableManager.replaceVariables(url);
      const headers = {};
      if (step.headers) {
        Object.entries(step.headers).forEach(([key, value]) => {
          headers[key] = this.variableManager.replaceVariables(value);
        });
      }
      const params = {};
      if (step.params) {
        Object.entries(step.params).forEach(([key, value]) => {
          params[key] = this.variableManager.replaceVariables(value);
        });
      }
      let body = step.body;
      if (body && typeof body === "object") {
        body = JSON.parse(this.variableManager.replaceVariables(JSON.stringify(body)));
      }
      const request = {
        method: step.method || "GET",
        url,
        headers,
        params,
        body
      };
      try {
        this.uiManager.showLoading();
        const startTime = Date.now();
        const response = await fetch(url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : void 0
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        const responseData = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data,
          duration: responseTime
        };
        this.historyManager.addEntry(request, responseData);
        return responseData;
      } finally {
        this.uiManager.hideLoading();
      }
    }
    /**
     * Process the result of a step execution
     * @param step Flow step
     * @param result Step result
     */
    processStepResult(step, result) {
      if (step.extractVariables && Array.isArray(step.extractVariables)) {
        step.extractVariables.forEach((variable) => {
          const value = this.extractValueByPath(result.data, variable.path);
          if (value !== void 0) {
            this.variableManager.setVariable(variable.name, value);
          }
        });
      }
    }
    /**
     * Extract a value by dot path from an object
     * @param obj Object to extract from
     * @param path Dot notation path (e.g., 'data.user.id')
     * @returns Extracted value or undefined
     */
    extractValueByPath(obj, path) {
      try {
        return path.split(".").reduce((o, p) => o?.[p], obj);
      } catch (error) {
        console.error(`Failed to extract value by path: ${path}`, error);
        return void 0;
      }
    }
    /**
     * Evaluate a skip condition expression
     * @param expression Skip condition expression
     * @returns Whether to skip the step
     */
    evaluateSkipCondition(expression) {
      try {
        const processedExpression = this.variableManager.replaceVariables(expression);
        return !!eval(processedExpression);
      } catch (error) {
        console.error("Failed to evaluate skip condition:", error);
        return false;
      }
    }
    /**
     * Generate a unique ID
     * @returns Unique ID
     */
    generateId() {
      return "f_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    }
    /**
     * Initialize flows from endpoints
     * @param endpoints API endpoints
     */
    initFlowsFromEndpoints(endpoints) {
      const generatedFlows = [];
      const groupedEndpoints = {};
      endpoints.forEach((endpoint) => {
        const category = endpoint.category || endpoint.tag || "General";
        if (!groupedEndpoints[category]) {
          groupedEndpoints[category] = [];
        }
        groupedEndpoints[category].push(endpoint);
      });
      Object.entries(groupedEndpoints).forEach(([category, categoryEndpoints]) => {
        const flow = {
          id: this.generateId(),
          name: category,
          description: `Generated flow for ${category} endpoints`,
          steps: categoryEndpoints.map((endpoint) => ({
            id: this.generateId(),
            name: endpoint.name || endpoint.path,
            description: endpoint.description || "",
            method: endpoint.method || "GET",
            url: endpoint.path,
            endpoint: endpoint.id
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ["generated"]
        };
        generatedFlows.push(flow);
      });
      this.flows = [...this.flows, ...generatedFlows];
      if (!this.activeFlow && this.flows.length > 0) {
        this.activeFlow = this.flows[0];
      }
      this.saveFlows();
      this.renderFlows();
    }
  };

  // js/utils/logger.ts
  var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
    LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
    LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
    LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
    LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
    LogLevel2[LogLevel2["NONE"] = 4] = "NONE";
    return LogLevel2;
  })(LogLevel || {});
  var DEFAULT_OPTIONS = {
    level: 1 /* INFO */,
    prefix: "",
    includeTimestamp: true,
    consoleOutput: true
  };
  var Logger = class {
    /**
     * Creates a new Logger instance
     * @param options Logger configuration options
     */
    constructor(options = {}) {
      this.history = [];
      this.maxHistorySize = 100;
      this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Sets the logger's log level
     * @param level New log level
     */
    setLevel(level) {
      this.options.level = level;
    }
    /**
     * Sets the logger's prefix
     * @param prefix New prefix
     */
    setPrefix(prefix) {
      this.options.prefix = prefix;
    }
    /**
     * Logs a debug message
     * @param message Message to log
     * @param args Additional arguments
     */
    debug(message, ...args) {
      this.log(0 /* DEBUG */, message, ...args);
    }
    /**
     * Logs an info message
     * @param message Message to log
     * @param args Additional arguments
     */
    info(message, ...args) {
      this.log(1 /* INFO */, message, ...args);
    }
    /**
     * Logs a warning message
     * @param message Message to log
     * @param args Additional arguments
     */
    warn(message, ...args) {
      this.log(2 /* WARN */, message, ...args);
    }
    /**
     * Logs an error message
     * @param message Message to log
     * @param args Additional arguments
     */
    error(message, ...args) {
      this.log(3 /* ERROR */, message, ...args);
    }
    /**
     * Gets the logger's history
     * @returns Array of log entries
     */
    getHistory() {
      return [...this.history];
    }
    /**
     * Clears the logger's history
     */
    clearHistory() {
      this.history = [];
    }
    /**
     * Logs a message at the specified level
     * @param level Log level
     * @param message Message to log
     * @param args Additional arguments
     */
    log(level, message, ...args) {
      if (level < this.options.level) {
        return;
      }
      const timestamp = /* @__PURE__ */ new Date();
      const logEntry = { level, message, timestamp, args };
      this.history.push(logEntry);
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }
      let formattedMessage = "";
      if (this.options.includeTimestamp) {
        formattedMessage += `[${timestamp.toISOString()}] `;
      }
      if (this.options.prefix) {
        formattedMessage += `[${this.options.prefix}] `;
      }
      formattedMessage += `[${LogLevel[level]}] `;
      formattedMessage += message;
      if (this.options.consoleOutput) {
        switch (level) {
          case 0 /* DEBUG */:
            console.debug(formattedMessage, ...args);
            break;
          case 1 /* INFO */:
            console.info(formattedMessage, ...args);
            break;
          case 2 /* WARN */:
            console.warn(formattedMessage, ...args);
            break;
          case 3 /* ERROR */:
            console.error(formattedMessage, ...args);
            break;
        }
      }
      if (this.options.customOutput) {
        this.options.customOutput(level, formattedMessage, ...args);
      }
    }
  };
  var logger = new Logger();

  // js/utils/dom-utils.ts
  function createElement(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (key.startsWith("on") && typeof value === "function") {
        const eventName = key.substring(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else if (typeof value === "boolean") {
        if (value) {
          element.setAttribute(key, "");
        }
      } else {
        element.setAttribute(key, String(value));
      }
    }
    for (const child of children) {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    }
    return element;
  }
  function findElements(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }
  function findElement(selector, parent = document) {
    return parent.querySelector(selector);
  }
  function getById(id) {
    return document.getElementById(id);
  }
  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
  function setHTML(element, html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    const fragment = template.content;
    clearElement(element);
    element.appendChild(fragment);
  }
  function showElement(element) {
    element.classList.remove("hidden");
    element.style.display = "";
  }
  function hideElement(element) {
    element.classList.add("hidden");
    element.style.display = "none";
  }
  function toggleElement(element, show) {
    if (show === void 0) {
      show = element.classList.contains("hidden") || element.style.display === "none";
    }
    if (show) {
      showElement(element);
    } else {
      hideElement(element);
    }
  }
  function addEventListeners(selector, eventType, handler, parent = document) {
    const elements = findElements(selector, parent);
    elements.forEach((element) => {
      element.addEventListener(eventType, handler);
    });
  }

  // js/components/UIManager.ts
  var DEFAULT_OPTIONS2 = {
    containerId: "app"
  };
  var UIManager = class {
    /**
     * Creates a new UIManager instance
     * @param options Component options
     */
    constructor(options = {}) {
      this.options = { ...DEFAULT_OPTIONS2, ...options };
      this.container = getById(this.options.containerId);
      this.eventListeners = /* @__PURE__ */ new Map();
      this.elements = /* @__PURE__ */ new Map();
      this.isInitialized = false;
      this.responseViewer = this.options.responseViewer || null;
      if (!this.container) {
        logger.warn(`UIManager: Container element with ID "${this.options.containerId}" not found`);
      }
    }
    /**
     * Initializes the UI
     */
    initialize() {
      if (this.isInitialized) return;
      try {
        this.cacheElements();
        this.setupEventListeners();
        this.isInitialized = true;
        if (this.options.onUiReady) {
          this.options.onUiReady();
        }
        logger.info("UIManager: UI initialized successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("UIManager: Failed to initialize UI:", errorMessage);
        this.showError("Failed to initialize UI", errorMessage);
      }
    }
    /**
     * Caches commonly used elements
     */
    cacheElements() {
      const elementIds = [
        "endpoint-select",
        "parameter-form",
        "response-container",
        "loading-indicator",
        "error-container",
        "submit-button",
        "method-select",
        "reset-button",
        "variables-container"
      ];
      for (const id of elementIds) {
        const element = getById(id);
        if (element) {
          this.elements.set(id, element);
        }
      }
    }
    /**
     * Sets up event listeners for UI elements
     */
    setupEventListeners() {
      const form = findElement("form");
      if (form) {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          this.emit("form:submit", this.getFormData(form));
        });
      }
      const endpointSelect = this.elements.get("endpoint-select");
      if (endpointSelect) {
        endpointSelect.addEventListener("change", () => {
          this.emit("endpoint:change", endpointSelect.value);
        });
      }
      const methodSelect = this.elements.get("method-select");
      if (methodSelect) {
        methodSelect.addEventListener("change", () => {
          this.emit("method:change", methodSelect.value);
        });
      }
      const resetButton = this.elements.get("reset-button");
      if (resetButton) {
        resetButton.addEventListener("click", () => {
          this.emit("form:reset");
        });
      }
      addEventListeners(".copy-response-btn", "click", (event) => {
        event.preventDefault();
        const target = event.target.dataset.target;
        this.emit("response:copy", target);
      });
      addEventListeners(".extract-variable-btn", "click", (event) => {
        event.preventDefault();
        const btn = event.target;
        const variable = btn.dataset.variable;
        const path = btn.dataset.path;
        if (variable && path) {
          this.emit("variable:extract", { variable, path });
        }
      });
      addEventListeners(".tab-button", "click", (event) => {
        const tabId = event.target.dataset.tab;
        if (tabId) {
          this.switchTab(tabId);
        }
      });
      addEventListeners(".collapsible-header", "click", (event) => {
        const header = event.target;
        const content = header.nextElementSibling;
        if (content && content.classList.contains("collapsible-content")) {
          toggleElement(content, content.style.display === "none");
          const icon = header.querySelector(".collapse-icon");
          if (icon) {
            icon.textContent = content.style.display === "none" ? "+" : "-";
          }
        }
      });
      logger.debug("UIManager: Event listeners set up");
    }
    /**
     * Gets form data as an object
     * @param form Form element
     * @returns Form data as an object
     */
    getFormData(form) {
      const formData = new FormData(form);
      const data = {};
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
      return data;
    }
    /**
     * Shows the loading indicator
     * @param show Whether to show or hide the indicator
     * @param message Optional message to display
     */
    showLoading(show, message) {
      if (this.options.showLoadingIndicator) {
        this.options.showLoadingIndicator(show, message);
        return;
      }
      const loadingIndicator = this.elements.get("loading-indicator");
      if (loadingIndicator) {
        if (show) {
          loadingIndicator.style.display = "flex";
          if (message) {
            const msgElement = loadingIndicator.querySelector(".loading-message");
            if (msgElement) {
              msgElement.textContent = message;
            }
          }
        } else {
          loadingIndicator.style.display = "none";
        }
      }
    }
    /**
     * Shows an error message
     * @param title Error title
     * @param message Error message
     * @param isHtml Whether the message contains HTML
     */
    showError(title, message, isHtml = false) {
      const errorContainer = this.elements.get("error-container");
      if (!errorContainer) return;
      const html = `
      <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
        <div class="font-bold">${title}</div>
        <div class="${isHtml ? "" : "whitespace-pre-wrap"}">${isHtml ? message : message.replace(/\n/g, "<br>")}</div>
        <button class="mt-2 text-red-700 underline dismiss-error">Dismiss</button>
      </div>
    `;
      setHTML(errorContainer, html);
      errorContainer.style.display = "block";
      const dismissButton = errorContainer.querySelector(".dismiss-error");
      if (dismissButton) {
        dismissButton.addEventListener("click", () => {
          errorContainer.style.display = "none";
          errorContainer.innerHTML = "";
        });
      }
      this.emit("ui:error", { title, message });
    }
    /**
     * Clears error messages
     */
    clearError() {
      const errorContainer = this.elements.get("error-container");
      if (errorContainer) {
        errorContainer.style.display = "none";
        errorContainer.innerHTML = "";
      }
    }
    /**
     * Shows a success message
     * @param message Success message
     * @param autoDismiss Whether to auto-dismiss after a timeout
     * @param dismissTimeout Timeout in ms before auto-dismissing
     */
    showSuccess(message, autoDismiss = true, dismissTimeout = 3e3) {
      const errorContainer = this.elements.get("error-container");
      if (!errorContainer) return;
      const html = `
      <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
        <div>${message}</div>
        <button class="mt-2 text-green-700 underline dismiss-message">Dismiss</button>
      </div>
    `;
      setHTML(errorContainer, html);
      errorContainer.style.display = "block";
      const dismissButton = errorContainer.querySelector(".dismiss-message");
      if (dismissButton) {
        dismissButton.addEventListener("click", () => {
          errorContainer.style.display = "none";
          errorContainer.innerHTML = "";
        });
      }
      if (autoDismiss) {
        setTimeout(() => {
          if (errorContainer.style.display !== "none") {
            errorContainer.style.display = "none";
            errorContainer.innerHTML = "";
          }
        }, dismissTimeout);
      }
      this.emit("ui:success", { message });
    }
    /**
     * Displays API response using the response viewer
     * @param response Response data
     * @param headers Response headers
     * @param status HTTP status code
     */
    showResponse(response, headers = {}, status = 200) {
      if (this.responseViewer) {
        this.responseViewer.display(response, headers, status);
      } else {
        logger.warn("UIManager: ResponseViewer not available for displaying response");
      }
      this.emit("response:display", { response, headers, status });
    }
    /**
     * Clears the response viewer
     */
    clearResponse() {
      if (this.responseViewer) {
        this.responseViewer.clear();
      }
    }
    /**
     * Switches between tabs
     * @param tabId ID of the tab to switch to
     */
    switchTab(tabId) {
      const tabs = findElements(".tab-content");
      const buttons = findElements(".tab-button");
      tabs.forEach((tab) => {
        tab.style.display = "none";
      });
      buttons.forEach((button) => {
        button.classList.remove("active");
      });
      const selectedTab = getById(tabId);
      if (selectedTab) {
        selectedTab.style.display = "block";
      }
      const selectedButton = findElement(`.tab-button[data-tab="${tabId}"]`);
      if (selectedButton) {
        selectedButton.classList.add("active");
      }
      this.emit("tab:change", tabId);
    }
    /**
     * Updates form fields based on the provided data
     * @param data Data to update form with
     */
    updateForm(data) {
      for (const [key, value] of Object.entries(data)) {
        const element = findElement(`[name="${key}"]`);
        if (element) {
          if (element instanceof HTMLInputElement) {
            if (element.type === "checkbox") {
              element.checked = Boolean(value);
            } else {
              element.value = String(value);
            }
          } else if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
            element.value = String(value);
          }
        }
      }
      this.emit("form:update", data);
    }
    /**
     * Enables or disables form elements
     * @param enabled Whether to enable or disable
     */
    setFormEnabled(enabled) {
      const form = findElement("form");
      if (!form) return;
      const elements = form.querySelectorAll("input, select, textarea, button");
      elements.forEach((element) => {
        element.disabled = !enabled;
      });
      this.emit("form:enabled", enabled);
    }
    /**
     * Resets the form
     */
    resetForm() {
      const form = findElement("form");
      if (form && form instanceof HTMLFormElement) {
        form.reset();
        this.emit("form:reset");
      }
    }
    /**
     * Adds an event listener
     * @param event Event name
     * @param callback Callback function
     */
    addEventListener(event, callback) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, /* @__PURE__ */ new Set());
      }
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.add(callback);
      }
    }
    /**
     * Removes an event listener
     * @param event Event name
     * @param callback Callback function
     */
    removeEventListener(event, callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }
    /**
     * Emits an event
     * @param event Event name
     * @param data Event data
     */
    emit(event, data = null) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            logger.error(`UIManager: Error in event listener for ${event}:`, error);
          }
        });
      }
    }
  };

  // js/data/bundled-endpoints.ts
  var bundledEndpoints = [
    {
      id: "health",
      name: "API Health",
      category: "System",
      description: "Check the health status of the API",
      path: "/api/v1/health",
      method: "GET",
      parameters: [],
      headers: {},
      requestBody: null,
      responseExample: null,
      requiresAuth: false,
      tags: ["health", "system"]
    },
    {
      id: "status",
      name: "API Status",
      category: "System",
      description: "Get detailed status of the API and its dependencies",
      path: "/api/v1/status",
      method: "GET",
      parameters: [],
      headers: {},
      requestBody: null,
      responseExample: null,
      requiresAuth: false,
      tags: ["system"]
    },
    {
      id: "users-list",
      name: "List Users",
      category: "Users",
      description: "Get a list of all users",
      path: "/api/v1/users",
      method: "GET",
      parameters: [
        {
          name: "page",
          in: "query",
          description: "Page number",
          required: false,
          type: "integer",
          default: 1
        },
        {
          name: "limit",
          in: "query",
          description: "Number of users per page",
          required: false,
          type: "integer",
          default: 10
        }
      ],
      headers: {},
      requestBody: null,
      responseExample: null,
      requiresAuth: false,
      tags: ["users"]
    },
    {
      id: "users-get",
      name: "Get User",
      category: "Users",
      description: "Get a specific user by ID",
      path: "/api/v1/users/{id}",
      method: "GET",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "User ID",
          required: true,
          type: "string"
        }
      ],
      headers: {},
      requestBody: null,
      responseExample: null,
      requiresAuth: false,
      tags: ["users"]
    },
    {
      id: "users-create",
      name: "Create User",
      category: "Users",
      description: "Create a new user",
      path: "/api/v1/users",
      method: "POST",
      parameters: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "User name",
                  example: "John Doe"
                },
                email: {
                  type: "string",
                  description: "User email",
                  example: "john@example.com"
                },
                role: {
                  type: "string",
                  description: "User role",
                  enum: ["admin", "user"],
                  example: "user"
                }
              },
              required: ["name", "email"]
            }
          }
        }
      },
      headers: {},
      responseExample: null,
      requiresAuth: false,
      tags: ["users"]
    },
    {
      id: "products-list",
      name: "List Products",
      category: "Products",
      description: "Get a list of all products",
      path: "/api/v1/products",
      method: "GET",
      parameters: [
        {
          name: "page",
          in: "query",
          description: "Page number",
          required: false,
          type: "integer",
          default: 1
        },
        {
          name: "limit",
          in: "query",
          description: "Number of products per page",
          required: false,
          type: "integer",
          default: 10
        },
        {
          name: "category",
          in: "query",
          description: "Filter by category",
          required: false,
          type: "string"
        }
      ],
      headers: {},
      requestBody: null,
      responseExample: null,
      requiresAuth: false,
      tags: ["products"]
    },
    {
      id: "products-get",
      name: "Get Product",
      category: "Products",
      description: "Get a specific product by ID",
      path: "/api/v1/products/{id}",
      method: "GET",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Product ID",
          required: true,
          type: "string"
        }
      ],
      headers: {},
      requestBody: null,
      responseExample: null,
      requiresAuth: false,
      tags: ["products"]
    },
    {
      id: "products-create",
      name: "Create Product",
      category: "Products",
      description: "Create a new product",
      path: "/api/v1/products",
      method: "POST",
      parameters: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Product name",
                  example: "Smartphone X1"
                },
                description: {
                  type: "string",
                  description: "Product description",
                  example: "The latest smartphone with advanced features"
                },
                price: {
                  type: "number",
                  description: "Product price",
                  example: 999.99
                },
                category: {
                  type: "string",
                  description: "Product category",
                  example: "Electronics"
                }
              },
              required: ["name", "price"]
            }
          }
        }
      },
      headers: {},
      responseExample: null,
      requiresAuth: false,
      tags: ["products"]
    },
    {
      id: "orders-list",
      name: "List Orders",
      category: "Orders",
      description: "Get a list of all orders",
      path: "/api/v1/orders",
      method: "GET",
      parameters: [
        {
          name: "page",
          in: "query",
          description: "Page number",
          required: false,
          type: "integer",
          default: 1
        },
        {
          name: "limit",
          in: "query",
          description: "Number of orders per page",
          required: false,
          type: "integer",
          default: 10
        },
        {
          name: "userId",
          in: "query",
          description: "Filter by user ID",
          required: false,
          type: "string"
        },
        {
          name: "status",
          in: "query",
          description: "Filter by order status",
          required: false,
          type: "string",
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"]
        }
      ],
      headers: {},
      requestBody: null,
      responseExample: null,
      requiresAuth: false,
      tags: ["orders"]
    },
    {
      id: "orders-get",
      name: "Get Order",
      category: "Orders",
      description: "Get a specific order by ID",
      path: "/api/v1/orders/{id}",
      method: "GET",
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Order ID",
          required: true,
          type: "string"
        }
      ],
      headers: {},
      requestBody: null,
      responseExample: null,
      requiresAuth: false,
      tags: ["orders"]
    },
    {
      id: "orders-create",
      name: "Create Order",
      category: "Orders",
      description: "Create a new order",
      path: "/api/v1/orders",
      method: "POST",
      parameters: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID",
                  example: "usr_123456"
                },
                items: {
                  type: "array",
                  description: "Order items",
                  items: {
                    type: "object",
                    properties: {
                      productId: {
                        type: "string",
                        description: "Product ID",
                        example: "prod_123456"
                      },
                      quantity: {
                        type: "integer",
                        description: "Quantity",
                        example: 1
                      },
                      price: {
                        type: "number",
                        description: "Price per unit",
                        example: 999.99
                      }
                    },
                    required: ["productId", "quantity"]
                  }
                },
                shippingAddress: {
                  type: "object",
                  description: "Shipping address",
                  properties: {
                    street: {
                      type: "string",
                      description: "Street address",
                      example: "123 Main St"
                    },
                    city: {
                      type: "string",
                      description: "City",
                      example: "San Francisco"
                    },
                    state: {
                      type: "string",
                      description: "State/Province",
                      example: "CA"
                    },
                    postalCode: {
                      type: "string",
                      description: "Postal code",
                      example: "94105"
                    },
                    country: {
                      type: "string",
                      description: "Country",
                      example: "USA"
                    }
                  },
                  required: ["street", "city", "country"]
                }
              },
              required: ["userId", "items"]
            }
          }
        }
      },
      headers: {},
      responseExample: null,
      requiresAuth: false,
      tags: ["orders"]
    }
  ];

  // js/utils/storage-utils.ts
  function isStorageAvailable(type) {
    try {
      const storage = window[type];
      const testKey = `__storage_test__${Math.random()}`;
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
  function setLocalStorageItem(key, value, options = {}) {
    if (!isStorageAvailable("localStorage")) {
      console.warn("localStorage is not available");
      return;
    }
    const { expires, prefix = "" } = options;
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    const item = {
      value
    };
    if (expires) {
      item.expires = Date.now() + expires;
    }
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(item));
    } catch (error) {
      console.error("Error storing item in localStorage:", error);
    }
  }
  function getLocalStorageItem(key, options = {}) {
    if (!isStorageAvailable("localStorage")) {
      console.warn("localStorage is not available");
      return null;
    }
    const { prefix = "" } = options;
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    try {
      const json = localStorage.getItem(prefixedKey);
      if (!json) {
        return null;
      }
      const item = JSON.parse(json);
      if (item.expires && item.expires < Date.now()) {
        localStorage.removeItem(prefixedKey);
        return null;
      }
      return item.value;
    } catch (error) {
      console.error("Error retrieving item from localStorage:", error);
      return null;
    }
  }

  // js/modules/domain-state-manager.ts
  var DEFAULT_OPTIONS3 = {
    storageKey: "domain_state",
    enablePersistence: true
  };
  var DomainStateManager = class {
    /**
     * Creates a new DomainStateManager instance
     * @param options Manager options
     */
    constructor(options = {}) {
      this.options = { ...DEFAULT_OPTIONS3, ...options };
      this.state = {};
      this.viewer = this.options.viewer || null;
      logger.debug("DomainStateManager: Initializing");
    }
    /**
     * Initializes the manager
     */
    initialize() {
      try {
        if (this.options.enablePersistence) {
          this.loadState();
        }
        if (this.viewer) {
          this.viewer.initialize();
          this.updateViewer();
        }
        logger.info("DomainStateManager: Initialized successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateManager: Failed to initialize:", errorMessage);
      }
    }
    /**
     * Sets a state value
     * @param key State key
     * @param value State value
     * @param persist Whether to persist the updated state
     */
    setState(key, value, persist = true) {
      try {
        this.state[key] = value;
        this.updateViewer();
        if (persist && this.options.enablePersistence) {
          this.persistState();
        }
        logger.debug(`DomainStateManager: Set state value for key "${key}"`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`DomainStateManager: Failed to set state for key "${key}":`, errorMessage);
      }
    }
    /**
     * Gets a state value
     * @param key State key
     * @param defaultValue Default value if key doesn't exist
     * @returns State value or default value
     */
    getState(key, defaultValue) {
      return key in this.state ? this.state[key] : defaultValue;
    }
    /**
     * Gets the entire state object
     * @returns Complete state object
     */
    getAllState() {
      return { ...this.state };
    }
    /**
     * Removes a state value
     * @param key State key
     * @param persist Whether to persist the updated state
     */
    removeState(key, persist = true) {
      try {
        if (key in this.state) {
          delete this.state[key];
          this.updateViewer();
          if (persist && this.options.enablePersistence) {
            this.persistState();
          }
          logger.debug(`DomainStateManager: Removed state value for key "${key}"`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`DomainStateManager: Failed to remove state for key "${key}":`, errorMessage);
      }
    }
    /**
     * Clears all state values
     * @param persist Whether to persist the cleared state
     */
    clearState(persist = true) {
      try {
        this.state = {};
        this.updateViewer();
        if (persist && this.options.enablePersistence) {
          this.persistState();
        }
        logger.debug("DomainStateManager: Cleared all state values");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateManager: Failed to clear state:", errorMessage);
      }
    }
    /**
     * Updates the state viewer with current state
     */
    updateViewer() {
      if (this.viewer) {
        this.viewer.updateState(this.state);
      }
    }
    /**
     * Persists the current state to storage
     */
    persistState() {
      try {
        setLocalStorageItem(this.options.storageKey, this.state);
        logger.debug("DomainStateManager: State persisted to storage");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateManager: Failed to persist state:", errorMessage);
      }
    }
    /**
     * Loads state from storage
     */
    loadState() {
      try {
        const storedState = getLocalStorageItem(this.options.storageKey);
        if (storedState) {
          this.state = storedState;
          logger.debug("DomainStateManager: State loaded from storage");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateManager: Failed to load state from storage:", errorMessage);
      }
    }
    /**
     * Updates state from API response
     * @param response API response object
     * @param stateKey Optional key to extract from response
     */
    updateFromResponse(response, stateKey) {
      try {
        if (!response) return;
        if (stateKey && typeof response === "object" && stateKey in response) {
          this.setState(stateKey, response[stateKey]);
        } else if (typeof response === "object" && "state" in response) {
          const stateData = response.state;
          if (typeof stateData === "object" && stateData !== null) {
            for (const [key, value] of Object.entries(stateData)) {
              this.setState(key, value, false);
            }
            if (this.options.enablePersistence) {
              this.persistState();
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateManager: Failed to update state from response:", errorMessage);
      }
    }
    /**
     * Checks if a state key exists
     * @param key State key
     * @returns Whether the key exists
     */
    hasState(key) {
      return key in this.state;
    }
  };

  // js/utils/json-utils.ts
  function determineTokenType(token) {
    if (/^["'].*["']\s*:/.test(token)) {
      return "property";
    } else if (/^["'].*["']$/.test(token)) {
      return "string";
    } else if (/^-?\d+\.?\d*([eE][-+]?\d+)?$/.test(token)) {
      return "number";
    } else if (/^(true|false)$/.test(token)) {
      return "boolean";
    } else if (/^null$/.test(token)) {
      return "null";
    } else if (/^[{}\[\],]$/.test(token)) {
      return "punctuation";
    }
    return "unknown";
  }
  function formatJSON(jsonString) {
    if (!jsonString) return "";
    const escapeHtml2 = (text) => {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };
    const tokenize = (text) => {
      let result = text.replace(/({)|(})|(\[)|(\])|(,)/g, "$1$2$3$4$5\n");
      let indentLevel = 0;
      const lines = result.split("\n");
      result = lines.map((line) => {
        let indent = " ".repeat(indentLevel * 2);
        if (line.includes("}") || line.includes("]")) {
          indentLevel = Math.max(0, indentLevel - 1);
          indent = " ".repeat(indentLevel * 2);
        }
        const formattedLine = indent + line;
        if (line.includes("{") || line.includes("[")) {
          indentLevel++;
        }
        return formattedLine;
      }).join("\n");
      const tokens = result.match(/(".*?"|'.*?'|\{|\}|\[|\]|,|\d+\.\d+|\d+|true|false|null|[^",\{\}\[\]\s]+)/g) || [];
      return tokens.map((token) => {
        const escapedToken = escapeHtml2(token);
        const tokenType = determineTokenType(token);
        switch (tokenType) {
          case "property":
            return `<span class="json-property">${escapedToken}</span>`;
          case "string":
            return `<span class="json-string">${escapedToken}</span>`;
          case "number":
            return `<span class="json-number">${escapedToken}</span>`;
          case "boolean":
            return `<span class="json-boolean">${escapedToken}</span>`;
          case "null":
            return `<span class="json-null">${escapedToken}</span>`;
          case "punctuation":
            return `<span class="json-punctuation">${escapedToken}</span>`;
          default:
            return escapedToken;
        }
      }).join("");
    };
    try {
      const obj = JSON.parse(jsonString);
      const prettyJson = JSON.stringify(obj, null, 2);
      return tokenize(prettyJson);
    } catch (error) {
      return `<span class="json-error">Invalid JSON: ${escapeHtml2(String(error))}</span><br>${tokenize(jsonString)}`;
    }
  }
  function prettyPrintJSON(data) {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error formatting JSON: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  function getValueByPath(obj, path, defaultValue) {
    if (!obj || !path) return defaultValue;
    try {
      const parts = path.split(".");
      let current = obj;
      for (const part of parts) {
        if (current === void 0 || current === null) {
          return defaultValue;
        }
        current = current[part];
      }
      return current !== void 0 ? current : defaultValue;
    } catch (error) {
      console.error(`Error extracting path ${path}:`, error);
      return defaultValue;
    }
  }

  // js/components/DomainStateViewer.ts
  var DEFAULT_OPTIONS4 = {
    containerId: "domain-state-container",
    emptyStateMessage: "No domain state available."
  };
  var DomainStateViewer = class {
    /**
     * Creates a new DomainStateViewer instance
     * @param options Component options
     */
    constructor(options = {}) {
      this.options = { ...DEFAULT_OPTIONS4, ...options };
      this.container = getById(this.options.containerId);
      this.currentState = null;
      if (!this.container) {
        logger.warn(`DomainStateViewer: Container element with ID "${this.options.containerId}" not found`);
      }
    }
    /**
     * Initializes the viewer
     */
    initialize() {
      try {
        this.renderEmptyState();
        logger.debug("DomainStateViewer: Initialized successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateViewer: Failed to initialize:", errorMessage);
      }
    }
    /**
     * Updates the domain state display
     * @param state Domain state object
     */
    updateState(state) {
      if (!this.container) return;
      try {
        this.currentState = state;
        if (!state || Object.keys(state).length === 0) {
          this.renderEmptyState();
          return;
        }
        this.renderState(state);
        logger.debug("DomainStateViewer: State updated");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateViewer: Failed to update state:", errorMessage);
      }
    }
    /**
     * Renders the domain state
     * @param state Domain state object
     */
    renderState(state) {
      if (!this.container) return;
      let html = '<div class="space-y-4">';
      html += `
      <div class="flex justify-between items-center bg-bg-card p-3 rounded-md">
        <h3 class="text-lg font-semibold">Domain State</h3>
        <div>
          <button id="collapse-all-state" class="text-xs px-2 py-1 mr-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">
            Collapse All
          </button>
          <button id="expand-all-state" class="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">
            Expand All
          </button>
        </div>
      </div>
    `;
      for (const [key, value] of Object.entries(state)) {
        html += this.renderStateEntry(key, value);
      }
      html += "</div>";
      setHTML(this.container, html);
      this.setupEventListeners();
    }
    /**
     * Renders a state entry
     * @param key Entry key
     * @param value Entry value
     * @returns HTML for the entry
     */
    renderStateEntry(key, value) {
      const sectionId = `domain-state-section-${key.replace(/[^a-zA-Z0-9]/g, "")}`;
      const contentId = `${sectionId}-content`;
      const isComplex = typeof value === "object" && value !== null;
      let valueDisplay;
      if (isComplex) {
        try {
          valueDisplay = prettyPrintJSON(value);
        } catch (error) {
          valueDisplay = String(value);
        }
      } else {
        valueDisplay = String(value);
      }
      return `
      <div class="bg-bg-card rounded-md overflow-hidden">
        <div class="p-3 font-medium flex justify-between items-center cursor-pointer collapsible-header" data-target="${contentId}">
          <div class="flex items-center">
            <span class="collapse-icon mr-2">-</span>
            <span class="text-text-body">${key}</span>
          </div>
          <div class="text-sm text-text-muted">
            ${isComplex ? Array.isArray(value) ? `Array[${value.length}]` : `Object` : typeof value}
          </div>
        </div>
        <div id="${contentId}" class="p-3 border-t border-border collapsible-content">
          ${isComplex ? `<pre class="text-sm overflow-x-auto">${valueDisplay}</pre>` : `<div class="text-sm">${valueDisplay}</div>`}
        </div>
      </div>
    `;
    }
    /**
     * Renders the empty state message
     */
    renderEmptyState() {
      if (!this.container) return;
      const html = `
      <div class="bg-bg-card p-6 rounded-md text-center text-text-muted">
        <p>${this.options.emptyStateMessage}</p>
      </div>
    `;
      setHTML(this.container, html);
    }
    /**
     * Sets up event listeners for interactive elements
     */
    setupEventListeners() {
      if (!this.container) return;
      const headers = this.container.querySelectorAll(".collapsible-header");
      headers.forEach((header) => {
        header.addEventListener("click", () => {
          const targetId = header.dataset.target;
          if (!targetId) return;
          const content = getById(targetId);
          if (!content) return;
          const isHidden = content.style.display === "none";
          toggleElement(content, isHidden);
          const icon = header.querySelector(".collapse-icon");
          if (icon) {
            icon.textContent = isHidden ? "-" : "+";
          }
        });
      });
      const expandAllBtn = getById("expand-all-state");
      if (expandAllBtn) {
        expandAllBtn.addEventListener("click", () => {
          const contents = this.container?.querySelectorAll(".collapsible-content");
          if (!contents) return;
          contents.forEach((content) => {
            content.style.display = "block";
          });
          const icons = this.container?.querySelectorAll(".collapse-icon");
          if (icons) {
            icons.forEach((icon) => {
              icon.textContent = "-";
            });
          }
        });
      }
      const collapseAllBtn = getById("collapse-all-state");
      if (collapseAllBtn) {
        collapseAllBtn.addEventListener("click", () => {
          const contents = this.container?.querySelectorAll(".collapsible-content");
          if (!contents) return;
          contents.forEach((content) => {
            content.style.display = "none";
          });
          const icons = this.container?.querySelectorAll(".collapse-icon");
          if (icons) {
            icons.forEach((icon) => {
              icon.textContent = "+";
            });
          }
        });
      }
    }
    /**
     * Gets the current domain state
     * @returns Current domain state or null
     */
    getState() {
      return this.currentState;
    }
    /**
     * Clears the domain state display
     */
    clear() {
      this.currentState = null;
      this.renderEmptyState();
    }
  };

  // js/utils/string-utils.ts
  function escapeHtml(html) {
    if (!html) return "";
    return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // js/components/ResponseViewer.ts
  var DEFAULT_OPTIONS5 = {
    containerId: "response-container",
    responseHeadersId: "response-headers",
    responseBodyId: "response-body"
  };
  var ResponseViewer = class {
    /**
     * Creates a new ResponseViewer instance
     * @param options Component options
     */
    constructor(options = {}) {
      this.options = { ...DEFAULT_OPTIONS5, ...options };
      this.container = getById(this.options.containerId);
      this.responseHeaders = getById(this.options.responseHeadersId);
      this.responseBody = getById(this.options.responseBodyId);
      this.currentResponse = null;
      this.currentHeaders = {};
      this.currentStatus = 0;
      this.formatter = this.options.formatter || (typeof JSONFormatter !== "undefined" ? JSONFormatter : null);
      if (!this.container) {
        logger.warn(`ResponseViewer: Container element with ID "${this.options.containerId}" not found`);
      }
    }
    /**
     * Displays API response data
     * @param response Response data
     * @param headers Response headers
     * @param status HTTP status code
     */
    display(response, headers = {}, status = 200) {
      this.currentResponse = response;
      this.currentHeaders = headers;
      this.currentStatus = status;
      this.displayResponseHeaders();
      this.displayResponseBody();
      if (this.container) {
        this.container.style.display = "";
      }
    }
    /**
     * Clears the response viewer
     */
    clear() {
      this.currentResponse = null;
      this.currentHeaders = {};
      this.currentStatus = 0;
      if (this.responseHeaders) {
        this.responseHeaders.innerHTML = "";
      }
      if (this.responseBody) {
        this.responseBody.innerHTML = "";
      }
      if (this.container) {
        this.container.style.display = "none";
      }
    }
    /**
     * Gets the current response data
     * @returns Current response data
     */
    getResponse() {
      return this.currentResponse;
    }
    /**
     * Gets the current response headers
     * @returns Current response headers
     */
    getHeaders() {
      return { ...this.currentHeaders };
    }
    /**
     * Gets the current HTTP status code
     * @returns Current HTTP status code
     */
    getStatus() {
      return this.currentStatus;
    }
    /**
     * Displays response headers
     */
    displayResponseHeaders() {
      if (!this.responseHeaders) return;
      const statusClass = this.getStatusClass(this.currentStatus);
      const statusText = this.getStatusText(this.currentStatus);
      let html = `
      <div class="mb-2">
        <span class="font-semibold">Status:</span> 
        <span class="${statusClass}">${this.currentStatus} ${statusText}</span>
      </div>
    `;
      if (Object.keys(this.currentHeaders).length > 0) {
        html += '<div class="mb-2"><span class="font-semibold">Headers:</span></div>';
        html += '<ul class="text-sm ml-2 border-l-2 border-gray-300 pl-3 mb-4">';
        Object.entries(this.currentHeaders).forEach(([name, value]) => {
          html += `<li><span class="font-medium">${escapeHtml(name)}</span>: ${escapeHtml(String(value))}</li>`;
        });
        html += "</ul>";
      }
      setHTML(this.responseHeaders, html);
    }
    /**
     * Displays response body
     */
    displayResponseBody() {
      if (!this.responseBody || this.currentResponse === null) return;
      try {
        if (typeof this.currentResponse === "object") {
          this.displayJsonResponse(this.currentResponse);
        } else if (typeof this.currentResponse === "string") {
          try {
            const jsonObject = JSON.parse(this.currentResponse);
            this.displayJsonResponse(jsonObject);
          } catch (e) {
            this.displayTextResponse(this.currentResponse);
          }
        } else {
          this.displayTextResponse(String(this.currentResponse));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Error displaying response:", errorMessage);
        setHTML(
          this.responseBody,
          `<div class="text-red-500 p-2">Error displaying response: ${escapeHtml(errorMessage)}</div>`
        );
      }
    }
    /**
     * Displays JSON response with formatter
     * @param json JSON object to display
     */
    displayJsonResponse(json) {
      if (!this.responseBody) return;
      this.responseBody.innerHTML = "";
      if (this.formatter) {
        try {
          const formatter = new this.formatter(json);
          this.responseBody.appendChild(formatter.render());
          return;
        } catch (error) {
          logger.warn("Error using JSONFormatter, falling back to basic formatting:", error);
        }
      }
      const formattedJson = formatJSON(JSON.stringify(json));
      const wrapper = createElement("div", { class: "json-viewer overflow-auto" });
      wrapper.innerHTML = formattedJson;
      this.responseBody.appendChild(wrapper);
    }
    /**
     * Displays text response
     * @param text Text to display
     */
    displayTextResponse(text) {
      if (!this.responseBody) return;
      const isHtml = text.trim().startsWith("<") && text.trim().endsWith(">");
      if (isHtml) {
        const iframe = createElement("iframe", {
          class: "w-full h-96 border border-gray-300 rounded",
          sandbox: "allow-same-origin"
        });
        this.responseBody.innerHTML = "";
        this.responseBody.appendChild(iframe);
        const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDocument) {
          iframeDocument.open();
          iframeDocument.write(text);
          iframeDocument.close();
        }
      } else {
        const pre = createElement("pre", {
          class: "bg-gray-100 p-4 rounded overflow-auto text-sm"
        });
        pre.textContent = text;
        this.responseBody.innerHTML = "";
        this.responseBody.appendChild(pre);
      }
    }
    /**
     * Gets the appropriate CSS class for a status code
     * @param status HTTP status code
     * @returns CSS class name
     */
    getStatusClass(status) {
      if (status >= 200 && status < 300) {
        return "text-green-600 font-medium";
      } else if (status >= 300 && status < 400) {
        return "text-blue-600 font-medium";
      } else if (status >= 400 && status < 500) {
        return "text-amber-600 font-medium";
      } else if (status >= 500) {
        return "text-red-600 font-medium";
      } else {
        return "text-gray-600 font-medium";
      }
    }
    /**
     * Gets status text for a status code
     * @param status HTTP status code
     * @returns Status text
     */
    getStatusText(status) {
      const statusTexts = {
        200: "OK",
        201: "Created",
        204: "No Content",
        301: "Moved Permanently",
        302: "Found",
        304: "Not Modified",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        422: "Unprocessable Entity",
        429: "Too Many Requests",
        500: "Internal Server Error",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout"
      };
      return statusTexts[status] || "";
    }
  };

  // js/components/VariableExtractor.ts
  var VariableExtractor = class {
    /**
     * Creates a new variable extractor
     * @param options Options for the extractor
     */
    constructor(options = {}) {
      this.options = options;
      this.extractionPatterns = [];
      this.extractedVariables = {};
    }
    /**
     * Adds an extraction pattern
     * @param pattern Extraction pattern to add
     * @returns This instance for chaining
     */
    addPattern(pattern) {
      this.extractionPatterns.push(pattern);
      return this;
    }
    /**
     * Adds multiple extraction patterns
     * @param patterns Extraction patterns to add
     * @returns This instance for chaining
     */
    addPatterns(patterns) {
      this.extractionPatterns.push(...patterns);
      return this;
    }
    /**
     * Removes an extraction pattern by name
     * @param name Name of the pattern to remove
     * @returns This instance for chaining
     */
    removePattern(name) {
      this.extractionPatterns = this.extractionPatterns.filter((pattern) => pattern.name !== name);
      return this;
    }
    /**
     * Clears all extraction patterns
     * @returns This instance for chaining
     */
    clearPatterns() {
      this.extractionPatterns = [];
      return this;
    }
    /**
     * Gets all extraction patterns
     * @returns Array of extraction patterns
     */
    getPatterns() {
      return [...this.extractionPatterns];
    }
    /**
     * Gets a specific extraction pattern by name
     * @param name Name of the pattern to get
     * @returns The pattern or undefined if not found
     */
    getPattern(name) {
      return this.extractionPatterns.find((pattern) => pattern.name === name);
    }
    /**
     * Extracts variables from response data
     * @param data Response data to extract from
     * @param clearExisting Whether to clear existing extracted variables
     * @returns Object containing extracted variables
     */
    extract(data, clearExisting = true) {
      if (clearExisting) {
        this.extractedVariables = {};
      }
      for (const pattern of this.extractionPatterns) {
        try {
          const value = getValueByPath(data, pattern.path, pattern.defaultValue);
          if (pattern.required && (value === void 0 || value === null)) {
            throw new Error(`Required variable '${pattern.name}' not found at path '${pattern.path}'`);
          }
          this.extractedVariables[pattern.name] = value;
          if (this.options.onVariableExtracted) {
            this.options.onVariableExtracted(pattern.name, value);
          }
        } catch (error) {
          const extractionError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`Error extracting variable '${pattern.name}': ${extractionError.message}`);
          if (this.options.onExtractionError) {
            this.options.onExtractionError(extractionError, pattern);
          }
          if (pattern.defaultValue !== void 0) {
            this.extractedVariables[pattern.name] = pattern.defaultValue;
          }
        }
      }
      if (this.options.onExtractionComplete) {
        this.options.onExtractionComplete({ ...this.extractedVariables });
      }
      return { ...this.extractedVariables };
    }
    /**
     * Gets all extracted variables
     * @returns Object containing all extracted variables
     */
    getVariables() {
      return { ...this.extractedVariables };
    }
    /**
     * Gets a specific variable value
     * @param name Name of the variable
     * @returns Variable value or undefined if not found
     */
    getVariable(name) {
      return this.extractedVariables[name];
    }
    /**
     * Sets a variable value manually
     * @param name Name of the variable
     * @param value Value to set
     * @returns This instance for chaining
     */
    setVariable(name, value) {
      this.extractedVariables[name] = value;
      if (this.options.onVariableExtracted) {
        this.options.onVariableExtracted(name, value);
      }
      return this;
    }
    /**
     * Clears all extracted variables
     * @returns This instance for chaining
     */
    clearVariables() {
      this.extractedVariables = {};
      return this;
    }
    /**
     * Extracts variables from a JSON response string
     * @param jsonString JSON string to extract from
     * @param clearExisting Whether to clear existing extracted variables
     * @returns Object containing extracted variables
     */
    extractFromJson(jsonString, clearExisting = true) {
      try {
        const data = JSON.parse(jsonString);
        return this.extract(data, clearExisting);
      } catch (error) {
        const parseError = error instanceof Error ? error : new Error(String(error));
        logger.error("Error parsing JSON:", parseError.message);
        if (clearExisting) {
          this.extractedVariables = {};
        }
        return { ...this.extractedVariables };
      }
    }
    /**
     * Parses a response and extracts variables based on content type
     * @param response Response object
     * @param contentType Content type of the response
     * @param clearExisting Whether to clear existing extracted variables
     * @returns Object containing extracted variables
     */
    extractFromResponse(response, contentType, clearExisting = true) {
      return new Promise(async (resolve, reject) => {
        try {
          if (response instanceof Response) {
            const responseContentType = contentType || response.headers.get("content-type") || "";
            if (responseContentType.includes("application/json")) {
              const jsonData = await response.json();
              const variables = this.extract(jsonData, clearExisting);
              resolve(variables);
            } else if (responseContentType.includes("text/")) {
              const textData = await response.text();
              try {
                const jsonData = JSON.parse(textData);
                const variables = this.extract(jsonData, clearExisting);
                resolve(variables);
              } catch {
                const variables = this.extract({ text: textData }, clearExisting);
                resolve(variables);
              }
            } else {
              const variables = this.extract(response, clearExisting);
              resolve(variables);
            }
          } else {
            const variables = this.extract(response, clearExisting);
            resolve(variables);
          }
        } catch (error) {
          const extractionError = error instanceof Error ? error : new Error(String(error));
          logger.error("Error extracting variables from response:", extractionError.message);
          reject(extractionError);
        }
      });
    }
  };

  // js/controllers/AppController.ts
  var AppController = class {
    /**
     * Constructor
     */
    constructor() {
      this.initializeManagers();
      this.uiManager = new UIManager();
      this.setupUIComponents();
      this.flowController = new FlowController({
        endpointManager: this.endpointManager,
        uiManager: this.uiManager,
        variableManager: this.variableManager,
        historyManager: this.historyManager
      });
    }
    /**
     * Initialize all manager modules
     */
    initializeManagers() {
      const variableManagerOptions = {
        persistVariables: true,
        storageKey: "api_admin_variables"
      };
      this.variableManager = new VariableManager(variableManagerOptions);
      const endpointManagerOptions = {
        useLocalEndpoints: true,
        supportMultipleFormats: true
      };
      this.endpointManager = new EndpointManager(endpointManagerOptions);
      const statusManagerOptions = {
        healthEndpoint: "/api/v1/health",
        refreshInterval: 3e4,
        autoRefresh: true
      };
      this.statusManager = new StatusManager(statusManagerOptions);
      this.historyManager = new HistoryManager({
        maxEntries: 50,
        persistHistory: true
      });
      this.logsManager = new BackendLogsManager({
        logsEndpoint: "/api/v1/logs",
        maxLogsToFetch: 100,
        autoRefresh: true
      });
      const domainStateOptions = {
        apiBasePath: "/api/v1",
        snapshotBeforeRequest: true,
        snapshotAfterRequest: true
      };
      this.domainStateManager = new DomainStateManager(domainStateOptions);
    }
    /**
     * Set up UI components
     */
    setupUIComponents() {
      const resultsElement = document.getElementById("results");
      if (resultsElement) {
        const responseViewerOptions = {
          container: resultsElement,
          variableManager: this.variableManager,
          showCopyButton: true,
          showDownloadButton: true
        };
        this.responseViewer = new ResponseViewer(responseViewerOptions);
      }
      const variableExtractorOptions = {
        variableManager: this.variableManager,
        autoExtract: true,
        suggestionLimit: 5
      };
      this.variableExtractor = new VariableExtractor(variableExtractorOptions);
      const domainStateContainer = document.getElementById("domain-state-viewer");
      if (domainStateContainer) {
        const domainStateViewerOptions = {
          container: domainStateContainer,
          onRequestNeeded: () => this.handleRequestFromDomainState(),
          autoFetchEntityTypes: true
        };
        this.domainStateViewer = new DomainStateViewer(domainStateViewerOptions);
      }
    }
    /**
     * Initialize the application
     * @param config Application configuration
     */
    initialize(config) {
      this.config = config;
      if (config) {
        this.applyConfiguration(config);
      }
      if (bundledEndpoints) {
        this.endpointManager.loadEndpoints();
      }
      this.setupEventListeners();
      this.flowController.initialize();
      this.loadUserPreferences();
      this.statusManager.refreshStatus();
      console.log("AppController initialized");
    }
    /**
     * Apply configuration to all modules
     * @param config Application configuration
     */
    applyConfiguration(config) {
      if (config.get("endpoints.customEndpointsPath")) {
        this.endpointManager.setDynamicEndpointsPath(config.get("endpoints.customEndpointsPath"));
      }
      const theme = config.get("ui.theme");
      if (theme) {
        document.body.classList.toggle("dark-mode", theme === "dark");
      }
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
      const sendButton = document.getElementById("send-button");
      if (sendButton) {
        sendButton.addEventListener("click", () => this.handleSendRequest());
      }
      const tabButtons = document.querySelectorAll(".tab-button");
      tabButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const tabName = e.target.getAttribute("data-tab");
          if (tabName) {
            this.activateTab(tabName);
          }
        });
      });
    }
    /**
     * Activate a tab
     * @param tabName Name of the tab to activate
     */
    activateTab(tabName) {
      const tabButtons = document.querySelectorAll(".tab-button");
      tabButtons.forEach((button) => {
        button.classList.toggle("active", button.getAttribute("data-tab") === tabName);
      });
      const tabContents = document.querySelectorAll("[data-tab-content]");
      tabContents.forEach((content) => {
        content.classList.toggle("hidden", content.getAttribute("data-tab-content") !== tabName);
        content.classList.toggle("active", content.getAttribute("data-tab-content") === tabName);
      });
    }
    /**
     * Handle send request button click
     */
    handleSendRequest() {
      const method = document.getElementById("method-select")?.value || "GET";
      const url = document.getElementById("url-input")?.value || "";
      if (!url) {
        this.showError("Please enter a URL");
        return;
      }
      const params = {};
      const headers = {};
      const body = null;
      const request = {
        method,
        url: this.variableManager.replaceVariables(url),
        params,
        headers,
        body
      };
      if (this.domainStateViewer) {
        this.domainStateManager.takeBeforeSnapshot(this.domainStateViewer.selectedEntityTypes);
      }
      this.sendRequest(request).then((response) => {
        this.responseViewer.display(response);
        if (this.domainStateViewer) {
          this.domainStateManager.takeAfterSnapshot(this.domainStateViewer.selectedEntityTypes).then(() => {
            console.log("Snapshot comparison complete, diffs available");
            const diffs = this.domainStateManager.getDiffs();
            if (diffs && Object.keys(diffs).length > 0) {
              console.log("Domain state changes detected:", diffs);
            }
          });
        }
        const suggestions = this.variableExtractor.suggestVariables(response);
        const suggestionContainer = document.getElementById("variable-suggestions");
        if (suggestionContainer && suggestions.length > 0) {
          this.variableExtractor.renderSuggestions(
            suggestionContainer,
            suggestions,
            (suggestion) => {
              console.log("Variable added:", suggestion);
            }
          );
        }
        this.historyManager.addEntry(request, {
          data: response,
          status: 200,
          headers: {},
          duration: 0
        });
      }).catch((error) => {
        this.showError(`Request failed: ${error.message}`);
        this.responseViewer.display({
          error: true,
          message: error.message
        });
      });
    }
    /**
     * Send an API request
     * @param request Request object
     * @returns Promise with response
     */
    async sendRequest(request) {
      const { method, url, headers, body } = request;
      const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : void 0
      };
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status} ${response.statusText}`);
      }
      return response.json();
    }
    /**
     * Show an error message
     * @param message Error message
     */
    showError(message) {
      console.error(message);
      this.uiManager.showError(message);
    }
    /**
     * Handle request initiated from domain state viewer
     */
    handleRequestFromDomainState() {
      console.log("Request initiated from domain state viewer");
    }
    /**
     * Load user preferences
     */
    loadUserPreferences() {
    }
  };
  var AppController_default = new AppController();

  // js/config/config.ts
  var Config = class {
    /**
     * Creates a new Config instance
     * @param initialConfig - Initial configuration values
     */
    constructor(initialConfig = {}) {
      this.config = {
        // Default configuration
        apiBaseUrl: "http://localhost:3000",
        // Base URL for API requests
        apiVersion: "v1",
        // API version
        useApiVersionPrefix: true,
        // Whether to use API version in URL
        requestTimeout: 3e4,
        // Request timeout in milliseconds
        maxHistoryItems: 50,
        // Maximum number of history items to store
        theme: "light",
        // UI theme (light, dark, auto)
        ...initialConfig
        // Override with provided values
      };
      this._loadFromStorage();
    }
    /**
     * Gets a configuration value using dot notation
     * @param key - The configuration key (supports dot notation)
     * @param defaultValue - Default value if key not found
     * @returns The configuration value
     */
    get(key, defaultValue = null) {
      const parts = key.split(".");
      let current = this.config;
      for (const part of parts) {
        if (current === null || current === void 0 || typeof current !== "object") {
          return defaultValue;
        }
        if (!(part in current)) {
          return defaultValue;
        }
        current = current[part];
      }
      return current !== void 0 ? current : defaultValue;
    }
    /**
     * Sets a configuration value with support for dot notation
     * @param key - The configuration key
     * @param value - The configuration value
     */
    set(key, value) {
      const parts = key.split(".");
      let current = this.config;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || current[part] === null || typeof current[part] !== "object") {
          current[part] = {};
        }
        current = current[part];
      }
      current[parts[parts.length - 1]] = value;
      this._saveToStorage();
    }
    /**
     * Sets multiple configuration values
     * @param values - The configuration values
     */
    setMultiple(values) {
      Object.assign(this.config, values);
      this._saveToStorage();
    }
    /**
     * Gets all configuration values
     * @returns The configuration object
     */
    getAll() {
      return { ...this.config };
    }
    /**
     * Resets configuration to defaults
     * @returns Promise that resolves when reset is complete
     */
    async reset() {
      this.config = {
        apiBaseUrl: "http://localhost:3000",
        apiVersion: "v1",
        useApiVersionPrefix: true,
        requestTimeout: 3e4,
        maxHistoryItems: 50,
        theme: "light"
      };
      this._saveToStorage();
    }
    /**
     * Loads configuration from storage
     * @private
     */
    _loadFromStorage() {
      try {
        const storedConfig = localStorage.getItem("api-tester-config");
        if (storedConfig) {
          this.config = {
            ...this.config,
            ...JSON.parse(storedConfig)
          };
        }
      } catch (error) {
        console.error("Error loading configuration from storage:", error);
      }
    }
    /**
     * Saves configuration to storage
     * @private
     */
    _saveToStorage() {
      try {
        localStorage.setItem("api-tester-config", JSON.stringify(this.config));
      } catch (error) {
        console.error("Error saving configuration to storage:", error);
      }
    }
  };

  // js/ui/UIManagerAdapter.ts
  var UIManager2 = class {
    /**
     * Constructor
     * @param newUIManager The new UIManager component to wrap
     */
    constructor(newUIManager) {
      this.elements = {};
      this.toastContainer = null;
      this.loadingOverlay = null;
      this.newUIManager = newUIManager;
      this.initElements();
      this.initializeUI();
    }
    /**
     * Initialize elements
     */
    initElements() {
      const commonElements = [
        "results",
        "flow-menu",
        "method-select",
        "url-input",
        "send-button",
        "params-editor",
        "headers-editor",
        "body-editor",
        "auth-editor",
        "variable-suggestions",
        "status-panel",
        "status-dot",
        "status-text"
      ];
      commonElements.forEach((id) => {
        this.elements[id] = document.getElementById(id);
      });
    }
    /**
     * Initialize UI elements
     */
    initializeUI() {
      if (!document.getElementById("toast-container")) {
        this.toastContainer = document.createElement("div");
        this.toastContainer.id = "toast-container";
        this.toastContainer.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2";
        document.body.appendChild(this.toastContainer);
      } else {
        this.toastContainer = document.getElementById("toast-container");
      }
      if (!document.getElementById("loading-overlay")) {
        this.loadingOverlay = document.createElement("div");
        this.loadingOverlay.id = "loading-overlay";
        this.loadingOverlay.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden";
        const spinner = document.createElement("div");
        spinner.className = "animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600";
        this.loadingOverlay.appendChild(spinner);
        document.body.appendChild(this.loadingOverlay);
      } else {
        this.loadingOverlay = document.getElementById("loading-overlay");
      }
      this.initializeTheme();
    }
    /**
     * Show a toast message
     * @param message Message to display
     * @param type Type of toast (success, error, info, warning)
     * @param duration Duration in milliseconds
     */
    showToast(message, type = "info", duration = 3e3) {
      switch (type) {
        case "success":
          this.newUIManager.showSuccess(message, true, duration);
          break;
        case "error":
          this.newUIManager.showError("Error", message, false);
          break;
        default:
          this.newUIManager.showSuccess(message, true, duration);
          break;
      }
    }
    /**
     * Show error message
     * @param message Error message
     */
    showError(message) {
      this.newUIManager.showError("Error", message);
    }
    /**
     * Show success message
     * @param message Success message
     */
    showSuccess(message) {
      this.newUIManager.showSuccess(message);
    }
    /**
     * Show loading overlay
     */
    showLoading() {
      this.newUIManager.showLoading(true);
    }
    /**
     * Hide loading overlay
     */
    hideLoading() {
      this.newUIManager.showLoading(false);
    }
    /**
     * Initialize theme
     */
    initializeTheme() {
      const isDarkMode = localStorage.getItem("theme") === "dark" || localStorage.getItem("theme") !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDarkMode) {
        document.documentElement.classList.add("dark-mode");
      }
    }
    /**
     * Toggle theme
     */
    toggleTheme() {
      const isDark = document.documentElement.classList.contains("dark-mode");
      if (isDark) {
        document.documentElement.classList.remove("dark-mode");
        localStorage.setItem("theme", "light");
      } else {
        document.documentElement.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
      }
    }
    /**
     * Get an element by ID
     * @param id Element ID
     * @returns HTMLElement or null if not found
     */
    getElement(id) {
      return document.getElementById(id);
    }
    /**
     * Get elements by selector
     * @param selector CSS selector
     * @returns NodeList of elements
     */
    getElements(selector) {
      return document.querySelectorAll(selector);
    }
    /**
     * Static method to get an element by ID
     * @param id Element ID
     * @returns HTMLElement or null if not found
     */
    static getElement(id) {
      return document.getElementById(id);
    }
    /**
     * Static method to get elements by selector
     * @param selector CSS selector
     * @returns NodeList of elements
     */
    static getElements(selector) {
      return document.querySelectorAll(selector);
    }
    /**
     * Remove a toast element
     * @param toast Toast element to remove
     */
    removeToast(toast) {
      if (toast && toast.parentElement) {
        toast.classList.remove("translate-x-0");
        toast.classList.add("translate-x-full");
        setTimeout(() => {
          toast.remove();
        }, 300);
      }
    }
  };

  // js/main-new.ts
  document.addEventListener("DOMContentLoaded", () => {
    try {
      logger.info("Initializing API Admin Interface...");
      const config = new Config();
      const responseViewer = new ResponseViewer({
        containerId: "response-container"
      });
      const domainStateViewer = new DomainStateViewer({
        containerId: "domain-state-container"
      });
      const newUIManager = new UIManager({
        containerId: "app",
        responseViewer
      });
      const uiManager = new UIManager2(newUIManager);
      const endpointManager = new EndpointManager();
      const variableManager = new VariableManager({
        storageKey: "api_variables"
      });
      const domainStateManager = new DomainStateManager({
        viewer: domainStateViewer
      });
      const backendLogsManager = new BackendLogsManager({
        logsEndpoint: config.get("endpoints.logsEndpoint", "/api/v1/logs")
      });
      const statusManager = new StatusManager({
        healthEndpoint: config.get("endpoints.statusEndpoint", "/api/v1/status")
      });
      const historyManager = new HistoryManager({
        maxEntries: config.get("maxHistoryItems", 50)
      });
      const appController = new AppController();
      const flowController = new FlowController({
        endpointManager,
        uiManager,
        variableManager,
        historyManager
      });
      appController.initialize(config);
      flowController.initialize();
      window.onerror = (message, source, lineno, colno, error) => {
        logger.error("Global error:", error || message);
        newUIManager.showError("Application Error", `${message}
Line: ${lineno}, Column: ${colno}`);
        return true;
      };
      window.addEventListener("unhandledrejection", (event) => {
        logger.error("Unhandled promise rejection:", event.reason);
        newUIManager.showError("Promise Error", String(event.reason));
      });
      logger.info("API Admin Interface initialized successfully");
      if (true) {
        window.app = {
          config,
          uiManager: newUIManager,
          legacyUIManager: uiManager,
          endpointManager,
          variableManager,
          domainStateManager,
          backendLogsManager,
          statusManager,
          historyManager,
          appController,
          flowController
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error initializing application:", error);
      const appContainer = document.getElementById("app");
      if (appContainer) {
        appContainer.innerHTML = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4">
          <h2 class="font-bold">Application Initialization Error</h2>
          <p class="whitespace-pre-wrap">${errorMessage}</p>
        </div>
      `;
      }
    }
  });
})();
