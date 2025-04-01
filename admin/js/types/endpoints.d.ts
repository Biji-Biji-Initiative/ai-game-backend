/**
 * Endpoint Parameter Schema
 */
export interface EndpointParameter {
  name: string;
  in?: string;
  type?: string;
  description?: string;
  required?: boolean;
  example?: any;
  format?: string;
  schema?: {
    type: string;
    format?: string;
    example?: any;
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
            example?: any;
            items?: any;
          };
        };
        required?: string[];
      };
      example?: any;
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
  responseExample?: any;
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