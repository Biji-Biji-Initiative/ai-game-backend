/**
 * Endpoint Manager Module
 * Handles loading and managing API endpoints
 */

/**
 *
 */
export class EndpointManager {
    /**
     * Creates a new EndpointManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            apiClient: null,
            config: null,
            maxRetries: 3,
            retryDelay: 2000, // milliseconds
            useLocalEndpoints: true, // Whether to fallback to bundled endpoints if fetch fails
            supportMultipleFormats: true, // Whether to support multiple endpoint formats
            endpointsFilePath: "data/endpoints.json", // Standardized path for endpoints
            dynamicEndpointsPath: "/api/v1/api-tester/endpoints", // Dynamic endpoints from backend
            useDynamicEndpoints: true, // Whether to use dynamic endpoints from backend
            ...options
        };
        
        this.apiClient = this.options.apiClient;
        this.config = this.options.config;
        this.endpoints = [];
        this.categories = new Map();
        this.listeners = new Map();
        this.loaded = false;
        this.retryCount = 0;
        this.bundledEndpoints = null; // Will hold bundled endpoints as fallback
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
     * Sets bundled endpoints to use as fallback
     * @param {Object|Array} endpoints - The bundled endpoints
     */
    setBundledEndpoints(endpoints) {
        this.bundledEndpoints = endpoints;
    }
    
    /**
     * Loads endpoints from the standardized JSON file or dynamic backend endpoint
     * @returns {Promise<Array>} The loaded endpoints
     */
    async loadEndpoints() {
        // Try to load dynamic endpoints first if enabled
        if (this.options.useDynamicEndpoints) {
            try {
                return await this.loadDynamicEndpoints();
            } catch (error) {
                console.warn("Failed to load dynamic endpoints:", error);
                console.log("Falling back to static endpoints");
                // Fall back to static endpoints if dynamic loading fails
                return await this.loadStaticEndpoints();
            }
        } else {
            // Use static endpoints directly if dynamic loading is disabled
            return await this.loadStaticEndpoints();
        }
    }
    
    /**
     * Loads endpoints from the backend API
     * @returns {Promise<Array>} The loaded endpoints
     */
    async loadDynamicEndpoints() {
        try {
            this.emit('endpoints:loading', { source: 'dynamic', path: this.options.dynamicEndpointsPath });
            
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
            
            const response = await fetch(this.options.dynamicEndpointsPath, {
                headers: headers
            });
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Authentication required: ${response.status} ${response.statusText}`);
                }
                throw new Error(`Failed to load dynamic endpoints: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data.endpoints)) {
                throw new Error('Invalid endpoint data structure');
            }
            
            this.dynamicEndpoints = data.endpoints;
            this.currentSource = 'dynamic';
            
            this.emit('endpoints:loaded', { 
                source: 'dynamic',
                endpoints: this.dynamicEndpoints,
                count: this.dynamicEndpoints.length
            });
            
            return this.dynamicEndpoints;
        } catch (error) {
            const message = `Failed to load dynamic endpoints: ${error.message}`;
            console.warn(message);
            
            this.emit('endpoints:error', { 
                source: 'dynamic',
                error: error,
                message: message
            });
            
            throw error;
        }
    }
    
    /**
     * Loads endpoints from the static JSON file
     * @returns {Promise<Array>} The loaded endpoints
     */
    async loadStaticEndpoints() {
        const endpointsFilePath = this.options.endpointsFilePath;
        
        try {
            // Emit loading event
            this.emit("endpoints:loading", { path: endpointsFilePath, type: "static" });
            
            // Fetch endpoints
            const response = await fetch(endpointsFilePath);
            
            if (!response.ok) {
                throw new Error(`Failed to load static endpoints: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Process and store endpoints
            this.processEndpoints(data);
            
            // Mark as loaded
            this.loaded = true;
            this.retryCount = 0;
            
            // Emit loaded event
            this.emit("endpoints:loaded", {
                endpoints: this.endpoints,
                categories: Array.from(this.categories.entries()),
                source: "static"
            });
            
            return this.endpoints;
        } catch (error) {
            console.error("Error loading static endpoints:", error);
            
            // Try to retry the request
            if (this.retryCount < this.options.maxRetries) {
                this.retryCount++;
                
                // Emit retry event
                this.emit("endpoints:retry", {
                    error,
                    retryCount: this.retryCount,
                    maxRetries: this.options.maxRetries
                });
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
                
                // Retry
                return this.loadStaticEndpoints();
            }
            
            // If we've reached max retries and have bundled endpoints, use them
            if (this.options.useLocalEndpoints && this.bundledEndpoints) {
                console.log("Using bundled endpoints as fallback");
                
                // Process bundled endpoints
                this.processEndpoints(this.bundledEndpoints);
                
                // Mark as loaded
                this.loaded = true;
                
                // Emit loaded event (but indicate it's from fallback)
                this.emit("endpoints:loaded", {
                    endpoints: this.endpoints,
                    categories: Array.from(this.categories.entries()),
                    source: "fallback"
                });
                
                return this.endpoints;
            }
            
            // Emit error event
            this.emit("endpoints:error", {
                error,
                message: error.message,
                source: "static"
            });
            
            throw error;
        }
    }
    
    /**
     * Processes the loaded endpoints data
     * @param {Object} data - The loaded endpoints data
     */
    processEndpoints(data) {
        // Reset endpoints and categories
        this.endpoints = [];
        this.categories.clear();
        
        // Support multiple endpoint formats
        if (this.options.supportMultipleFormats) {
            if (Array.isArray(data)) {
                // Format 1: Plain array of endpoints
                this.processEndpointsArray(data);
            } else if (data && Array.isArray(data.endpoints)) {
                // Format 2: Object with endpoints array
                this.processEndpointsArray(data.endpoints);
            } else if (data && typeof data === "object" && !Array.isArray(data)) {
                // Format 3: Object with categories as keys and arrays as values
                this.processEndpointsObject(data);
            } else {
                throw new Error("Invalid endpoints data format - could not detect format");
            }
        } else {
            // Strict format check
            if (!data || !Array.isArray(data.endpoints)) {
                throw new Error("Invalid endpoints data format - expected {endpoints: [...]}");
            }
            
            this.processEndpointsArray(data.endpoints);
        }
    }
    
    /**
     * Processes an array of endpoints
     * @param {Array} endpoints - The array of endpoints
     */
    processEndpointsArray(endpoints) {
        if (!Array.isArray(endpoints)) {
            throw new Error("Expected endpoints to be an array");
        }
        
        // Process each endpoint
        endpoints.forEach((endpoint, index) => {
            // Validate endpoint
            if (!endpoint || typeof endpoint !== "object") {
                console.warn("Skipping invalid endpoint at index", index, endpoint);
                return;
            }
            
            // Determine path and name - bare minimum required
            const path = endpoint.path || endpoint.url || endpoint.endpoint;
            const name = endpoint.name || endpoint.title || endpoint.label || path;
            
            if (!path) {
                console.warn("Skipping endpoint without path:", endpoint);
                return;
            }
            
            // Add default values if missing
            const processedEndpoint = {
                id: endpoint.id || `endpoint-${this.endpoints.length + 1}`,
                method: endpoint.method || "GET",
                path: path,
                name: name,
                description: endpoint.description || "",
                category: endpoint.category || endpoint.group || "Uncategorized",
                parameters: endpoint.parameters || endpoint.params || [],
                headers: endpoint.headers || {},
                requestBody: endpoint.requestBody || endpoint.body || null,
                responseExample: endpoint.responseExample || endpoint.example || null,
                requiresAuth: endpoint.requiresAuth || endpoint.authenticated || false,
                tags: endpoint.tags || []
            };
            
            // Add to endpoints array
            this.endpoints.push(processedEndpoint);
            
            // Add to categories
            if (!this.categories.has(processedEndpoint.category)) {
                this.categories.set(processedEndpoint.category, []);
            }
            
            this.categories.get(processedEndpoint.category).push(processedEndpoint);
        });
    }
    
    /**
     * Processes an object with categories
     * @param {Object} data - The endpoints object
     */
    processEndpointsObject(data) {
        // Remove endpoints key which might contain an array that we already processed
        const dataWithoutEndpoints = { ...data };
        delete dataWithoutEndpoints.endpoints;
        
        // Process each category
        Object.entries(dataWithoutEndpoints).forEach(([category, endpoints]) => {
            if (!Array.isArray(endpoints)) {
                console.warn(`Skipping invalid category ${category}: expected array but got`, typeof endpoints);
                return;
            }
            
            // Create category if it doesn't exist
            if (!this.categories.has(category)) {
                this.categories.set(category, []);
            }
            
            // Process endpoints in this category
            endpoints.forEach((endpoint, index) => {
                // Validate endpoint
                if (!endpoint || typeof endpoint !== "object") {
                    console.warn(`Skipping invalid endpoint in category ${category} at index`, index, endpoint);
                    return;
                }
                
                // Force category to match the key
                endpoint.category = category;
                
                // Determine path and name
                const path = endpoint.path || endpoint.url || endpoint.endpoint;
                const name = endpoint.name || endpoint.title || endpoint.label || path;
                
                if (!path) {
                    console.warn(`Skipping endpoint without path in category ${category}:`, endpoint);
                    return;
                }
                
                // Add default values if missing
                const processedEndpoint = {
                    id: endpoint.id || `endpoint-${this.endpoints.length + 1}`,
                    method: endpoint.method || "GET",
                    path: path,
                    name: name,
                    description: endpoint.description || "",
                    category: category,
                    parameters: endpoint.parameters || endpoint.params || [],
                    headers: endpoint.headers || {},
                    requestBody: endpoint.requestBody || endpoint.body || null,
                    responseExample: endpoint.responseExample || endpoint.example || null,
                    requiresAuth: endpoint.requiresAuth || endpoint.authenticated || false,
                    tags: endpoint.tags || []
                };
                
                // Add to endpoints array
                this.endpoints.push(processedEndpoint);
                
                // Add to category
                this.categories.get(category).push(processedEndpoint);
            });
        });
    }
    
    /**
     * Refreshes endpoints by loading them again
     * @returns {Promise<Array>} The loaded endpoints
     */
    async refreshEndpoints() {
        // Reset retry count
        this.retryCount = 0;
        
        // Emit refreshing event
        this.emit("endpoints:refreshing");
        
        // Load endpoints
        try {
            const endpoints = await this.loadEndpoints();
            
            // Emit refreshed event
            this.emit("endpoints:refreshed", {
                endpoints: this.endpoints,
                categories: Array.from(this.categories.entries())
            });
            
            return endpoints;
        } catch (error) {
            // Emit error event
            this.emit("endpoints:refresh-error", {
                error,
                message: error.message
            });
            
            throw error;
        }
    }
    
    /**
     * Gets all loaded endpoints
     * @returns {Array} The loaded endpoints
     */
    getEndpoints() {
        return [...this.endpoints];
    }
    
    /**
     * Gets endpoints by category
     * @param {string} category - The category name
     * @returns {Array} The endpoints in the category
     */
    getEndpointsByCategory(category) {
        return this.categories.has(category) ? [...this.categories.get(category)] : [];
    }
    
    /**
     * Gets all categories
     * @returns {Array} The categories
     */
    getCategories() {
        return Array.from(this.categories.keys());
    }
    
    /**
     * Gets an endpoint by ID
     * @param {string} id - The endpoint ID
     * @returns {Object} The endpoint or null if not found
     */
    getEndpointById(id) {
        return this.endpoints.find(endpoint => endpoint.id === id) || null;
    }
    
    /**
     * Gets an endpoint by path and method
     * @param {string} path - The endpoint path
     * @param {string} method - The endpoint method
     * @returns {Object} The endpoint or null if not found
     */
    getEndpointByPathAndMethod(path, method) {
        return this.endpoints.find(
            endpoint => endpoint.path === path && endpoint.method === method
        ) || null;
    }
    
    /**
     * Searches for endpoints matching a query
     * @param {string} query - The search query
     * @param {Object} options - Search options
     * @returns {Array} The matching endpoints
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
        
        const normalizedQuery = searchOptions.caseSensitive 
            ? query 
            : query.toLowerCase();
        
        return this.endpoints.filter(endpoint => {
            // Check each field
            for (const field of searchOptions.fields) {
                const value = endpoint[field];
                
                // Skip if field doesn't exist
                if (value === undefined || value === null) {
                    continue;
                }
                
                // Handle arrays (e.g. tags)
                if (Array.isArray(value)) {
                    for (const item of value) {
                        const normalizedItem = searchOptions.caseSensitive 
                            ? String(item) 
                            : String(item).toLowerCase();
                        
                        if (searchOptions.exactMatch 
                            ? normalizedItem === normalizedQuery 
                            : normalizedItem.includes(normalizedQuery)) {
                            return true;
                        }
                    }
                } else {
                    // Handle strings and other values
                    const normalizedValue = searchOptions.caseSensitive 
                        ? String(value) 
                        : String(value).toLowerCase();
                    
                    if (searchOptions.exactMatch 
                        ? normalizedValue === normalizedQuery 
                        : normalizedValue.includes(normalizedQuery)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    }
    
    /**
     * Adds a custom endpoint
     * @param {Object} endpoint - The endpoint to add
     * @returns {Object} The added endpoint
     */
    addCustomEndpoint(endpoint) {
        // Validate endpoint
        if (!endpoint || !endpoint.path) {
            throw new Error("Invalid endpoint: missing path");
        }
        
        // Prepare endpoint
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
        
        // Add to endpoints array
        this.endpoints.push(customEndpoint);
        
        // Add to categories
        if (!this.categories.has(customEndpoint.category)) {
            this.categories.set(customEndpoint.category, []);
        }
        
        this.categories.get(customEndpoint.category).push(customEndpoint);
        
        // Emit event
        this.emit("endpoints:custom-added", customEndpoint);
        
        return customEndpoint;
    }
    
    /**
     * Removes a custom endpoint
     * @param {string} id - The endpoint ID
     * @returns {boolean} Whether the endpoint was removed
     */
    removeCustomEndpoint(id) {
        const endpoint = this.getEndpointById(id);
        
        if (!endpoint || !endpoint.isCustom) {
            return false;
        }
        
        // Remove from endpoints array
        this.endpoints = this.endpoints.filter(e => e.id !== id);
        
        // Remove from category
        if (this.categories.has(endpoint.category)) {
            this.categories.set(
                endpoint.category,
                this.categories.get(endpoint.category).filter(e => e.id !== id)
            );
            
            // Remove category if empty
            if (this.categories.get(endpoint.category).length === 0) {
                this.categories.delete(endpoint.category);
            }
        }
        
        // Emit event
        this.emit("endpoints:custom-removed", endpoint);
        
        return true;
    }
    
    /**
     * Checks whether endpoints are loaded
     * @returns {boolean} Whether endpoints are loaded
     */
    isLoaded() {
        return this.loaded;
    }
    
    /**
     * Gets the number of loaded endpoints
     * @returns {number} The number of endpoints
     */
    getEndpointCount() {
        return this.endpoints.length;
    }
} 