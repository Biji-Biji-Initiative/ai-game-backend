/**
 * Status Manager
 * Handles system status checks and health monitoring
 */

class StatusManager {
    constructor() {
        this.healthListeners = [];
        this.statusListeners = [];
        this.isHealthy = null;
        this.systemStatus = {
            mode: null,
            version: null,
            node: null,
            dependencies: {}
        };
        this.healthCheckInterval = null;
        this.lastChecked = null;
    }

    /**
     * Register a health change listener
     * @param {Function} callback - Function to call when health changes
     * @returns {Function} Function to unregister the listener
     */
    onHealthChange(callback) {
        this.healthListeners.push(callback);
        
        // Immediately call with current status if available
        if (this.isHealthy !== null) {
            try {
                callback(this.isHealthy);
            } catch (e) {
                console.error("Error in health listener callback", e);
            }
        }
        
        // Return function to unregister
        return () => {
            this.healthListeners = this.healthListeners.filter(listener => listener !== callback);
        };
    }

    /**
     * Register a status change listener
     * @param {Function} callback - Function to call when status changes
     * @returns {Function} Function to unregister the listener
     */
    onStatusChange(callback) {
        this.statusListeners.push(callback);
        
        // Immediately call with current status if available
        if (this.systemStatus.mode !== null) {
            try {
                callback(this.systemStatus);
            } catch (e) {
                console.error("Error in status listener callback", e);
            }
        }
        
        // Return function to unregister
        return () => {
            this.statusListeners = this.statusListeners.filter(listener => listener !== callback);
        };
    }

    /**
     * Start periodic health checks
     * @param {number} interval - Time between checks in milliseconds
     */
    startHealthChecks(interval = 30000) {
        // Clear existing interval if any
        this.stopHealthChecks();
        
        // Do an immediate check
        this.checkHealth();
        
        // Set up periodic checks
        this.healthCheckInterval = setInterval(() => this.checkHealth(), interval);
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
     * Check backend health
     * @returns {Promise<boolean>} Whether the backend is healthy
     */
    async checkHealth() {
        try {
            const response = await fetch("/api/v1/health", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                // Short timeout for health checks
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                this.updateHealth(false);
                return false;
            }
            
            const data = await response.json();
            const isHealthy = data && data.status === "ok";
            
            this.updateHealth(isHealthy);
            this.lastChecked = new Date();
            
            return isHealthy;
        } catch (error) {
            console.warn("Health check failed:", error.message);
            this.updateHealth(false);
            this.lastChecked = new Date();
            return false;
        }
    }

    /**
     * Get detailed system status
     * @returns {Promise<Object>} System status details
     */
    async getSystemStatus() {
        try {
            const response = await fetch("/api/v1/status", {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn("Authentication required for system status");
                    return this.systemStatus;
                }
                
                throw new Error(`Failed to fetch system status: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Safely extract data with fallbacks
            const systemStatus = {
                mode: this.safeGet(data, "status.mode") || "unknown",
                version: this.safeGet(data, "status.version") || "unknown",
                node: this.safeGet(data, "status.node") || "unknown",
                dependencies: this.safeGet(data, "status.dependencies") || {},
                timestamp: new Date()
            };
            
            this.updateSystemStatus(systemStatus);
            return systemStatus;
        } catch (error) {
            console.warn("[WARNING] Failed to fetch system status", { error: error.message });
            return this.systemStatus;
        }
    }

    /**
     * Refresh the status display in the UI
     * @returns {Promise<void>}
     */
    async refreshStatus() {
        // Check health
        await this.checkHealth();
        
        // Get detailed status
        await this.getSystemStatus();
    }

    /**
     * Update the health status and notify listeners
     * @param {boolean} isHealthy - Whether the system is healthy
     * @private
     */
    updateHealth(isHealthy) {
        // Only notify if status changed
        if (this.isHealthy !== isHealthy) {
            this.isHealthy = isHealthy;
            
            // Notify listeners
            this.healthListeners.forEach(listener => {
                try {
                    listener(isHealthy);
                } catch (e) {
                    console.error("Error in health listener callback", e);
                }
            });
        }
    }

    /**
     * Update system status and notify listeners
     * @param {Object} status - System status information
     * @private
     */
    updateSystemStatus(status) {
        this.systemStatus = status;
        
        // Notify listeners
        this.statusListeners.forEach(listener => {
            try {
                listener(status);
            } catch (e) {
                console.error("Error in status listener callback", e);
            }
        });
    }

    /**
     * Safely get a nested property from an object
     * @param {Object} obj - Object to extract from
     * @param {string} path - Dot-notation path to the property
     * @param {*} defaultValue - Default value if property is not found
     * @returns {*} The value or default
     * @private
     */
    safeGet(obj, path, defaultValue = null) {
        if (!obj || !path) return defaultValue;
        
        const props = path.split(".");
        let current = obj;
        
        for (const prop of props) {
            if (current === null || current === undefined || typeof current !== "object") {
                return defaultValue;
            }
            
            current = current[prop];
        }
        
        return current !== undefined ? current : defaultValue;
    }
}

export { StatusManager }; 