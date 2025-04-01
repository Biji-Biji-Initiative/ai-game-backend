/**
 * Endpoint Manager Module
 * Handles loading and managing API endpoints
 */
import { logger } from '../utils/logger';
import { EndpointManagerOptions, EndpointParameter } from '../types/modules';

// Define the Endpoint interface here instead of importing it
export interface Endpoint {
  id: string;
  name: string;
  url?: string;
  method?: string;
  path?: string;
  description?: string;
  category?: string;
  parameters?: EndpointParameter[];
  headers?: Record<string, string>;
  requestBody?: any;
  responseExample?: any;
  requiresAuth?: boolean;
  tags?: string[];
  isCustom?: boolean;
}

// Extend the Endpoint interface to include isCustom property for custom endpoints
interface CustomEndpoint extends Endpoint {
  isCustom: boolean;
}

interface ApiClient {
  fetch: (path: string, options?: RequestInit) => Promise<any>;
}

interface EndpointData {
  endpoints?: any[];
  [key: string]: any;
}

export class EndpointManager {
    private options: EndpointManagerOptions;
    private apiClient: ApiClient | null;
    private config: any | null;
    private endpoints: Endpoint[];
    private categories: Map<string, Endpoint[]>;
    private listeners: Map<string, Function[]>;
    private loaded: boolean;
    private retryCount: number;
    private bundledEndpoints: Endpoint[] | Record<string, any> | null;

    /**
     * Creates a new EndpointManager instance
     * @param options - Configuration options
     */
    constructor(options: Partial<EndpointManagerOptions> = {}) {
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
     * @param event - The event name
     * @param callback - The callback function
     */
    addEventListener(event: string, callback: Function): void {
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
    removeEventListener(event: string, callback: Function): void {
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
    emit(event: string, data: any = null): void {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            if (listeners) {
                listeners.forEach(callback => callback(data));
            }
        }
    }
    
    /**
     * Sets bundled endpoints to use as fallback
     * @param endpoints - The bundled endpoints
     */
    setBundledEndpoints(endpoints: Endpoint[] | Record<string, any>): void {
        this.bundledEndpoints = endpoints;
    }
    
    /**
     * Loads endpoints from the standardized JSON file or dynamic backend endpoint
     * @returns The loaded endpoints
     */
    async loadEndpoints(): Promise<Endpoint[]> {
        // Try to load dynamic endpoints first if enabled
        if (this.options.useDynamicEndpoints) {
            try {
                return await this.loadDynamicEndpoints();
            } catch (error) {
                console.debug("Failed to load dynamic endpoints:", error);
                console.debug("Falling back to static endpoints");
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
     * @returns The loaded endpoints
     */
    async loadDynamicEndpoints(): Promise<Endpoint[]> {
        const dynamicEndpointsPath = this.options.dynamicEndpointsPath;
        
        try {
            // Emit loading event
            this.emit("endpoints:loading", { path: dynamicEndpointsPath, type: "dynamic" });
            
            // Fetch endpoints from backend
            if (!dynamicEndpointsPath) {
                throw new Error("Dynamic endpoints path is not defined");
            }
            
            const response = await fetch(dynamicEndpointsPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load dynamic endpoints: ${response.status} ${response.statusText}`);
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
                source: "dynamic"
            });
            
            return this.endpoints;
        } catch (error) {
            console.error("Error loading dynamic endpoints:", error);
            
            // Emit error event
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
    async loadStaticEndpoints(): Promise<Endpoint[]> {
        const endpointsFilePath = this.options.endpointsFilePath;
        
        try {
            // Emit loading event
            this.emit("endpoints:loading", { path: endpointsFilePath, type: "static" });
            
            // Fetch endpoints
            if (!endpointsFilePath) {
                throw new Error("Endpoints file path is not defined");
            }
            
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
            if (this.retryCount < (this.options.maxRetries || 0)) {
                this.retryCount++;
                
                // Emit retry event
                this.emit("endpoints:retry", {
                    error,
                    retryCount: this.retryCount,
                    maxRetries: this.options.maxRetries
                });
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.options.retryDelay || 2000));
                
                // Retry
                return this.loadStaticEndpoints();
            }
            
            // If we've reached max retries and have bundled endpoints, use them
            if (this.options.useLocalEndpoints && this.bundledEndpoints) {
                console.debug("Using bundled endpoints as fallback");
                
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
    processEndpoints(data: any): void {
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
     * @param endpoints - The array of endpoints
     */
    processEndpointsArray(endpoints: any[]): void {
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
            const processedEndpoint: Endpoint = {
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
                tags: endpoint.tags || [],
                url: endpoint.url || "",
                isCustom: endpoint.isCustom || false
            };
            
            // Add to endpoints array
            this.endpoints.push(processedEndpoint);
            
            // Add to categories - ensure we have a non-null category
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
    processEndpointsObject(data: EndpointData): void {
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
                const processedEndpoint: Endpoint = {
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
                    tags: endpoint.tags || [],
                    url: endpoint.url || "",
                    isCustom: endpoint.isCustom || false
                };
                
                // Add to endpoints array
                this.endpoints.push(processedEndpoint);
                
                // Add to category
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
    async refreshEndpoints(): Promise<Endpoint[]> {
        // Reset retry count
        this.retryCount = 0;
        
        // Emit refreshing event
        this.emit("endpoints:refreshing", null);
        
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
                message: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
        }
    }
    
    /**
     * Gets all loaded endpoints
     * @returns The loaded endpoints
     */
    getEndpoints(): Endpoint[] {
        return [...this.endpoints];
    }
    
    /**
     * Gets endpoints by category
     * @param category - The category name
     * @returns The endpoints in the category
     */
    getEndpointsByCategory(category: string): Endpoint[] {
        const endpoints = this.categories.get(category);
        return endpoints ? [...endpoints] : [];
    }
    
    /**
     * Gets all categories
     * @returns The categories
     */
    getCategories(): string[] {
        return Array.from(this.categories.keys());
    }
    
    /**
     * Gets an endpoint by ID
     * @param id - The endpoint ID
     * @returns The endpoint or null if not found
     */
    getEndpointById(id: string): Endpoint | null {
        return this.endpoints.find(endpoint => endpoint.id === id) || null;
    }
    
    /**
     * Gets an endpoint by path and method
     * @param path - The endpoint path
     * @param method - The endpoint method
     * @returns The endpoint or null if not found
     */
    getEndpointByPathAndMethod(path: string | undefined, method: string | undefined): Endpoint | null {
        if (!path || !method) return null;
        
        return this.endpoints.find(
            endpoint => endpoint.path === path && endpoint.method === method
        ) || null;
    }
    
    /**
     * Searches for endpoints matching a query
     * @param query - The search query
     * @param options - Search options
     * @returns The matching endpoints
     */
    searchEndpoints(query: string, options: {
        fields?: string[];
        caseSensitive?: boolean;
        exactMatch?: boolean;
    } = {}): Endpoint[] {
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
                const value = this.getFieldValue(endpoint, field);
                
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
     * Helper method to safely get field value from an endpoint
     */
    private getFieldValue(endpoint: Endpoint, field: string): any {
        return (endpoint as any)[field];
    }
    
    /**
     * Adds a custom endpoint
     * @param endpoint - The endpoint to add
     * @returns The added endpoint
     */
    addCustomEndpoint(endpoint: Partial<Endpoint>): CustomEndpoint {
        // Validate required fields
        if (!endpoint.name) {
            throw new Error("Endpoint name is required");
        }
        
        if (!endpoint.url && !endpoint.path) {
            throw new Error("Either URL or path is required for the endpoint");
        }
        
        // Create endpoint object
        const customEndpoint: CustomEndpoint = {
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
        
        // Add to endpoints array
        this.endpoints.push(customEndpoint);
        
        // Add to categories - ensure we have a non-null category
        const category = customEndpoint.category || "Custom";
        
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        
        const categoryEndpoints = this.categories.get(category);
        if (categoryEndpoints) {
            categoryEndpoints.push(customEndpoint);
        }
        
        // Emit endpoint added event
        this.emit("endpoint:added", customEndpoint);
        
        return customEndpoint;
    }
    
    /**
     * Removes a custom endpoint
     * @param id - The endpoint ID
     * @returns Whether the endpoint was removed
     */
    removeCustomEndpoint(id: string): boolean {
        const endpoint = this.getEndpointById(id) as CustomEndpoint | null;
        
        if (!endpoint || !endpoint.isCustom) {
            return false;
        }
        
        // Remove from endpoints array
        this.endpoints = this.endpoints.filter(e => e.id !== id);
        
        // Remove from category - ensure we have a non-null category
        const category = endpoint.category || "Custom";
        
        if (this.categories.has(category)) {
            const categoryEndpoints = this.categories.get(category);
            if (categoryEndpoints) {
                this.categories.set(
                    category,
                    categoryEndpoints.filter(e => e.id !== id)
                );
                
                // Remove category if empty
                if (this.categories.get(category)?.length === 0) {
                    this.categories.delete(category);
                }
            }
        }
        
        // Emit event
        this.emit("endpoints:custom-removed", endpoint);
        
        return true;
    }
    
    /**
     * Checks whether endpoints are loaded
     * @returns Whether endpoints are loaded
     */
    isLoaded(): boolean {
        return this.loaded;
    }
    
    /**
     * Gets the number of loaded endpoints
     * @returns The number of endpoints
     */
    getEndpointCount(): number {
        return this.endpoints.length;
    }

    /**
     * Sets the dynamic endpoints path
     * @param path - The new path for dynamic endpoints
     */
    setDynamicEndpointsPath(path: string): void {
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
    getDynamicEndpointsPath(): string {
        return this.options.dynamicEndpointsPath || '';
    }
} 