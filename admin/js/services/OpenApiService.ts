import { NetworkService } from './NetworkService';
import { StorageService } from './StorageService';
import { LoggingService } from './LoggingService';

/**
 * Options for OpenApiService
 */
export interface OpenApiServiceOptions {
  networkService: NetworkService;
  storageService?: StorageService;
  loggingService?: LoggingService;
  apiClient?: unknown;
  specUrl?: string;
  cacheKey?: string;
}

/**
 * Service for working with OpenAPI specifications
 * Provides functionality for loading, caching, and validating against OpenAPI specifications
 */
export class OpenApiService {
  private networkService: NetworkService;
  private storageService: StorageService;
  private loggingService: LoggingService;
  private specUrl: string;
  private cacheKey: string;
  private spec: any = null;
  private isInitialized = false;

  /**
   * Create a new OpenApiService
   * @param options Service options
   */
  constructor(options: OpenApiServiceOptions) {
    this.networkService = options.networkService;
    this.storageService = options.storageService || ({} as StorageService);
    this.loggingService = options.loggingService || ({
      info: console.info,
      debug: console.debug,
      warn: console.warn,
      error: console.error
    } as LoggingService);
    this.specUrl = options.specUrl || '/openapi-spec.json';
    this.cacheKey = options.cacheKey || 'openapi_spec';

    this.loggingService.info('OpenApiService initialized');
  }

  /**
   * Initialize the service
   * @param forceRefresh Whether to force a refresh of the spec
   */
  public async initialize(forceRefresh = false): Promise<void> {
    if (this.isInitialized && !forceRefresh) {
      this.loggingService.debug('OpenApiService already initialized');
      return;
    }

    try {
      await this.loadSpec(forceRefresh);
      this.isInitialized = true;
      this.loggingService.info('OpenApiService initialized with spec');
    } catch (error) {
      this.loggingService.error('Failed to initialize OpenApiService', error);
      throw error;
    }
  }

  /**
   * Load the OpenAPI specification
   * @param forceRefresh Whether to force a refresh of the spec
   * @returns The loaded spec
   */
  public async loadSpec(forceRefresh = false): Promise<any> {
    try {
      // Try to load from cache first, unless forceRefresh is true
      if (!forceRefresh) {
        const cachedSpec = this.loadFromCache();
        if (cachedSpec) {
          this.spec = cachedSpec;
          this.loggingService.debug('Loaded OpenAPI spec from cache');
          return this.spec;
        }
      }

      // If not in cache or forceRefresh is true, load from network
      const response = await this.networkService.get(this.specUrl);
      if (!response.data) {
        throw new Error('No data received from OpenAPI spec endpoint');
      }

      this.spec = response.data;
      this.saveToCache(this.spec);
      this.loggingService.info('Loaded OpenAPI spec from network');
      return this.spec;
    } catch (error) {
      this.loggingService.error('Failed to load OpenAPI spec', error);
      throw error;
    }
  }

  /**
   * Get the loaded OpenAPI specification
   * @returns The loaded spec or null if not loaded
   */
  public getSpec(): any {
    return this.spec;
  }

  /**
   * Get all endpoint paths from the spec
   * @returns Array of endpoint paths
   */
  public getPaths(): string[] {
    if (!this.spec || !this.spec.paths) {
      return [];
    }

    return Object.keys(this.spec.paths);
  }

  /**
   * Get all endpoints from the spec
   * @returns Array of endpoint objects with path, method, and operation info
   */
  public getEndpoints(): any[] {
    if (!this.spec || !this.spec.paths) {
      return [];
    }

    const endpoints: any[] = [];
    const paths = this.spec.paths;

    Object.keys(paths).forEach(path => {
      const pathItem = paths[path];

      // Process each HTTP method (get, post, put, delete, etc.)
      Object.keys(pathItem).forEach(method => {
        // Skip properties that aren't HTTP methods
        if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          return;
        }

        const operation = pathItem[method];

        endpoints.push({
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId || `${method}${path}`,
          summary: operation.summary || '',
          description: operation.description || '',
          tags: operation.tags || [],
          parameters: operation.parameters || [],
          requestBody: operation.requestBody || null,
          responses: operation.responses || {},
        });
      });
    });

    return endpoints;
  }

  /**
   * Validate a request against the OpenAPI specification
   * @param path Endpoint path
   * @param method HTTP method
   * @param params Request parameters
   * @param body Request body
   * @returns Validation result
   */
  public validateRequest(
    path: string,
    method: string,
    params?: any,
    body?: any,
  ): {
    valid: boolean;
    errors?: any[];
  } {
    if (!this.spec || !this.spec.paths) {
      return { valid: false, errors: [{ message: 'OpenAPI spec not loaded' }] };
    }

    try {
      // Get path from spec
      const pathObject = this.spec.paths[path];
      if (!pathObject) {
        return {
          valid: false,
          errors: [{ message: `Path "${path}" not found in OpenAPI spec` }],
        };
      }

      // Get method from path
      const methodLower = method.toLowerCase();
      const methodObject = pathObject[methodLower];
      if (!methodObject) {
        return {
          valid: false,
          errors: [{ message: `Method "${method}" not allowed for path "${path}"` }],
        };
      }

      // Currently this is a simple check - for full validation we would need a JSON Schema validator
      // For basic parameters check
      const errors: any[] = [];

      // Validate parameters if provided
      if (params && methodObject.parameters) {
        for (const param of methodObject.parameters) {
          if (param.required && !params[param.name]) {
            errors.push({
              type: 'parameter',
              message: `Required parameter "${param.name}" is missing`,
              name: param.name,
            });
          }
        }
      }

      // Validate request body if required
      if (methodObject.requestBody && methodObject.requestBody.required && !body) {
        errors.push({
          type: 'body',
          message: 'Request body is required but not provided',
        });
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.loggingService.error('Error validating request against OpenAPI spec', error);
      return {
        valid: false,
        errors: [{ message: 'Error validating request', details: error }],
      };
    }
  }

  /**
   * Load the spec from cache
   * @returns Cached spec or null if not found
   */
  private loadFromCache(): any {
    try {
      const cachedData = this.storageService.get<string>(this.cacheKey);
      if (!cachedData) {
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      this.loggingService.warn('Failed to load OpenAPI spec from cache', error);
      return null;
    }
  }

  /**
   * Save the spec to cache
   * @param spec The spec to cache
   */
  private saveToCache(spec: any): void {
    try {
      this.storageService.set(this.cacheKey, JSON.stringify(spec));
      this.loggingService.debug('Saved OpenAPI spec to cache');
    } catch (error) {
      this.loggingService.warn('Failed to save OpenAPI spec to cache', error);
    }
  }

  /**
   * Get a schema by reference
   * @param ref Schema reference (e.g. #/components/schemas/User)
   * @returns The schema or null if not found
   */
  public getSchemaByRef(ref: string): any {
    if (!this.spec) {
      return null;
    }

    try {
      // Remove the #/ prefix
      const path = ref.startsWith('#/') ? ref.substring(2) : ref;

      // Split into components
      const components = path.split('/');

      // Traverse the spec object
      let current = this.spec;
      for (const component of components) {
        if (!current[component]) {
          return null;
        }
        current = current[component];
      }

      return current;
    } catch (error) {
      this.loggingService.error(`Error getting schema by ref ${ref}`, error);
      return null;
    }
  }
}
