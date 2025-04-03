/**
 * Status Manager
 * 
 * Handles system status monitoring and health checks.
 * Provides information about backend availability and dependencies.
 */
class StatusManager {
    constructor() {
        this.status = {
            healthy: false,
            lastChecked: null,
            dependencies: [],
            env: {
                mode: null,
                version: null,
                node: null
            }
        };
        
        this.healthCheckInterval = null;
        this.healthChangeListeners = [];
        
        console.log("StatusManager initialized");
    }
    
    /**
     * Register a callback for health changes
     * @param {Function} callback - Function to call when health changes
     */
    onHealthChange(callback) {
        if (typeof callback === "function") {
            this.healthChangeListeners.push(callback);
        }
    }
    
    /**
     * Notify health change listeners
     * @param {boolean} isHealthy - Current health status
     */
    notifyHealthListeners(isHealthy) {
        this.healthChangeListeners.forEach(listener => {
            try {
                listener(isHealthy);
            } catch (error) {
                console.error("Error in health change listener:", error);
            }
        });
    }
    
    /**
     * Start periodic health checks
     * @param {number} interval - Interval in milliseconds (default: 60000ms or 1 minute)
     * @returns {number} Interval ID
     */
    startHealthChecks(interval = 60000) {
        // Clear existing interval if any
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        // Run an immediate check
        this.checkHealth();
        
        // Set up interval
        this.healthCheckInterval = setInterval(() => {
            this.checkHealth();
        }, interval);
        
        return this.healthCheckInterval;
    }
    
    /**
     * Stop periodic health checks
     */
    stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    
    /**
     * Check system health
     * @returns {Promise<boolean>} Promise resolving to health status
     */
    async checkHealth() {
        try {
            // Determine API base URL (similar to EndpointManager)
            const apiBaseUrl = this.getApiBaseUrl();
            const url = `${apiBaseUrl}/system/health`;
            
            console.log("Checking health at:", url);
            
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                // Short timeout for health checks
                signal: AbortSignal.timeout(5000)
            });
            
            const wasHealthy = this.status.healthy;
            const isHealthy = response.ok;
            
            // Update status
            this.status.healthy = isHealthy;
            this.status.lastChecked = new Date();
            
            // Only notify if health status changed
            if (wasHealthy !== isHealthy) {
                this.notifyHealthListeners(isHealthy);
            }
            
            return isHealthy;
        } catch (error) {
            console.warn("Health check failed:", error);
            
            const wasHealthy = this.status.healthy;
            
            // Update status to unhealthy
            this.status.healthy = false;
            this.status.lastChecked = new Date();
            
            // Only notify if health status changed
            if (wasHealthy !== false) {
                this.notifyHealthListeners(false);
            }
            
            return false;
        }
    }
    
    /**
     * Get detailed system status
     * @returns {Promise<Object>} System status object
     */
    async getSystemStatus() {
        try {
            // Determine API base URL
            const apiBaseUrl = this.getApiBaseUrl();
            const url = `${apiBaseUrl}/system/status`;
            
            console.log("Fetching system status from:", url);
            
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                // Longer timeout for status checks
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Process and store status data
            this.processStatusData(data);
            
            return this.status;
        } catch (error) {
            console.error("Failed to get system status:", error);
            throw error;
        }
    }
    
    /**
     * Process status data from API response
     * @param {Object} data - Status data from API
     */
    processStatusData(data) {
        try {
            // Handle different response structures
            if (data.status) {
                // Update health status
                this.status.healthy = data.status.healthy === true;
                
                // Update dependencies if available
                if (Array.isArray(data.status.dependencies)) {
                    this.status.dependencies = data.status.dependencies.map(dep => ({
                        name: dep.name,
                        healthy: dep.healthy === true,
                        message: dep.message || null
                    }));
                }
                
                // Update environment info
                if (data.status.env) {
                    this.status.env = {
                        mode: data.status.env.mode || null,
                        version: data.status.env.version || null,
                        node: data.status.env.node || null
                    };
                }
            } else {
                // Simpler response format
                this.status.healthy = data.healthy === true;
                
                if (data.dependencies) {
                    this.status.dependencies = Array.isArray(data.dependencies) 
                        ? data.dependencies 
                        : [];
                }
                
                if (data.env) {
                    this.status.env = data.env;
                }
            }
            
            // Update last checked timestamp
            this.status.lastChecked = new Date();
        } catch (error) {
            console.error("Error processing status data:", error);
        }
    }
    
    /**
     * Determine the API base URL
     * @returns {string} API base URL
     */
    getApiBaseUrl() {
        // Try to get base URL from meta tag
        const metaBaseUrl = document.querySelector("meta[name=\"api-base-url\"]");
        if (metaBaseUrl && metaBaseUrl.content) {
            return metaBaseUrl.content;
        }
        
        // Use current host with API path as fallback
        const host = window.location.hostname;
        const port = window.location.port === "8080" ? "3000" : window.location.port;
        
        // Use HTTPS for production, HTTP for development
        const protocol = window.location.protocol;
        
        return `${protocol}//${host}${port ? `:${port}` : ""}/api`;
    }
}

export default StatusManager; 