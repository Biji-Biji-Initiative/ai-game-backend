import { useState } from 'react';
import { ApiEndpoint } from '../types/api';

interface PathParam {
  name: string;
  value: string;
}

interface QueryParam {
  name: string;
  value: string;
}

interface ApiError extends Error {
  status?: number;
  details?: any;
}

interface TestHistoryResult {
  success: boolean;
  data?: any;
  error?: ApiError;
  responseTime: number;
  timestamp: number;
}

interface TestHistory {
  endpoint: string;
  method: string;
  requestBody?: any;
  headers?: Record<string, string>;
  result: TestHistoryResult;
}

interface UseApiRequestOptions {
  endpoint: ApiEndpoint;
  baseUrl: string;
}

interface UseApiRequestResult {
  isLoading: boolean;
  error: ApiError | null;
  data: any;
  responseTime: number | null;
  makeRequest: (params: {
    pathParams?: PathParam[];
    queryParams?: QueryParam[];
    body?: any;
    headers?: Record<string, string>;
  }) => Promise<any>;
}

// Helper function to save test history
const saveTestHistory = (history: TestHistory) => {
  try {
    const existingHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
    const updatedHistory = [history, ...existingHistory].slice(0, 100); // Keep last 100 entries
    localStorage.setItem('testHistory', JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to save test history:', error);
  }
};

export function useApiRequest({ endpoint, baseUrl }: UseApiRequestOptions): UseApiRequestResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const makeRequest = async ({
    pathParams = [],
    queryParams = [],
    body = null,
    headers = {}
  }: {
    pathParams?: PathParam[];
    queryParams?: QueryParam[];
    body?: any;
    headers?: Record<string, string>;
  }): Promise<any> => {
    setIsLoading(true);
    setError(null);
    setData(null);
    setResponseTime(null);

    const startTime = performance.now();
    let url = `${baseUrl}${endpoint.path}`;

    try {
      // Build the URL with path parameters
      pathParams.forEach(param => {
        url = url.replace(`{${param.name}}`, encodeURIComponent(param.value));
      });

      // Add query parameters
      if (queryParams.length > 0) {
        const queryString = queryParams
          .filter(param => param.name && param.value)
          .map(param => `${encodeURIComponent(param.name)}=${encodeURIComponent(param.value)}`)
          .join('&');

        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // Prepare the fetch options
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers
        },
        credentials: 'include' // Include cookies for authentication
      };

      // Add body for non-GET requests
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && body) {
        options.body = JSON.stringify(body);
      }

      // Execute the request
      const response = await fetch(url, options);
      const responseData = await response.json();
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      setResponseTime(totalTime);

      if (!response.ok) {
        const apiError = new Error(responseData.error?.message || 'API request failed') as ApiError;
        apiError.status = response.status;
        apiError.details = responseData.error;
        throw apiError;
      }

      setData(responseData);

      // Save successful request to history
      saveTestHistory({
        endpoint: url,
        method: endpoint.method,
        requestBody: body,
        headers,
        result: {
          success: true,
          data: responseData,
          responseTime: totalTime,
          timestamp: Date.now()
        }
      });

      return responseData;
    } catch (err) {
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      setResponseTime(totalTime);

      const apiError = err instanceof Error
        ? err as ApiError
        : new Error('Unknown error occurred') as ApiError;

      setError(apiError);

      // Save failed request to history
      saveTestHistory({
        endpoint: url,
        method: endpoint.method,
        requestBody: body,
        headers,
        result: {
          success: false,
          error: apiError,
          responseTime: totalTime,
          timestamp: Date.now()
        }
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    data,
    responseTime,
    makeRequest
  };
}
