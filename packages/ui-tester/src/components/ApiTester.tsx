import React, { useState, useEffect } from 'react';
import { ApiEndpoint, TestResult, TestHistory as TestHistoryType } from '../types/api';
import FormInputGenerator from './FormInputGenerator';
import { AuthService } from '../services/AuthService';
import { saveTestHistory } from '../utils/apiUtils';

interface PathParam {
  name: string;
  value: string;
}

interface QueryParam {
  name: string;
  value: string;
}

interface ApiTesterProps {
  endpoint: ApiEndpoint;
  baseUrl: string;
  onResponse: (data: any) => void;
  onError: (error: Error) => void;
}

const ApiTester: React.FC<ApiTesterProps> = ({
  endpoint,
  baseUrl,
  onResponse,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [isAuthEndpoint, setIsAuthEndpoint] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if the current endpoint is an auth endpoint (login, signup)
  useEffect(() => {
    // Check if this is an auth-related endpoint
    const isAuth = (
      endpoint.path.includes('/auth/login') ||
      endpoint.path.includes('/auth/signup') ||
      endpoint.path.includes('/login') ||
      endpoint.path.includes('/signup')
    );
    setIsAuthEndpoint(isAuth);

    // Check authentication status
    const authService = AuthService.getInstance();
    setIsAuthenticated(authService.isAuthenticated());
  }, [endpoint]);

  const handleSubmit = async (
    pathParams: PathParam[],
    queryParams: QueryParam[],
    body: any
  ) => {
    setLoading(true);

    try {
      // Build the URL with path parameters
      let url = `${baseUrl}${endpoint.path}`;
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

      // Get auth service instance
      const authService = AuthService.getInstance();

      // Prepare the fetch options
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authService.getAuthHeader() // Add authorization header if authenticated
        }
      };

      // Add body for non-GET requests
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && body) {
        options.body = JSON.stringify(body);
      }

      // Execute the request
      const startTime = Date.now();
      const response = await fetch(url, options);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Parse the response
      const responseData = await response.json();

      // Create a response object with metadata
      const result = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: {},
        responseTime
      };

      // Save to test history
      const testResult: TestResult = {
        success: response.ok,
        data: responseData,
        responseTime,
        timestamp: Date.now()
      };

      // Create history entry
      const historyEntry: TestHistoryType = {
        endpoint: endpoint.path,
        method: endpoint.method,
        requestBody: body,
        headers: {},
        result: testResult
      };

      // Save to history
      saveTestHistory(historyEntry);

      // If this is an auth endpoint and the response was successful, process the token
      if (isAuthEndpoint && response.ok) {
        authService.processLoginResponse(result);
        setIsAuthenticated(authService.isAuthenticated());
      }

      onResponse(result);
    } catch (error) {
      console.error('Error executing API request:', error);

      // Save error to history
      const testResult: TestResult = {
        success: false,
        error: error as Error,
        timestamp: Date.now()
      };

      const historyEntry: TestHistoryType = {
        endpoint: endpoint.path,
        method: endpoint.method,
        requestBody: body,
        result: testResult
      };

      saveTestHistory(historyEntry);

      onError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const authService = AuthService.getInstance();
    authService.clearToken();
    setIsAuthenticated(false);
  };

  return (
    <div className="p-5 h-full overflow-y-auto relative">
      <div className="mb-5 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold mb-2.5">{endpoint.name}</h2>
        <div className="flex items-center mb-2.5">
          <span className={`method ${endpoint.method.toLowerCase()}`}>
            {endpoint.method}
          </span>
          <span className="font-mono text-sm">{endpoint.path}</span>

          {/* Show auth status for non-auth endpoints */}
          {!isAuthEndpoint && (
            <div className="ml-auto flex items-center gap-2.5">
              {isAuthenticated ? (
                <>
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    Authenticated
                  </span>
                  <button
                    className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs cursor-pointer transition-colors hover:bg-gray-200"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                  Not Authenticated
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-gray-600 mb-2.5">{endpoint.description}</p>
        <div className="text-xs text-gray-500 bg-gray-100 py-1 px-1.5 rounded inline-block">
          Category: {endpoint.category}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded">
        <h3 className="text-base font-semibold mb-4 text-gray-700">Request Parameters</h3>
        <FormInputGenerator
          endpoint={endpoint}
          onSubmit={handleSubmit}
        />
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/80 flex flex-col justify-center items-center z-10">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p>Sending request...</p>
        </div>
      )}
    </div>
  );
};

export default ApiTester;
