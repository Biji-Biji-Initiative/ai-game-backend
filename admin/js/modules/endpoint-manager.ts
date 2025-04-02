// Types improved by ts-improve-types
/**
 * Endpoint Manager Module
 * Handles loading and managing API endpoints
 */
import { logger } from '../utils/logger';
import { APIClient } from '../api/api-client';

/**
 * Options for initializing the EndpointManager
 */
export interface EndpointManagerOptions {
  /** API client for making requests */
  apiClient: any;
  /** Optional storage service */
  storageService?: any;
  /** Optional event bus */
  eventBus?: any;
  /** Whether to use local endpoints */
  useLocalEndpoints?: boolean;
  /** Whether to support multiple formats */
  supportMultipleFormats?: boolean;
  /** Maximum number of retries for failed requests */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Path to endpoints file */
  endpointsFilePath?: string;
  /** Path to dynamic endpoints */
  dynamicEndpointsPath?: string;
  /** Whether to use dynamic endpoints */
  useDynamicEndpoints?: boolean;
  /** Whether to use storage */
  useStorage?: boolean;
  /** URL for endpoints API */
  endpointsUrl?: string;
  /** Config manager - can be either Record<string, unknown> or ConfigManager */
  config?: any; 
}

// Export EndpointParameter
export interface EndpointParameter {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  location: 'query' | 'path' | 'header' | 'body' | 'cookie';
  schema?: unknown; // any -> unknown
  example?: unknown; // any -> unknown
}

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
  requestBody?: unknown; // any -> unknown
  responseExample?: unknown; // any -> unknown
  requiresAuth?: boolean;
  tags?: string[];
  isCustom?: boolean;
}

// Extend the Endpoint interface to include isCustom property for custom endpoints
interface CustomEndpoint extends Endpoint {
  isCustom: boolean;
}

// Export EndpointManager class
export class EndpointManager {
  private options: EndpointManagerOptions;
  private endpoints: Map<string, Endpoint>;
  private categories: Map<string, string[]>;
  private listeners: Map<string, Array<(data?: unknown) => void>>;
  private loaded: boolean;
  private retryCount: number;
  private bundledEndpoints: Endpoint[] | Record<string, unknown> | null;
  private config: Record<string, unknown> | null;
  private apiClient: APIClient | null; // Use APIClient type, allow null

  /**
   * Creates a new EndpointManager instance
   * @param options - Configuration options
   */
  constructor(options: EndpointManagerOptions) {
    this.options = {
      apiClient: null,
      config: null,
      maxRetries: 3,
      retryDelay: 2000, // milliseconds
      useLocalEndpoints: true, // Whether to fallback to bundled endpoints if fetch fails
      supportMultipleFormats: true, // Whether to support multiple endpoint formats
      endpointsFilePath: 'data/endpoints.json', // Standardized path for endpoints
      dynamicEndpointsPath: '/api/v1/api-tester/endpoints', // Dynamic endpoints from backend
      useDynamicEndpoints: true, // Whether to use dynamic endpoints from backend
      useStorage: true,
      endpointsUrl: '/api/endpoints',
      ...options,
    };

    this.endpoints = new Map();
    this.categories = new Map();
    this.listeners = new Map();
    this.loaded = false;
    this.retryCount = 0;
    this.bundledEndpoints = null;
    this.config = this.options.config;
    this.apiClient =
      this.options.apiClient && typeof (this.options.apiClient as any).makeRequest === 'function'
        ? (this.options.apiClient as APIClient)
        : null;

    if (this.options.useStorage) {
      this.loadEndpointsFromStorage();
    }
  }

  /**
   * Adds an event listener
   * @param event - The event name
   * @param callback - The callback function
   */
  addEventListener(event: string, callback: (data?: unknown) => void): void {
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
  removeEventListener(event: string, callback: (data?: unknown) => void): void {
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
  emit(event: string, data: unknown = null): void {
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
  setBundledEndpoints(endpoints: Endpoint[] | Record<string, unknown>): void {
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
        console.debug('Failed to load dynamic endpoints:', error);
        console.debug('Falling back to static endpoints');
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
      this.emit('endpoints:loading', { path: dynamicEndpointsPath, type: 'dynamic' });
      if (!dynamicEndpointsPath) {
        throw new Error('Dynamic path not defined');
      }

      let data: unknown;
      if (this.apiClient) {
        // Use makeRequest
        data = await this.apiClient.makeRequest('GET', dynamicEndpointsPath);
      } else {
        logger.warn('APIClient not available for dynamic endpoints, using global fetch.');
        const response = await fetch(dynamicEndpointsPath);
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status}`);
        }
        data = await response.json();
      }

      this.processEndpoints(data as unknown[] | Record<string, unknown>);
      this.loaded = true;
      this.retryCount = 0;
      this.emit('endpoints:loaded', {
        endpoints: Array.from(this.endpoints.values()),
        categories: Array.from(this.categories.entries()),
        source: 'dynamic',
      });
      return Array.from(this.endpoints.values());
    } catch (error) {
      logger.error('Error loading dynamic endpoints:', error);
      this.emit('endpoints:error', {
        error,
        message: error instanceof Error ? error.message : String(error),
        source: 'dynamic',
      });
      // Ensure a return or throw in catch block if fallback occurs
      if (this.options.useLocalEndpoints && this.bundledEndpoints) {
        logger.info('Falling back to bundled endpoints after dynamic fetch error.');
        this.processEndpoints(this.bundledEndpoints);
        this.loaded = true;
        this.emit('endpoints:loaded', {
          endpoints: Array.from(this.endpoints.values()),
          categories: Array.from(this.categories.entries()),
          source: 'fallback',
        });
        return Array.from(this.endpoints.values());
      }
      throw error; // Rethrow if no fallback
    }
  }

  /**
   * Loads endpoints from the static JSON file
   * @returns The loaded endpoints
   */
  async loadStaticEndpoints(): Promise<Endpoint[]> {
    const endpointsFilePath = this.options.endpointsFilePath;
    try {
      this.emit('endpoints:loading', { path: endpointsFilePath, type: 'static' });
      if (!endpointsFilePath) {
        throw new Error('Static path not defined');
      }

      // Use global fetch for static files
      const response = await fetch(endpointsFilePath);
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }
      const data = await response.json();

      this.processEndpoints(data as unknown[] | Record<string, unknown>);
      // ... rest of method ...
    } catch (error) {
      console.error('Error loading static endpoints:', error);

      // Try to retry the request
      if (this.retryCount < (this.options.maxRetries || 0)) {
        this.retryCount++;

        // Emit retry event
        this.emit('endpoints:retry', {
          error,
          retryCount: this.retryCount,
          maxRetries: this.options.maxRetries,
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay || 2000));

        // Retry
        return this.loadStaticEndpoints();
      }

      // If we've reached max retries and have bundled endpoints, use them
      if (this.options.useLocalEndpoints && this.bundledEndpoints) {
        console.debug('Using bundled endpoints as fallback');

        // Process bundled endpoints
        this.processEndpoints(this.bundledEndpoints);

        // Mark as loaded
        this.loaded = true;

        // Emit loaded event (but indicate it's from fallback)
        this.emit('endpoints:loaded', {
          endpoints: Array.from(this.endpoints.values()),
          categories: Array.from(this.categories.entries()),
          source: 'fallback',
        });

        return Array.from(this.endpoints.values());
      }

      // Emit error event
      this.emit('endpoints:error', {
        error,
        message: error instanceof Error ? error.message : String(error),
        source: 'static',
      });

      throw error;
    }
  }

  /**
   * Processes the loaded endpoints data
   * @param data - The loaded endpoints data
   */
  processEndpoints(data: unknown[] | Record<string, unknown>): void {
    // Reset endpoints and categories
    this.endpoints = new Map();
    this.categories.clear();

    // Support multiple endpoint formats
    if (this.options.supportMultipleFormats) {
      if (Array.isArray(data)) {
        // Format 1: Plain array of endpoints
        this.processEndpointsArray(data);
      } else if (
        data &&
        typeof data === 'object' &&
        'endpoints' in data &&
        Array.isArray(data.endpoints)
      ) {
        // Format 2: Object with endpoints array
        this.processEndpointsArray(data.endpoints);
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Format 3: Object with categories as keys and arrays as values
        this.processEndpointsObject(data as Record<string, unknown>);
      } else {
        throw new Error('Invalid endpoints data format - could not detect format');
      }
    } else {
      // Strict format check
      if (
        !data ||
        typeof data !== 'object' ||
        !('endpoints' in data) ||
        !Array.isArray(data.endpoints)
      ) {
        throw new Error('Invalid endpoints data format - expected {endpoints: [...]}');
      }

      this.processEndpointsArray(data.endpoints);
    }
  }

  /**
   * Processes an array of endpoints
   * @param endpoints - The array of endpoints
   */
  processEndpointsArray(endpoints: unknown[]): void {
    if (!Array.isArray(endpoints)) {
      throw new Error('Expected endpoints to be an array');
    }

    // Process each endpoint
    endpoints.forEach((endpoint: unknown, index: number) => {
      // Validate endpoint
      if (!endpoint || typeof endpoint !== 'object') {
        console.warn('Skipping invalid endpoint at index', index, endpoint);
        return;
      }

      // Determine path and name - bare minimum required
      const ep = endpoint as Record<string, any>; // Assert to access properties, still risky
      const path = ep.path || ep.url || ep.endpoint;
      const name = ep.name || ep.title || ep.label || path;

      if (!path) {
        console.warn('Skipping endpoint without path:', endpoint);
        return;
      }

      // Add default values if missing
      const processedEndpoint: Endpoint = {
        id: ep.id || `endpoint-${this.endpoints.size + 1}`,
        method: ep.method || 'GET',
        path: path,
        name: name,
        description: ep.description || '',
        category: ep.category || ep.group || 'Uncategorized',
        parameters: ep.parameters || ep.params || [],
        headers: ep.headers || {},
        requestBody: ep.requestBody || ep.body || null,
        responseExample: ep.responseExample || ep.example || null,
        requiresAuth: ep.requiresAuth || ep.authenticated || false,
        tags: ep.tags || [],
        url: ep.url || '',
        isCustom: ep.isCustom || false,
      };

      // Add to endpoints array
      this.endpoints.set(processedEndpoint.id, processedEndpoint);

      // Add to categories - ensure we have a non-null category
      const category = processedEndpoint.category || 'Uncategorized';

      if (!this.categories.has(category)) {
        this.categories.set(category, []);
      }

      const categoryEndpoints = this.categories.get(category);
      if (categoryEndpoints) {
        categoryEndpoints.push(processedEndpoint.id);
      }
    });
  }

  /**
   * Processes an object with categories
   * @param data - The endpoints object
   */
  processEndpointsObject(data: Record<string, unknown>): void {
    // Remove endpoints key which might contain an array that we already processed
    const dataWithoutEndpoints = { ...data };
    delete dataWithoutEndpoints.endpoints;

    // Process each category
    Object.entries(dataWithoutEndpoints).forEach(([category, endpoints]) => {
      if (!Array.isArray(endpoints)) {
        console.warn(
          `Skipping invalid category ${category}: expected array but got`,
          typeof endpoints,
        );
        return;
      }

      // Create category if it doesn't exist
      if (!this.categories.has(category)) {
        this.categories.set(category, []);
      }

      // Process endpoints in this category
      endpoints.forEach((endpoint: unknown, index: number) => {
        // Validate endpoint
        if (!endpoint || typeof endpoint !== 'object') {
          console.warn(
            `Skipping invalid endpoint in category ${category} at index`,
            index,
            endpoint,
          );
          return;
        }

        // Add type guards before accessing endpoint properties
        const ep = endpoint as Record<string, any>; // Assert to access properties
        ep.category = category;

        // Determine path and name
        const path = ep.path || ep.url || ep.endpoint;
        const name = ep.name || ep.title || ep.label || path;

        if (!path) {
          console.warn(`Skipping endpoint without path in category ${category}:`, ep);
          return;
        }

        // Add default values if missing
        const processedEndpoint: Endpoint = {
          id: ep.id || `endpoint-${this.endpoints.size + 1}`,
          method: ep.method || 'GET',
          path: path,
          name: name,
          description: ep.description || '',
          category: category,
          parameters: ep.parameters || ep.params || [],
          headers: ep.headers || {},
          requestBody: ep.requestBody || ep.body || null,
          responseExample: ep.responseExample || ep.example || null,
          requiresAuth: ep.requiresAuth || ep.authenticated || false,
          tags: ep.tags || [],
          url: ep.url || '',
          isCustom: ep.isCustom || false,
        };

        // Add to endpoints array
        this.endpoints.set(processedEndpoint.id, processedEndpoint);

        // Add to category
        const categoryEndpoints = this.categories.get(category);
        if (categoryEndpoints) {
          categoryEndpoints.push(processedEndpoint.id);
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
    this.emit('endpoints:refreshing', {});

    // Load endpoints
    try {
      const endpoints = await this.loadEndpoints();

      // Emit refreshed event
      this.emit('endpoints:refreshed', {
        endpoints: Array.from(this.endpoints.values()),
        categories: Array.from(this.categories.entries()),
      });

      return endpoints;
    } catch (error) {
      // Emit error event
      this.emit('endpoints:refresh-error', {
        error,
        message: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Gets all loaded endpoints
   * @returns The loaded endpoints
   */
  getEndpoints(): Endpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Gets endpoints by category
   * @param category - The category name
   * @returns The endpoints in the category
   */
  getEndpointsByCategory(category: string): Endpoint[] {
    const categoryEndpoints = this.categories.get(category);
    if (categoryEndpoints) {
      return categoryEndpoints.map(id => this.endpoints.get(id) as Endpoint);
    }
    return [];
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
    return this.endpoints.get(id) || null;
  }

  /**
   * Gets an endpoint by path and method
   * @param path - The endpoint path
   * @param method - The endpoint method
   * @returns The endpoint or null if not found
   */
  getEndpointByPathAndMethod(path: string, method: string): Endpoint | null {
    if (!path || !method) return null;

    return (
      this.endpoints
        .values()
        .find(endpoint => endpoint.path === path && endpoint.method === method) || null
    );
  }

  /**
   * Searches for endpoints matching a query
   * @param query - The search query
   * @param options - Search options
   * @returns The matching endpoints
   */
  searchEndpoints(
    query: string,
    options: {
      fields?: string[];
      caseSensitive?: boolean;
      exactMatch?: boolean;
    } = {},
  ): Endpoint[] {
    const searchOptions = {
      fields: ['name', 'path', 'description', 'category', 'tags'],
      caseSensitive: false,
      exactMatch: false,
      ...options,
    };

    if (!query) {
      return this.getEndpoints();
    }

    const normalizedQuery = searchOptions.caseSensitive ? query : query.toLowerCase();

    return Array.from(this.endpoints.values()).filter(endpoint => {
      // Check each field
      for (const field of searchOptions.fields) {
        const value = this.getFieldValue(endpoint, field as keyof Endpoint);

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

            if (
              searchOptions.exactMatch
                ? normalizedItem === normalizedQuery
                : normalizedItem.includes(normalizedQuery)
            ) {
              return true;
            }
          }
        } else {
          // Handle strings and other values
          const normalizedValue = searchOptions.caseSensitive
            ? String(value)
            : String(value).toLowerCase();

          if (
            searchOptions.exactMatch
              ? normalizedValue === normalizedQuery
              : normalizedValue.includes(normalizedQuery)
          ) {
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
  private getFieldValue(
    endpoint: Endpoint,
    field: keyof Endpoint,
  ): Endpoint[keyof Endpoint] | undefined {
    return endpoint[field];
  }

  /**
   * Adds a custom endpoint
   * @param endpoint - The endpoint to add
   * @returns The added endpoint
   */
  addCustomEndpoint(endpoint: Partial<Endpoint>): CustomEndpoint {
    const name = typeof endpoint.name === 'string' ? endpoint.name : 'Unnamed Custom Endpoint';
    const pathOrUrl = endpoint.path ?? endpoint.url;
    const path = typeof pathOrUrl === 'string' ? pathOrUrl : '';
    const url = typeof endpoint.url === 'string' ? endpoint.url : path;
    if (!path) {
      throw new Error('Endpoint path/url is required');
    }

    const customEndpoint: CustomEndpoint = {
      id: typeof endpoint.id === 'string' ? endpoint.id : `custom-endpoint-${Date.now()}`,
      method: typeof endpoint.method === 'string' ? endpoint.method : 'GET',
      name: name,
      url: url,
      path: path,
      description: typeof endpoint.description === 'string' ? endpoint.description : '',
      category: typeof endpoint.category === 'string' ? endpoint.category : 'Custom',
      // Assert type after Array.isArray check
      parameters: Array.isArray(endpoint.parameters)
        ? (endpoint.parameters as EndpointParameter[])
        : [],
      // Assert type after object check
      headers:
        typeof endpoint.headers === 'object' &&
        endpoint.headers !== null &&
        !Array.isArray(endpoint.headers)
          ? (endpoint.headers as Record<string, string>)
          : {},
      requestBody: endpoint.requestBody ?? null,
      responseExample: endpoint.responseExample ?? null,
      requiresAuth: !!endpoint.requiresAuth,
      // Assert type after Array.isArray check and filter for strings
      tags: Array.isArray(endpoint.tags)
        ? endpoint.tags.filter((t): t is string => typeof t === 'string')
        : [],
      isCustom: true,
    };

    // Add to endpoints array
    this.endpoints.set(customEndpoint.id, customEndpoint);

    // Add to categories - ensure we have a non-null category
    const category = customEndpoint.category || 'Custom';

    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }

    const categoryEndpoints = this.categories.get(category);
    if (categoryEndpoints) {
      categoryEndpoints.push(customEndpoint.id);
    }

    // Emit endpoint added event
    this.emit('endpoint:added', customEndpoint);

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
    this.endpoints.delete(id);

    // Remove from category - ensure we have a non-null category
    const category = endpoint.category || 'Custom';

    if (this.categories.has(category)) {
      const categoryEndpoints = this.categories.get(category);
      if (categoryEndpoints) {
        this.categories.set(
          category,
          categoryEndpoints.filter(id => id !== id),
        );

        // Remove category if empty
        if (this.categories.get(category)?.length === 0) {
          this.categories.delete(category);
        }
      }
    }

    // Emit event
    this.emit('endpoints:custom-removed', endpoint);

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
    return this.endpoints.size;
  }

  /**
   * Sets the dynamic endpoints path
   * @param path - The new path for dynamic endpoints
   */
  setDynamicEndpointsPath(path: string): void {
    if (!path) {
      throw new Error('Dynamic endpoints path cannot be empty');
    }

    this.options.dynamicEndpointsPath = path;
    this.emit('endpoints:config-changed', {
      property: 'dynamicEndpointsPath',
      value: path,
    });
  }

  /**
   * Gets the current dynamic endpoints path
   * @returns The current dynamic endpoints path
   */
  getDynamicEndpointsPath(): string {
    return this.options.dynamicEndpointsPath || '';
  }

  /**
   * Fetches endpoints from API
   * @returns true if successful, false otherwise
   */
  private async fetchEndpointsFromApi(): Promise<boolean> {
    try {
      logger.debug('Fetching endpoints from API...');

      // Get API URL from config or use default
      const endpointsUrl = this.options.dynamicEndpointsPath;

      if (!this.apiClient) {
        logger.error('API client not available');
        return false;
      }

      // Make API request
      const response = await this.apiClient.fetch(endpointsUrl);

      // Process response
      const endpoints = this.processEndpointsResponse(response.data);

      if (!endpoints || !Array.isArray(endpoints)) {
        logger.error('Invalid endpoints data', endpoints);
        return false;
      }

      this.endpoints = new Map(endpoints.map(endpoint => [endpoint.id, endpoint]));
      this.saveEndpointsToStorage();

      logger.info(`Loaded ${endpoints.length} endpoints from API`);
      return true;
    } catch (error) {
      logger.error('Error loading dynamic endpoints:', error);
      return false;
    }
  }

  /**
   * Processes endpoints response data
   * @param data - Endpoints data from API
   * @returns Processed endpoints
   */
  private processEndpointsResponse(data: any[] | Record<string, unknown>): Endpoint[] {
    // Process endpoints from API response
    this.processEndpoints(data);

    // Return endpoints as array
    return Array.from(this.endpoints.values());
  }

  /**
   * Save endpoints to local storage
   */
  private saveEndpointsToStorage(): void {
    try {
      localStorage.setItem('api_admin_endpoints', JSON.stringify(this.endpoints));
      logger.debug(`Saved ${this.endpoints.size} endpoints to local storage`);
    } catch (error) {
      logger.error('Failed to save endpoints to local storage:', error);
    }
  }

  /**
   * Normalize an endpoint object to ensure it has all required properties
   * @param endpoint - The endpoint object to normalize
   * @returns The normalized endpoint
   */
  private normalizeEndpoint(endpoint: Record<string, unknown>): Endpoint {
    // Ensure required properties exist
    const normalizedEndpoint: Endpoint = {
      id: endpoint.id || this.generateId(),
      name: endpoint.name || endpoint.path || endpoint.url || 'Unnamed Endpoint',
      url: endpoint.url || endpoint.path || '',
      method: endpoint.method || 'GET',
      description: endpoint.description || '',
      category: endpoint.category || endpoint.group || 'Uncategorized',
      parameters: Array.isArray(endpoint.parameters) ? endpoint.parameters : [],
      headers: endpoint.headers || {},
      tags: Array.isArray(endpoint.tags) ? endpoint.tags : [],
    };

    // Optional properties
    if (endpoint.requestBody !== undefined) {
      normalizedEndpoint.requestBody = endpoint.requestBody;
    }

    if (endpoint.responseExample !== undefined) {
      normalizedEndpoint.responseExample = endpoint.responseExample;
    }

    if (endpoint.requiresAuth !== undefined) {
      normalizedEndpoint.requiresAuth = !!endpoint.requiresAuth;
    }

    if (endpoint.isCustom !== undefined) {
      normalizedEndpoint.isCustom = !!endpoint.isCustom;
    }

    return normalizedEndpoint;
  }

  /**
   * Generate a unique ID
   * @returns A unique ID string
   */
  private generateId(): string {
    return `endpoint_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Loads endpoints from storage
   * @private
   */
  private loadEndpointsFromStorage(): void {
    // Implementation to load from storage...
  }
}
