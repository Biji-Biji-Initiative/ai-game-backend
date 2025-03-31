import { ApiEndpoint, ApiParameter, ApiRequestBody } from '../types/api';

export interface OpenApiSchema {
  paths: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, any>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

export class OpenApiService {
  private static instance: OpenApiService;
  private schema: OpenApiSchema | null = null;

  private constructor() {}

  public static getInstance(): OpenApiService {
    if (!OpenApiService.instance) {
      OpenApiService.instance = new OpenApiService();
    }
    return OpenApiService.instance;
  }

  /**
   * Fetch the OpenAPI schema from the server
   */
  public async fetchSchema(url: string): Promise<OpenApiSchema> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenAPI schema: ${response.statusText}`);
      }

      const schema = await response.json() as OpenApiSchema;
      this.schema = schema;
      return schema;
    } catch (error) {
      console.error('Error fetching OpenAPI schema:', error);
      throw error;
    }
  }

  /**
   * Convert OpenAPI schema to our internal ApiEndpoint format
   */
  public convertSchemaToEndpoints(): ApiEndpoint[] {
    if (!this.schema) {
      return [];
    }

    const endpoints: ApiEndpoint[] = [];

    // Process each path and method in the schema
    Object.entries(this.schema.paths).forEach(([path, pathItem]) => {
      Object.entries(pathItem).forEach(([method, operation]) => {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          // Get the first tag as category, or 'Other' if no tags
          const category = operation.tags && operation.tags.length > 0
            ? operation.tags[0]
            : 'Other';

          // Convert parameters
          const parameters: ApiParameter[] = Array.isArray(operation.parameters)
            ? operation.parameters.map((param: any) => this.convertParameter(param))
            : [];

          // Create ApiEndpoint object
          const endpoint: ApiEndpoint = {
            name: operation.summary || path,
            method: method.toUpperCase() as any,
            path,
            description: operation.description || '',
            category,
            parameters,
            responseExample: operation.responses?.['200']?.content?.['application/json']?.example || null
          };

          // Add request body if present
          if (operation.requestBody) {
            endpoint.requestBody = this.convertRequestBody(operation.requestBody);
          }

          endpoints.push(endpoint);
        }
      });
    });

    return endpoints;
  }

  /**
   * Get all unique categories/tags from the schema
   */
  public getCategories(): string[] {
    if (!this.schema || !this.schema.tags) {
      return [];
    }

    return this.schema.tags.map(tag => tag.name);
  }

  /**
   * Convert OpenAPI parameter to our ApiParameter format
   */
  private convertParameter(param: any): ApiParameter {
    return {
      name: param.name,
      required: !!param.required,
      description: param.description || '',
      schema: param.schema || { type: 'string' }
    };
  }

  /**
   * Convert OpenAPI requestBody to our ApiRequestBody format
   */
  private convertRequestBody(requestBody: any): ApiRequestBody {
    const contentType = Object.keys(requestBody.content || {})[0] || 'application/json';
    const schema = requestBody.content?.[contentType]?.schema || { type: 'object', properties: {} };

    return {
      name: 'body',
      required: !!requestBody.required,
      content: {
        'application/json': {
          schema
        }
      }
    };
  }

  /**
   * Get example value based on schema type
   */
  public static getExampleValue(schema: any): any {
    if (!schema) return '';

    switch (schema.type) {
      case 'string':
        return schema.example || schema.default || '';
      case 'number':
      case 'integer':
        return schema.example || schema.default || 0;
      case 'boolean':
        return schema.example || schema.default || false;
      case 'array':
        return schema.example || schema.items
          ? [OpenApiService.getExampleValue(schema.items)]
          : [];
      case 'object':
        if (schema.example) return schema.example;

        const result: Record<string, any> = {};
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
            result[key] = OpenApiService.getExampleValue(prop);
          });
        }
        return result;
      default:
        return schema.example || schema.default || '';
    }
  }
}
