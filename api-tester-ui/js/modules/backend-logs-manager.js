/**
 * Backend Logs Manager Module
 * Handles fetching and managing logs from the backend
 */

/**
 * Class for managing backend logs
 */
export class BackendLogsManager {
    /**
     * Creates a new BackendLogsManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            apiClient: null,
            config: null,
            logsEndpoint: "/api/v1/api-tester/logs",
            maxLogsToFetch: 500,
            refreshInterval: null, // If set, auto-refresh logs at this interval (ms)
            ...options
        };
        
        this.apiClient = this.options.apiClient;
        this.logs = [];
        this.isLoading = false;
        this.lastError = null;
        this.listeners = new Map();
        this.refreshIntervalId = null;
        
        // Start auto-refresh if enabled
        if (this.options.refreshInterval) {
            this.startAutoRefresh();
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
     * Fetches logs from the backend
     * @param {Object} options - Fetch options
     * @returns {Promise<Array>} - The fetched logs
     */
    async fetchLogs(options = {}) {
        const fetchOptions = {
            correlationId: options.correlationId || null,
            level: options.level || null,
            limit: options.limit || this.options.maxLogsToFetch,
            search: options.search || null,
            ...options
        };
        
        this.isLoading = true;
        this.emit("logs:loading", { options: fetchOptions });
        
        try {
            // Build the URL with query parameters
            const url = new URL(this.options.logsEndpoint, window.location.origin);
            if (fetchOptions.correlationId) url.searchParams.append("correlationId", fetchOptions.correlationId);
            if (fetchOptions.level) url.searchParams.append("level", fetchOptions.level);
            if (fetchOptions.limit) url.searchParams.append("limit", fetchOptions.limit);
            if (fetchOptions.search) url.searchParams.append("search", fetchOptions.search);
            
            // Fetch the logs
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.status || data.status !== "success" || !data.data || !Array.isArray(data.data.logs)) {
                throw new Error("Invalid response format");
            }
            
            // Store logs
            this.logs = data.data.logs;
            this.lastError = null;
            
            // Emit loaded event
            this.emit("logs:loaded", {
                logs: this.logs,
                count: this.logs.length,
                source: options.source || "manual",
                logFile: data.data.logFile
            });
            
            return this.logs;
        } catch (error) {
            this.lastError = error;
            
            // Emit error event
            this.emit("logs:error", {
                error,
                message: error.message
            });
            
            throw error;
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Refreshes logs by fetching them again
     * @param {Object} options - Refresh options
     * @returns {Promise<Array>} - The refreshed logs
     */
    async refreshLogs(options = {}) {
        // Emit refreshing event
        this.emit("logs:refreshing", options);
        
        try {
            return await this.fetchLogs({
                ...options,
                source: "refresh"
            });
        } catch (error) {
            // Error is already emitted in fetchLogs
            throw error;
        }
    }
    
    /**
     * Starts auto-refreshing logs at the specified interval
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
                this.refreshLogs({ source: "auto" }).catch(error => {
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
     * @param {Object} filters - Filter criteria
     * @returns {Array} - Filtered logs
     */
    filterLogs(filters = {}) {
        return this.logs.filter(log => {
            // Filter by level
            if (filters.level && log.level !== filters.level) {
                return false;
            }
            
            // Filter by correlation ID
            if (filters.correlationId && 
                (!log.meta?.correlationId || 
                 !log.meta.correlationId.includes(filters.correlationId))) {
                return false;
            }
            
            // Filter by search term
            if (filters.search) {
                const logText = JSON.stringify(log).toLowerCase();
                if (!logText.includes(filters.search.toLowerCase())) {
                    return false;
                }
            }
            
            // Filter by time range
            if (filters.startTime && new Date(log.timestamp) < new Date(filters.startTime)) {
                return false;
            }
            
            if (filters.endTime && new Date(log.timestamp) > new Date(filters.endTime)) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Gets all logs
     * @returns {Array} - All logs
     */
    getLogs() {
        return [...this.logs];
    }
    
    /**
     * Gets the loading status
     * @returns {boolean} - Whether logs are currently loading
     */
    isLoading() {
        return this.isLoading;
    }
    
    /**
     * Gets the last error
     * @returns {Error|null} - The last error or null
     */
    getLastError() {
        return this.lastError;
    }
    
    /**
     * Gets logs for a specific correlation ID
     * @param {string} correlationId - The correlation ID
     * @returns {Array} - Logs with the specified correlation ID
     */
    getLogsByCorrelationId(correlationId) {
        return this.logs.filter(log => 
            log.meta?.correlationId && log.meta.correlationId.includes(correlationId)
        );
    }
    
    /**
     * Clears all logs
     */
    clearLogs() {
        this.logs = [];
        this.emit("logs:cleared");
    }
} 