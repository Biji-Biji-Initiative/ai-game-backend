import { ApiClient, ApiOptions, ApiResponse } from './interfaces/api-client';

// Define a typed structure for mock responses
type MockResponse<T = unknown> = {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

/**
 * Mock implementation of the API client
 * This client doesn't make real HTTP requests but returns mock data instead
 */
export class MockApiClient implements ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private mockResponses: Map<string, MockResponse> = new Map();

  constructor(options: ApiOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.headers = options.headers || {};
  }

  /**
   * Register a mock response for a specific endpoint
   */
  registerMock(endpoint: string, response: MockResponse): void {
    this.mockResponses.set(endpoint, response);
  }

  /**
   * Get the normalized endpoint URL for matching against mocks
   */
  private getNormalizedEndpoint(url: string, method: string = 'GET'): string {
    // Remove baseUrl from the start of the URL
    const endpoint = url.startsWith(this.baseUrl)
      ? url.substring(this.baseUrl.length)
      : url;
    
    return `${method}:${endpoint}`;
  }

  /**
   * Simulate a network delay to make the mock API feel more realistic
   */
  private async delay(ms: number = 200): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createErrorResponse<T>(message: string, code?: string, details?: unknown): ApiResponse<T> {
    return {
      data: null,
      error: {
        message,
        code,
        details
      },
      status: 500,
      ok: false
    };
  }

  private createSuccessResponse<T>(data: T): ApiResponse<T> {
    return {
      data,
      error: null,
      status: 200,
      ok: true
    };
  }

  private getMockResponse<T>(url: string, method: string): ApiResponse<T> {
    const normalizedEndpoint = this.getNormalizedEndpoint(url, method);
    const mockData = this.mockResponses.get(normalizedEndpoint);

    if (mockData === undefined) {
      console.warn(`No mock response registered for ${method} ${url}`);
      return this.createErrorResponse<T>(`No mock response registered for ${method} ${url}`, 'MOCK_NOT_FOUND');
    }

    if (mockData.error) {
      return this.createErrorResponse<T>(mockData.error.message, mockData.error.code, mockData.error.details);
    }

    // Type assertion is needed here since we know the data is of type T from the context
    return this.createSuccessResponse<T>(mockData.data as T);
  }

  async get<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    await this.delay();
    
    // Append query parameters to URL if provided
    let fullUrl = url;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    }
    
    return this.getMockResponse<T>(fullUrl, 'GET');
  }

  async post<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
    await this.delay();
    // Log data for debugging purposes
    if (data) {
      console.debug('POST data:', data);
    }
    return this.getMockResponse<T>(url, 'POST');
  }

  async put<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
    await this.delay();
    // Log data for debugging purposes
    if (data) {
      console.debug('PUT data:', data);
    }
    return this.getMockResponse<T>(url, 'PUT');
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    await this.delay();
    return this.getMockResponse<T>(url, 'DELETE');
  }
}
