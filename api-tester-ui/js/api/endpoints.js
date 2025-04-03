/**
 * Endpoints Manager
 * Manages the API endpoints, categories, and endpoint metadata
 */

import apiClient from "./client.js";
import store, { flowHelpers } from "../state/index.js";
import errorHandler from "../utils/error-handler.js";

// Category name mapping
const CATEGORY_MAPPING = {
    "A": "Authentication",
    "C": "Characters",
    "E": "Environment",
    "F": "Files",
    "P": "Personality",
    "S": "System",
    "U": "Users",
    "G": "Game",
    "AI": "AI Models",
    "H": "Health"
};

/**
 * Get a friendly name for a category
 * @param {string} category - The category code
 * @returns {string} Friendly category name
 */
function getFriendlyCategoryName(category) {
    // Use mapping if available
    if (CATEGORY_MAPPING[category]) {
        return CATEGORY_MAPPING[category];
    }
    
    // Handle single letter categories not in the mapping
    if (category.length === 1) {
        return `Category ${category}`;
    }
    
    // Format category name
    return category
        // Add spaces before capital letters
        .replace(/([A-Z])/g, " $1")
        // Replace underscores and hyphens with spaces
        .replace(/[_-]+/g, " ")
        // Capitalize first letter of each word
        .replace(/\b\w/g, c => c.toUpperCase())
        // Clean up extra spaces
        .trim();
}

/**
 * Get a user-friendly description for a method
 * @param {string} method - HTTP method
 * @returns {string} User-friendly description
 */
function getMethodDescription(method) {
    switch (method.toUpperCase()) {
        case "GET": return "View";
        case "POST": return "Create";
        case "PUT": return "Update";
        case "PATCH": return "Modify";
        case "DELETE": return "Delete";
        default: return method;
    }
}

/**
 * Endpoints manager class
 */
class EndpointsManager {
    constructor() {
        this.endpoints = [];
        this.categories = new Map();
        this.isLoading = false;
        this.lastLoaded = null;
        this.bundledEndpoints = null;
    }

    /**
     * Initialize with bundled endpoints
     * @param {Array} bundledEndpoints - Array of bundled endpoints
     */
    initWithBundledEndpoints(bundledEndpoints) {
        this.bundledEndpoints = bundledEndpoints;
    }

    /**
     * Load endpoints from the server
     * @param {boolean} forceFresh - Whether to force a fresh load
     * @returns {Promise<Array>} The loaded endpoints
     */
    async loadEndpoints(forceFresh = false) {
        // Skip if already loading
        if (this.isLoading) {
            return this.endpoints;
        }
        
        // Skip if loaded recently and not forcing fresh
        const ONE_MINUTE = 60 * 1000;
        if (
            !forceFresh && 
            this.lastLoaded && 
            (Date.now() - this.lastLoaded) < ONE_MINUTE
        ) {
            return this.endpoints;
        }
        
        try {
            this.isLoading = true;
            
            // Fetch endpoints from API
            const response = await apiClient.get("/api-tester/endpoints");
            
            if (!response || !Array.isArray(response)) {
                throw new Error("Invalid endpoints response from server");
            }
            
            // Process and store the endpoints
            this.endpoints = this._processEndpoints(response);
            this.lastLoaded = Date.now();
            
            // Organize endpoints by category
            this._organizeCategories();
            
            // Update flows in state
            this._updateFlows();
            
            return this.endpoints;
        } catch (error) {
            // If server endpoints failed, try to use bundled endpoints
            if (this.bundledEndpoints) {
                console.warn("Using bundled endpoints as fallback");
                this.endpoints = this._processEndpoints(this.bundledEndpoints);
                this._organizeCategories();
                this._updateFlows();
                return this.endpoints;
            }
            
            // Handle error
            errorHandler.handleApiError(error, {
                userMessage: "Failed to load API endpoints"
            });
            
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load static bundled endpoints
     * @returns {Promise<Array>} The loaded endpoints
     */
    async loadStaticEndpoints() {
        if (!this.bundledEndpoints) {
            throw new Error("No bundled endpoints available");
        }
        
        this.endpoints = this._processEndpoints(this.bundledEndpoints);
        this._organizeCategories();
        this._updateFlows();
        
        return this.endpoints;
    }

    /**
     * Get all endpoints
     * @returns {Array} List of endpoints
     */
    getEndpoints() {
        return [...this.endpoints];
    }

    /**
     * Get endpoints by category
     * @param {string} category - Category name
     * @returns {Array} List of endpoints in the category
     */
    getEndpointsByCategory(category) {
        return this.categories.get(category) || [];
    }

    /**
     * Get all categories
     * @returns {Map} Map of categories and their endpoints
     */
    getCategories() {
        return new Map(this.categories);
    }

    /**
     * Get an endpoint by ID
     * @param {string} id - Endpoint ID
     * @returns {Object|null} The endpoint or null if not found
     */
    getEndpointById(id) {
        return this.endpoints.find(endpoint => endpoint.id === id) || null;
    }

    /**
     * Get an endpoint by path and method
     * @param {string} path - Endpoint path
     * @param {string} method - HTTP method
     * @returns {Object|null} The endpoint or null if not found
     */
    getEndpointByPathAndMethod(path, method) {
        return this.endpoints.find(
            endpoint => endpoint.path === path && endpoint.method === method
        ) || null;
    }

    /**
     * Search endpoints
     * @param {string} searchTerm - Search term
     * @returns {Array} List of matching endpoints
     */
    searchEndpoints(searchTerm) {
        if (!searchTerm) return [...this.endpoints];
        
        const term = searchTerm.toLowerCase();
        
        return this.endpoints.filter(endpoint => {
            return (
                endpoint.path.toLowerCase().includes(term) ||
                endpoint.method.toLowerCase().includes(term) ||
                endpoint.category.toLowerCase().includes(term) ||
                endpoint.description?.toLowerCase().includes(term) ||
                endpoint.name?.toLowerCase().includes(term)
            );
        });
    }

    /**
     * Get category names
     * @returns {Array} List of category names
     */
    getCategoryNames() {
        return Array.from(this.categories.keys());
    }

    // Private methods

    /**
     * Process raw endpoints data
     * @private
     */
    _processEndpoints(rawEndpoints) {
        return rawEndpoints.map(endpoint => {
            // Generate ID if not present
            const id = endpoint.id || 
                `${endpoint.method.toLowerCase()}_${endpoint.path.replace(/\//g, "_")}`;
            
            // Get category from path if not specified
            let category = endpoint.category;
            if (!category) {
                // Extract first segment from path
                const pathParts = endpoint.path.split("/").filter(part => part);
                category = pathParts[0] || "Uncategorized";
            }
            
            // Generate a nice name if not present
            const name = endpoint.name || this._generateEndpointName(endpoint);
            
            // Generate a description if not present
            const description = endpoint.description || 
                `${getMethodDescription(endpoint.method)} ${name}`;
            
            return {
                ...endpoint,
                id,
                category,
                name,
                description,
                friendlyCategory: getFriendlyCategoryName(category)
            };
        });
    }

    /**
     * Generate a user-friendly name for an endpoint
     * @private
     */
    _generateEndpointName(endpoint) {
        // Extract the last path segment as a base name
        const pathParts = endpoint.path.split("/").filter(part => part);
        const lastPart = pathParts[pathParts.length - 1] || "endpoint";
        
        // Clean up the name
        return lastPart
            // Add spaces before capital letters
            .replace(/([A-Z])/g, " $1")
            // Replace hyphens and underscores with spaces
            .replace(/[-_]+/g, " ")
            // Capitalize first letter of each word
            .replace(/\b\w/g, c => c.toUpperCase())
            // Clean up extra spaces
            .trim();
    }

    /**
     * Organize endpoints by category
     * @private
     */
    _organizeCategories() {
        // Clear current categories
        this.categories.clear();
        
        // Organize endpoints by category
        this.endpoints.forEach(endpoint => {
            if (!this.categories.has(endpoint.category)) {
                this.categories.set(endpoint.category, []);
            }
            
            this.categories.get(endpoint.category).push(endpoint);
        });
        
        // Sort endpoints within each category
        this.categories.forEach(endpoints => {
            endpoints.sort((a, b) => {
                // Sort by path then method
                const pathCompare = a.path.localeCompare(b.path);
                if (pathCompare !== 0) return pathCompare;
                
                // If same path, use a consistent method order
                const methodOrder = { GET: 1, POST: 2, PUT: 3, PATCH: 4, DELETE: 5 };
                return (methodOrder[a.method] || 99) - (methodOrder[b.method] || 99);
            });
        });
    }

    /**
     * Update flows in the state based on current endpoints
     * @private
     */
    _updateFlows() {
        // Create flows from categories
        const flows = Array.from(this.categories.entries()).map(([category, endpoints]) => {
            // Generate a descriptive name based on what the endpoints do
            const friendlyCategory = getFriendlyCategoryName(category);
            
            // Count methods to create a descriptive name
            const methodCounts = endpoints.reduce((acc, endpoint) => {
                acc[endpoint.method] = (acc[endpoint.method] || 0) + 1;
                return acc;
            }, {});
            
            // Get the main operations (top 2 by count)
            const mainOperations = Object.entries(methodCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([method]) => getMethodDescription(method));
            
            // Generate description based on operations
            let description = `Test ${friendlyCategory.toLowerCase()} endpoints`;
            if (mainOperations.length > 0) {
                description = `${mainOperations.join("/")} ${friendlyCategory.toLowerCase()} data`;
            }
            
            return {
                id: `flow_${category.toLowerCase()}`,
                name: friendlyCategory,
                description,
                category,
                endpoints
            };
        });
        
        // Sort flows alphabetically by name
        flows.sort((a, b) => a.name.localeCompare(b.name));
        
        // Update state
        flowHelpers.setFlows(flows);
    }
}

// Create and export singleton instance
const endpointsManager = new EndpointsManager();
export default endpointsManager; 