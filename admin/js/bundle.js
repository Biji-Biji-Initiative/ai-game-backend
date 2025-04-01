"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b ||= {})
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

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
          tags: endpoint.tags || [],
          url: endpoint.url || "",
          isCustom: endpoint.isCustom || false
        };
        this.endpoints.push(processedEndpoint);
        const category = processedEndpoint.category || "Uncategorized";
        if (!this.categories.has(category)) {
          this.categories.set(category, []);
        }
        const categoryEndpoints = this.categories.get(category);
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
            tags: endpoint.tags || [],
            url: endpoint.url || "",
            isCustom: endpoint.isCustom || false
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
      if (!path || !method)
        return null;
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
      if (!endpoint.name) {
        throw new Error("Endpoint name is required");
      }
      if (!endpoint.url && !endpoint.path) {
        throw new Error("Either URL or path is required for the endpoint");
      }
      const customEndpoint = {
        id: endpoint.id || `custom-endpoint-${Date.now()}`,
        method: endpoint.method || "GET",
        name: endpoint.name,
        url: endpoint.url || "",
        path: endpoint.path || endpoint.url || "",
        description: endpoint.description || "",
        category: endpoint.category || "Custom",
        parameters: endpoint.parameters || [],
        headers: endpoint.headers || {},
        requestBody: endpoint.requestBody || null,
        responseExample: endpoint.responseExample || null,
        requiresAuth: endpoint.requiresAuth || false,
        tags: endpoint.tags || [],
        isCustom: true
      };
      this.endpoints.push(customEndpoint);
      const category = customEndpoint.category || "Custom";
      if (!this.categories.has(category)) {
        this.categories.set(category, []);
      }
      const categoryEndpoints = this.categories.get(category);
      if (categoryEndpoints) {
        categoryEndpoints.push(customEndpoint);
      }
      this.emit("endpoint:added", customEndpoint);
      return customEndpoint;
    }
    /**
     * Removes a custom endpoint
     * @param id - The endpoint ID
     * @returns Whether the endpoint was removed
     */
    removeCustomEndpoint(id) {
      var _a;
      const endpoint = this.getEndpointById(id);
      if (!endpoint || !endpoint.isCustom) {
        return false;
      }
      this.endpoints = this.endpoints.filter((e) => e.id !== id);
      const category = endpoint.category || "Custom";
      if (this.categories.has(category)) {
        const categoryEndpoints = this.categories.get(category);
        if (categoryEndpoints) {
          this.categories.set(
            category,
            categoryEndpoints.filter((e) => e.id !== id)
          );
          if (((_a = this.categories.get(category)) == null ? void 0 : _a.length) === 0) {
            this.categories.delete(category);
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

  // js/utils/logger.ts
  var DEFAULT_CONFIG = {
    level: "info",
    enableConsole: true,
    maxEntries: 1e3,
    prefix: "[Admin UI]"
  };
  var LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  var Logger = class {
    /**
     * Create a new Logger instance
     * @param config Logger configuration
     */
    constructor(config = {}) {
      this.entries = [];
      this.listeners = /* @__PURE__ */ new Set();
      this.config = __spreadValues(__spreadValues({}, DEFAULT_CONFIG), config);
    }
    /**
     * Log a message at debug level
     * @param message Log message
     * @param data Optional data to log
     */
    debug(message, data) {
      this.log("debug", message, data);
    }
    /**
     * Log a message at info level
     * @param message Log message
     * @param data Optional data to log
     */
    info(message, data) {
      this.log("info", message, data);
    }
    /**
     * Log a message at warn level
     * @param message Log message
     * @param data Optional data to log
     */
    warn(message, data) {
      this.log("warn", message, data);
    }
    /**
     * Log a message at error level
     * @param message Log message
     * @param data Optional data to log
     */
    error(message, data) {
      this.log("error", message, data);
    }
    /**
     * Log a message at the specified level
     * @param level Log level
     * @param message Log message
     * @param data Optional data to log
     */
    log(level, message, data) {
      if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.level]) {
        return;
      }
      const entry = {
        level,
        message: `${this.config.prefix} ${message}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        data
      };
      this.entries.push(entry);
      if (this.entries.length > this.config.maxEntries) {
        this.entries = this.entries.slice(-this.config.maxEntries);
      }
      if (this.config.enableConsole) {
        this.outputToConsole(entry);
      }
      this.notifyListeners(entry);
    }
    /**
     * Output a log entry to the console
     * @param entry Log entry to output
     */
    outputToConsole(entry) {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const prefix = `[${timestamp}]${entry.message}`;
      switch (entry.level) {
        case "debug":
          console.debug(prefix, entry.data || "");
          break;
        case "info":
          console.info(prefix, entry.data || "");
          break;
        case "warn":
          console.warn(prefix, entry.data || "");
          break;
        case "error":
          console.error(prefix, entry.data || "");
          break;
      }
    }
    /**
     * Get all log entries
     * @returns Array of log entries
     */
    getEntries() {
      return [...this.entries];
    }
    /**
     * Get log entries filtered by level
     * @param level Minimum log level to include
     * @returns Filtered log entries
     */
    getEntriesByLevel(level) {
      const levelPriority = LOG_LEVEL_PRIORITY[level];
      return this.entries.filter((entry) => LOG_LEVEL_PRIORITY[entry.level] >= levelPriority);
    }
    /**
     * Clear all log entries
     */
    clearEntries() {
      this.entries = [];
    }
    /**
     * Update logger configuration
     * @param config New configuration (partial)
     */
    updateConfig(config) {
      this.config = __spreadValues(__spreadValues({}, this.config), config);
    }
    /**
     * Add a log entry listener
     * @param listener Function to call when a new log entry is added
     */
    addListener(listener) {
      this.listeners.add(listener);
    }
    /**
     * Remove a log entry listener
     * @param listener Listener to remove
     */
    removeListener(listener) {
      this.listeners.delete(listener);
    }
    /**
     * Notify all listeners of a new log entry
     * @param entry Log entry to notify about
     */
    notifyListeners(entry) {
      this.listeners.forEach((listener) => {
        try {
          listener(entry);
        } catch (error) {
          console.error("Error in log listener:", error);
        }
      });
    }
  };
  var logger = new Logger();

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
        maxLogEntries: 500,
        fetchInterval: 0,
        ...options
      };
      this.apiClient = this.options.apiClient;
      this.logs = [];
      this.isLoadingLogs = false;
      this.lastError = null;
      this.eventListeners = /* @__PURE__ */ new Map();
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
    on(event, callback) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.push(callback);
      }
    }
    /**
     * Removes an event listener
     * @param event - The event name
     * @param callback - The callback function to remove
     */
    off(event, callback) {
      if (this.eventListeners.has(event)) {
        const listeners = this.eventListeners.get(event);
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
      if (this.eventListeners.has(event)) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
          listeners.forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              logger.error(`Error in backend logs event listener for ${event}:`, error);
            }
          });
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
        correlationId: options.correlationId || void 0,
        level: options.level || void 0,
        limit: options.limit || this.options.maxLogsToFetch,
        search: options.search || void 0,
        ...options
      };
      this.isLoadingLogs = true;
      this.emit("logs:loading", { options: fetchOptions });
      try {
        const url = new URL(this.options.logsEndpoint, window.location.origin);
        if (fetchOptions.correlationId)
          url.searchParams.append("correlationId", fetchOptions.correlationId);
        if (fetchOptions.level)
          url.searchParams.append("level", fetchOptions.level);
        if (fetchOptions.limit)
          url.searchParams.append("limit", String(fetchOptions.limit));
        if (fetchOptions.search)
          url.searchParams.append("search", fetchOptions.search);
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
        this.emit("logsReceived", this.logs);
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
  var DEFAULT_OPTIONS = {
    statusEndpoint: "/api/health",
    updateInterval: 3e4,
    // 30 seconds
    containerId: "api-status"
  };
  var StatusManager = class {
    /**
     * Creates a new StatusManager instance
     * @param options Manager options
     */
    constructor(options = {}) {
      this.statusElement = null;
      this.updateIntervalId = null;
      this.currentStatus = {
        status: "unknown",
        message: "Initializing...",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.options = { ...DEFAULT_OPTIONS, ...options };
      this.initializeUI();
      logger.debug("StatusManager: Initialized");
    }
    /**
     * Initialize UI elements
     */
    initializeUI() {
      if (this.options.containerId) {
        this.statusElement = document.getElementById(this.options.containerId);
      }
    }
    /**
     * Start monitoring API status
     */
    start() {
      this.checkStatus();
      this.updateIntervalId = window.setInterval(() => {
        this.checkStatus();
      }, this.options.updateInterval);
      logger.info("StatusManager: Started monitoring API status");
    }
    /**
     * Stop monitoring API status
     */
    stop() {
      if (this.updateIntervalId !== null) {
        window.clearInterval(this.updateIntervalId);
        this.updateIntervalId = null;
        logger.info("StatusManager: Stopped monitoring API status");
      }
    }
    /**
     * Check API server status
     */
    async checkStatus() {
      try {
        const response = await fetch(this.options.statusEndpoint);
        if (!response.ok) {
          this.updateStatus({
            status: "error",
            message: `API server returned status: ${response.status}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          return;
        }
        const statusData = await response.json();
        this.updateStatus(statusData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("StatusManager: Failed to check API status", errorMessage);
        this.updateStatus({
          status: "error",
          message: `Connection error: ${errorMessage}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    /**
     * Update the status information and UI
     * @param statusInfo New status information
     */
    updateStatus(statusInfo) {
      this.currentStatus = statusInfo;
      if (this.statusElement) {
        this.statusElement.classList.remove("status-ok", "status-degraded", "status-error", "status-unknown");
        this.statusElement.classList.add(`status-${statusInfo.status}`);
        const statusIndicator = this.statusElement.querySelector(".status-indicator");
        if (statusIndicator) {
          statusIndicator.className = "status-indicator";
          statusIndicator.classList.add(`status-${statusInfo.status}`);
        }
        const statusTextElement = this.statusElement.querySelector(".status-text");
        if (statusTextElement) {
          let statusText = "Unknown";
          switch (statusInfo.status) {
            case "ok":
              statusText = "Online";
              break;
            case "degraded":
              statusText = "Degraded";
              break;
            case "error":
              statusText = "Offline";
              break;
          }
          statusTextElement.textContent = statusText;
        }
      }
      if (statusInfo.status !== "ok") {
        logger.warn(`StatusManager: API status - ${statusInfo.status}${statusInfo.message ? ": " + statusInfo.message : ""}`);
      } else {
        logger.debug("StatusManager: API status - ok");
      }
    }
    /**
     * Get the current status information
     * @returns Current status information
     */
    getStatus() {
      return { ...this.currentStatus };
    }
    /**
     * Check if the API is currently available
     * @returns Whether the API is available
     */
    isApiAvailable() {
      return this.currentStatus.status === "ok" || this.currentStatus.status === "degraded";
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
     * Replace variable placeholders in a string
     * @param text Text to process
     * @returns Text with variables replaced
     */
    replaceVariables(text) {
      if (!text)
        return "";
      const prefix = this.options.variablePrefix || "$";
      const suffix = this.options.variableSuffix || "";
      if (suffix) {
        const variableRegex = new RegExp(`${prefix}(\\w+)${suffix}`, "g");
        return text.replace(variableRegex, (match, variableName) => {
          return this.getVariableValue(variableName, match);
        });
      } else {
        const variableRegex = new RegExp(`${prefix}(\\w+)`, "g");
        return text.replace(variableRegex, (match, variableName) => {
          return this.getVariableValue(variableName, match);
        });
      }
    }
    /**
     * Get variable value, or return the original text if variable not found
     * @param name Variable name
     * @param originalText Original text to return if variable not found
     * @returns Variable value or original text
     */
    getVariableValue(name, originalText) {
      const value = this.variables[name];
      if (value === void 0) {
        return originalText;
      }
      if (typeof value === "object") {
        return JSON.stringify(value);
      }
      return String(value);
    }
    /**
     * Find variables in a text string
     * @param text Text to search
     * @returns Array of variable names
     */
    findVariables(text) {
      if (!text)
        return [];
      const prefix = this.options.variablePrefix || "$";
      const suffix = this.options.variableSuffix || "";
      const variableNames = [];
      if (suffix) {
        const variableRegex = new RegExp(`${prefix}(\\w+)${suffix}`, "g");
        let match;
        while ((match = variableRegex.exec(text)) !== null) {
          variableNames.push(match[1]);
        }
      } else {
        const variableRegex = new RegExp(`${prefix}(\\w+)`, "g");
        let match;
        while ((match = variableRegex.exec(text)) !== null) {
          variableNames.push(match[1]);
        }
      }
      return variableNames;
    }
    /**
    * Check if a string contains variable references
    * @param text Text to check
    * @returns True if text contains variables
    */
    hasVariables(text) {
      if (!text)
        return false;
      const prefix = this.options.variablePrefix || "$";
      const suffix = this.options.variableSuffix || "";
      if (suffix) {
        const variableRegex = new RegExp(`${prefix}\\w+${suffix}`);
        return variableRegex.test(text);
      } else {
        const variableRegex = new RegExp(`${prefix}\\w+`);
        return variableRegex.test(text);
      }
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
      var _a;
      if (!response || !path)
        return void 0;
      const jsonPathIndicator = ((_a = this.options.variableSyntax) == null ? void 0 : _a.jsonPathIndicator) || "$";
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
      if (!path || path === ".")
        return [];
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
      if (!this.options.persistHistory)
        return;
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
      if (!data)
        return 0;
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
        this.uiManager.showError("Error", "Failed to save flows. Local storage may be full.");
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
      if (!flowMenu)
        return;
      flowMenu.innerHTML = "";
      this.flows.forEach((flow) => {
        var _a;
        const flowItem = document.createElement("div");
        flowItem.className = `flow-item p-2 my-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${((_a = this.activeFlow) == null ? void 0 : _a.id) === flow.id ? "bg-primary-100 dark:bg-primary-900" : ""}`;
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
      if (!this.activeFlow)
        return;
      const flowContainer = document.getElementById("flow-details");
      if (!flowContainer)
        return;
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
      if (!this.activeFlow)
        return;
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
      if (!this.activeFlow)
        return;
      const step = this.activeFlow.steps.find((s) => s.id === stepId);
      if (!step)
        return;
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
      var _a;
      const index = this.flows.findIndex((f) => f.id === flowId);
      if (index !== -1) {
        this.flows.splice(index, 1);
        this.saveFlows();
        if (((_a = this.activeFlow) == null ? void 0 : _a.id) === flowId) {
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
      if (!this.activeFlow)
        return;
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
      if (!this.activeFlow)
        return;
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
      if (!this.activeFlow)
        return;
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
      if (!this.activeFlow || this.isRunning)
        return;
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
        this.uiManager.showSuccess("Success", "Flow executed successfully");
      } catch (error) {
        console.error("Flow execution failed:", error);
        this.uiManager.showError("Error", `Flow execution failed: ${error instanceof Error ? error.message : String(error)}`);
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
        return path.split(".").reduce((o, p) => o == null ? void 0 : o[p], obj);
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

  // js/utils/dom-utils.ts
  function getElementById(id) {
    return document.getElementById(id);
  }
  function getById(id) {
    return getElementById(id);
  }
  function querySelector(selector, parent = document) {
    return parent.querySelector(selector);
  }
  function findElement(selector, parent = document) {
    return querySelector(selector, parent);
  }
  function querySelectorAll(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }
  function findElements(selector, parent = document) {
    return querySelectorAll(selector, parent);
  }
  function createElement(tagName, options) {
    const element = document.createElement(tagName);
    if (options == null ? void 0 : options.class) {
      element.className = options.class;
    }
    return element;
  }
  function setHTML(element, html) {
    if (element) {
      element.innerHTML = html;
    }
  }
  function addEventListener(element, eventType, handler, options) {
    if (element) {
      element.addEventListener(eventType, handler, options);
    }
  }
  function toggleElement(element, force) {
    if (!element)
      return;
    const isHidden = element.style.display === "none";
    if (force !== void 0) {
      element.style.display = force ? "" : "none";
    } else {
      element.style.display = isHidden ? "" : "none";
    }
  }
  function addEventListeners(selector, eventType, handler, options) {
    const elements = findElements(selector);
    elements.forEach((element) => {
      addEventListener(element, eventType, handler, options);
    });
  }

  // js/components/UIManagerNew.ts
  var UIManager = class {
    /**
     * Creates a new UIManager instance
     * @param options Configuration options
     */
    constructor(options = {}) {
      this.activeToasts = [];
      this.activeModals = [];
      this.theme = "light";
      this.eventListeners = /* @__PURE__ */ new Map();
      this.elements = /* @__PURE__ */ new Map();
      this.isInitialized = false;
      this.options = {
        containerId: "app-container",
        toastContainerId: "toast-container",
        loadingOverlayId: "loading-overlay",
        modalContainerId: "modal-container",
        debug: false,
        ...options
      };
      this.container = null;
      this.toastContainer = null;
      this.loadingOverlay = null;
      this.modalContainer = null;
      this.responseViewer = this.options.responseViewer || null;
      this.initElements();
    }
    /**
     * Initialize UI elements
     */
    initElements() {
      this.container = document.getElementById(this.options.containerId || "app-container");
      let toastContainer = document.getElementById(this.options.toastContainerId || "toast-container");
      if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = this.options.toastContainerId || "toast-container";
        toastContainer.className = "toast-container";
        document.body.appendChild(toastContainer);
      }
      this.toastContainer = toastContainer;
      let loadingOverlay = document.getElementById(this.options.loadingOverlayId || "loading-overlay");
      if (!loadingOverlay) {
        loadingOverlay = document.createElement("div");
        loadingOverlay.id = this.options.loadingOverlayId || "loading-overlay";
        loadingOverlay.className = "loading-overlay";
        loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">Loading...</div>
      `;
        loadingOverlay.style.display = "none";
        document.body.appendChild(loadingOverlay);
      }
      this.loadingOverlay = loadingOverlay;
      let modalContainer = document.getElementById(this.options.modalContainerId || "modal-container");
      if (!modalContainer) {
        modalContainer = document.createElement("div");
        modalContainer.id = this.options.modalContainerId || "modal-container";
        modalContainer.className = "modal-container";
        document.body.appendChild(modalContainer);
      }
      this.modalContainer = modalContainer;
      if (this.options.debug) {
        logger.debug("UIManager: Elements initialized");
      }
    }
    /**
     * Initialize UI
     */
    initializeUI() {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        this.setTheme(savedTheme);
      }
      this.cacheElements();
      this.setupEventListeners();
      this.isInitialized = true;
      if (this.options.onUiReady) {
        this.options.onUiReady();
      }
      if (this.options.debug) {
        logger.debug("UIManager: UI initialized");
      }
    }
    /**
     * Show a toast notification
     */
    showToast(options) {
      if (!this.toastContainer)
        return;
      const toastOptions = {
        id: options.id || `toast-${Date.now()}`,
        type: options.type || "info",
        title: options.title || "",
        message: options.message,
        duration: options.duration || 3e3,
        position: options.position || "top-right",
        closable: options.closable !== void 0 ? options.closable : true,
        onClose: options.onClose || (() => {
        }),
        dismissable: options.dismissable !== void 0 ? options.dismissable : true
      };
      const toast = document.createElement("div");
      toast.className = `toast toast-${toastOptions.type} toast-${toastOptions.position}`;
      toast.innerHTML = `
      ${toastOptions.title ? `<div class="toast-title">${toastOptions.title}</div>` : ""}
      <div class="toast-message">${toastOptions.message}</div>
      ${toastOptions.closable ? '<button class="toast-close">&times;</button>' : ""}
    `;
      this.toastContainer.appendChild(toast);
      this.activeToasts.push(toast);
      if (toastOptions.closable) {
        const closeButton = toast.querySelector(".toast-close");
        if (closeButton) {
          closeButton.addEventListener("click", () => {
            this.closeToast(toast);
            toastOptions.onClose();
          });
        }
      }
      if (toastOptions.duration > 0) {
        setTimeout(() => {
          this.closeToast(toast);
          toastOptions.onClose();
        }, toastOptions.duration);
      }
      setTimeout(() => {
        toast.classList.add("show");
      }, 10);
    }
    /**
     * Close a toast notification
     */
    closeToast(toast) {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        const index = this.activeToasts.indexOf(toast);
        if (index > -1) {
          this.activeToasts.splice(index, 1);
        }
      }, 300);
    }
    /**
     * Show a success toast
     */
    showSuccess(title, message, duration = 3e3) {
      this.showToast({
        type: "success",
        title,
        message,
        duration
      });
    }
    /**
     * Show an error toast
     */
    showError(title, message, duration = 5e3) {
      this.showToast({
        type: "error",
        title,
        message,
        duration
      });
    }
    /**
     * Show a warning toast
     */
    showWarning(title, message, duration = 4e3) {
      this.showToast({
        type: "warning",
        title,
        message,
        duration
      });
    }
    /**
     * Show an info toast
     */
    showInfo(title, message, duration = 3e3) {
      this.showToast({
        type: "info",
        title,
        message,
        duration
      });
    }
    /**
     * Show loading overlay
     */
    showLoading(message = "Loading...") {
      if (!this.loadingOverlay)
        return;
      const messageEl = this.loadingOverlay.querySelector(".loading-message");
      if (messageEl) {
        messageEl.textContent = message;
      }
      this.loadingOverlay.style.display = "flex";
    }
    /**
     * Hide loading overlay
     */
    hideLoading() {
      if (!this.loadingOverlay)
        return;
      this.loadingOverlay.style.display = "none";
    }
    /**
     * Show a modal dialog
     */
    showModal(options) {
      if (!this.modalContainer) {
        throw new Error("Modal container not found");
      }
      const modal = document.createElement("div");
      modal.className = `modal ${options.customClass || ""}`;
      if (options.size) {
        modal.classList.add(`modal-${options.size}`);
      }
      const modalContent = document.createElement("div");
      modalContent.className = "modal-content";
      if (options.title) {
        const modalHeader = document.createElement("div");
        modalHeader.className = "modal-header";
        modalHeader.innerHTML = `
        <h3 class="modal-title">${options.title}</h3>
        ${options.showClose !== false ? '<button class="modal-close">&times;</button>' : ""}
      `;
        modalContent.appendChild(modalHeader);
      }
      const modalBody = document.createElement("div");
      modalBody.className = "modal-body";
      if (typeof options.content === "string") {
        modalBody.innerHTML = options.content;
      } else if (options.content) {
        modalBody.appendChild(options.content);
      }
      modalContent.appendChild(modalBody);
      if (options.buttons && options.buttons.length > 0) {
        const modalFooter = document.createElement("div");
        modalFooter.className = "modal-footer";
        options.buttons.forEach((button) => {
          const buttonEl = document.createElement("button");
          buttonEl.className = `btn ${button.type ? `btn-${button.type}` : "btn-secondary"}`;
          buttonEl.textContent = button.text;
          buttonEl.addEventListener("click", () => {
            if (button.onClick) {
              button.onClick(modal);
            }
            if (button.closeOnClick !== false) {
              this.closeModal(modal);
            }
          });
          modalFooter.appendChild(buttonEl);
        });
        modalContent.appendChild(modalFooter);
      }
      modal.appendChild(modalContent);
      this.modalContainer.appendChild(modal);
      this.activeModals.push(modal);
      if (options.showClose !== false) {
        const closeButton = modal.querySelector(".modal-close");
        if (closeButton) {
          closeButton.addEventListener("click", () => {
            this.closeModal(modal);
            if (options.onClose) {
              options.onClose();
            }
          });
        }
      }
      if (options.closable !== false) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.closeModal(modal);
            if (options.onClose) {
              options.onClose();
            }
          }
        });
      }
      setTimeout(() => {
        modal.classList.add("show");
      }, 10);
      if (options.onOpen) {
        setTimeout(() => {
          if (options.onOpen) {
            options.onOpen();
          }
        }, 300);
      }
      return modal;
    }
    /**
     * Close a modal dialog
     */
    closeModal(modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        const index = this.activeModals.indexOf(modal);
        if (index > -1) {
          this.activeModals.splice(index, 1);
        }
      }, 300);
    }
    /**
     * Close all modal dialogs
     */
    closeAllModals() {
      [...this.activeModals].forEach((modal) => {
        this.closeModal(modal);
      });
    }
    /**
     * Show a confirmation dialog
     */
    confirm(title, message, onConfirm, onCancel) {
      this.showModal({
        title,
        content: `<p>${message}</p>`,
        size: "small",
        buttons: [
          {
            text: "Cancel",
            type: "secondary",
            onClick: () => {
              if (onCancel) {
                onCancel();
              }
            }
          },
          {
            text: "Confirm",
            type: "primary",
            onClick: () => {
              onConfirm();
            }
          }
        ]
      });
    }
    /**
     * Set the UI theme
     */
    setTheme(theme) {
      this.theme = theme;
      document.body.classList.remove("theme-light", "theme-dark");
      document.body.classList.add(`theme-${theme}`);
      localStorage.setItem("theme", theme);
    }
    /**
     * Get the current theme
     */
    getTheme() {
      return this.theme;
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
        var _a, _b;
        event.preventDefault();
        const target = (_b = (_a = event.target) == null ? void 0 : _a.dataset) == null ? void 0 : _b.target;
        this.emit("response:copy", target);
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
      if (!form)
        return;
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
    /**
     * Shows the loading indicator
     * @param show Whether to show or hide the indicator
     * @param message Optional message to display
     */
    setLoadingIndicator(show, message) {
      if (typeof this.options.showLoadingIndicator === "function") {
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
    try {
      if (!isStorageAvailable("localStorage")) {
        logger.warn("localStorage is not available");
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
      localStorage.setItem(prefixedKey, JSON.stringify(item));
      logger.debug(`LocalStorage: Set item "${prefixedKey}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to set localStorage item "${key}":`, errorMessage);
    }
  }
  function getLocalStorageItem(key, options = {}) {
    try {
      if (!isStorageAvailable("localStorage")) {
        logger.warn("localStorage is not available");
        return null;
      }
      const { prefix = "" } = options;
      const prefixedKey = prefix ? `${prefix}_${key}` : key;
      const json = localStorage.getItem(prefixedKey);
      if (!json) {
        return null;
      }
      const item = JSON.parse(json);
      if (item.expires && item.expires < Date.now()) {
        localStorage.removeItem(prefixedKey);
        logger.debug(`LocalStorage: Item "${prefixedKey}" expired and was removed`);
        return null;
      }
      logger.debug(`LocalStorage: Retrieved item "${prefixedKey}"`);
      return item.value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get localStorage item "${key}":`, errorMessage);
      return null;
    }
  }

  // js/modules/domain-state-manager.ts
  var DEFAULT_OPTIONS2 = {
    storageKey: "domain_state",
    enablePersistence: true,
    stateEndpoint: "/api/v1/state",
    diffingEnabled: true,
    storagePrefix: "admin_ui"
  };
  var DomainStateManager = class {
    /**
     * Creates a new DomainStateManager instance
     * @param options Manager options
     */
    constructor(options = {}) {
      this.state = {};
      this.previousState = {};
      this.options = { ...DEFAULT_OPTIONS2, ...options };
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
        if (this.options.diffingEnabled) {
          this.previousState = { ...this.state };
        }
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
        if (this.options.diffingEnabled) {
          this.previousState = { ...this.state };
        }
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
        if (this.options.diffingEnabled) {
          this.previousState = { ...this.state };
        }
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
        const diff = this.options.diffingEnabled ? this.calculateDiff(this.previousState, this.state) : null;
        this.viewer.updateState(this.state, diff);
      }
    }
    /**
    * Calculates the difference between previous and current state
    * @param oldState Previous state
    * @param newState Current state
    * @returns Diff object showing added, updated, and removed properties
    */
    calculateDiff(oldState, newState) {
      const diff = {
        added: {},
        updated: {},
        removed: {}
      };
      Object.keys(newState).forEach((key) => {
        if (!(key in oldState)) {
          diff.added[key] = newState[key];
        } else if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
          diff.updated[key] = {
            from: oldState[key],
            to: newState[key]
          };
        }
      });
      Object.keys(oldState).forEach((key) => {
        if (!(key in newState)) {
          diff.removed[key] = oldState[key];
        }
      });
      return diff;
    }
    /**
     * Persists the current state to storage
     */
    persistState() {
      try {
        const storageOptions = {
          prefix: this.options.storagePrefix
        };
        setLocalStorageItem(this.options.storageKey, this.state, storageOptions);
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
        const storageOptions = {
          prefix: this.options.storagePrefix
        };
        const storedState = getLocalStorageItem(
          this.options.storageKey,
          storageOptions
        );
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
        if (!response)
          return;
        if (this.options.diffingEnabled) {
          this.previousState = { ...this.state };
        }
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
    /**
     * Fetches current state from the API
     * @returns Promise resolving to the state data
     */
    async fetchStateFromApi() {
      try {
        const response = await fetch(this.options.stateEndpoint);
        if (!response.ok) {
          throw new Error(`API returned status: ${response.status}`);
        }
        const data = await response.json();
        if (this.options.diffingEnabled) {
          this.previousState = { ...this.state };
        }
        if (data && typeof data === "object") {
          if ("state" in data && typeof data.state === "object") {
            this.state = data.state;
          } else {
            this.state = data;
          }
          this.updateViewer();
          if (this.options.enablePersistence) {
            this.persistState();
          }
          logger.info("DomainStateManager: State fetched from API");
        }
        return this.getAllState();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateManager: Failed to fetch state from API:", errorMessage);
        throw error;
      }
    }
  };

  // js/components/DomainStateViewer.ts
  var DomainStateViewer = class {
    // Will use JSON Formatter library if available
    /**
     * Creates a new DomainStateViewer instance
     * @param options Viewer options
     */
    constructor(options) {
      this.container = null;
      this.currentState = {};
      this.jsonFormatter = null;
      this.options = options;
    }
    /**
     * Initializes the viewer
     */
    initialize() {
      try {
        this.container = document.getElementById(this.options.containerId);
        if (!this.container) {
          throw new Error(`Container element not found: ${this.options.containerId}`);
        }
        if (typeof window !== "undefined" && "JSONFormatter" in window) {
          this.jsonFormatter = window.JSONFormatter;
        }
        logger.debug("DomainStateViewer: Initialized");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateViewer: Initialization failed:", errorMessage);
      }
    }
    /**
     * Updates the viewer with new state data
     * @param state Current state object
     * @param diff Optional diff showing state changes
     */
    updateState(state, diff) {
      try {
        if (!this.container) {
          return;
        }
        this.currentState = { ...state };
        if (Object.keys(state).length === 0) {
          this.renderEmptyState();
        } else {
          this.renderState(state, diff);
        }
        logger.debug("DomainStateViewer: State updated");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("DomainStateViewer: Failed to update state:", errorMessage);
      }
    }
    /**
     * Renders empty state message
     */
    renderEmptyState() {
      if (!this.container)
        return;
      this.container.innerHTML = `
      <div class="empty-state">
        <p class="text-text-muted">No domain state data available</p>
      </div>
    `;
    }
    /**
     * Renders state content
     * @param state State object to render
     * @param diff Optional diff showing state changes
     */
    renderState(state, diff) {
      if (!this.container)
        return;
      this.container.innerHTML = "";
      const stateWrapper = document.createElement("div");
      stateWrapper.className = "domain-state-wrapper";
      const toolbar = document.createElement("div");
      toolbar.className = "domain-state-toolbar";
      toolbar.innerHTML = `
      <div class="state-info">
        <span class="state-count">${Object.keys(state).length} entities</span>
      </div>
      <div class="toolbar-actions">
        <button class="refresh-state-btn" title="Refresh State">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
        <button class="expand-all-btn" title="Expand All">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11l7-7 7 7M5 19l7-7 7 7"></path>
          </svg>
        </button>
        <button class="collapse-all-btn" title="Collapse All">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
    `;
      stateWrapper.appendChild(toolbar);
      if (diff && (Object.keys(diff.added).length > 0 || Object.keys(diff.updated).length > 0 || Object.keys(diff.removed).length > 0)) {
        const diffSummary = document.createElement("div");
        diffSummary.className = "state-diff-summary";
        let summaryHTML = '<div class="diff-title">Changes:</div><div class="diff-counts">';
        if (Object.keys(diff.added).length > 0) {
          summaryHTML += `<span class="diff-added">+${Object.keys(diff.added).length} added</span>`;
        }
        if (Object.keys(diff.updated).length > 0) {
          summaryHTML += `<span class="diff-updated">~${Object.keys(diff.updated).length} updated</span>`;
        }
        if (Object.keys(diff.removed).length > 0) {
          summaryHTML += `<span class="diff-removed">-${Object.keys(diff.removed).length} removed</span>`;
        }
        summaryHTML += "</div>";
        diffSummary.innerHTML = summaryHTML;
        stateWrapper.appendChild(diffSummary);
      }
      const contentContainer = document.createElement("div");
      contentContainer.className = "domain-state-content";
      if (this.jsonFormatter) {
        const formatter = new this.jsonFormatter(state);
        contentContainer.appendChild(formatter.render());
        if (diff) {
          this.addDiffHighlights(contentContainer, diff);
        }
      } else {
        const pre = document.createElement("pre");
        pre.className = "json-display";
        pre.textContent = JSON.stringify(state, null, 2);
        contentContainer.appendChild(pre);
      }
      stateWrapper.appendChild(contentContainer);
      this.container.appendChild(stateWrapper);
      this.addEventListeners(stateWrapper);
    }
    /**
     * Adds diff highlights to the rendered JSON
     * @param container Container element
     * @param diff State diff object
     */
    addDiffHighlights(container, diff) {
      const keyElements = container.querySelectorAll(".json-formatter-key");
      keyElements.forEach((keyElement) => {
        var _a, _b, _c;
        const key = (_a = keyElement.textContent) == null ? void 0 : _a.replace(":", "").trim();
        if (!key)
          return;
        if (key in diff.added) {
          (_b = keyElement.parentElement) == null ? void 0 : _b.classList.add("diff-added");
        } else if (key in diff.updated) {
          (_c = keyElement.parentElement) == null ? void 0 : _c.classList.add("diff-updated");
        } else if (key in diff.removed) {
        }
      });
    }
    /**
     * Adds event listeners to the state viewer
     * @param container Container element
     */
    addEventListeners(container) {
      const refreshBtn = container.querySelector(".refresh-state-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          const event = new CustomEvent("domainstate:refresh");
          document.dispatchEvent(event);
        });
      }
      const expandBtn = container.querySelector(".expand-all-btn");
      if (expandBtn) {
        expandBtn.addEventListener("click", () => {
          const toggles = container.querySelectorAll(".json-formatter-toggler-link");
          toggles.forEach((toggle) => {
            var _a;
            const open = (_a = toggle.parentElement) == null ? void 0 : _a.classList.contains("json-formatter-open");
            if (!open) {
              toggle.click();
            }
          });
        });
      }
      const collapseBtn = container.querySelector(".collapse-all-btn");
      if (collapseBtn) {
        collapseBtn.addEventListener("click", () => {
          const toggles = container.querySelectorAll(".json-formatter-toggler-link");
          toggles.forEach((toggle) => {
            var _a;
            const open = (_a = toggle.parentElement) == null ? void 0 : _a.classList.contains("json-formatter-open");
            if (open) {
              toggle.click();
            }
          });
        });
      }
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
    if (!jsonString)
      return "";
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
  function getValueByPath(obj, path, defaultValue) {
    if (!obj || !path)
      return defaultValue;
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

  // js/utils/string-utils.ts
  function escapeHtml(html) {
    if (!html)
      return "";
    return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // js/components/ResponseViewer.ts
  var DEFAULT_OPTIONS3 = {
    containerId: "response-container",
    responseHeadersId: "response-headers",
    responseBodyId: "response-body",
    responseStatusId: "response-status"
  };
  var ResponseViewer = class {
    /**
     * Creates a new ResponseViewer instance
     * @param options Component options
     */
    constructor(options = {}) {
      this.options = { ...DEFAULT_OPTIONS3, ...options };
      this.container = getById(this.options.containerId);
      this.responseHeaders = getById(this.options.responseHeadersId);
      this.responseBody = getById(this.options.responseBodyId);
      this.responseStatus = getById(this.options.responseStatusId);
      this.currentResponse = null;
      this.currentHeaders = {};
      this.currentStatus = 0;
      this.formatter = this.options.formatter || (typeof window !== "undefined" && window.JSONFormatter ? window.JSONFormatter : null);
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
      this.showResponseContainer();
    }
    /**
     * Shows the response container
     */
    showResponseContainer() {
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
      if (!this.responseHeaders)
        return;
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
      if (!this.responseBody || this.currentResponse === null)
        return;
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
      if (!this.responseBody)
        return;
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
      const wrapper = createElement("div", {
        class: "json-viewer overflow-auto"
      });
      wrapper.innerHTML = formattedJson;
      this.responseBody.appendChild(wrapper);
    }
    /**
     * Displays text response
     * @param text Text to display
     */
    displayTextResponse(text) {
      if (!this.responseBody)
        return;
      const isHtml = text.trim().startsWith("<") && text.trim().endsWith(">");
      if (isHtml) {
        const iframe = createElement("iframe", {
          class: "w-full h-96 border border-gray-300 rounded",
          sandbox: "allow-same-origin"
        });
        this.responseBody.innerHTML = "";
        this.responseBody.appendChild(iframe);
        if (iframe.contentDocument) {
          iframe.contentDocument.open();
          iframe.contentDocument.write(text);
          iframe.contentDocument.close();
        } else if (iframe.contentWindow && iframe.contentWindow.document) {
          iframe.contentWindow.document.open();
          iframe.contentWindow.document.write(text);
          iframe.contentWindow.document.close();
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
    /**
     * Show an API response in the viewer
     * @param response The API response object to display
     */
    showResponse(response) {
      if (!response) {
        this.clear();
        return;
      }
      this.currentResponse = response;
      if (response.headers) {
        this.currentHeaders = response.headers;
      }
      if (response.status) {
        this.currentStatus = response.status;
      }
      this.displayResponseHeaders();
      this.displayResponseBody();
      this.showResponseContainer();
    }
    /**
     * Show an error in the viewer
     * @param error The error to display
     */
    showError(error) {
      if (!error) {
        this.clear();
        return;
      }
      const response = {
        status: error.code || 0,
        statusText: "Error",
        headers: {},
        body: {
          error: error.message,
          details: error.details || "",
          stack: error.stack || ""
        }
      };
      this.currentResponse = response;
      this.displayResponseStatus("error");
      this.displayResponseBody();
      this.showResponseContainer();
    }
    /**
     * Displays response status
     */
    displayResponseStatus(type = "success") {
      if (!this.responseStatus || !this.currentResponse)
        return;
      const statusCode = this.currentResponse.status;
      const statusText = this.currentResponse.statusText;
      let statusClass = "status-unknown";
      if (type === "error" || statusCode >= 400) {
        statusClass = "status-error";
      } else if (statusCode >= 200 && statusCode < 300) {
        statusClass = "status-success";
      } else if (statusCode >= 300 && statusCode < 400) {
        statusClass = "status-redirect";
      } else if (statusCode === 0) {
        statusClass = "status-error";
      }
      let timeInfo = "";
      if (this.currentResponse.time) {
        const formattedTime = this.currentResponse.formattedTime || `${this.currentResponse.time}ms`;
        timeInfo = `<span class="response-time">${formattedTime}</span>`;
      }
      let sizeInfo = "";
      if (this.currentResponse.size) {
        sizeInfo = `<span class="response-size">${this.formatBytes(this.currentResponse.size)}</span>`;
      }
      this.responseStatus.innerHTML = `
      <div class="status-code ${statusClass}">${statusCode}</div>
      <div class="status-text">${statusText}</div>
      ${timeInfo}
      ${sizeInfo}
    `;
    }
    /**
     * Formats bytes to human-readable size
     */
    formatBytes(bytes, decimals = 2) {
      if (bytes === 0)
        return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
    }
  };

  // js/components/VariableExtractor.ts
  var VariableExtractor = class {
    /**
     * Creates a new variable extractor
     * @param options Options for the extractor
     */
    constructor(options = {}) {
      // Store response data for extraction
      this._responseData = null;
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
              } catch (e) {
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
    /**
     * Shows the variable extraction modal
     * @param responseData Response data to extract variables from
     */
    showExtractionModal(responseData) {
      this.createModal();
      this._responseData = responseData;
      this.suggestPaths(responseData);
      const modal = document.getElementById("variable-extractor-modal");
      if (modal) {
        modal.classList.remove("hidden");
      }
    }
    /**
     * Creates the variable extraction modal
     */
    createModal() {
      if (document.getElementById("variable-extractor-modal")) {
        return;
      }
      const modal = document.createElement("div");
      modal.id = "variable-extractor-modal";
      modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden";
      modal.innerHTML = `
      <div class="bg-bg-card p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">Extract Variables</h2>
          <button id="close-extractor-modal" class="text-text-muted hover:text-text">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Variable Name</label>
            <input id="variable-name-input" type="text" class="w-full px-3 py-2 border border-border rounded bg-bg text-sm" placeholder="e.g. userId">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">JSON Path</label>
            <div class="flex">
              <input id="variable-path-input" type="text" class="flex-1 px-3 py-2 border border-border rounded-l bg-bg text-sm" placeholder="e.g. data.user.id">
              <button id="test-path-btn" class="px-3 py-2 bg-primary-600 text-white rounded-r">Test</button>
            </div>
            <div id="path-suggestion-container" class="mt-1 text-xs text-text-muted"></div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Description (optional)</label>
            <input id="variable-description-input" type="text" class="w-full px-3 py-2 border border-border rounded bg-bg text-sm" placeholder="Optional description">
          </div>
          
          <div class="flex items-center">
            <input id="variable-required-checkbox" type="checkbox" class="mr-2">
            <label for="variable-required-checkbox" class="text-sm">Required (extraction fails if not found)</label>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Default Value (optional)</label>
            <input id="variable-default-input" type="text" class="w-full px-3 py-2 border border-border rounded bg-bg text-sm" placeholder="Default value if not found">
          </div>
          
          <div id="test-result-container" class="mt-2 p-3 border border-border rounded bg-bg-sidebar hidden">
            <div class="text-sm font-medium mb-1">Test Result:</div>
            <div id="test-result" class="text-sm font-mono break-all"></div>
          </div>
        </div>
        
        <div class="flex justify-end mt-6 space-x-2">
          <button id="cancel-extraction-btn" class="px-4 py-2 border border-border rounded text-text-muted hover:bg-bg-sidebar">
            Cancel
          </button>
          <button id="add-extraction-btn" class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
            Add Variable
          </button>
        </div>
      </div>
    `;
      document.body.appendChild(modal);
      this.setupModalEventListeners();
    }
    /**
     * Sets up event listeners for the variable extraction modal
     */
    setupModalEventListeners() {
      const closeBtn = document.getElementById("close-extractor-modal");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => this.hideModal());
      }
      const cancelBtn = document.getElementById("cancel-extraction-btn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => this.hideModal());
      }
      const testPathBtn = document.getElementById("test-path-btn");
      if (testPathBtn) {
        testPathBtn.addEventListener("click", () => this.testPath());
      }
      const addBtn = document.getElementById("add-extraction-btn");
      if (addBtn) {
        addBtn.addEventListener("click", () => this.addVariableFromModal());
      }
      const pathInput = document.getElementById("variable-path-input");
      if (pathInput) {
        pathInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            this.testPath();
          }
        });
      }
    }
    /**
     * Hides the variable extraction modal
     */
    hideModal() {
      const modal = document.getElementById("variable-extractor-modal");
      if (modal) {
        modal.classList.add("hidden");
      }
    }
    /**
     * Tests the current path against the response data
     */
    testPath() {
      if (!this._responseData) {
        this.showTestResult("No response data available", false);
        return;
      }
      const pathInput = document.getElementById("variable-path-input");
      if (!pathInput)
        return;
      const path = pathInput.value.trim();
      if (!path) {
        this.showTestResult("Please enter a path", false);
        return;
      }
      try {
        const value = getValueByPath(this._responseData, path, void 0);
        if (value === void 0) {
          this.showTestResult("Path not found in response data", false);
        } else {
          this.showTestResult(typeof value === "object" ? JSON.stringify(value, null, 2) : String(value), true);
        }
      } catch (error) {
        this.showTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`, false);
      }
    }
    /**
     * Shows the test result
     * @param result Result to show
     * @param success Whether the test was successful
     */
    showTestResult(result, success) {
      const resultContainer = document.getElementById("test-result-container");
      const resultElement = document.getElementById("test-result");
      if (resultContainer && resultElement) {
        resultContainer.classList.remove("hidden");
        resultContainer.classList.toggle("border-green-500", success);
        resultContainer.classList.toggle("border-red-500", !success);
        resultContainer.classList.toggle("bg-green-50", success);
        resultContainer.classList.toggle("bg-red-50", !success);
        resultElement.textContent = result;
      }
    }
    /**
     * Adds a variable from the modal inputs
     */
    addVariableFromModal() {
      const nameInput = document.getElementById("variable-name-input");
      const pathInput = document.getElementById("variable-path-input");
      const descriptionInput = document.getElementById("variable-description-input");
      const requiredCheckbox = document.getElementById("variable-required-checkbox");
      const defaultInput = document.getElementById("variable-default-input");
      if (!nameInput || !pathInput)
        return;
      const name = nameInput.value.trim();
      const path = pathInput.value.trim();
      if (!name) {
        this.showTestResult("Please enter a variable name", false);
        return;
      }
      if (!path) {
        this.showTestResult("Please enter a JSON path", false);
        return;
      }
      const pattern = {
        name,
        path,
        description: (descriptionInput == null ? void 0 : descriptionInput.value.trim()) || void 0,
        required: (requiredCheckbox == null ? void 0 : requiredCheckbox.checked) || false,
        defaultValue: (defaultInput == null ? void 0 : defaultInput.value.trim()) || void 0
      };
      this.addPattern(pattern);
      if (this._responseData) {
        try {
          const value = getValueByPath(this._responseData, path, pattern.defaultValue);
          this.setVariable(name, value);
          this.showTestResult(`Variable '${name}' extracted successfully`, true);
          setTimeout(() => this.hideModal(), 1e3);
        } catch (error) {
          this.showTestResult(`Error extracting variable: ${error instanceof Error ? error.message : String(error)}`, false);
        }
      } else {
        this.showTestResult(`Pattern added, but no response data to extract from`, true);
        setTimeout(() => this.hideModal(), 1e3);
      }
    }
    /**
     * Suggests paths based on response data
     * @param data Response data to suggest paths from
     */
    suggestPaths(data) {
      if (!data || typeof data !== "object")
        return;
      const suggestionsContainer = document.getElementById("path-suggestion-container");
      if (!suggestionsContainer)
        return;
      const suggestions = [];
      const findPaths = (obj, currentPath = "", depth = 0) => {
        if (depth > 3 || typeof obj !== "object" || obj === null)
          return;
        if (Array.isArray(obj)) {
          if (obj.length > 0 && typeof obj[0] !== "object") {
            suggestions.push(`${currentPath}[0]`);
          } else if (obj.length > 0) {
            findPaths(obj[0], `${currentPath}[0]`, depth + 1);
          }
          return;
        }
        for (const key of Object.keys(obj)) {
          const path = currentPath ? `${currentPath}.${key}` : key;
          if (typeof obj[key] !== "object" || obj[key] === null) {
            suggestions.push(path);
          } else {
            findPaths(obj[key], path, depth + 1);
          }
          if (suggestions.length >= 10)
            return;
        }
      };
      findPaths(data);
      if (suggestions.length > 0) {
        const html = `
        <div class="text-xs mb-1">Suggested paths:</div>
        <div class="flex flex-wrap gap-1">
          ${suggestions.map((path) => `
            <span class="cursor-pointer px-1 py-0.5 bg-bg-sidebar hover:bg-primary-100 rounded text-xs path-suggestion" data-path="${path}">
              ${path}
            </span>
          `).join("")}
        </div>
      `;
        suggestionsContainer.innerHTML = html;
        const suggestionSpans = suggestionsContainer.querySelectorAll(".path-suggestion");
        suggestionSpans.forEach((span) => {
          span.addEventListener("click", () => {
            const path = span.getAttribute("data-path");
            const pathInput = document.getElementById("variable-path-input");
            if (pathInput && path) {
              pathInput.value = path;
              this.testPath();
            }
          });
        });
      } else {
        suggestionsContainer.innerHTML = "";
      }
    }
  };

  // js/components/RequestBuilder.ts
  var DEFAULT_OPTIONS4 = {
    containerId: "request-form"
  };
  var RequestBuilder = class {
    /**
     * Creates a new RequestBuilder instance
     */
    constructor(options = {}) {
      this.tabButtons = [];
      this.tabContents = [];
      this.requestData = {
        method: "GET",
        url: "",
        params: {},
        headers: {},
        bodyType: "json"
      };
      this.options = { ...DEFAULT_OPTIONS4, ...options };
      this.container = getById(this.options.containerId);
      this.uiManager = this.options.uiManager;
      if (!this.container) {
        logger.warn(`RequestBuilder: Container element with ID "${this.options.containerId}" not found`);
        return;
      }
      this.initTabs();
      this.setupEventListeners();
    }
    /**
     * Initialize tabs
     */
    initTabs() {
      if (!this.container)
        return;
      const tabsHtml = `
      <div class="flex border-b border-border mb-4">
        <button class="tab-button active" data-tab="params">Params</button>
        <button class="tab-button" data-tab="headers">Headers</button>
        <button class="tab-button" data-tab="body">Body</button>
        <button class="tab-button" data-tab="auth">Auth</button>
      </div>
      <div id="params-tab" class="tab-content active"></div>
      <div id="headers-tab" class="tab-content hidden"></div>
      <div id="body-tab" class="tab-content hidden"></div>
      <div id="auth-tab" class="tab-content hidden"></div>
    `;
      setHTML(this.container, tabsHtml);
      this.tabButtons = Array.from(this.container.querySelectorAll(".tab-button"));
      this.tabContents = [
        getById("params-tab"),
        getById("headers-tab"),
        getById("body-tab"),
        getById("auth-tab")
      ].filter((el) => el !== null);
      this.renderParamsTab();
      this.renderHeadersTab();
      this.renderBodyTab();
      this.renderAuthTab();
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
      if (!this.container)
        return;
      this.tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.tabButtons.forEach((btn) => btn.classList.remove("active"));
          this.tabContents.forEach((content) => content.classList.add("hidden"));
          button.classList.add("active");
          const tabName = button.getAttribute("data-tab");
          if (tabName) {
            const tabContent = getById(`${tabName}-tab`);
            if (tabContent) {
              tabContent.classList.remove("hidden");
            }
          }
        });
      });
      this.container.addEventListener("change", (e) => {
        const target = e.target;
        if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") {
          this.handleInputChange(target);
        }
      });
      this.container.addEventListener("keyup", (e) => {
        const target = e.target;
        if (target.tagName === "INPUT" && target.getAttribute("type") === "text") {
          this.handleInputChange(target);
        }
      });
    }
    /**
     * Handle input change events
     */
    handleInputChange(target) {
      const inputType = target.getAttribute("data-type");
      const inputKey = target.getAttribute("data-key");
      if (!inputType || !inputKey)
        return;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        const value = target.value;
        switch (inputType) {
          case "param":
            this.requestData.params[inputKey] = value;
            break;
          case "header":
            this.requestData.headers[inputKey] = value;
            break;
          case "body":
            if (this.requestData.bodyType === "json") {
              try {
                this.requestData.body = JSON.parse(value);
              } catch (e) {
                this.requestData.body = value;
              }
            } else {
              this.requestData.body = value;
            }
            break;
          case "bodyType":
            this.requestData.bodyType = value;
            this.renderBodyTab();
            break;
          case "auth":
            if (!this.requestData.auth) {
              this.requestData.auth = { type: "none" };
            }
            if (inputKey === "type") {
              this.requestData.auth.type = value;
              this.renderAuthTab();
            } else {
              this.requestData.auth[inputKey] = value;
            }
            break;
          case "method":
            this.requestData.method = value;
            break;
          case "url":
            this.requestData.url = value;
            break;
        }
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      }
    }
    /**
     * Render parameters tab content
     */
    renderParamsTab() {
      const tab = getById("params-tab");
      if (!tab)
        return;
      let html = `
      <div class="mb-2 flex justify-between items-center">
        <h3 class="text-sm font-medium">Query Parameters</h3>
        <button id="add-param-btn" class="text-xs px-2 py-1 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
          Add Parameter
        </button>
      </div>
      <div class="space-y-2" id="params-list">
    `;
      const params = this.requestData.params;
      if (Object.keys(params).length === 0) {
        html += `<p class="text-sm text-text-muted italic">No parameters defined</p>`;
      } else {
        Object.entries(params).forEach(([key, value]) => {
          html += this.createParamRow(key, value);
        });
      }
      html += `</div>`;
      setHTML(tab, html);
      const addParamBtn = getById("add-param-btn");
      if (addParamBtn) {
        addParamBtn.addEventListener("click", () => this.addParameter());
      }
    }
    /**
     * Create a parameter input row
     */
    createParamRow(key = "", value = "") {
      return `
      <div class="flex gap-2 items-center param-row">
        <input 
          type="text" 
          class="w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Parameter name" 
          value="${escapeHtml(key)}" 
          data-type="param-key"
        >
        <input 
          type="text" 
          class="flex-1 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Value" 
          value="${escapeHtml(value)}" 
          data-type="param" 
          data-key="${escapeHtml(key)}"
        >
        <button class="text-red-500 hover:text-red-700 delete-param-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    }
    /**
     * Add a new parameter
     */
    addParameter() {
      const paramsList = getById("params-list");
      if (!paramsList)
        return;
      const newParam = createElement("div", { class: "flex gap-2 items-center param-row" });
      const keyInput = createElement("input", {
        type: "text",
        class: "w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm",
        placeholder: "Parameter name",
        "data-type": "param-key"
      });
      const valueInput = createElement("input", {
        type: "text",
        class: "flex-1 px-2 py-1 border border-border rounded bg-bg text-sm",
        placeholder: "Value",
        "data-type": "param",
        "data-key": ""
      });
      const deleteBtn = createElement("button", {
        class: "text-red-500 hover:text-red-700 delete-param-btn"
      });
      deleteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;
      deleteBtn.addEventListener("click", () => {
        newParam.remove();
      });
      keyInput.addEventListener("input", () => {
        const newKey = keyInput.value;
        valueInput.setAttribute("data-key", newKey);
        const oldValue = valueInput.value;
        delete this.requestData.params[valueInput.getAttribute("data-key") || ""];
        this.requestData.params[newKey] = oldValue;
      });
      newParam.appendChild(keyInput);
      newParam.appendChild(valueInput);
      newParam.appendChild(deleteBtn);
      if (paramsList.querySelector(".italic")) {
        paramsList.innerHTML = "";
      }
      paramsList.appendChild(newParam);
    }
    /**
     * Render headers tab content
     */
    renderHeadersTab() {
      const tab = getById("headers-tab");
      if (!tab)
        return;
      let html = `
      <div class="mb-2 flex justify-between items-center">
        <h3 class="text-sm font-medium">HTTP Headers</h3>
        <button id="add-header-btn" class="text-xs px-2 py-1 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
          Add Header
        </button>
      </div>
      <div class="space-y-2" id="headers-list">
    `;
      html += `
      <div class="mb-3">
        <label class="text-xs text-text-muted">Add Common Header:</label>
        <select id="common-headers" class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1">
          <option value="">Select a common header...</option>
          <option value="Content-Type">Content-Type</option>
          <option value="Authorization">Authorization</option>
          <option value="Accept">Accept</option>
          <option value="Accept-Language">Accept-Language</option>
          <option value="Cache-Control">Cache-Control</option>
          <option value="User-Agent">User-Agent</option>
        </select>
      </div>
    `;
      const headers = this.requestData.headers;
      if (Object.keys(headers).length === 0) {
        html += `<p class="text-sm text-text-muted italic">No headers defined</p>`;
      } else {
        Object.entries(headers).forEach(([key, value]) => {
          html += this.createHeaderRow(key, value);
        });
      }
      html += `</div>`;
      setHTML(tab, html);
      const addHeaderBtn = getById("add-header-btn");
      if (addHeaderBtn) {
        addHeaderBtn.addEventListener("click", () => this.addHeader());
      }
      const commonHeadersSelect = getById("common-headers");
      if (commonHeadersSelect) {
        commonHeadersSelect.addEventListener("change", () => {
          const selectedHeader = commonHeadersSelect.value;
          if (selectedHeader) {
            this.addHeader(selectedHeader, this.getDefaultHeaderValue(selectedHeader));
            commonHeadersSelect.value = "";
          }
        });
      }
    }
    /**
     * Get default value for common headers
     */
    getDefaultHeaderValue(header) {
      const defaults = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "User-Agent": "API-Admin-UI"
      };
      return defaults[header] || "";
    }
    /**
     * Create a header input row
     */
    createHeaderRow(key = "", value = "") {
      return `
      <div class="flex gap-2 items-center header-row">
        <input 
          type="text" 
          class="w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Header name" 
          value="${escapeHtml(key)}" 
          data-type="header-key"
        >
        <input 
          type="text" 
          class="flex-1 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Value" 
          value="${escapeHtml(value)}" 
          data-type="header" 
          data-key="${escapeHtml(key)}"
        >
        <button class="text-red-500 hover:text-red-700 delete-header-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    }
    /**
     * Add a new header
     */
    addHeader(key = "", value = "") {
      const headersList = getById("headers-list");
      if (!headersList)
        return;
      const newHeader = createElement("div", { class: "flex gap-2 items-center header-row" });
      const keyInput = createElement("input", {
        type: "text",
        class: "w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm",
        placeholder: "Header name",
        "data-type": "header-key",
        value: key
      });
      const valueInput = createElement("input", {
        type: "text",
        class: "flex-1 px-2 py-1 border border-border rounded bg-bg text-sm",
        placeholder: "Value",
        "data-type": "header",
        "data-key": key,
        value
      });
      const deleteBtn = createElement("button", {
        class: "text-red-500 hover:text-red-700 delete-header-btn"
      });
      deleteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;
      deleteBtn.addEventListener("click", () => {
        newHeader.remove();
        delete this.requestData.headers[keyInput.value];
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      });
      keyInput.addEventListener("input", () => {
        const newKey = keyInput.value;
        valueInput.setAttribute("data-key", newKey);
        const oldValue = valueInput.value;
        delete this.requestData.headers[valueInput.getAttribute("data-key") || ""];
        this.requestData.headers[newKey] = oldValue;
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      });
      valueInput.addEventListener("input", () => {
        this.requestData.headers[keyInput.value] = valueInput.value;
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      });
      newHeader.appendChild(keyInput);
      newHeader.appendChild(valueInput);
      newHeader.appendChild(deleteBtn);
      if (headersList.querySelector(".italic")) {
        headersList.innerHTML = "";
      }
      headersList.appendChild(newHeader);
      if (key && value) {
        this.requestData.headers[key] = value;
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      }
    }
    /**
     * Render body tab content
     */
    renderBodyTab() {
      const tab = getById("body-tab");
      if (!tab)
        return;
      const bodyType = this.requestData.bodyType || "json";
      let html = `
      <div class="mb-2">
        <h3 class="text-sm font-medium mb-2">Request Body</h3>
        
        <div class="flex mb-3">
          <select id="body-type-select" data-type="bodyType" data-key="type" class="px-2 py-1 border border-border rounded bg-bg text-sm">
            <option value="json" ${bodyType === "json" ? "selected" : ""}>JSON</option>
            <option value="form-data" ${bodyType === "form-data" ? "selected" : ""}>form-data</option>
            <option value="x-www-form-urlencoded" ${bodyType === "x-www-form-urlencoded" ? "selected" : ""}>x-www-form-urlencoded</option>
            <option value="raw" ${bodyType === "raw" ? "selected" : ""}>Raw</option>
            <option value="binary" ${bodyType === "binary" ? "selected" : ""}>Binary</option>
          </select>
        </div>
      `;
      switch (bodyType) {
        case "json":
          const jsonValue = typeof this.requestData.body === "object" ? JSON.stringify(this.requestData.body, null, 2) : this.requestData.body || "{\n  \n}";
          html += `
          <div id="json-body-container">
            <textarea 
              id="json-body" 
              class="w-full h-64 px-3 py-2 border border-border rounded bg-bg font-mono text-sm" 
              data-type="body" 
              data-key="json"
              placeholder="Enter JSON body"
            >${escapeHtml(jsonValue)}</textarea>
            <div class="flex justify-end mt-2">
              <button id="format-json-btn" class="text-xs px-2 py-1 text-primary-500 hover:text-primary-700">
                Format JSON
              </button>
            </div>
          </div>
        `;
          break;
        case "form-data":
          html += `
          <div id="form-data-container" class="space-y-2">
            <div class="flex justify-end mb-2">
              <button id="add-form-field-btn" class="text-xs px-2 py-1 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
                Add Field
              </button>
            </div>
        `;
          const formData = this.requestData.body || {};
          if (typeof formData !== "object" || Object.keys(formData).length === 0) {
            html += `<p class="text-sm text-text-muted italic">No form fields defined</p>`;
          } else {
            Object.entries(formData).forEach(([key, value]) => {
              html += this.createFormDataRow(key, value);
            });
          }
          html += `</div>`;
          break;
        case "x-www-form-urlencoded":
          html += `
          <div id="urlencoded-container" class="space-y-2">
            <div class="flex justify-end mb-2">
              <button id="add-urlencoded-field-btn" class="text-xs px-2 py-1 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
                Add Field
              </button>
            </div>
        `;
          const urlencoded = this.requestData.body || {};
          if (typeof urlencoded !== "object" || Object.keys(urlencoded).length === 0) {
            html += `<p class="text-sm text-text-muted italic">No form fields defined</p>`;
          } else {
            Object.entries(urlencoded).forEach(([key, value]) => {
              html += this.createUrlencodedRow(key, value);
            });
          }
          html += `</div>`;
          break;
        case "raw":
          html += `
          <textarea 
            id="raw-body" 
            class="w-full h-64 px-3 py-2 border border-border rounded bg-bg font-mono text-sm" 
            data-type="body" 
            data-key="raw"
            placeholder="Enter raw body content"
          >${escapeHtml(this.requestData.body || "")}</textarea>
        `;
          break;
        case "binary":
          html += `
          <div id="binary-container" class="border-2 border-dashed border-border rounded p-8 text-center">
            <p class="text-text-muted mb-4">Select a file to upload</p>
            <input type="file" id="binary-file" class="hidden">
            <button id="select-file-btn" class="px-4 py-2 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
              Select File
            </button>
            <p id="selected-file-name" class="mt-4 text-sm"></p>
          </div>
        `;
          break;
      }
      html += `</div>`;
      setHTML(tab, html);
      this.setupBodyEventListeners(bodyType);
    }
    /**
     * Set up event listeners for the body tab
     */
    setupBodyEventListeners(bodyType) {
      const bodyTypeSelect = getById("body-type-select");
      if (bodyTypeSelect) {
        bodyTypeSelect.addEventListener("change", () => {
          const newBodyType = bodyTypeSelect.value;
          this.requestData.bodyType = newBodyType;
          if (newBodyType === "json") {
            this.requestData.body = {};
          } else if (newBodyType === "form-data" || newBodyType === "x-www-form-urlencoded") {
            this.requestData.body = {};
          } else {
            this.requestData.body = "";
          }
          this.renderBodyTab();
          if (this.options.onRequestDataChange) {
            this.options.onRequestDataChange(this.requestData);
          }
        });
      }
      switch (bodyType) {
        case "json":
          const jsonBody = getById("json-body");
          if (jsonBody) {
            jsonBody.addEventListener("input", () => {
              try {
                this.requestData.body = JSON.parse(jsonBody.value);
              } catch (e) {
                this.requestData.body = jsonBody.value;
              }
              if (this.options.onRequestDataChange) {
                this.options.onRequestDataChange(this.requestData);
              }
            });
          }
          const formatJsonBtn = getById("format-json-btn");
          if (formatJsonBtn) {
            formatJsonBtn.addEventListener("click", () => {
              const jsonBody2 = getById("json-body");
              if (jsonBody2) {
                try {
                  const formatted = JSON.stringify(JSON.parse(jsonBody2.value), null, 2);
                  jsonBody2.value = formatted;
                  this.requestData.body = JSON.parse(formatted);
                  if (this.options.onRequestDataChange) {
                    this.options.onRequestDataChange(this.requestData);
                  }
                } catch (e) {
                  if (this.uiManager) {
                    this.uiManager.showError("Invalid JSON", "Please check your JSON syntax.");
                  } else {
                    alert("Invalid JSON. Please check your syntax.");
                  }
                }
              }
            });
          }
          break;
        case "form-data":
          const addFormFieldBtn = getById("add-form-field-btn");
          if (addFormFieldBtn) {
            addFormFieldBtn.addEventListener("click", () => this.addFormDataField());
          }
          break;
        case "x-www-form-urlencoded":
          const addUrlencodedFieldBtn = getById("add-urlencoded-field-btn");
          if (addUrlencodedFieldBtn) {
            addUrlencodedFieldBtn.addEventListener("click", () => this.addUrlencodedField());
          }
          break;
        case "binary":
          const selectFileBtn = getById("select-file-btn");
          if (selectFileBtn) {
            selectFileBtn.addEventListener("click", () => {
              const fileInput2 = getById("binary-file");
              if (fileInput2) {
                fileInput2.click();
              }
            });
          }
          const fileInput = getById("binary-file");
          if (fileInput) {
            fileInput.addEventListener("change", () => {
              const fileNameElement = getById("selected-file-name");
              if (fileNameElement && fileInput.files && fileInput.files[0]) {
                fileNameElement.textContent = fileInput.files[0].name;
                this.requestData.body = fileInput.files[0];
                if (this.options.onRequestDataChange) {
                  this.options.onRequestDataChange(this.requestData);
                }
              }
            });
          }
          break;
      }
    }
    /**
     * Create a form-data input row
     */
    createFormDataRow(key = "", value = "") {
      return `
      <div class="flex gap-2 items-center form-data-row">
        <input 
          type="text" 
          class="w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Field name" 
          value="${escapeHtml(key)}" 
          data-type="form-data-key"
        >
        <input 
          type="text" 
          class="flex-1 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Value" 
          value="${escapeHtml(value)}" 
          data-type="form-data" 
          data-key="${escapeHtml(key)}"
        >
        <button class="text-red-500 hover:text-red-700 delete-form-data-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    }
    /**
     * Add a new form-data field
     */
    addFormDataField() {
      const container = getById("form-data-container");
      if (!container)
        return;
      const noFieldsMessage = container.querySelector(".italic");
      if (noFieldsMessage) {
        container.removeChild(noFieldsMessage);
      }
      const newRow = createElement("div", { class: "flex gap-2 items-center form-data-row" });
      const keyInput = createElement("input", {
        type: "text",
        class: "w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm",
        placeholder: "Field name",
        "data-type": "form-data-key"
      });
      const valueInput = createElement("input", {
        type: "text",
        class: "flex-1 px-2 py-1 border border-border rounded bg-bg text-sm",
        placeholder: "Value",
        "data-type": "form-data",
        "data-key": ""
      });
      const deleteBtn = createElement("button", {
        class: "text-red-500 hover:text-red-700 delete-form-data-btn"
      });
      deleteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;
      deleteBtn.addEventListener("click", () => {
        newRow.remove();
        if (keyInput.value) {
          if (typeof this.requestData.body === "object") {
            delete this.requestData.body[keyInput.value];
          }
        }
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      });
      keyInput.addEventListener("input", () => {
        const newKey = keyInput.value;
        valueInput.setAttribute("data-key", newKey);
        if (typeof this.requestData.body !== "object") {
          this.requestData.body = {};
        }
        const oldKey = valueInput.getAttribute("data-key") || "";
        if (oldKey && oldKey !== newKey) {
          const value = this.requestData.body[oldKey];
          delete this.requestData.body[oldKey];
          if (newKey) {
            this.requestData.body[newKey] = value;
          }
        }
      });
      valueInput.addEventListener("input", () => {
        if (typeof this.requestData.body !== "object") {
          this.requestData.body = {};
        }
        const key = keyInput.value;
        if (key) {
          this.requestData.body[key] = valueInput.value;
          if (this.options.onRequestDataChange) {
            this.options.onRequestDataChange(this.requestData);
          }
        }
      });
      newRow.appendChild(keyInput);
      newRow.appendChild(valueInput);
      newRow.appendChild(deleteBtn);
      container.appendChild(newRow);
    }
    /**
     * Create a x-www-form-urlencoded input row
     */
    createUrlencodedRow(key = "", value = "") {
      return `
      <div class="flex gap-2 items-center urlencoded-row">
        <input 
          type="text" 
          class="w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Field name" 
          value="${escapeHtml(key)}" 
          data-type="urlencoded-key"
        >
        <input 
          type="text" 
          class="flex-1 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Value" 
          value="${escapeHtml(value)}" 
          data-type="urlencoded" 
          data-key="${escapeHtml(key)}"
        >
        <button class="text-red-500 hover:text-red-700 delete-urlencoded-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    }
    /**
     * Add a new x-www-form-urlencoded field
     */
    addUrlencodedField() {
      const container = getById("urlencoded-container");
      if (!container)
        return;
      const noFieldsMessage = container.querySelector(".italic");
      if (noFieldsMessage) {
        container.removeChild(noFieldsMessage);
      }
      const newRow = createElement("div", { class: "flex gap-2 items-center urlencoded-row" });
      const keyInput = createElement("input", {
        type: "text",
        class: "w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm",
        placeholder: "Field name",
        "data-type": "urlencoded-key"
      });
      const valueInput = createElement("input", {
        type: "text",
        class: "flex-1 px-2 py-1 border border-border rounded bg-bg text-sm",
        placeholder: "Value",
        "data-type": "urlencoded",
        "data-key": ""
      });
      const deleteBtn = createElement("button", {
        class: "text-red-500 hover:text-red-700 delete-urlencoded-btn"
      });
      deleteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;
      deleteBtn.addEventListener("click", () => {
        newRow.remove();
        if (keyInput.value) {
          if (typeof this.requestData.body === "object") {
            delete this.requestData.body[keyInput.value];
          }
        }
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      });
      keyInput.addEventListener("input", () => {
        const newKey = keyInput.value;
        valueInput.setAttribute("data-key", newKey);
        if (typeof this.requestData.body !== "object") {
          this.requestData.body = {};
        }
        const oldKey = valueInput.getAttribute("data-key") || "";
        if (oldKey && oldKey !== newKey) {
          const value = this.requestData.body[oldKey];
          delete this.requestData.body[oldKey];
          if (newKey) {
            this.requestData.body[newKey] = value;
          }
        }
      });
      valueInput.addEventListener("input", () => {
        if (typeof this.requestData.body !== "object") {
          this.requestData.body = {};
        }
        const key = keyInput.value;
        if (key) {
          this.requestData.body[key] = valueInput.value;
          if (this.options.onRequestDataChange) {
            this.options.onRequestDataChange(this.requestData);
          }
        }
      });
      newRow.appendChild(keyInput);
      newRow.appendChild(valueInput);
      newRow.appendChild(deleteBtn);
      container.appendChild(newRow);
    }
    /**
     * Render authentication tab content
     */
    renderAuthTab() {
      const tab = getById("auth-tab");
      if (!tab)
        return;
      const auth = this.requestData.auth || { type: "none" };
      let html = `
      <div class="mb-2">
        <h3 class="text-sm font-medium mb-2">Authentication</h3>
        
        <div class="mb-4">
          <select id="auth-type-select" data-type="auth" data-key="type" class="w-full px-2 py-1 border border-border rounded bg-bg text-sm">
            <option value="none" ${auth.type === "none" ? "selected" : ""}>No Auth</option>
            <option value="basic" ${auth.type === "basic" ? "selected" : ""}>Basic Auth</option>
            <option value="bearer" ${auth.type === "bearer" ? "selected" : ""}>Bearer Token</option>
            <option value="apiKey" ${auth.type === "apiKey" ? "selected" : ""}>API Key</option>
          </select>
        </div>
    `;
      switch (auth.type) {
        case "basic":
          html += `
          <div class="space-y-3">
            <div>
              <label class="text-xs text-text-muted">Username</label>
              <input 
                type="text" 
                class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
                placeholder="Username" 
                value="${escapeHtml(auth.username || "")}" 
                data-type="auth" 
                data-key="username"
              >
            </div>
            <div>
              <label class="text-xs text-text-muted">Password</label>
              <input 
                type="password" 
                class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
                placeholder="Password" 
                value="${escapeHtml(auth.password || "")}" 
                data-type="auth" 
                data-key="password"
              >
            </div>
          </div>
        `;
          break;
        case "bearer":
          html += `
          <div>
            <label class="text-xs text-text-muted">Token</label>
            <input 
              type="text" 
              class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
              placeholder="Bearer token" 
              value="${escapeHtml(auth.token || "")}" 
              data-type="auth" 
              data-key="token"
            >
          </div>
        `;
          break;
        case "apiKey":
          html += `
          <div class="space-y-3">
            <div>
              <label class="text-xs text-text-muted">Key Name</label>
              <input 
                type="text" 
                class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
                placeholder="API key name (e.g. X-API-Key)" 
                value="${escapeHtml(auth.apiKeyName || "")}" 
                data-type="auth" 
                data-key="apiKeyName"
              >
            </div>
            <div>
              <label class="text-xs text-text-muted">Key Value</label>
              <input 
                type="text" 
                class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
                placeholder="API key value" 
                value="${escapeHtml(auth.apiKey || "")}" 
                data-type="auth" 
                data-key="apiKey"
              >
            </div>
          </div>
        `;
          break;
      }
      html += `</div>`;
      setHTML(tab, html);
      const authTypeSelect = getById("auth-type-select");
      if (authTypeSelect) {
        authTypeSelect.addEventListener("change", () => {
          const newAuthType = authTypeSelect.value;
          if (!this.requestData.auth) {
            this.requestData.auth = { type: newAuthType };
          } else {
            this.requestData.auth.type = newAuthType;
          }
          this.renderAuthTab();
          if (this.options.onRequestDataChange) {
            this.options.onRequestDataChange(this.requestData);
          }
        });
      }
    }
    /**
     * Load request data
     * @param data Request data to load
     */
    loadRequest(data) {
      this.requestData = {
        ...this.requestData,
        ...data
      };
      this.renderParamsTab();
      this.renderHeadersTab();
      this.renderBodyTab();
      this.renderAuthTab();
    }
    /**
     * Get current request data
     * @returns Current request data
     */
    getRequestData() {
      return { ...this.requestData };
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
        historyManager: this.historyManager,
        appController: this
      });
    }
    /**
     * Initialize all manager modules
     */
    initializeManagers() {
      const variableManagerOptions = {
        persistVariables: true,
        storageKey: "api_admin_variables",
        variablePrefix: "$",
        maxVariables: 100,
        storageType: "localStorage"
      };
      this.variableManager = new VariableManager(variableManagerOptions);
      const endpointManagerOptions = {
        useLocalEndpoints: true,
        supportMultipleFormats: true
      };
      this.endpointManager = new EndpointManager(endpointManagerOptions);
      const statusManagerOptions = {
        updateInterval: 3e4,
        statusEndpoint: "/api/v1/health"
      };
      this.statusManager = new StatusManager(statusManagerOptions);
      const historyOptions = {
        maxEntries: 50,
        persistHistory: true
      };
      this.historyManager = new HistoryManager(historyOptions);
      this.logsManager = new BackendLogsManager({
        logsEndpoint: "/api/v1/logs",
        maxLogsToFetch: 100,
        autoRefresh: true
      });
      const domainStateOptions = {
        localStorageKey: "domain_state",
        autoSave: true,
        diffingEnabled: true
      };
      this.domainStateManager = new DomainStateManager(domainStateOptions);
    }
    /**
     * Set up UI components
     */
    setupUIComponents() {
      const responseViewerOptions = {
        containerId: "response-container",
        responseHeadersId: "response-headers",
        responseBodyId: "response-body",
        responseStatusId: "response-status"
      };
      this.responseViewer = new ResponseViewer(responseViewerOptions);
      this.requestBuilder = new RequestBuilder({
        containerId: "request-form",
        uiManager: this.uiManager,
        onRequestDataChange: (data) => {
          console.log("Request data changed:", data);
        }
      });
      const variableExtractorOptions = {
        variablePrefix: "$",
        suggestionsEnabled: true,
        autoExtract: true
      };
      this.variableExtractor = new VariableExtractor(variableExtractorOptions);
      const domainStateViewerOptions = {
        containerId: "domain-state-container",
        stateManager: this.domainStateManager,
        showFilters: true,
        showTimeline: true
      };
      this.domainStateViewer = new DomainStateViewer(domainStateViewerOptions);
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
      const extractVariablesBtn = document.getElementById("extract-variables-btn");
      if (extractVariablesBtn) {
        extractVariablesBtn.addEventListener("click", () => {
          const response = this.responseViewer.getResponse();
          if (response) {
            this.variableExtractor.showExtractionModal(response);
          } else {
            this.uiManager.showError("No Response", "There is no response data to extract variables from.");
          }
        });
      }
      const clearResponseBtn = document.getElementById("clear-response-btn");
      if (clearResponseBtn) {
        clearResponseBtn.addEventListener("click", () => {
          this.responseViewer.clear();
        });
      }
      const clearVariablesBtn = document.getElementById("clear-variables-btn");
      if (clearVariablesBtn) {
        clearVariablesBtn.addEventListener("click", () => {
          this.variableManager.clearVariables();
          this.updateVariablesList();
        });
      }
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
     * Update the variables list in the UI
     */
    updateVariablesList() {
      const variablesList = document.getElementById("variables-list");
      if (!variablesList)
        return;
      const variables = this.variableManager.getVariables();
      if (Object.keys(variables).length === 0) {
        variablesList.innerHTML = '<div class="text-text-muted italic">No variables defined</div>';
        return;
      }
      let html = '<div class="space-y-1">';
      Object.entries(variables).forEach(([name, value]) => {
        html += `
        <div class="flex justify-between items-center p-1 hover:bg-bg-sidebar rounded">
          <div>
            <span class="font-medium text-primary-500">${name}</span>
            <span class="text-xs text-text-muted ml-2">${typeof value === "object" ? "Object" : typeof value}</span>
          </div>
          <div class="text-xs truncate max-w-[200px]">${typeof value === "object" ? JSON.stringify(value) : String(value)}</div>
        </div>
      `;
      });
      html += "</div>";
      variablesList.innerHTML = html;
    }
    /**
     * Handle send request button click
     */
    handleSendRequest() {
      const requestData = this.requestBuilder.getRequestData();
      requestData.url = this.variableManager.replaceVariables(requestData.url);
      const processedHeaders = {};
      Object.entries(requestData.headers).forEach(([key, value]) => {
        processedHeaders[key] = this.variableManager.replaceVariables(String(value));
      });
      if (requestData.auth) {
        switch (requestData.auth.type) {
          case "basic":
            if (requestData.auth.username && requestData.auth.password) {
              const credentials = btoa(`${requestData.auth.username}:${requestData.auth.password}`);
              processedHeaders["Authorization"] = `Basic ${credentials}`;
            }
            break;
          case "bearer":
            if (requestData.auth.token) {
              processedHeaders["Authorization"] = `Bearer ${requestData.auth.token}`;
            }
            break;
          case "apiKey":
            if (requestData.auth.apiKeyName && requestData.auth.apiKey) {
              processedHeaders[requestData.auth.apiKeyName] = requestData.auth.apiKey;
            }
            break;
        }
      }
      if (this.domainStateViewer && "selectedEntityTypes" in this.domainStateViewer) {
        const entityTypes = this.domainStateViewer.selectedEntityTypes || [];
        this.domainStateManager.takeBeforeSnapshot(entityTypes);
      }
      this.uiManager.showLoading("Sending request...");
      this.sendRequest({
        method: requestData.method,
        url: requestData.url,
        headers: processedHeaders,
        body: requestData.body
      }).then((response) => {
        this.uiManager.hideLoading();
        this.responseViewer.display(response.body, response.headers, response.status);
        if (this.domainStateViewer && "selectedEntityTypes" in this.domainStateViewer) {
          const entityTypes = this.domainStateViewer.selectedEntityTypes || [];
          this.domainStateManager.takeAfterSnapshot(entityTypes).then(() => {
            const diffs = this.domainStateManager.getDiffs();
            if (diffs && Object.keys(diffs).length > 0) {
              console.log("Domain state changes detected:", diffs);
            }
          });
        }
        this.historyManager.addEntry({
          method: requestData.method,
          url: requestData.url,
          headers: requestData.headers,
          body: requestData.body
        }, {
          status: response.status,
          headers: response.headers,
          body: response.body,
          time: response.time
        });
        this.updateVariablesList();
      }).catch((error) => {
        this.uiManager.hideLoading();
        this.showError(error);
      });
    }
    /**
     * Send an API request
     * @param request Request object
     * @returns Promise with response
     */
    async sendRequest(request) {
      const startTime = Date.now();
      try {
        const options = {
          method: request.method,
          headers: request.headers
        };
        if (request.method !== "GET" && request.method !== "HEAD") {
          if (typeof request.body === "object") {
            options.body = JSON.stringify(request.body);
          } else if (request.body) {
            options.body = request.body;
          }
        }
        let url = request.url;
        if (request.params && Object.keys(request.params).length > 0) {
          const queryParams = new URLSearchParams();
          Object.entries(request.params).forEach(([key, value]) => {
            queryParams.append(key, String(value));
          });
          url += (url.includes("?") ? "&" : "?") + queryParams.toString();
        }
        const response = await fetch(url, options);
        const timeMs = Date.now() - startTime;
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        let body;
        const contentType = headers["content-type"] || "";
        if (contentType.includes("application/json")) {
          body = await response.json();
        } else if (contentType.includes("text/")) {
          body = await response.text();
        } else {
          body = await response.text();
        }
        return {
          status: response.status,
          statusText: response.statusText,
          headers,
          body,
          time: timeMs,
          url: response.url
        };
      } catch (error) {
        const timeMs = Date.now() - startTime;
        throw {
          message: error instanceof Error ? error.message : String(error),
          time: timeMs
        };
      }
    }
    /**
     * Show error message
     * @param message Error message to display
     */
    showError(message) {
      const errorMessage = message instanceof Error ? message.message : message;
      console.error(errorMessage);
      this.uiManager.showError("Error", errorMessage);
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

  // js/components/LogsViewer.ts
  var LogsViewer = class {
    /**
     * Creates a new LogsViewer instance
     * @param options Configuration options
     */
    constructor(options = {}) {
      this.options = {
        logsContainerId: "logs-container",
        backendLogsManager: null,
        maxFrontendLogs: 1e3,
        showFrontendLogs: true,
        showBackendLogs: true,
        enableAiLogFormatting: true,
        enableDomainEventFormatting: true,
        enableCorrelationIdFiltering: true,
        enableSearchFiltering: true,
        autoRefreshBackendLogs: false,
        refreshInterval: 1e4,
        // 10 seconds
        ...options
      };
      this.container = document.getElementById(this.options.logsContainerId);
      this.frontendLogsTab = null;
      this.backendLogsTab = null;
      this.frontendLogsContainer = null;
      this.backendLogsContainer = null;
      this.frontendLogsList = null;
      this.backendLogsList = null;
      this.activeTab = "backend";
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
      this.initializeUI();
      this.initializeBackendLogsManager();
      if (this.options.showFrontendLogs) {
        this.hookConsole();
      }
    }
    /**
     * Initializes the UI elements
     */
    initializeUI() {
      if (!this.container) {
        console.error("LogsViewer: Cannot find container element with ID", this.options.logsContainerId);
        return;
      }
      if (this.options.showFrontendLogs && this.options.showBackendLogs) {
        const tabsContainer = document.createElement("div");
        tabsContainer.className = "logs-tabs mb-4 border-b border-border";
        this.frontendLogsTab = document.createElement("button");
        this.frontendLogsTab.className = "logs-tab px-4 py-2 mr-2";
        this.frontendLogsTab.textContent = "Frontend Logs";
        this.frontendLogsTab.addEventListener("click", () => this.switchTab("frontend"));
        this.backendLogsTab = document.createElement("button");
        this.backendLogsTab.className = "logs-tab px-4 py-2";
        this.backendLogsTab.textContent = "Backend Logs";
        this.backendLogsTab.addEventListener("click", () => this.switchTab("backend"));
        tabsContainer.appendChild(this.frontendLogsTab);
        tabsContainer.appendChild(this.backendLogsTab);
        this.container.appendChild(tabsContainer);
        this.frontendLogsContainer = document.createElement("div");
        this.frontendLogsContainer.className = "logs-container hidden";
        const frontendFiltersContainer = document.createElement("div");
        frontendFiltersContainer.className = "logs-filter-container mb-4 flex items-center space-x-2";
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
        this.frontendLogsList = document.createElement("div");
        this.frontendLogsList.id = "frontend-logs-list";
        this.frontendLogsList.className = "logs-list overflow-y-auto max-h-[calc(100vh-300px)]";
        this.frontendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No frontend logs to display</div>';
        this.frontendLogsContainer.appendChild(frontendFiltersContainer);
        this.frontendLogsContainer.appendChild(this.frontendLogsList);
        this.backendLogsContainer = document.createElement("div");
        this.backendLogsContainer.className = "logs-container";
        const backendFiltersContainer = document.createElement("div");
        backendFiltersContainer.className = "logs-filter-container mb-4";
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
          ${this.options.enableCorrelationIdFiltering ? `<input type="text" id="backend-correlation-id" placeholder="Filter by correlation ID" class="w-1/3 px-2 py-1 border border-border rounded bg-bg">` : ""}
          <label class="flex items-center">
            <input type="checkbox" id="backend-auto-refresh" ${this.options.autoRefreshBackendLogs ? "checked" : ""} class="mr-1"> Auto-refresh
          </label>
          <button id="clear-backend-logs-btn" class="px-2 py-1 bg-bg-sidebar text-text-muted hover:bg-bg-card rounded">Clear</button>
        </div>
      `;
        this.backendLogsList = document.createElement("div");
        this.backendLogsList.id = "backend-logs-list";
        this.backendLogsList.className = "logs-list overflow-y-auto max-h-[calc(100vh-350px)] mt-4";
        this.backendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No backend logs to display</div>';
        this.backendLogsContainer.appendChild(backendFiltersContainer);
        this.backendLogsContainer.appendChild(this.backendLogsList);
        this.container.appendChild(this.frontendLogsContainer);
        this.container.appendChild(this.backendLogsContainer);
        this.setupFilterEventListeners();
        this.switchTab(this.activeTab);
      } else if (this.options.showBackendLogs) {
        this.backendLogsContainer = this.container;
        const filtersContainer = document.createElement("div");
        filtersContainer.className = "logs-filter-container mb-4";
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
          ${this.options.enableCorrelationIdFiltering ? `<input type="text" id="backend-correlation-id" placeholder="Filter by correlation ID" class="w-1/3 px-2 py-1 border border-border rounded bg-bg">` : ""}
          <label class="flex items-center">
            <input type="checkbox" id="backend-auto-refresh" ${this.options.autoRefreshBackendLogs ? "checked" : ""} class="mr-1"> Auto-refresh
          </label>
          <button id="clear-backend-logs-btn" class="px-2 py-1 bg-bg-sidebar text-text-muted hover:bg-bg-card rounded">Clear</button>
        </div>
      `;
        this.backendLogsList = document.createElement("div");
        this.backendLogsList.id = "backend-logs-list";
        this.backendLogsList.className = "logs-list overflow-y-auto max-h-[calc(100vh-250px)] mt-4";
        this.backendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No logs to display</div>';
        this.container.appendChild(filtersContainer);
        this.container.appendChild(this.backendLogsList);
        this.setupFilterEventListeners();
      } else if (this.options.showFrontendLogs) {
        this.frontendLogsContainer = this.container;
        const filtersContainer = document.createElement("div");
        filtersContainer.className = "logs-filter-container mb-4";
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
        this.frontendLogsList = document.createElement("div");
        this.frontendLogsList.id = "frontend-logs-list";
        this.frontendLogsList.className = "logs-list overflow-y-auto max-h-[calc(100vh-200px)] mt-4";
        this.frontendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No logs to display</div>';
        this.container.appendChild(filtersContainer);
        this.container.appendChild(this.frontendLogsList);
        this.setupFilterEventListeners();
      }
    }
    /**
     * Initializes backend logs manager
     */
    initializeBackendLogsManager() {
      if (!this.backendLogsManager || !this.options.showBackendLogs) {
        return;
      }
      this.backendLogsManager.on("logs:loaded", (_data) => {
        this.renderBackendLogs();
      });
      if (this.options.autoRefreshBackendLogs && this.options.refreshInterval > 0) {
        this.startAutoRefresh();
      }
      this.refreshBackendLogs();
    }
    /**
     * Sets up event listeners for filters
     */
    setupFilterEventListeners() {
      if (this.options.showFrontendLogs) {
        ["debug", "info", "warning", "error"].forEach((level) => {
          const checkbox = document.getElementById(`filter-${level}`);
          if (checkbox) {
            checkbox.addEventListener("change", () => this.renderFrontendLogs());
          }
        });
        const searchInput = document.getElementById("frontend-logs-search");
        if (searchInput) {
          searchInput.addEventListener("input", () => this.renderFrontendLogs());
        }
        const clearButton = document.getElementById("clear-frontend-logs-btn");
        if (clearButton) {
          clearButton.addEventListener("click", () => this.clearFrontendLogs());
        }
      }
      if (this.options.showBackendLogs) {
        ["debug", "info", "warning", "error"].forEach((level) => {
          const checkbox = document.getElementById(`backend-filter-${level}`);
          if (checkbox) {
            checkbox.addEventListener("change", () => this.renderBackendLogs());
          }
        });
        const searchInput = document.getElementById("backend-logs-search");
        if (searchInput) {
          searchInput.addEventListener("input", () => this.renderBackendLogs());
        }
        const correlationIdInput = document.getElementById("backend-correlation-id");
        if (correlationIdInput) {
          correlationIdInput.addEventListener("input", () => this.renderBackendLogs());
        }
        const refreshButton = document.getElementById("refresh-backend-logs-btn");
        if (refreshButton) {
          refreshButton.addEventListener("click", () => this.refreshBackendLogs());
        }
        const autoRefreshCheckbox = document.getElementById("backend-auto-refresh");
        if (autoRefreshCheckbox) {
          autoRefreshCheckbox.addEventListener("change", () => {
            if (autoRefreshCheckbox.checked) {
              this.startAutoRefresh();
            } else {
              this.stopAutoRefresh();
            }
          });
        }
        const clearButton = document.getElementById("clear-backend-logs-btn");
        if (clearButton) {
          clearButton.addEventListener("click", () => this.clearBackendLogs());
        }
      }
    }
    /**
     * Switches between frontend and backend logs tabs
     * @param tab The tab to switch to
     */
    switchTab(tab) {
      if (!this.options.showFrontendLogs || !this.options.showBackendLogs) {
        return;
      }
      this.activeTab = tab;
      if (this.frontendLogsTab && this.backendLogsTab) {
        this.frontendLogsTab.classList.toggle("border-b-2", tab === "frontend");
        this.frontendLogsTab.classList.toggle("border-primary-500", tab === "frontend");
        this.frontendLogsTab.classList.toggle("text-primary-500", tab === "frontend");
        this.frontendLogsTab.classList.toggle("font-medium", tab === "frontend");
        this.backendLogsTab.classList.toggle("border-b-2", tab === "backend");
        this.backendLogsTab.classList.toggle("border-primary-500", tab === "backend");
        this.backendLogsTab.classList.toggle("text-primary-500", tab === "backend");
        this.backendLogsTab.classList.toggle("font-medium", tab === "backend");
      }
      if (this.frontendLogsContainer && this.backendLogsContainer) {
        this.frontendLogsContainer.classList.toggle("hidden", tab !== "frontend");
        this.backendLogsContainer.classList.toggle("hidden", tab !== "backend");
      }
      if (tab === "frontend") {
        this.renderFrontendLogs();
      } else {
        this.renderBackendLogs();
      }
    }
    /**
     * Renders frontend logs based on current filters
     */
    renderFrontendLogs() {
      if (!this.frontendLogsList || !this.options.showFrontendLogs) {
        return;
      }
      const filteredLogs = this.getFilteredFrontendLogs();
      if (filteredLogs.length === 0) {
        this.frontendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No logs match your filters</div>';
        return;
      }
      this.frontendLogsList.innerHTML = "";
      filteredLogs.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
      filteredLogs.forEach((log) => {
        const logElement = document.createElement("div");
        logElement.className = "log-entry border-b border-border p-2";
        const formattedTime = new Date(log.timestamp).toLocaleTimeString();
        const formattedDate = new Date(log.timestamp).toLocaleDateString();
        logElement.innerHTML = `
        <div class="log-entry-header flex items-center text-xs text-text-muted mb-1">
          <span class="log-level log-level-${log.level} px-1 py-0.5 rounded text-white mr-2" style="background-color: ${this.getLevelColor(log.level)}">
            ${log.level}
          </span>
          <span class="log-timestamp mr-2">${formattedDate} ${formattedTime}</span>
          ${log.correlationId ? `<span class="log-correlation-id bg-bg-sidebar px-1.5 py-0.5 rounded text-xs" title="${log.correlationId}">ID: ${log.correlationId.substring(0, 8)}...</span>` : ""}
        </div>
        <div class="log-message text-sm">${log.message}</div>
        ${log.data ? `<div class="log-data mt-1 bg-bg-sidebar p-2 rounded text-xs font-mono">${this.formatJson(log.data)}</div>` : ""}
      `;
        this.frontendLogsList.appendChild(logElement);
      });
    }
    /**
     * Renders backend logs based on current filters
     */
    renderBackendLogs() {
      if (!this.backendLogsList || !this.backendLogsManager || !this.options.showBackendLogs) {
        return;
      }
      const logs = this.backendLogsManager.getLogs();
      const filteredLogs = this.getFilteredBackendLogs(logs);
      if (filteredLogs.length === 0) {
        this.backendLogsList.innerHTML = '<div class="text-center text-text-muted p-4">No logs match your filters</div>';
        return;
      }
      const aiLogCount = filteredLogs.filter((log) => this.isAiLog(log)).length;
      const domainEventCount = filteredLogs.filter((log) => this.isDomainEventLog(log)).length;
      this.backendLogsList.innerHTML = "";
      if (aiLogCount > 0 || domainEventCount > 0) {
        const countersElement = document.createElement("div");
        countersElement.className = "flex space-x-2 mb-2 text-xs";
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
      filteredLogs.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
      filteredLogs.forEach((log) => {
        var _a;
        const logElement = document.createElement("div");
        logElement.className = "log-entry border-b border-border p-2 mb-2";
        const formattedTime = new Date(log.timestamp).toLocaleTimeString();
        const formattedDate = new Date(log.timestamp).toLocaleDateString();
        const isAiLog = this.isAiLog(log);
        const isDomainEvent = this.isDomainEventLog(log);
        const logType = isDomainEvent ? "domain-event-log" : isAiLog ? "ai-log" : "";
        if (isAiLog) {
          logElement.classList.add("border-l-2", "border-l-green-500", "bg-green-50/10");
        } else if (isDomainEvent) {
          logElement.classList.add("border-l-2", "border-l-blue-500", "bg-blue-50/10");
        }
        const headerHtml = `
        <div class="log-entry-header flex flex-wrap items-center text-xs text-text-muted mb-1">
          <span class="log-level log-level-${log.level} px-1 py-0.5 rounded text-white mr-2" style="background-color: ${this.getLevelColor(log.level)}">
            ${log.level}
          </span>
          <span class="log-timestamp mr-2">${formattedDate} ${formattedTime}</span>
          ${((_a = log.meta) == null ? void 0 : _a.correlationId) ? `<span class="log-correlation-id bg-bg-sidebar px-1.5 py-0.5 rounded text-xs mr-2" title="${log.meta.correlationId}">ID: ${log.meta.correlationId.substring(0, 8)}...</span>` : ""}
          ${log.service ? `<span class="log-service-badge bg-gray-500 text-white px-1.5 py-0.5 rounded text-xs mr-2">${log.service}</span>` : ""}
          ${isAiLog ? '<span class="ai-log-badge bg-green-600 text-white px-1.5 py-0.5 rounded text-xs mr-2">AI</span>' : ""}
          ${isDomainEvent ? '<span class="domain-event-badge bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs mr-2">Event</span>' : ""}
          <span class="expand-icon ml-auto bg-bg-sidebar rounded-full h-4 w-4 inline-flex items-center justify-center text-xs font-bold cursor-pointer">+</span>
        </div>
      `;
        let detailsHtml = "";
        if (log.meta && Object.keys(log.meta).length > 0 || log.context && Object.keys(log.context).length > 0 || isAiLog || isDomainEvent) {
          detailsHtml = `
          <div class="log-details hidden mt-2">
            <div class="log-details-tabs flex border-b border-border">
              <button class="log-tab active py-1 px-3 text-xs" data-tab="meta">Metadata</button>
              ${log.context ? '<button class="log-tab py-1 px-3 text-xs" data-tab="context">Context</button>' : ""}
              ${isAiLog ? '<button class="log-tab py-1 px-3 text-xs" data-tab="ai">AI Details</button>' : ""}
              ${isDomainEvent ? '<button class="log-tab py-1 px-3 text-xs" data-tab="event">Event Details</button>' : ""}
            </div>
            
            <div class="log-details-content mt-2">
              <div class="log-tab-content active" data-tab="meta">
                ${log.meta ? `<div class="log-meta"><pre class="text-xs bg-bg-sidebar p-2 rounded overflow-auto max-h-60">${this.formatJson(log.meta)}</pre></div>` : '<p class="text-xs text-text-muted">No metadata available</p>'}
                ${log.service ? `<div class="log-service mt-1"><strong class="text-xs">Service:</strong> ${log.service}</div>` : ""}
              </div>
              
              ${log.context ? `
              <div class="log-tab-content hidden" data-tab="context">
                <pre class="text-xs bg-bg-sidebar p-2 rounded overflow-auto max-h-60">${this.formatJson(log.context)}</pre>
              </div>
              ` : ""}
              
              ${isAiLog ? `
              <div class="log-tab-content hidden" data-tab="ai">
                ${this.formatAiLogDetails(log)}
              </div>
              ` : ""}
              
              ${isDomainEvent ? `
              <div class="log-tab-content hidden" data-tab="event">
                ${this.formatDomainEventDetails(log)}
              </div>
              ` : ""}
            </div>
          </div>
        `;
        }
        const messageHtml = `<div class="log-message text-sm">${log.message}</div>`;
        logElement.innerHTML = headerHtml + messageHtml + detailsHtml;
        const header = logElement.querySelector(".log-entry-header");
        const details = logElement.querySelector(".log-details");
        const expandIcon = logElement.querySelector(".expand-icon");
        if (header && details && expandIcon) {
          header.addEventListener("click", () => {
            details.classList.toggle("hidden");
            expandIcon.textContent = details.classList.contains("hidden") ? "+" : "-";
          });
        }
        const tabs = logElement.querySelectorAll(".log-tab");
        tabs.forEach((tab) => {
          tab.addEventListener("click", (e) => {
            e.stopPropagation();
            tabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            const tabContents = logElement.querySelectorAll(".log-tab-content");
            const targetTab = tab.getAttribute("data-tab");
            tabContents.forEach((content) => {
              content.classList.toggle("hidden", content.getAttribute("data-tab") !== targetTab);
              content.classList.toggle("active", content.getAttribute("data-tab") === targetTab);
            });
          });
        });
        this.backendLogsList.appendChild(logElement);
      });
    }
    /**
     * Gets filtered frontend logs based on current filter settings
     * @returns Array of filtered log entries
     */
    getFilteredFrontendLogs() {
      let filteredLogs = [...this.frontendLogs];
      const levelFilters = {
        debug: document.getElementById("filter-debug") instanceof HTMLInputElement ? document.getElementById("filter-debug").checked : true,
        info: document.getElementById("filter-info") instanceof HTMLInputElement ? document.getElementById("filter-info").checked : true,
        warning: document.getElementById("filter-warning") instanceof HTMLInputElement ? document.getElementById("filter-warning").checked : true,
        error: document.getElementById("filter-error") instanceof HTMLInputElement ? document.getElementById("filter-error").checked : true
      };
      filteredLogs = filteredLogs.filter((log) => {
        const level = log.level.toLowerCase();
        return levelFilters[level] || false;
      });
      const searchInput = document.getElementById("frontend-logs-search");
      if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filteredLogs = filteredLogs.filter((log) => {
          return log.message.toLowerCase().includes(searchTerm) || log.correlationId && log.correlationId.toLowerCase().includes(searchTerm) || log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm);
        });
      }
      return filteredLogs;
    }
    /**
     * Gets filtered backend logs based on current filter settings
     * @param logs The logs to filter
     * @returns Array of filtered log entries
     */
    getFilteredBackendLogs(logs) {
      if (!logs || !Array.isArray(logs)) {
        return [];
      }
      let filteredLogs = [...logs];
      const levelFilters = {
        debug: document.getElementById("backend-filter-debug") instanceof HTMLInputElement ? document.getElementById("backend-filter-debug").checked : true,
        info: document.getElementById("backend-filter-info") instanceof HTMLInputElement ? document.getElementById("backend-filter-info").checked : true,
        warning: document.getElementById("backend-filter-warning") instanceof HTMLInputElement ? document.getElementById("backend-filter-warning").checked : true,
        error: document.getElementById("backend-filter-error") instanceof HTMLInputElement ? document.getElementById("backend-filter-error").checked : true
      };
      filteredLogs = filteredLogs.filter((log) => {
        const level = log.level ? log.level.toLowerCase() : "info";
        return levelFilters[level] || false;
      });
      if (this.options.enableCorrelationIdFiltering) {
        const correlationIdInput = document.getElementById("backend-correlation-id");
        if (correlationIdInput && correlationIdInput.value.trim()) {
          const correlationId = correlationIdInput.value.trim();
          filteredLogs = filteredLogs.filter((log) => {
            var _a;
            return ((_a = log.meta) == null ? void 0 : _a.correlationId) && log.meta.correlationId.includes(correlationId) || log.correlationId && log.correlationId.includes(correlationId);
          });
        }
      }
      if (this.options.enableSearchFiltering) {
        const searchInput = document.getElementById("backend-logs-search");
        if (searchInput && searchInput.value.trim()) {
          const searchTerm = searchInput.value.trim().toLowerCase();
          filteredLogs = filteredLogs.filter((log) => {
            return log.message.toLowerCase().includes(searchTerm) || log.service && log.service.toLowerCase().includes(searchTerm) || log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchTerm) || log.context && JSON.stringify(log.context).toLowerCase().includes(searchTerm);
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
    getLevelColor(level) {
      switch (level.toUpperCase()) {
        case "DEBUG":
          return "#6b7280";
        case "INFO":
          return "#3b82f6";
        case "WARNING":
          return "#f59e0b";
        case "ERROR":
          return "#ef4444";
        default:
          return "#6b7280";
      }
    }
    /**
     * Formats JSON for display
     * @param obj Object to format
     * @returns Formatted string
     */
    formatJson(obj) {
      if (!obj)
        return "";
      try {
        const formattedJson = JSON.stringify(obj, null, 2).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
          let cls = "text-blue-600 dark:text-blue-400";
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "text-gray-800 dark:text-gray-300 font-medium";
            } else {
              cls = "text-green-600 dark:text-green-400";
            }
          } else if (/true|false/.test(match)) {
            cls = "text-purple-600 dark:text-purple-400";
          } else if (/null/.test(match)) {
            cls = "text-gray-500 dark:text-gray-500";
          }
          return `<span class="${cls}">${match}</span>`;
        });
        return formattedJson;
      } catch (e) {
        console.error("Error formatting JSON:", e);
        return String(obj);
      }
    }
    /**
     * Formats AI log details for display
     * @param log The log entry
     * @returns Formatted HTML
     */
    formatAiLogDetails(log) {
      if (!log || !this.options.enableAiLogFormatting) {
        return '<p class="text-xs text-text-muted">No AI details available</p>';
      }
      try {
        const data = log.data || log.meta || {};
        if (!data.prompt && !data.completion && !data.messages) {
          return '<p class="text-xs text-text-muted">No AI details available</p>';
        }
        let html = '<div class="ai-log-details space-y-3">';
        if (data.prompt) {
          html += `
          <div class="prompt-section">
            <div class="font-medium text-xs mb-1">Prompt:</div>
            <div class="bg-bg-sidebar p-2 rounded text-xs whitespace-pre-wrap">${data.prompt}</div>
          </div>
        `;
        }
        if (data.messages && Array.isArray(data.messages)) {
          html += `
          <div class="messages-section">
            <div class="font-medium text-xs mb-1">Messages:</div>
            <div class="space-y-2">
        `;
          data.messages.forEach((message, index) => {
            const role = message.role || "unknown";
            const content = message.content || "";
            const roleColorClass = role === "user" ? "bg-blue-100 text-blue-800" : role === "assistant" ? "bg-green-100 text-green-800" : role === "system" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800";
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
        if (data.completion) {
          html += `
          <div class="completion-section">
            <div class="font-medium text-xs mb-1">Completion:</div>
            <div class="bg-bg-sidebar p-2 rounded text-xs whitespace-pre-wrap">${data.completion}</div>
          </div>
        `;
        }
        if (data.model) {
          html += `
          <div class="model-info">
            <div class="font-medium text-xs inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded">Model: ${data.model}</div>
          </div>
        `;
        }
        if (data.usage) {
          html += `
          <div class="token-info flex flex-wrap gap-2">
            ${data.usage.prompt_tokens ? `<div class="font-medium text-xs inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Prompt tokens: ${data.usage.prompt_tokens}</div>` : ""}
            ${data.usage.completion_tokens ? `<div class="font-medium text-xs inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded">Completion tokens: ${data.usage.completion_tokens}</div>` : ""}
            ${data.usage.total_tokens ? `<div class="font-medium text-xs inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded">Total tokens: ${data.usage.total_tokens}</div>` : ""}
          </div>
        `;
        }
        html += "</div>";
        return html;
      } catch (e) {
        console.error("Error formatting AI log details:", e);
        return '<p class="text-xs text-text-muted">Error formatting AI log details</p>';
      }
    }
    /**
     * Formats domain event log details for display
     * @param log The log entry
     * @returns Formatted HTML
     */
    formatDomainEventDetails(log) {
      if (!log || !this.options.enableDomainEventFormatting) {
        return '<p class="text-xs text-text-muted">No event details available</p>';
      }
      try {
        const data = log.data || log.meta || {};
        if (!data.event && !data.eventType && !data.type) {
          return '<p class="text-xs text-text-muted">No event details available</p>';
        }
        const eventType = data.eventType || data.type || data.event || "Unknown Event";
        const payload = data.payload || data.data || data;
        let html = `
        <div class="event-details space-y-3">
          <div class="event-type flex items-center">
            <div class="font-medium text-xs inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              ${eventType}
            </div>
            ${data.timestamp ? `<div class="text-xs text-text-muted ml-2">${new Date(data.timestamp).toLocaleString()}</div>` : ""}
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
          ` : ""}
          
          ${data.correlationId ? `
          <div class="event-correlation">
            <div class="font-medium text-xs mb-1">Correlation ID:</div>
            <div class="text-xs font-mono">${data.correlationId}</div>
          </div>
          ` : ""}
        </div>
      `;
        return html;
      } catch (e) {
        console.error("Error formatting domain event details:", e);
        return '<p class="text-xs text-text-muted">Error formatting event details</p>';
      }
    }
    /**
     * Determines if a log entry is an AI-related log
     * @param log The log entry to check
     * @returns True if the log is AI-related
     */
    isAiLog(log) {
      if (!log)
        return false;
      const messageIndicators = [
        "openai",
        "gpt-",
        "ai response",
        "ai request",
        "ai completion",
        "llm",
        "model response",
        "prompt"
      ];
      if (log.message && typeof log.message === "string") {
        for (const indicator of messageIndicators) {
          if (log.message.toLowerCase().includes(indicator)) {
            return true;
          }
        }
      }
      const data = log.data || log.meta || {};
      if (data.model && typeof data.model === "string" && data.model.includes("gpt-")) {
        return true;
      }
      if (data.prompt || data.completion || data.messages && Array.isArray(data.messages)) {
        return true;
      }
      if (log.service && typeof log.service === "string") {
        const serviceIndicators = ["openai", "ai", "llm", "gpt"];
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
    isDomainEventLog(log) {
      if (!log)
        return false;
      const messageIndicators = [
        "event emitted",
        "event received",
        "domain event",
        "event dispatched",
        "dispatching event",
        "event published",
        "event processed"
      ];
      if (log.message && typeof log.message === "string") {
        for (const indicator of messageIndicators) {
          if (log.message.toLowerCase().includes(indicator)) {
            return true;
          }
        }
      }
      const data = log.data || log.meta || {};
      if (data.eventType || data.type || data.event) {
        return true;
      }
      const eventPatterns = [
        /Event\s+[A-Z][a-zA-Z]+Event/,
        /[A-Z][a-zA-Z]+Event/,
        /Event\s+[A-Z][a-zA-Z]+/
      ];
      if (log.message && typeof log.message === "string") {
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
    hookConsole() {
      const addFrontendLog = (level, args) => {
        const entry = {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          level: level.toUpperCase(),
          message: args.map((arg) => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" "),
          correlationId: this.getCurrentCorrelationId(),
          data: args.length === 1 && typeof args[0] === "object" ? args[0] : null
        };
        this.frontendLogs.push(entry);
        if (this.frontendLogs.length > this.options.maxFrontendLogs) {
          this.frontendLogs.shift();
        }
        if (this.activeTab === "frontend") {
          this.renderFrontendLogs();
        }
      };
      console.debug = (...args) => {
        this.originalConsole.debug.apply(console, args);
        addFrontendLog("debug", args);
      };
      console.log = (...args) => {
        this.originalConsole.log.apply(console, args);
        addFrontendLog("info", args);
      };
      console.info = (...args) => {
        this.originalConsole.info.apply(console, args);
        addFrontendLog("info", args);
      };
      console.warn = (...args) => {
        this.originalConsole.warn.apply(console, args);
        addFrontendLog("warning", args);
      };
      console.error = (...args) => {
        this.originalConsole.error.apply(console, args);
        addFrontendLog("error", args);
      };
    }
    /**
     * Restores original console methods
     */
    unhookConsole() {
      console.log = this.originalConsole.log;
      console.info = this.originalConsole.info;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
      console.debug = this.originalConsole.debug;
    }
    /**
     * Gets the current correlation ID from meta elements or localStorage
     */
    getCurrentCorrelationId() {
      const metaCorrelationId = document.querySelector('meta[name="correlation-id"]');
      if (metaCorrelationId && metaCorrelationId.getAttribute("content")) {
        return metaCorrelationId.getAttribute("content") || void 0;
      }
      return localStorage.getItem("correlationId") || void 0;
    }
    /**
     * Starts auto-refresh for backend logs
     */
    startAutoRefresh() {
      this.stopAutoRefresh();
      if (this.options.refreshInterval > 0) {
        this.refreshIntervalId = window.setInterval(() => {
          this.refreshBackendLogs();
        }, this.options.refreshInterval);
      }
      const autoRefreshCheckbox = document.getElementById("backend-auto-refresh");
      if (autoRefreshCheckbox) {
        autoRefreshCheckbox.checked = true;
      }
    }
    /**
     * Stops auto-refresh for backend logs
     */
    stopAutoRefresh() {
      if (this.refreshIntervalId !== null) {
        window.clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
      }
      const autoRefreshCheckbox = document.getElementById("backend-auto-refresh");
      if (autoRefreshCheckbox) {
        autoRefreshCheckbox.checked = false;
      }
    }
    /**
     * Public method to refresh backend logs
     */
    refreshBackendLogs() {
      if (this.backendLogsManager) {
        this.backendLogsManager.fetchLogs();
      }
    }
    /**
     * Public method to clear frontend logs
     */
    clearFrontendLogs() {
      this.frontendLogs = [];
      this.renderFrontendLogs();
    }
    /**
     * Public method to clear backend logs
     */
    clearBackendLogs() {
      if (this.backendLogsManager) {
        this.backendLogsManager.clearLogs();
        this.renderBackendLogs();
      }
    }
    /**
     * Public method to add a log entry programmatically
     * @param entry LogEntry to add
     */
    addLog(entry) {
      this.frontendLogs.push(entry);
      if (this.frontendLogs.length > this.options.maxFrontendLogs) {
        this.frontendLogs.shift();
      }
      if (this.activeTab === "frontend") {
        this.renderFrontendLogs();
      }
    }
    /**
     * Public method to get all frontend logs
     * @returns Array of log entries
     */
    getFrontendLogs() {
      return [...this.frontendLogs];
    }
    /**
     * Public method to get all backend logs
     * @returns Array of log entries or null if not available
     */
    getBackendLogs() {
      if (this.backendLogsManager) {
        return this.backendLogsManager.getLogs();
      }
      return null;
    }
    /**
     * Public method to destroy the LogsViewer
     * Cleans up event listeners and restores console
     */
    destroy() {
      this.unhookConsole();
      this.stopAutoRefresh();
      if (this.container) {
        this.container.innerHTML = "";
      }
      this.frontendLogsTab = null;
      this.backendLogsTab = null;
      this.frontendLogsContainer = null;
      this.backendLogsContainer = null;
      this.frontendLogsList = null;
      this.backendLogsList = null;
      this.frontendLogs = [];
      this.backendLogsManager = null;
    }
  };
  var LogsViewer_default = LogsViewer;

  // js/core/ConfigManager.ts
  var DEFAULT_CONFIG2 = {
    appName: "API Client",
    debug: false,
    version: "1.0.0",
    apiUrl: "/api",
    useLocalEndpoints: true,
    theme: "light",
    language: "en",
    toastPosition: "top-right",
    enableHistory: true,
    enableVariables: true,
    enableDomainState: true,
    storagePrefix: "api_client_",
    persistHistory: true,
    historyMaxItems: 50,
    logLevel: "error",
    timeout: 3e4
  };
  var ConfigManager = class {
    /**
     * Private constructor to prevent direct creation
     */
    constructor() {
      this.initialized = false;
      this.config = { ...DEFAULT_CONFIG2 };
    }
    /**
     * Get the singleton instance of ConfigManager
     */
    static getInstance() {
      if (!ConfigManager.instance) {
        ConfigManager.instance = new ConfigManager();
      }
      return ConfigManager.instance;
    }
    /**
     * Initialize with configuration
     * @param options Configuration options
     */
    initialize(options = {}) {
      this.config = { ...DEFAULT_CONFIG2, ...options };
      this.initialized = true;
      if (this.config.theme && this.config.theme !== "auto") {
        document.documentElement.setAttribute("data-theme", this.config.theme);
      }
      if (this.config.debug) {
        console.debug("ConfigManager initialized with:", this.config);
      }
    }
    /**
     * Get all configuration
     * @returns The complete configuration object
     */
    getAll() {
      return { ...this.config };
    }
    /**
     * Get a specific configuration value
     * @param key Configuration key
     * @param defaultValue Default value if not found
     * @returns The configuration value or default
     */
    get(key, defaultValue) {
      const value = this.config[key];
      return value !== void 0 ? value : defaultValue;
    }
    /**
     * Set a configuration value
     * @param key Configuration key
     * @param value New value
     */
    set(key, value) {
      this.config[key] = value;
      if (key === "theme" && typeof value === "string") {
        document.documentElement.setAttribute("data-theme", value);
      }
      if (this.config.debug) {
        console.debug(`ConfigManager set ${key}:`, value);
      }
    }
    /**
     * Check if a configuration value exists
     * @param key Configuration key
     * @returns True if the key exists
     */
    has(key) {
      return key in this.config;
    }
    /**
     * Update multiple configuration values
     * @param options Configuration options to update
     */
    update(options) {
      Object.assign(this.config, options);
      if (options.theme) {
        document.documentElement.setAttribute("data-theme", options.theme);
      }
      if (this.config.debug) {
        console.debug("ConfigManager updated with:", options);
      }
    }
    /**
     * Reset configuration to default values
     */
    reset() {
      this.config = { ...DEFAULT_CONFIG2 };
      document.documentElement.setAttribute("data-theme", DEFAULT_CONFIG2.theme || "light");
      if (this.config.debug) {
        console.debug("ConfigManager reset to defaults");
      }
    }
    /**
     * Load configuration from a JSON file path
     * @param path Path to the configuration JSON file
     * @returns Promise that resolves when configuration is loaded
     */
    async loadConfig(path) {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load config from ${path}: ${response.status} ${response.statusText}`);
        }
        const config = await response.json();
        this.update(config);
        if (this.config.debug) {
          console.debug(`ConfigManager loaded config from ${path}:`, config);
        }
      } catch (error) {
        console.error(`Error loading config from ${path}:`, error);
        throw error;
      }
    }
  };

  // js/core/Logger.ts
  var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
    LogLevel2[LogLevel2["NONE"] = 0] = "NONE";
    LogLevel2[LogLevel2["ERROR"] = 1] = "ERROR";
    LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
    LogLevel2[LogLevel2["INFO"] = 3] = "INFO";
    LogLevel2[LogLevel2["DEBUG"] = 4] = "DEBUG";
    return LogLevel2;
  })(LogLevel || {});
  var DEFAULT_OPTIONS5 = {
    level: 1 /* ERROR */,
    showTimestamp: true,
    showComponent: true,
    showLevel: true,
    prefix: ""
  };
  var Logger2 = class {
    /**
     * Get the singleton instance of Logger
     */
    static getInstance() {
      if (!Logger2.instance) {
        Logger2.instance = new Logger2();
      }
      return Logger2.instance;
    }
    /**
     * Get a component-specific logger
     * @param component Component name
     */
    static getLogger(component) {
      return new ComponentLogger(component, Logger2.getInstance());
    }
    /**
     * Private constructor to prevent direct creation
     */
    constructor() {
      const config = ConfigManager.getInstance();
      const configLevel = config.get("logLevel");
      let level = DEFAULT_OPTIONS5.level;
      if (configLevel) {
        switch (configLevel) {
          case "error":
            level = 1 /* ERROR */;
            break;
          case "warn":
            level = 2 /* WARN */;
            break;
          case "info":
            level = 3 /* INFO */;
            break;
          case "debug":
            level = 4 /* DEBUG */;
            break;
          case "none":
            level = 0 /* NONE */;
            break;
        }
      }
      this.options = {
        ...DEFAULT_OPTIONS5,
        level
      };
    }
    /**
     * Configure the logger
     * @param options Logger options
     */
    configure(options) {
      this.options = { ...this.options, ...options };
    }
    /**
     * Get current logger options
     */
    getOptions() {
      return { ...this.options };
    }
    /**
     * Set the current log level
     * @param level New log level
     */
    setLevel(level) {
      this.options.level = level;
    }
    /**
     * Log an error message
     * @param component Component name
     * @param message Error message
     * @param args Additional arguments
     */
    error(component, message, ...args) {
      this.log(1 /* ERROR */, component, message, args);
    }
    /**
     * Log a warning message
     * @param component Component name
     * @param message Warning message
     * @param args Additional arguments
     */
    warn(component, message, ...args) {
      this.log(2 /* WARN */, component, message, args);
    }
    /**
     * Log an info message
     * @param component Component name
     * @param message Info message
     * @param args Additional arguments
     */
    info(component, message, ...args) {
      this.log(3 /* INFO */, component, message, args);
    }
    /**
     * Log a debug message
     * @param component Component name
     * @param message Debug message
     * @param args Additional arguments
     */
    debug(component, message, ...args) {
      this.log(4 /* DEBUG */, component, message, args);
    }
    /**
     * Internal log method
     * @param level Log level
     * @param component Component name
     * @param message Log message
     * @param args Additional arguments
     */
    log(level, component, message, args) {
      if (!this.options.level || level > this.options.level) {
        return;
      }
      let prefix = this.options.prefix ? `${this.options.prefix} ` : "";
      if (this.options.showTimestamp) {
        const now = /* @__PURE__ */ new Date();
        prefix += `[${now.toISOString()}] `;
      }
      if (this.options.showLevel) {
        const levelName = LogLevel[level];
        prefix += `${levelName} `;
      }
      if (this.options.showComponent && component) {
        prefix += `[${component}] `;
      }
      let method;
      switch (level) {
        case 1 /* ERROR */:
          method = "error";
          break;
        case 2 /* WARN */:
          method = "warn";
          break;
        case 3 /* INFO */:
          method = "info";
          break;
        case 4 /* DEBUG */:
          method = "debug";
          break;
        default:
          method = "log";
      }
      if (args.length > 0) {
        console[method](prefix + message, ...args);
      } else {
        console[method](prefix + message);
      }
    }
  };
  var ComponentLogger = class {
    /**
     * Create a new component logger
     * @param component Component name
     * @param logger Parent logger
     */
    constructor(component, logger2) {
      this.component = component;
      this.logger = logger2;
    }
    /**
     * Log an error message
     * @param message Error message
     * @param args Additional arguments
     */
    error(message, ...args) {
      this.logger.error(this.component, message, ...args);
    }
    /**
     * Log a warning message
     * @param message Warning message
     * @param args Additional arguments
     */
    warn(message, ...args) {
      this.logger.warn(this.component, message, ...args);
    }
    /**
     * Log an info message
     * @param message Info message
     * @param args Additional arguments
     */
    info(message, ...args) {
      this.logger.info(this.component, message, ...args);
    }
    /**
     * Log a debug message
     * @param message Debug message
     * @param args Additional arguments
     */
    debug(message, ...args) {
      this.logger.debug(this.component, message, ...args);
    }
  };

  // js/core/DependencyContainer.ts
  var DependencyContainer = class {
    /**
     * Private constructor to prevent direct creation
     */
    constructor() {
      this.initialized = false;
      this.logger = Logger2.getLogger("DependencyContainer");
      this.services = /* @__PURE__ */ new Map();
      this.aliases = /* @__PURE__ */ new Map();
      this.tags = /* @__PURE__ */ new Map();
    }
    /**
     * Get the singleton instance of DependencyContainer
     */
    static getInstance() {
      if (!DependencyContainer.instance) {
        DependencyContainer.instance = new DependencyContainer();
      }
      return DependencyContainer.instance;
    }
    /**
     * Initialize the container
     */
    initialize() {
      this.logger.info("Dependency container initialized");
      this.initialized = true;
    }
    /**
     * Register a service with the container
     * @param id Service ID
     * @param factory Factory function to create the service
     * @param options Service options
     */
    register(id, factory, options = {}) {
      if (this.services.has(id)) {
        this.logger.warn(`Service '${id}' is already registered. Overwriting.`);
      }
      const serviceOptions = {
        singleton: true,
        tags: [],
        priority: 0,
        ...options
      };
      this.services.set(id, {
        factory,
        options: serviceOptions
      });
      if (serviceOptions.tags && serviceOptions.tags.length > 0) {
        for (const tag of serviceOptions.tags) {
          if (!this.tags.has(tag)) {
            this.tags.set(tag, /* @__PURE__ */ new Set());
          }
          const taggedServices = this.tags.get(tag);
          if (taggedServices) {
            taggedServices.add(id);
          }
        }
      }
      this.logger.debug(`Registered service '${id}'`);
    }
    /**
     * Check if a service is registered
     * @param id Service ID
     * @returns True if the service is registered
     */
    has(id) {
      if (this.services.has(id)) {
        return true;
      }
      if (this.aliases.has(id)) {
        const aliasedId = this.aliases.get(id);
        return aliasedId !== void 0 && this.services.has(aliasedId);
      }
      return false;
    }
    /**
     * Get a service instance
     * @param id Service ID
     * @returns Service instance
     * @throws Error if service not found
     */
    get(id) {
      if (this.aliases.has(id)) {
        const aliasedId = this.aliases.get(id);
        if (aliasedId) {
          return this.get(aliasedId);
        }
      }
      const registration = this.services.get(id);
      if (!registration) {
        throw new Error(`Service '${id}' not found in container`);
      }
      if (registration.options.singleton && registration.instance !== void 0) {
        return registration.instance;
      }
      try {
        const instance = registration.factory(this);
        if (registration.options.singleton) {
          registration.instance = instance;
        }
        return instance;
      } catch (error) {
        this.logger.error(`Error creating service '${id}':`, error);
        throw new Error(`Error creating service '${id}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    /**
     * Create a new instance of a service, ignoring singleton status
     * @param id Service ID
     * @returns Service instance
     * @throws Error if service not found
     */
    create(id) {
      if (this.aliases.has(id)) {
        const aliasedId = this.aliases.get(id);
        if (aliasedId) {
          return this.create(aliasedId);
        }
      }
      const registration = this.services.get(id);
      if (!registration) {
        throw new Error(`Service '${id}' not found in container`);
      }
      try {
        return registration.factory(this);
      } catch (error) {
        this.logger.error(`Error creating service '${id}':`, error);
        throw new Error(`Error creating service '${id}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    /**
     * Register a service alias
     * @param alias Alias name
     * @param id Target service ID
     */
    alias(alias, id) {
      if (!this.services.has(id)) {
        this.logger.warn(`Cannot create alias '${alias}' for unknown service '${id}'`);
        return;
      }
      this.aliases.set(alias, id);
      this.logger.debug(`Registered alias '${alias}' for service '${id}'`);
    }
    /**
     * Get all services with a specific tag
     * @param tag Tag to filter by
     * @returns Array of service instances
     */
    getByTag(tag) {
      const serviceIds = this.tags.get(tag);
      if (!serviceIds || serviceIds.size === 0) {
        return [];
      }
      const sortedIds = Array.from(serviceIds).sort((a, b) => {
        const serviceA = this.services.get(a);
        const serviceB = this.services.get(b);
        if (!serviceA || !serviceB) {
          return 0;
        }
        const priorityA = serviceA.options.priority || 0;
        const priorityB = serviceB.options.priority || 0;
        return priorityB - priorityA;
      });
      return sortedIds.map((id) => this.get(id));
    }
    /**
     * Remove a service from the container
     * @param id Service ID
     * @returns True if service was removed
     */
    remove(id) {
      if (!this.services.has(id)) {
        return false;
      }
      const service = this.services.get(id);
      if (service && service.options.tags) {
        for (const tag of service.options.tags) {
          const taggedServices = this.tags.get(tag);
          if (taggedServices) {
            taggedServices.delete(id);
            if (taggedServices.size === 0) {
              this.tags.delete(tag);
            }
          }
        }
      }
      this.services.delete(id);
      for (const [alias, targetId] of this.aliases.entries()) {
        if (targetId === id) {
          this.aliases.delete(alias);
        }
      }
      this.logger.debug(`Removed service '${id}'`);
      return true;
    }
    /**
     * Register a service factory
     * @param id Service ID
     * @param factory Factory function
     * @param options Service options
     */
    factory(id, factory, options = {}) {
      const factoryOptions = {
        ...options,
        singleton: options.singleton === true
      };
      this.register(id, factory, factoryOptions);
    }
    /**
     * Register a value directly
     * @param id Service ID
     * @param value Value to register
     */
    value(id, value) {
      this.register(id, () => value, { singleton: true });
    }
    /**
     * Get all registered service IDs
     * @returns Array of service IDs
     */
    getServiceIds() {
      return Array.from(this.services.keys());
    }
    /**
     * Get all registered tags
     * @returns Array of tags
     */
    getTags() {
      return Array.from(this.tags.keys());
    }
    /**
     * Reset the container, removing all services
     */
    reset() {
      this.services.clear();
      this.aliases.clear();
      this.tags.clear();
      this.logger.info("Dependency container reset");
    }
  };

  // js/core/EventBus.ts
  var EventBus = class {
    /**
     * Private constructor to prevent direct creation
     */
    constructor() {
      this.events = /* @__PURE__ */ new Map();
      this.events = /* @__PURE__ */ new Map();
    }
    /**
     * Get the singleton instance of EventBus
     */
    static getInstance() {
      if (!EventBus.instance) {
        EventBus.instance = new EventBus();
      }
      return EventBus.instance;
    }
    /**
     * Subscribe to an event
     * @param event Event name
     * @param handler Event handler
     */
    subscribe(event, handler) {
      if (!this.events.has(event)) {
        this.events.set(event, /* @__PURE__ */ new Set());
      }
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.add(handler);
      }
    }
    /**
     * Unsubscribe from an event
     * @param event Event name
     * @param handler Event handler to remove
     */
    unsubscribe(event, handler) {
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.events.delete(event);
        }
      }
    }
    /**
     * Publish an event
     * @param event Event name
     * @param data Event data
     */
    publish(event, data) {
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in event handler for ${event}:`, error);
          }
        });
      }
    }
    /**
     * Emit an event (alias for publish)
     * @param event Event name
     * @param data Event data
     */
    emit(event, data) {
      this.publish(event, data);
    }
    /**
     * Check if an event has subscribers
     * @param event Event name
     * @returns True if the event has subscribers
     */
    hasSubscribers(event) {
      const handlers = this.events.get(event);
      return !!handlers && handlers.size > 0;
    }
    /**
     * Clear all subscriptions for an event
     * @param event Event name
     */
    clearEvent(event) {
      this.events.delete(event);
    }
    /**
     * Clear all events and subscriptions
     */
    clearAll() {
      this.events.clear();
    }
  };

  // js/core/HttpClient.ts
  var HttpError = class extends Error {
    constructor(message, status, statusText, data, response) {
      super(message);
      this.name = "HttpError";
      this.status = status;
      this.statusText = statusText;
      this.data = data;
      this.response = response;
      Object.setPrototypeOf(this, HttpError.prototype);
    }
    /**
     * Convert the error to a string
     * @returns String representation of the error
     */
    toString() {
      return `${this.name}: ${this.message} (${this.status} ${this.statusText})`;
    }
  };
  var DEFAULT_OPTIONS6 = {
    baseUrl: "",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    timeout: 3e4,
    requestInterceptors: [],
    responseInterceptors: [],
    errorInterceptors: [],
    parseJson: true,
    retries: 0,
    retryDelay: 1e3,
    fetchFn: fetch,
    logRequests: false,
    logResponses: false,
    logErrors: true
  };
  var HttpClient = class {
    /**
     * Private constructor to prevent direct creation
     */
    constructor() {
      this.requestInterceptors = [];
      this.responseInterceptors = [];
      this.errorInterceptors = [];
      this.initialized = false;
      this.logger = Logger2.getLogger("HttpClient");
      this.config = { ...DEFAULT_OPTIONS6 };
    }
    /**
     * Get the singleton instance of HttpClient
     */
    static getInstance() {
      if (!HttpClient.instance) {
        HttpClient.instance = new HttpClient();
      }
      return HttpClient.instance;
    }
    /**
     * Initialize the HTTP client
     * @param options HTTP client options
     */
    initialize(options = {}) {
      const configManager = ConfigManager.getInstance();
      const configTimeout = configManager.get("timeout");
      const configApiUrl = configManager.get("apiUrl");
      this.config = {
        ...DEFAULT_OPTIONS6,
        ...configTimeout ? { timeout: configTimeout } : {},
        ...configApiUrl ? { baseUrl: configApiUrl } : {},
        ...options
      };
      this.requestInterceptors = [...this.config.requestInterceptors || []];
      this.responseInterceptors = [...this.config.responseInterceptors || []];
      this.errorInterceptors = [...this.config.errorInterceptors || []];
      this.initialized = true;
      this.logger.info("HTTP client initialized");
    }
    /**
     * Build the full URL for a request
     * @param url URL to build
     * @param params Query parameters
     * @returns Built URL
     */
    buildUrl(url, params) {
      let fullUrl = url;
      if (!url.match(/^https?:\/\//) && !url.startsWith("/")) {
        fullUrl = `${this.config.baseUrl || ""}/${url}`;
      } else if (url.startsWith("/") && this.config.baseUrl) {
        const baseUrl = this.config.baseUrl.endsWith("/") ? this.config.baseUrl.slice(0, -1) : this.config.baseUrl;
        fullUrl = `${baseUrl}${url}`;
      }
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value !== null && value !== void 0) {
            searchParams.append(key, String(value));
          }
        }
        const queryString = searchParams.toString();
        if (queryString) {
          fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryString;
        }
      }
      return fullUrl;
    }
    /**
     * Add a request interceptor
     * @param interceptor Request interceptor
     */
    addRequestInterceptor(interceptor) {
      this.requestInterceptors.push(interceptor);
    }
    /**
     * Add a response interceptor
     * @param interceptor Response interceptor
     */
    addResponseInterceptor(interceptor) {
      this.responseInterceptors.push(interceptor);
    }
    /**
     * Add an error interceptor
     * @param interceptor Error interceptor
     */
    addErrorInterceptor(interceptor) {
      this.errorInterceptors.push(interceptor);
    }
    /**
     * Remove all interceptors
     */
    clearInterceptors() {
      this.requestInterceptors = [];
      this.responseInterceptors = [];
      this.errorInterceptors = [];
    }
    /**
     * Make an HTTP request
     * @param url URL to request
     * @param reqOptions Request options
     * @returns Response promise
     */
    async request(url, reqOptions = {}) {
      var _a;
      let interceptedUrl = url;
      let interceptedOptions = { ...reqOptions };
      for (const interceptor of this.requestInterceptors) {
        const result = interceptor.intercept(interceptedUrl, interceptedOptions);
        interceptedUrl = result.url;
        interceptedOptions = result.options;
      }
      const mergedOptions = {
        method: "GET",
        headers: { ...this.config.headers },
        timeout: this.config.timeout,
        parseJson: this.config.parseJson,
        retries: this.config.retries,
        retryDelay: this.config.retryDelay,
        fetchFn: this.config.fetchFn || fetch,
        ...interceptedOptions
      };
      if (interceptedOptions.headers) {
        mergedOptions.headers = {
          ...this.config.headers,
          ...interceptedOptions.headers
        };
      }
      if (mergedOptions.body !== void 0) {
        if (typeof mergedOptions.body === "object" && !(mergedOptions.body instanceof FormData) && !(mergedOptions.body instanceof URLSearchParams) && !(mergedOptions.body instanceof Blob) && !(mergedOptions.body instanceof ArrayBuffer)) {
          mergedOptions.body = JSON.stringify(mergedOptions.body);
          if (mergedOptions.headers && !("Content-Type" in mergedOptions.headers)) {
            mergedOptions.headers["Content-Type"] = "application/json";
          }
        }
      }
      const fullUrl = this.buildUrl(interceptedUrl, mergedOptions.params);
      if (this.config.logRequests) {
        this.logger.debug(`${mergedOptions.method} ${fullUrl}`, {
          headers: mergedOptions.headers,
          body: mergedOptions.body
        });
      }
      const fetchOptions = {
        method: mergedOptions.method,
        headers: mergedOptions.headers,
        body: mergedOptions.body,
        cache: mergedOptions.cache,
        credentials: mergedOptions.withCredentials ? "include" : "same-origin",
        signal: mergedOptions.signal
      };
      let timeoutId;
      let timeoutController;
      if (mergedOptions.timeout && mergedOptions.timeout > 0) {
        timeoutController = new AbortController();
        if (mergedOptions.signal) {
          const originalSignal = mergedOptions.signal;
          if (originalSignal.aborted) {
            fetchOptions.signal = originalSignal;
          } else {
            originalSignal.addEventListener("abort", () => {
              timeoutController == null ? void 0 : timeoutController.abort();
            });
            fetchOptions.signal = timeoutController.signal;
          }
        } else {
          fetchOptions.signal = timeoutController.signal;
        }
        timeoutId = window.setTimeout(() => {
          timeoutController == null ? void 0 : timeoutController.abort();
        }, mergedOptions.timeout);
      }
      try {
        let lastError = null;
        let retryCount = 0;
        while (retryCount <= (mergedOptions.retries || 0)) {
          try {
            const fetchFn = mergedOptions.fetchFn || fetch;
            const response = await fetchFn(fullUrl, fetchOptions);
            if (timeoutId !== void 0) {
              clearTimeout(timeoutId);
            }
            let data;
            if (mergedOptions.responseType) {
              switch (mergedOptions.responseType) {
                case "json":
                  data = await response.json();
                  break;
                case "text":
                  data = await response.text();
                  break;
                case "blob":
                  data = await response.blob();
                  break;
                case "arraybuffer":
                  data = await response.arrayBuffer();
                  break;
              }
            } else if (mergedOptions.parseJson !== false) {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                try {
                  data = await response.json();
                } catch (e) {
                  data = await response.text();
                }
              } else {
                data = await response.text();
              }
            } else {
              data = await response.text();
            }
            let httpResponse = {
              data,
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              response
            };
            for (const interceptor of this.responseInterceptors) {
              httpResponse = await interceptor.intercept(httpResponse);
            }
            if (this.config.logResponses) {
              this.logger.debug(`Response ${mergedOptions.method} ${fullUrl}`, {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                data: httpResponse.data
              });
            }
            if (!response.ok) {
              const error = new HttpError(
                `HTTP error ${response.status}: ${response.statusText}`,
                response.status,
                response.statusText,
                httpResponse.data,
                response
              );
              let result = error;
              for (const interceptor of this.errorInterceptors) {
                result = await interceptor.intercept(error);
                if ("data" in result) {
                  return result;
                }
              }
              throw result;
            }
            return httpResponse;
          } catch (error) {
            lastError = error;
            if (error instanceof DOMException && error.name === "AbortError" || ((_a = fetchOptions.signal) == null ? void 0 : _a.aborted)) {
              throw new Error(`Request timeout: ${mergedOptions.timeout}ms exceeded`);
            }
            if (retryCount >= (mergedOptions.retries || 0)) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, mergedOptions.retryDelay || 1e3));
            retryCount++;
          }
        }
        throw lastError;
      } catch (error) {
        if (timeoutId !== void 0) {
          clearTimeout(timeoutId);
        }
        let httpError;
        if (error instanceof HttpError) {
          httpError = error;
        } else {
          httpError = new HttpError(
            error instanceof Error ? error.message : String(error),
            0,
            "Unknown Error",
            null
          );
        }
        if (this.config.logErrors) {
          this.logger.error(`Error ${mergedOptions.method} ${fullUrl}`, httpError);
        }
        let result = httpError;
        for (const interceptor of this.errorInterceptors) {
          result = await interceptor.intercept(httpError);
          if ("data" in result) {
            return result;
          }
        }
        throw result;
      }
    }
    /**
     * Make a GET request
     * @param url URL to request
     * @param reqOptions Request options
     * @returns Response promise
     */
    get(url, reqOptions = {}) {
      return this.request(url, { ...reqOptions, method: "GET" });
    }
    /**
     * Make a POST request
     * @param url URL to request
     * @param data Request body
     * @param reqOptions Request options
     * @returns Response promise
     */
    post(url, data, reqOptions = {}) {
      return this.request(url, { ...reqOptions, method: "POST", body: data });
    }
    /**
     * Make a PUT request
     * @param url URL to request
     * @param data Request body
     * @param reqOptions Request options
     * @returns Response promise
     */
    put(url, data, reqOptions = {}) {
      return this.request(url, { ...reqOptions, method: "PUT", body: data });
    }
    /**
     * Make a DELETE request
     * @param url URL to request
     * @param reqOptions Request options
     * @returns Response promise
     */
    delete(url, reqOptions = {}) {
      return this.request(url, { ...reqOptions, method: "DELETE" });
    }
    /**
     * Make a PATCH request
     * @param url URL to request
     * @param data Request body
     * @param reqOptions Request options
     * @returns Response promise
     */
    patch(url, data, reqOptions = {}) {
      return this.request(url, { ...reqOptions, method: "PATCH", body: data });
    }
    /**
     * Make a HEAD request
     * @param url URL to request
     * @param reqOptions Request options
     * @returns Response promise
     */
    head(url, reqOptions = {}) {
      return this.request(url, { ...reqOptions, method: "HEAD" });
    }
    /**
     * Make an OPTIONS request
     * @param url URL to request
     * @param reqOptions Request options
     * @returns Response promise
     */
    optionsRequest(url, reqOptions = {}) {
      return this.request(url, { ...reqOptions, method: "OPTIONS" });
    }
  };

  // js/core/ApiClient.ts
  var DEFAULT_OPTIONS7 = {
    baseUrl: "/api",
    apiVersion: "v1",
    headers: {},
    authTokenHeader: "Authorization",
    autoRetryAuth: true,
    timeout: 3e4
  };
  var ApiClient = class {
    /**
     * Private constructor
     */
    constructor() {
      this.logger = Logger2.getLogger("ApiClient");
      this.endpoints = /* @__PURE__ */ new Map();
      this.initialized = false;
      this.httpClient = HttpClient.getInstance();
      this.config = { ...DEFAULT_OPTIONS7 };
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
      if (!ApiClient.instance) {
        ApiClient.instance = new ApiClient();
      }
      return ApiClient.instance;
    }
    /**
     * Initialize the API client
     * @param options Options for the API client
     */
    initialize(options = {}) {
      if (this.initialized) {
        this.logger.warn("ApiClient already initialized");
        return;
      }
      const configManager = ConfigManager.getInstance();
      const configBaseUrl = configManager.get("apiUrl");
      const configTimeout = configManager.get("apiTimeout");
      const configApiVersion = configManager.get("apiVersion");
      this.config = {
        ...DEFAULT_OPTIONS7,
        ...configBaseUrl ? { baseUrl: configBaseUrl } : {},
        ...configTimeout ? { timeout: configTimeout } : {},
        ...configApiVersion ? { apiVersion: configApiVersion } : {},
        ...options
      };
      this.httpClient.initialize({
        baseUrl: this.getBaseUrlWithVersion(),
        timeout: this.config.timeout,
        headers: this.config.headers
      });
      if (this.config.authToken) {
        this.setAuthToken(this.config.authToken);
      }
      this.initialized = true;
      this.logger.info("API client initialized");
    }
    /**
     * Get the base URL with version
     */
    getBaseUrlWithVersion() {
      const baseUrl = this.config.baseUrl || "";
      const apiVersion = this.config.apiVersion;
      if (!apiVersion) {
        return baseUrl;
      }
      return `${baseUrl.replace(/\/$/, "")}/${apiVersion}`;
    }
    /**
     * Register an endpoint
     * @param name Endpoint name
     * @param options Endpoint options
     */
    registerEndpoint(name, options) {
      if (this.endpoints.has(name)) {
        this.logger.warn(`Endpoint ${name} already registered. Overwriting.`);
      }
      this.endpoints.set(name, {
        method: "GET",
        requiresAuth: true,
        ...options
      });
      this.logger.debug(`Registered endpoint ${name}: ${options.method || "GET"} ${options.path}`);
    }
    /**
     * Register multiple endpoints
     * @param endpoints Map of endpoint names to options
     */
    registerEndpoints(endpoints) {
      for (const [name, options] of Object.entries(endpoints)) {
        this.registerEndpoint(name, options);
      }
    }
    /**
     * Get endpoint details
     * @param name Endpoint name
     * @returns Endpoint options
     */
    getEndpoint(name) {
      return this.endpoints.get(name);
    }
    /**
     * Set authentication token
     * @param token Authentication token
     */
    setAuthToken(token) {
      this.config.authToken = token;
      this.httpClient.addRequestInterceptor({
        intercept: (url, options) => {
          if (options.headers && this.config.authTokenHeader && !options.headers[this.config.authTokenHeader]) {
            return {
              url,
              options: {
                ...options,
                headers: {
                  ...options.headers,
                  [this.config.authTokenHeader]: `Bearer ${this.config.authToken}`
                }
              }
            };
          }
          return { url, options };
        }
      });
      this.logger.debug("Set authentication token");
    }
    /**
     * Clear authentication token
     */
    clearAuthToken() {
      this.config.authToken = void 0;
      this.httpClient.clearInterceptors();
      this.logger.debug("Cleared authentication token");
    }
    /**
     * Call an API endpoint by name
     * @param name Endpoint name
     * @param params URL path parameters
     * @param data Request body
     * @param options Additional request options
     * @returns Response promise
     */
    async callEndpoint(name, params = {}, data, options = {}) {
      const endpoint = this.endpoints.get(name);
      if (!endpoint) {
        throw new Error(`Endpoint ${name} is not registered`);
      }
      if (endpoint.requiresAuth && !this.config.authToken) {
        throw new Error(`Endpoint ${name} requires authentication`);
      }
      let path = endpoint.path;
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, encodeURIComponent(value));
      }
      const requestOptions = {
        method: endpoint.method,
        headers: endpoint.headers,
        timeout: endpoint.timeout,
        ...options
      };
      try {
        return await this.request(path, data, requestOptions);
      } catch (error) {
        if (error instanceof HttpError && error.status === 401 && this.config.autoRetryAuth && endpoint.requiresAuth) {
          await this.refreshAuth();
          return await this.request(path, data, requestOptions);
        }
        throw error;
      }
    }
    /**
     * Refresh authentication token
     * This should be implemented by the application
     */
    async refreshAuth() {
      this.logger.debug("Attempting to refresh authentication");
      const authManager = DependencyContainer.getInstance().get("authManager");
      if (authManager && typeof authManager.refreshToken === "function") {
        const newToken = await authManager.refreshToken();
        if (newToken) {
          this.setAuthToken(newToken);
        }
      } else {
        throw new Error("Auth refresh not implemented");
      }
    }
    /**
     * Make a direct API request
     * @param path URL path
     * @param data Request body
     * @param options Request options
     * @returns Response promise
     */
    async request(path, data, options = {}) {
      const method = options.method || "GET";
      this.logger.debug(`${method} ${path}`);
      try {
        let response;
        switch (method) {
          case "GET":
            response = await this.httpClient.get(path, {
              ...options,
              params: data
              // For GET, data is passed as query params
            });
            break;
          case "POST":
            response = await this.httpClient.post(path, data, options);
            break;
          case "PUT":
            response = await this.httpClient.put(path, data, options);
            break;
          case "DELETE":
            response = await this.httpClient.delete(path, {
              ...options,
              params: data
              // For DELETE, typically pass data as query params
            });
            break;
          case "PATCH":
            response = await this.httpClient.patch(path, data, options);
            break;
          case "HEAD":
            response = await this.httpClient.head(path, options);
            break;
          case "OPTIONS":
            response = await this.httpClient.optionsRequest(path, options);
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${method}`);
        }
        return response;
      } catch (error) {
        this.logger.error(`API request failed: ${method} ${path}`, error);
        throw error;
      }
    }
    /**
     * Make a GET request
     * @param path URL path
     * @param params Query parameters
     * @param options Request options
     * @returns Response promise
     */
    get(path, params, options = {}) {
      return this.request(path, params, { ...options, method: "GET" });
    }
    /**
     * Make a POST request
     * @param path URL path
     * @param data Request body
     * @param options Request options
     * @returns Response promise
     */
    post(path, data, options = {}) {
      return this.request(path, data, { ...options, method: "POST" });
    }
    /**
     * Make a PUT request
     * @param path URL path
     * @param data Request body
     * @param options Request options
     * @returns Response promise
     */
    put(path, data, options = {}) {
      return this.request(path, data, { ...options, method: "PUT" });
    }
    /**
     * Make a DELETE request
     * @param path URL path
     * @param params Query parameters
     * @param options Request options
     * @returns Response promise
     */
    delete(path, params, options = {}) {
      return this.request(path, params, { ...options, method: "DELETE" });
    }
    /**
     * Make a PATCH request
     * @param path URL path
     * @param data Request body
     * @param options Request options
     * @returns Response promise
     */
    patch(path, data, options = {}) {
      return this.request(path, data, { ...options, method: "PATCH" });
    }
  };

  // js/core/AppBootstrapper.ts
  var DEFAULT_OPTIONS8 = {
    configPath: "/config/app-config.json",
    logLevel: 3 /* INFO */,
    autoInitialize: true,
    registerDefaultServices: true,
    apiUrl: "/api"
  };
  var AppBootstrapper = class {
    /**
     * Private constructor
     */
    constructor() {
      this.initStatus = /* @__PURE__ */ new Map();
      this.isBootstrapped = false;
      this.options = { ...DEFAULT_OPTIONS8 };
      this.logger = Logger2.getLogger("AppBootstrapper");
      this.dependencyContainer = DependencyContainer.getInstance();
      this.eventBus = EventBus.getInstance();
      this.initStatus.set("logger", "not_started" /* NOT_STARTED */);
      this.initStatus.set("config", "not_started" /* NOT_STARTED */);
      this.initStatus.set("eventBus", "not_started" /* NOT_STARTED */);
      this.initStatus.set("dependencyContainer", "not_started" /* NOT_STARTED */);
      this.initStatus.set("httpClient", "not_started" /* NOT_STARTED */);
      this.initStatus.set("apiClient", "not_started" /* NOT_STARTED */);
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
      if (!AppBootstrapper.instance) {
        AppBootstrapper.instance = new AppBootstrapper();
      }
      return AppBootstrapper.instance;
    }
    /**
     * Implementation of Component interface
     * Initializes the application by bootstrapping it
     */
    initialize() {
      if (!this.isBootstrapped) {
        this.bootstrap(this.options).catch((error) => {
          console.error("Failed to initialize application:", error);
        });
      }
    }
    /**
     * Bootstrap the application
     * @param options Bootstrap options
     */
    async bootstrap(options = {}) {
      if (this.isBootstrapped) {
        this.logger.warn("Application already bootstrapped", "Bootstrap operation skipped");
        return;
      }
      this.options = {
        ...DEFAULT_OPTIONS8,
        ...options
      };
      try {
        await this.initializeLogger();
        await this.initializeConfig();
        await this.initializeEventBus();
        await this.initializeDependencyContainer();
        await this.initializeHttpClient();
        await this.initializeApiClient();
        if (this.options.registerDefaultServices) {
          this.registerDefaultServices();
        }
        this.isBootstrapped = true;
        this.logger.info("Application bootstrapped successfully", "All components initialized");
        this.eventBus.publish("app:bootstrapped", {
          timestamp: /* @__PURE__ */ new Date(),
          status: "success"
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to bootstrap application", errorMessage);
        this.eventBus.publish("app:bootstrap:failed", {
          timestamp: /* @__PURE__ */ new Date(),
          error
        });
        throw error;
      }
    }
    /**
     * Initialize the logger
     */
    async initializeLogger() {
      this.updateStatus("logger", "in_progress" /* IN_PROGRESS */);
      try {
        const loggerInstance = Logger2.getInstance();
        if (this.options.logLevel !== void 0) {
          loggerInstance.setLevel(this.options.logLevel);
        }
        this.updateStatus("logger", "completed" /* COMPLETED */);
        this.logger.info("Logger initialized", "Logging system ready");
      } catch (error) {
        this.updateStatus("logger", "failed" /* FAILED */);
        console.error("Failed to initialize logger", error);
        throw error;
      }
    }
    /**
     * Initialize the config manager
     */
    async initializeConfig() {
      this.updateStatus("config", "in_progress" /* IN_PROGRESS */);
      try {
        const configManager = ConfigManager.getInstance();
        if (this.options.configPath) {
          try {
            await configManager.loadConfig(this.options.configPath);
            this.logger.info("Config loaded", `Configuration loaded from ${this.options.configPath}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Failed to load config from ${this.options.configPath}`,
              errorMessage
            );
          }
        }
        if (this.options.apiUrl) {
          configManager.set("apiUrl", this.options.apiUrl);
        }
        this.updateStatus("config", "completed" /* COMPLETED */);
        this.logger.info("Config initialized", `Configuration ready`);
      } catch (error) {
        this.updateStatus("config", "failed" /* FAILED */);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to initialize config", errorMessage);
        throw error;
      }
    }
    /**
     * Initialize the event bus
     */
    async initializeEventBus() {
      this.updateStatus("eventBus", "in_progress" /* IN_PROGRESS */);
      try {
        this.updateStatus("eventBus", "completed" /* COMPLETED */);
        this.logger.info("EventBus initialized", "Event system ready");
      } catch (error) {
        this.updateStatus("eventBus", "failed" /* FAILED */);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to initialize event bus", errorMessage);
        throw error;
      }
    }
    /**
     * Initialize the dependency container
     */
    async initializeDependencyContainer() {
      this.updateStatus("dependencyContainer", "in_progress" /* IN_PROGRESS */);
      try {
        this.dependencyContainer.register("logger", () => Logger2.getInstance());
        this.dependencyContainer.register("configManager", () => ConfigManager.getInstance());
        this.dependencyContainer.register("eventBus", () => this.eventBus);
        this.updateStatus("dependencyContainer", "completed" /* COMPLETED */);
        this.logger.info("DependencyContainer initialized", "Dependency injection system ready");
      } catch (error) {
        this.updateStatus("dependencyContainer", "failed" /* FAILED */);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to initialize dependency container", errorMessage);
        throw error;
      }
    }
    /**
     * Initialize the HTTP client
     */
    async initializeHttpClient() {
      this.updateStatus("httpClient", "in_progress" /* IN_PROGRESS */);
      try {
        const httpClient = HttpClient.getInstance();
        httpClient.initialize();
        this.dependencyContainer.register("httpClient", () => httpClient);
        this.updateStatus("httpClient", "completed" /* COMPLETED */);
        this.logger.info("HttpClient initialized", "HTTP client ready");
      } catch (error) {
        this.updateStatus("httpClient", "failed" /* FAILED */);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to initialize HTTP client", errorMessage);
        throw error;
      }
    }
    /**
     * Initialize the API client
     */
    async initializeApiClient() {
      this.updateStatus("apiClient", "in_progress" /* IN_PROGRESS */);
      try {
        const configManager = ConfigManager.getInstance();
        const apiUrl = configManager.get("apiUrl") || this.options.apiUrl;
        if (!apiUrl) {
          throw new Error("API URL not configured");
        }
        const apiClient = ApiClient.getInstance();
        apiClient.initialize({
          baseUrl: apiUrl
        });
        this.dependencyContainer.register("apiClient", () => apiClient);
        this.updateStatus("apiClient", "completed" /* COMPLETED */);
        this.logger.info("ApiClient initialized", `API client ready with base URL: ${apiUrl}`);
      } catch (error) {
        this.updateStatus("apiClient", "failed" /* FAILED */);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to initialize API client", errorMessage);
        throw error;
      }
    }
    /**
     * Register default services
     */
    registerDefaultServices() {
      this.dependencyContainer.register("appBootstrapper", () => this);
      this.logger.info("Default services registered", "Core services available in dependency container");
    }
    /**
     * Update component initialization status
     * @param component Component name
     * @param status New status
     */
    updateStatus(component, status) {
      this.initStatus.set(component, status);
      this.eventBus.publish("app:component:status", {
        component,
        status,
        timestamp: /* @__PURE__ */ new Date()
      });
    }
    /**
     * Get initialization status
     * @param component Component name
     */
    getStatus(component) {
      return this.initStatus.get(component) || "not_started" /* NOT_STARTED */;
    }
    /**
     * Check if application is bootstrapped
     */
    isBootstrapComplete() {
      return this.isBootstrapped;
    }
  };

  // js/index.ts
  async function main() {
    try {
      const bootstrapper = AppBootstrapper.getInstance();
      await bootstrapper.bootstrap({
        logLevel: 4 /* DEBUG */,
        configPath: "/config/app-config.json",
        apiUrl: "/api/v1",
        registerDefaultServices: true
      });
      console.log("Application bootstrap complete");
      console.log("Application ready");
    } catch (error) {
      console.error("Failed to start application:", error);
    }
  }
  document.addEventListener("DOMContentLoaded", main);
  document.addEventListener("DOMContentLoaded", () => {
    try {
      logger.info("Initializing API Admin Interface...");
      const config = new Config();
      const responseViewerOptions = {
        containerId: "response-container",
        responseHeadersId: "response-headers",
        responseBodyId: "response-body",
        responseStatusId: "response-status"
      };
      const responseViewer = new ResponseViewer(responseViewerOptions);
      const domainStateViewerOptions = {
        containerId: "domain-state-container"
      };
      const domainStateViewer = new DomainStateViewer(domainStateViewerOptions);
      const uiManagerOptions = {
        containerId: "app",
        responseViewer,
        toastContainerId: "toast-container",
        loadingOverlayId: "loading-overlay",
        modalContainerId: "modal-container"
      };
      const uiManager = new UIManager(uiManagerOptions);
      const endpointManagerOptions = {
        useLocalEndpoints: true,
        supportMultipleFormats: true
      };
      const endpointManager = new EndpointManager(endpointManagerOptions);
      const variableManagerOptions = {
        storageKey: "api_variables",
        variablePrefix: "$",
        persistVariables: true,
        storageType: "localStorage",
        maxVariables: 100
      };
      const variableManager = new VariableManager(variableManagerOptions);
      const domainStateManagerOptions = {
        apiClient: null,
        localStorageKey: "domain_state",
        autoSave: true,
        diffingEnabled: true
      };
      const domainStateManager = new DomainStateManager(domainStateManagerOptions);
      const backendLogsManager = new BackendLogsManager({
        logsEndpoint: config.get("endpoints.logsEndpoint", "/api/v1/logs")
      });
      const logsViewer = new LogsViewer_default({
        logsContainerId: "logs-container",
        backendLogsManager,
        maxFrontendLogs: 500,
        showFrontendLogs: true,
        showBackendLogs: true,
        enableAiLogFormatting: true,
        enableDomainEventFormatting: true,
        enableCorrelationIdFiltering: true,
        enableSearchFiltering: true,
        autoRefreshBackendLogs: true,
        refreshInterval: 3e4
        // 30 seconds
      });
      const statusManagerOptions = {
        updateInterval: 3e4,
        statusEndpoint: config.get("endpoints.statusEndpoint", "/api/v1/status"),
        containerId: "status-container",
        apiClient: null
      };
      const statusManager = new StatusManager(statusManagerOptions);
      const historyManagerOptions = {
        maxEntries: config.get("maxHistoryItems", 50),
        persistHistory: true,
        storageKey: "api_history",
        storageType: "localStorage",
        maxItems: config.get("maxHistoryItems", 50)
      };
      const historyManager = new HistoryManager(historyManagerOptions);
      const appController = new AppController();
      const flowControllerOptions = {
        endpointManager,
        uiManager,
        variableManager,
        historyManager,
        appController
      };
      const flowController = new FlowController(flowControllerOptions);
      appController.initialize(config);
      flowController.initialize();
      const flowsTabBtn = document.getElementById("flows-tab-btn");
      const stateTabBtn = document.getElementById("state-tab-btn");
      const logsTabBtn = document.getElementById("logs-tab-btn");
      const flowsTab = document.getElementById("flows-tab");
      const stateTab = document.getElementById("state-tab");
      const logsTab = document.getElementById("logs-tab");
      const switchTab = (tabId) => {
        if (flowsTab)
          flowsTab.classList.add("hidden");
        if (stateTab)
          stateTab.classList.add("hidden");
        if (logsTab)
          logsTab.classList.add("hidden");
        if (flowsTabBtn)
          flowsTabBtn.classList.remove("bg-primary-600");
        if (stateTabBtn)
          stateTabBtn.classList.remove("bg-primary-600");
        if (logsTabBtn)
          logsTabBtn.classList.remove("bg-primary-600");
        const selectedTab = document.getElementById(tabId);
        if (selectedTab)
          selectedTab.classList.remove("hidden");
        switch (tabId) {
          case "flows-tab":
            if (flowsTabBtn)
              flowsTabBtn.classList.add("bg-primary-600");
            break;
          case "state-tab":
            if (stateTabBtn)
              stateTabBtn.classList.add("bg-primary-600");
            break;
          case "logs-tab":
            if (logsTabBtn)
              logsTabBtn.classList.add("bg-primary-600");
            if (backendLogsManager) {
              backendLogsManager.fetchLogs();
            }
            break;
        }
      };
      if (flowsTabBtn) {
        flowsTabBtn.addEventListener("click", () => switchTab("flows-tab"));
      }
      if (stateTabBtn) {
        stateTabBtn.addEventListener("click", () => switchTab("state-tab"));
      }
      if (logsTabBtn) {
        logsTabBtn.addEventListener("click", () => switchTab("logs-tab"));
      }
      const refreshLogsBtn = document.getElementById("refresh-logs-btn");
      if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener("click", () => {
          if (backendLogsManager) {
            backendLogsManager.fetchLogs();
          }
        });
      }
      window.onerror = (message, source, lineno, colno, error) => {
        logger.error("Global error:", error || message);
        uiManager.showError("Application Error", `${message}
Line: ${lineno}, Column: ${colno}`);
        return true;
      };
      window.addEventListener("unhandledrejection", (event) => {
        logger.error("Unhandled promise rejection:", event.reason);
        uiManager.showError("Application Error", String(event.reason));
      });
      logger.info("API Admin Interface initialized successfully");
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
//# sourceMappingURL=bundle.js.map
