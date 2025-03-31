import { ApiEndpoint, ApiMethod, TestHistory } from '../types/api';

// Load endpoints from endpoints.json
export const loadEndpoints = async (): Promise<ApiEndpoint[]> => {
  try {
    const response = await fetch('/data/endpoints.json');
    if (!response.ok) {
      throw new Error('Failed to load endpoints');
    }
    const data = await response.json();
    return data.endpoints || [];
  } catch (error) {
    console.error('Error loading endpoints:', error);
    return [];
  }
};

// Group endpoints by category
export const groupEndpointsByCategory = (
  endpoints: ApiEndpoint[]
): Record<string, ApiEndpoint[]> => {
  return endpoints.reduce((grouped, endpoint) => {
    const category = endpoint.category || 'Uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(endpoint);
    return grouped;
  }, {} as Record<string, ApiEndpoint[]>);
};

// Format response time
export const formatResponseTime = (timeMs: number): string => {
  if (timeMs < 1000) {
    return `${timeMs.toFixed(0)}ms`;
  }
  return `${(timeMs / 1000).toFixed(2)}s`;
};

// Local storage key for test history
const TEST_HISTORY_STORAGE_KEY = 'api_test_history';

// Save test history to local storage
export const saveTestHistory = (history: TestHistory): void => {
  try {
    const existingHistory = getTestHistory();
    const updatedHistory = [history, ...existingHistory].slice(0, 50); // Keep only the last 50 tests
    localStorage.setItem(TEST_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving test history:', error);
  }
};

// Get test history from local storage
export const getTestHistory = (): TestHistory[] => {
  try {
    const history = localStorage.getItem(TEST_HISTORY_STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting test history:', error);
    return [];
  }
};

// Clear test history
export const clearTestHistory = (): void => {
  localStorage.removeItem(TEST_HISTORY_STORAGE_KEY);
};

// Create formatted example request body
export const createExampleRequestBody = (endpoint: ApiEndpoint): string => {
  if (!endpoint.requestBody?.content?.['application/json']?.schema) {
    return '{}';
  }

  const schema = endpoint.requestBody.content['application/json'].schema;

  // If there's an example in the schema, use it
  if (schema.example) {
    return JSON.stringify(schema.example, null, 2);
  }

  // Otherwise build from properties
  if (schema.properties) {
    const example: Record<string, any> = {};

    Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
      if (prop.example) {
        example[key] = prop.example;
      } else if (prop.type === 'string') {
        example[key] = '';
      } else if (prop.type === 'number') {
        example[key] = 0;
      } else if (prop.type === 'boolean') {
        example[key] = false;
      } else if (prop.type === 'object') {
        example[key] = {};
      } else if (prop.type === 'array') {
        example[key] = [];
      }
    });

    return JSON.stringify(example, null, 2);
  }

  return '{}';
};

export interface Endpoint {
  path: string;
  method: string;
  description: string;
}

export interface ApiResponse<T = any> {
  data: T | null;
  status: number;
  statusText: string;
  responseTime: number;
  error?: string;
  headers: Record<string, string>;
}

export interface PathParam {
  name: string;
  value: string;
}

export interface QueryParam {
  name: string;
  value: string;
}

/**
 * Fetches the list of API endpoints from the endpoints.json file
 */
export const fetchEndpoints = async (): Promise<Endpoint[]> => {
  try {
    const response = await fetch('/data/endpoints.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch endpoints: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    throw error;
  }
};

/**
 * Builds a URL with path parameters and query parameters
 * @param path Base path with parameter placeholders
 * @param pathParams Path parameters to replace in the URL
 * @param queryParams Query parameters to add to the URL
 */
export const buildUrl = (
  path: string,
  pathParams: PathParam[] = [],
  queryParams: QueryParam[] = []
): string => {
  // Replace path parameters
  let url = path;
  pathParams.forEach(param => {
    url = url.replace(`{${param.name}}`, encodeURIComponent(param.value));
  });

  // Add query parameters
  if (queryParams.length > 0) {
    const validQueryParams = queryParams.filter(param => param.name.trim() !== '');
    if (validQueryParams.length > 0) {
      const queryString = validQueryParams
        .map(param => `${encodeURIComponent(param.name)}=${encodeURIComponent(param.value)}`)
        .join('&');
      url += `?${queryString}`;
    }
  }

  return url;
};

/**
 * Makes an API request to the specified endpoint
 * @param path The API endpoint path
 * @param method The HTTP method to use
 * @param pathParams Path parameters to include in the URL
 * @param queryParams Query parameters to include in the URL
 * @param data Optional request body for POST/PUT/PATCH requests
 */
export const callApi = async <T = any>(
  path: string,
  method: string = 'GET',
  pathParams: PathParam[] = [],
  queryParams: QueryParam[] = [],
  data?: any
): Promise<ApiResponse<T>> => {
  const startTime = performance.now();

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
  };

  // Add body for non-GET requests if data is provided
  if (['POST', 'PUT', 'PATCH'].includes(method) && data) {
    options.body = JSON.stringify(data);
  }

  // Build the URL with path and query parameters
  const url = buildUrl(path, pathParams, queryParams);

  try {
    // Use the Vite proxy to forward requests to the API server
    const apiPath = `/api${url.startsWith('/') ? url : `/${url}`}`;
    const response = await fetch(apiPath, options);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    // Extract headers into a plain object
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Handle different response content types
    let data = null;
    const contentType = response.headers.get('content-type');

    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType && contentType.includes('text/')) {
        data = await response.text();
      } else {
        // For binary data or other types, just get text
        data = await response.text();
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      data = await response.text();
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      headers,
      error: !response.ok ? `${response.status} ${response.statusText}` : undefined
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    console.error(`API Request Error (${method} ${path}):`, error);
    return {
      data: null,
      status: 0,
      statusText: 'Network Error',
      responseTime,
      headers: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * @deprecated Use callApi instead
 */
export const getApiData = async (
  path: string,
  method: string = 'GET',
  data?: any
): Promise<any> => {
  const response = await callApi(path, method, [], [], data);

  if (response.error) {
    throw new Error(response.error);
  }

  return response.data;
};
