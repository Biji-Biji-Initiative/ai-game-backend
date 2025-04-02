// Types improved by ts-improve-types
/**
 * Endpoint Parameter Schema
 */
export interface EndpointParameter {
  name: string;
  in?: string;
  type?: string;
  description?: string;
  required?: boolean;
  example?: unknown;
  format?: string;
  schema?: {
    type: string;
    format?: string;
    example?: unknown;
  };
}

/**
 * Request Body Schema
 */
export interface RequestBody {
  name?: string;
  required?: boolean;
  content?: {
    [key: string]: {
      schema?: {
        type: string;
        properties?: {
          [key: string]: {
            type: string;
            example?: unknown;
            items?: unknown;
          };
        };
        required?: string[];
      };
      example?: unknown;
    };
  };
}

/**
 * Endpoint Definition
 */
export interface Endpoint {
  name: string;
  method: string;
  path: string;
  description?: string;
  category: string;
  parameters?: EndpointParameter[];
  requestBody?: RequestBody;
  responseExample?: unknown;
}

/**
 * Endpoints Collection
 */
export interface EndpointsCollection {
  endpoints: Endpoint[];
}

/**
 * Bundled Endpoints Module
 */
export interface BundledEndpointsModule {
  bundledEndpoints: EndpointsCollection;
}
