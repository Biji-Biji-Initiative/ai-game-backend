/**
 * Endpoint Manager
 * Handles loading, organizing, and managing API endpoints
 */

class EndpointManager {
    constructor() {
        this.endpoints = [];
        this.categories = {};
        this.listeners = [];
        this.isLoading = false;
    }

    /**
     * Add an event listener for endpoint events
     * @param {string} event - Event name ('loaded', 'error')
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    /**
     * Emit an event to listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @private
     */
    emit(event, data) {
        this.listeners
            .filter(listener => listener.event === event)
            .forEach(listener => {
                try {
                    listener.callback(data);
                } catch (error) {
                    console.error(`Error in endpoint manager listener for ${event}:`, error);
                }
            });
    }

    /**
     * Load endpoints from the server or fallback to static
     * @returns {Promise<Array>} - Array of endpoints
     */
    async loadEndpoints() {
        if (this.isLoading) {
            return this.endpoints;
        }

        this.isLoading = true;
        
        try {
            // First try to load from the API
            console.log("[DEBUG] Loading endpoints from /api/v1/api-tester/endpoints", {
                source: "dynamic", 
                path: "/api/v1/api-tester/endpoints"
            });
            
            const dynamicEndpoints = await this.loadDynamicEndpoints();
            
            if (dynamicEndpoints && Array.isArray(dynamicEndpoints)) {
                this.endpoints = this.processEndpoints(dynamicEndpoints);
                this.organizeByCategory();
                
                console.info("[INFO] Endpoints loaded from dynamic source", {
                    categories: Object.keys(this.categories).length,
                    endpoints: this.endpoints.length
                });
                
                this.emit("loaded", {
                    source: "dynamic",
                    endpoints: this.endpoints,
                    categories: this.categories
                });
                
                return this.endpoints;
            }
        } catch (error) {
            console.warn("Failed to load dynamic endpoints:", error.message);
            this.emit("error", {
                source: "dynamic",
                error,
                message: `Failed to load dynamic endpoints: ${error.message}`
            });
        }
        
        // Fallback to static endpoints
        try {
            console.log("Falling back to static endpoints");
            const staticEndpoints = await this.loadStaticEndpoints();
            
            if (staticEndpoints && Array.isArray(staticEndpoints)) {
                this.endpoints = this.processEndpoints(staticEndpoints);
                this.organizeByCategory();
                
                console.info("[INFO] Endpoints loaded from static source", {
                    categories: Object.keys(this.categories).length,
                    endpoints: this.endpoints.length
                });
                
                this.emit("loaded", {
                    source: "static",
                    endpoints: this.endpoints,
                    categories: this.categories
                });
                
                return this.endpoints;
            } else {
                throw new Error("Invalid static endpoints format");
            }
        } catch (fallbackError) {
            console.error("[ERROR] Failed to load static endpoints", { fallbackError });
            this.emit("error", {
                source: "static",
                error: fallbackError,
                message: `Failed to load static endpoints: ${fallbackError.message}`
            });
            
            // Return empty array if all loading attempts failed
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load endpoints from the API
     * @returns {Promise<Array>} - Raw endpoints data
     * @private
     */
    async loadDynamicEndpoints() {
        const response = await fetch("/api/v1/api-tester/endpoints", {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error(`Authentication required: ${response.status} ${response.statusText}`);
            } else {
                throw new Error(`Failed to load endpoints: ${response.status} ${response.statusText}`);
            }
        }
        
        const data = await response.json();
        
        if (!data || !Array.isArray(data)) {
            throw new Error("Invalid endpoint data format");
        }
        
        return data;
    }

    /**
     * Load static endpoints from JSON file
     * @returns {Promise<Array>} - Raw endpoints data
     * @private
     */
    async loadStaticEndpoints() {
        console.log("[DEBUG] Loading endpoints from data/endpoints.json", {
            path: "data/endpoints.json",
            type: "static"
        });
        
        const response = await fetch("/data/endpoints.json");
        
        if (!response.ok) {
            throw new Error(`Failed to load static endpoints: ${response.status} ${response.statusText}`);
        }
        
        let data = await response.json();
        
        // Handle different possible formats of the static endpoints file
        let endpoints = [];
        
        if (Array.isArray(data)) {
            // Format 1: Direct array of endpoints
            endpoints = data;
        } else if (data.endpoints && Array.isArray(data.endpoints)) {
            // Format 2: { endpoints: [...] }
            endpoints = data.endpoints;
        } else if (data.flows && Array.isArray(data.flows)) {
            // Format 3: { flows: [...] }
            // Flatten flows into endpoints
            data.flows.forEach(flow => {
                if (flow.steps && Array.isArray(flow.steps)) {
                    endpoints = endpoints.concat(flow.steps.map(step => ({
                        ...step,
                        category: flow.name || flow.category || "Uncategorized"
                    })));
                }
            });
        } else if (data.categories) {
            // Format 4: { categories: { "name": [...endpoints] } }
            Object.entries(data.categories).forEach(([category, categoryEndpoints]) => {
                if (Array.isArray(categoryEndpoints)) {
                    endpoints = endpoints.concat(categoryEndpoints.map(endpoint => ({
                        ...endpoint,
                        category
                    })));
                }
            });
        }
        
        if (endpoints.length === 0) {
            throw new Error("Invalid static endpoints format - no endpoints found");
        }
        
        // Ensure all endpoints have required fields
        endpoints = endpoints.map(endpoint => {
            return {
                method: endpoint.method || "GET",
                path: endpoint.path || "/",
                category: endpoint.category || "Uncategorized",
                name: endpoint.name || this.generateEndpointName(endpoint),
                params: endpoint.params || {},
                ...endpoint
            };
        });
        
        return endpoints;
    }

    /**
     * Process raw endpoints into a consistent format
     * @param {Array} rawEndpoints - Raw endpoints data
     * @returns {Array} - Processed endpoints
     * @private
     */
    processEndpoints(rawEndpoints) {
        if (!Array.isArray(rawEndpoints)) {
            console.error("Non-array endpoints data:", rawEndpoints);
            return [];
        }
        
        return rawEndpoints.map(endpoint => {
            if (!endpoint) return null;
            
            // Extract category from path if not provided
            let category = endpoint.category;
            if (!category) {
                const pathParts = endpoint.path ? endpoint.path.split("/").filter(part => part) : [];
                category = pathParts[0] || "Uncategorized";
            }
            
            // Ensure required properties
            const method = endpoint.method || "GET";
            const path = endpoint.path || "/";
            
            // Generate a unique ID
            const id = endpoint.id || 
                `${method.toLowerCase()}_${path.replace(/\//g, "_")}`;
            
            // Generate a user-friendly name if not provided
            const name = endpoint.name || this.generateEndpointName({
                method,
                path
            });
            
            return {
                id,
                method,
                path,
                category,
                name,
                params: endpoint.params || {},
                description: endpoint.description || "",
                processed: true
            };
        }).filter(Boolean); // Remove null entries
    }

    /**
     * Generate a user-friendly name for an endpoint
     * @param {Object} endpoint - Endpoint object
     * @returns {string} - User-friendly name
     * @private
     */
    generateEndpointName(endpoint) {
        if (!endpoint || !endpoint.path) return "Unnamed Endpoint";
        
        // Get the last part of the path
        const pathParts = endpoint.path.split("/").filter(part => part);
        const lastPart = pathParts[pathParts.length - 1] || "endpoint";
        
        // Format it nicely
        return lastPart
            // Add spaces before capitals
            .replace(/([A-Z])/g, " $1")
            // Replace hyphens and underscores with spaces
            .replace(/[-_]/g, " ")
            // Capitalize first letter
            .replace(/^./, match => match.toUpperCase())
            // Clean up
            .trim();
    }

    /**
     * Organize endpoints by category
     * @private
     */
    organizeByCategory() {
        this.categories = {};
        
        this.endpoints.forEach(endpoint => {
            const category = endpoint.category || "Uncategorized";
            
            if (!this.categories[category]) {
                this.categories[category] = [];
            }
            
            this.categories[category].push(endpoint);
        });
    }

    /**
     * Get all endpoints
     * @returns {Array} - All endpoints
     */
    getEndpoints() {
        return [...this.endpoints];
    }

    /**
     * Get endpoints by category
     * @param {string} category - Category name
     * @returns {Array} - Endpoints in the category
     */
    getEndpointsByCategory(category) {
        return this.categories[category] || [];
    }

    /**
     * Get all categories
     * @returns {Object} - Categories object
     */
    getCategories() {
        return { ...this.categories };
    }
}

export { EndpointManager }; 