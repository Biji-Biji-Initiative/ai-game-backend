/**
 * Endpoint Manager
 * 
 * Manages API endpoints and test flows.
 * Handles loading, categorizing, and filtering endpoints.
 */
class EndpointManager {
    constructor(options = {}) {
        this.options = {
            staticEndpointsUrl: "data/endpoints.json",
            staticFlowsUrl: "data/flows.json",
            dynamicEndpointsUrl: "/api/endpoints",
            dynamicFlowsUrl: "/api/flows",
            useDynamicEndpoints: true,
            useDynamicFlows: true,
            ...options
        };
        
        this.endpoints = [];
        this.flows = [];
        this.categories = new Set();
        this.isLoading = false;
        this.lastLoaded = null;
        this.listeners = [];
    }
    
    /**
     * Initialize the endpoint manager
     */
    async init() {
        console.log("Initializing EndpointManager");
        await this.loadEndpoints();
        await this.loadFlows();
        return this;
    }
    
    /**
     * Load endpoints from either dynamic or static source
     */
    async loadEndpoints() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.notifyListeners({ type: "loading", loading: true });
        
        try {
            let endpoints = [];
            
            // Try to load from dynamic source first if enabled
            if (this.options.useDynamicEndpoints) {
                try {
                    endpoints = await this.loadDynamicEndpoints();
                    console.log("Loaded dynamic endpoints:", endpoints.length);
                } catch (error) {
                    console.error("Error loading dynamic endpoints:", error);
                    endpoints = [];
                }
            }
            
            // Fall back to static endpoints if dynamic loading failed or is disabled
            if (endpoints.length === 0) {
                try {
                    endpoints = await this.loadStaticEndpoints();
                    console.log("Loaded static endpoints:", endpoints.length);
                } catch (error) {
                    console.error("Error loading static endpoints:", error);
                    endpoints = [];
                }
            }
            
            // Process the loaded endpoints
            this.processEndpoints(endpoints);
            
            this.lastLoaded = new Date();
            this.isLoading = false;
            
            this.notifyListeners({ 
                type: "endpoints-loaded", 
                count: this.endpoints.length,
                categories: Array.from(this.categories)
            });
        } catch (error) {
            console.error("Failed to load endpoints:", error);
            
            this.isLoading = false;
            this.notifyListeners({ 
                type: "error", 
                error: error.message || "Failed to load endpoints"
            });
        }
    }
    
    /**
     * Load flows from either dynamic or static source
     */
    async loadFlows() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.notifyListeners({ type: "loading", loading: true });
        
        try {
            let flows = [];
            
            // Try to load from dynamic source first if enabled
            if (this.options.useDynamicFlows) {
                try {
                    flows = await this.loadDynamicFlows();
                    console.log("Loaded dynamic flows:", flows.length);
                } catch (error) {
                    console.error("Error loading dynamic flows:", error);
                    flows = [];
                }
            }
            
            // Fall back to static flows if dynamic loading failed or is disabled
            if (flows.length === 0) {
                try {
                    flows = await this.loadStaticFlows();
                    console.log("Loaded static flows:", flows.length);
                } catch (error) {
                    console.error("Error loading static flows:", error);
                    flows = [];
                }
            }
            
            // Process the loaded flows
            this.processFlows(flows);
            
            this.isLoading = false;
            
            this.notifyListeners({ 
                type: "flows-loaded", 
                count: this.flows.length
            });
        } catch (error) {
            console.error("Failed to load flows:", error);
            
            this.isLoading = false;
            this.notifyListeners({ 
                type: "error", 
                error: error.message || "Failed to load flows"
            });
        }
    }
    
    /**
     * Load endpoints from dynamic source
     * @returns {Promise<Array>} Array of endpoints
     */
    async loadDynamicEndpoints() {
        try {
            const response = await fetch(this.options.dynamicEndpointsUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load dynamic endpoints: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Handle different response formats
            if (Array.isArray(data)) {
                return data;
            } else if (data.endpoints && Array.isArray(data.endpoints)) {
                return data.endpoints;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data;
            }
            
            throw new Error("Invalid endpoint data format");
        } catch (error) {
            console.error("Error loading dynamic endpoints:", error);
            throw error;
        }
    }
    
    /**
     * Load endpoints from static file
     * @returns {Promise<Array>} Array of endpoints
     */
    async loadStaticEndpoints() {
        try {
            const response = await fetch(this.options.staticEndpointsUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load static endpoints: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Handle different response formats
            if (Array.isArray(data)) {
                return data;
            } else if (data.endpoints && Array.isArray(data.endpoints)) {
                return data.endpoints;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data;
            }
            
            throw new Error("Invalid endpoint data format");
        } catch (error) {
            console.error("Error loading static endpoints:", error);
            throw error;
        }
    }
    
    /**
     * Load flows from dynamic source
     * @returns {Promise<Array>} Array of flows
     */
    async loadDynamicFlows() {
        try {
            const response = await fetch(this.options.dynamicFlowsUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load dynamic flows: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Handle different response formats
            if (Array.isArray(data)) {
                return data;
            } else if (data.flows && Array.isArray(data.flows)) {
                return data.flows;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data;
            }
            
            throw new Error("Invalid flow data format");
        } catch (error) {
            console.error("Error loading dynamic flows:", error);
            throw error;
        }
    }
    
    /**
     * Load flows from static file
     * @returns {Promise<Array>} Array of flows
     */
    async loadStaticFlows() {
        try {
            const response = await fetch(this.options.staticFlowsUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load static flows: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Handle different response formats
            if (Array.isArray(data)) {
                return data;
            } else if (data.flows && Array.isArray(data.flows)) {
                return data.flows;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data;
            }
            
            throw new Error("Invalid flow data format");
        } catch (error) {
            console.error("Error loading static flows:", error);
            throw error;
        }
    }
    
    /**
     * Process and validate endpoints
     * @param {Array} endpoints - Array of endpoint objects
     */
    processEndpoints(endpoints) {
        if (!Array.isArray(endpoints)) {
            console.error("Invalid endpoints data:", endpoints);
            this.endpoints = [];
            return;
        }
        
        // Reset categories
        this.categories.clear();
        
        // Process and validate each endpoint
        this.endpoints = endpoints.filter(endpoint => {
            // Validate required fields
            if (!endpoint.id || !endpoint.method || !endpoint.path) {
                console.warn("Invalid endpoint missing required fields:", endpoint);
                return false;
            }
            
            // Add category to the set
            if (endpoint.category) {
                this.categories.add(endpoint.category);
            } else {
                endpoint.category = "Uncategorized";
                this.categories.add("Uncategorized");
            }
            
            // Ensure params is an array
            if (!Array.isArray(endpoint.params)) {
                endpoint.params = [];
            }
            
            return true;
        });
        
        // Sort endpoints by category and name
        this.endpoints.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return (a.name || a.id).localeCompare(b.name || b.id);
        });
        
        console.log(`Processed ${this.endpoints.length} endpoints in ${this.categories.size} categories`);
    }
    
    /**
     * Process and validate flows
     * @param {Array} flows - Array of flow objects
     */
    processFlows(flows) {
        if (!Array.isArray(flows)) {
            console.error("Invalid flows data:", flows);
            this.flows = [];
            return;
        }
        
        // Process and validate each flow
        this.flows = flows.filter(flow => {
            // Validate required fields
            if (!flow.id || !flow.name) {
                console.warn("Invalid flow missing required fields:", flow);
                return false;
            }
            
            // Ensure steps is an array
            if (!Array.isArray(flow.steps)) {
                flow.steps = [];
            }
            
            // Check if endpoints exist for each step
            flow.steps.forEach(step => {
                if (step.endpointId) {
                    const endpoint = this.getEndpointById(step.endpointId);
                    if (!endpoint) {
                        console.warn(`Endpoint ${step.endpointId} not found for step in flow ${flow.id}`);
                    }
                }
            });
            
            return true;
        });
        
        // Sort flows by category and name
        this.flows.sort((a, b) => {
            if (a.category !== b.category) {
                return (a.category || "").localeCompare(b.category || "");
            }
            return a.name.localeCompare(b.name);
        });
        
        console.log(`Processed ${this.flows.length} flows`);
    }
    
    /**
     * Get all endpoints
     * @returns {Array} Array of all endpoints
     */
    getAllEndpoints() {
        return [...this.endpoints];
    }
    
    /**
     * Get all categories
     * @returns {Array} Array of category names
     */
    getAllCategories() {
        return Array.from(this.categories).sort();
    }
    
    /**
     * Get endpoints by category
     * @param {string} category - Category name
     * @returns {Array} Array of endpoints in the category
     */
    getEndpointsByCategory(category) {
        if (!category) return [];
        return this.endpoints.filter(endpoint => endpoint.category === category);
    }
    
    /**
     * Get endpoint by ID
     * @param {string} id - Endpoint ID
     * @returns {Object|null} Endpoint object or null if not found
     */
    getEndpointById(id) {
        if (!id) return null;
        return this.endpoints.find(endpoint => endpoint.id === id) || null;
    }
    
    /**
     * Get all flows
     * @returns {Array} Array of all flows
     */
    getAllFlows() {
        return [...this.flows];
    }
    
    /**
     * Get flows by category
     * @param {string} category - Category name
     * @returns {Array} Array of flows in the category
     */
    getFlowsByCategory(category) {
        if (!category) return [];
        return this.flows.filter(flow => flow.category === category);
    }
    
    /**
     * Get flow by ID
     * @param {string} id - Flow ID
     * @returns {Object|null} Flow object or null if not found
     */
    getFlowById(id) {
        if (!id) return null;
        return this.flows.find(flow => flow.id === id) || null;
    }
    
    /**
     * Search endpoints by text
     * @param {string} query - Search query
     * @returns {Array} Array of matching endpoints
     */
    searchEndpoints(query) {
        if (!query) return [];
        
        const searchLower = query.toLowerCase();
        
        return this.endpoints.filter(endpoint => {
            // Search in ID, name, description, path
            return (
                endpoint.id.toLowerCase().includes(searchLower) ||
                (endpoint.name && endpoint.name.toLowerCase().includes(searchLower)) ||
                (endpoint.description && endpoint.description.toLowerCase().includes(searchLower)) ||
                endpoint.path.toLowerCase().includes(searchLower)
            );
        });
    }
    
    /**
     * Search flows by text
     * @param {string} query - Search query
     * @returns {Array} Array of matching flows
     */
    searchFlows(query) {
        if (!query) return [];
        
        const searchLower = query.toLowerCase();
        
        return this.flows.filter(flow => {
            // Search in ID, name, description
            return (
                flow.id.toLowerCase().includes(searchLower) ||
                flow.name.toLowerCase().includes(searchLower) ||
                (flow.description && flow.description.toLowerCase().includes(searchLower))
            );
        });
    }
    
    /**
     * Add a listener for endpoint manager events
     * @param {Function} listener - Listener function
     */
    addListener(listener) {
        if (typeof listener === "function" && !this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }
    
    /**
     * Remove a listener
     * @param {Function} listener - Listener function to remove
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    /**
     * Notify all listeners of an event
     * @param {Object} event - Event object
     */
    notifyListeners(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error("Error in endpoint manager listener:", error);
            }
        });
    }
}

export default EndpointManager; 