/**
 * API Client
 * Handles all API requests, authentication, and error handling
 */

import store, { authHelpers } from "../state/index.js";
import errorHandler, { ERROR_TYPES } from "../utils/error-handler.js";

// Default options for all requests
const DEFAULT_OPTIONS = {
    baseUrl: "/api/v1",
    timeout: 30000, // 30 seconds
    retries: 1,
    retryDelay: 1000,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
};

/**
 * API Client class
 */
class ApiClient {
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.pendingRequests = new Map();
        this.requestCount = 0;
    }

    /**
     * Set the base URL for all requests
     * @param {string} baseUrl - The base URL
     */
    setBaseUrl(baseUrl) {
        this.options.baseUrl = baseUrl;
    }

    /**
     * Set a default header for all requests
     * @param {string} name - Header name
     * @param {string} value - Header value
     */
    setHeader(name, value) {
        this.options.headers[name] = value;
    }

    /**
     * Remove a default header
     * @param {string} name - Header name
     */
    removeHeader(name) {
        delete this.options.headers[name];
    }

    /**
     * Set authentication token header
     * @param {string} token - The auth token
     */
    setAuthToken(token) {
        if (token) {
            this.setHeader("Authorization", `Bearer ${token}`);
        } else {
            this.removeHeader("Authorization");
        }
    }

    /**
     * Make a GET request
     * @param {string} path - API endpoint path
     * @param {Object} options - Request options
     * @returns {Promise} - Response promise
     */
    async get(path, options = {}) {
        return this.request(path, { 
            method: "GET", 
            ...options 
        });
    }

    /**
     * Make a POST request
     * @param {string} path - API endpoint path
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise} - Response promise
     */
    async post(path, data, options = {}) {
        return this.request(path, { 
            method: "POST", 
            data, 
            ...options 
        });
    }

    /**
     * Make a PUT request
     * @param {string} path - API endpoint path
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise} - Response promise
     */
    async put(path, data, options = {}) {
        return this.request(path, { 
            method: "PUT", 
            data, 
            ...options 
        });
    }

    /**
     * Make a PATCH request
     * @param {string} path - API endpoint path
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise} - Response promise
     */
    async patch(path, data, options = {}) {
        return this.request(path, { 
            method: "PATCH", 
            data, 
            ...options 
        });
    }

    /**
     * Make a DELETE request
     * @param {string} path - API endpoint path
     * @param {Object} options - Request options
     * @returns {Promise} - Response promise
     */
    async delete(path, options = {}) {
        return this.request(path, { 
            method: "DELETE", 
            ...options 
        });
    }

    /**
     * Make a request to the API
     * @param {string} path - API endpoint path
     * @param {Object} options - Request options
     * @returns {Promise} - Response promise
     */
    async request(path, options = {}) {
        // Set auth token from state if available
        const authToken = store.getState("auth.token");
        if (authToken) {
            this.setAuthToken(authToken);
        }

        const requestId = this._generateRequestId();
        const requestOptions = this._prepareRequestOptions(options);
        const url = this._buildUrl(path);
        
        // Store request information for logging/debugging
        const requestInfo = {
            id: requestId,
            url,
            method: requestOptions.method || "GET",
            headers: requestOptions.headers,
            body: requestOptions.body,
            timestamp: new Date(),
            retryCount: 0
        };
        
        // Add to pending requests
        this.pendingRequests.set(requestId, requestInfo);
        
        try {
            // Set timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Request timeout after ${this.options.timeout}ms`));
                }, this.options.timeout);
            });
            
            // Make the request with retry logic
            const response = await this._executeWithRetry(url, requestOptions, requestInfo);
            
            // Remove from pending requests
            this.pendingRequests.delete(requestId);
            
            // Process response
            return await this._processResponse(response, { requestId, ...requestInfo });
        } catch (error) {
            // Remove from pending requests
            this.pendingRequests.delete(requestId);
            
            // Handle error based on type
            return this._handleRequestError(error, { requestId, ...requestInfo });
        }
    }

    /**
     * Check the health status of the API
     * @returns {Promise<boolean>} Whether the API is healthy
     */
    async checkHealth() {
        try {
            const response = await this.get("/health", { 
                skipErrorHandling: true,
                timeout: 5000
            });
            return response && response.status === "ok";
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the current pending requests
     * @returns {Array} List of pending requests
     */
    getPendingRequests() {
        return Array.from(this.pendingRequests.values());
    }

    /**
     * Cancel a pending request
     * @param {string} requestId - The request ID to cancel
     * @returns {boolean} Whether the request was cancelled
     */
    cancelRequest(requestId) {
        const request = this.pendingRequests.get(requestId);
        if (request && request.controller) {
            request.controller.abort();
            this.pendingRequests.delete(requestId);
            return true;
        }
        return false;
    }

    /**
     * Cancel all pending requests
     */
    cancelAllRequests() {
        this.pendingRequests.forEach(request => {
            if (request.controller) {
                request.controller.abort();
            }
        });
        this.pendingRequests.clear();
    }

    // Private methods

    /**
     * Generate a unique request ID
     * @private
     */
    _generateRequestId() {
        return `req_${Date.now()}_${++this.requestCount}`;
    }

    /**
     * Prepare request options
     * @private
     */
    _prepareRequestOptions(options) {
        const { method = "GET", data, headers = {} } = options;
        
        // Create abort controller for timeout/cancellation
        const controller = new AbortController();
        
        // Build request options
        const requestOptions = {
            method,
            headers: { ...this.options.headers, ...headers },
            signal: controller.signal
        };
        
        // Add body for methods that support it
        if (["POST", "PUT", "PATCH"].includes(method) && data !== undefined) {
            requestOptions.body = JSON.stringify(data);
        }
        
        // Store controller for possible cancellation
        options.controller = controller;
        
        return requestOptions;
    }

    /**
     * Build the full URL
     * @private
     */
    _buildUrl(path) {
        // Handle absolute URLs
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        
        // Handle root-relative URLs
        if (path.startsWith("/")) {
            return `${window.location.origin}${path}`;
        }
        
        // Combine base URL and path
        const baseUrl = this.options.baseUrl.endsWith("/") 
            ? this.options.baseUrl.slice(0, -1) 
            : this.options.baseUrl;
            
        const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
        return `${baseUrl}${pathWithSlash}`;
    }

    /**
     * Execute a request with retry logic
     * @private
     */
    async _executeWithRetry(url, options, requestInfo) {
        let lastError;
        
        // Try initial request plus retries
        for (let attempt = 0; attempt <= this.options.retries; attempt++) {
            try {
                // Update retry count in request info
                requestInfo.retryCount = attempt;
                
                // Execute request
                return await fetch(url, options);
            } catch (error) {
                lastError = error;
                
                // Don't retry if it's an abort or if we've used all retries
                if (error.name === "AbortError" || attempt >= this.options.retries) {
                    throw error;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
            }
        }
        
        throw lastError;
    }

    /**
     * Process a successful response
     * @private
     */
    async _processResponse(response, requestInfo) {
        // Store response info
        const responseInfo = {
            ...requestInfo,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            responseTime: new Date() - requestInfo.timestamp
        };
        
        // Handle unauthorized responses (401)
        if (response.status === 401 && !requestInfo.isRefreshRequest) {
            return this._handleUnauthorized(response, responseInfo);
        }
        
        // Parse response body based on content type
        const contentType = response.headers.get("content-type") || "";
        
        let data;
        if (contentType.includes("application/json")) {
            data = await response.json();
        } else if (contentType.includes("text/")) {
            data = await response.text();
        } else {
            data = await response.blob();
        }
        
        // Add data to response info
        responseInfo.data = data;
        
        // Handle error responses
        if (!response.ok && !requestInfo.skipErrorHandling) {
            return this._handleResponseError(response, responseInfo);
        }
        
        // Return successful response data
        return data;
    }

    /**
     * Handle unauthorized response
     * @private
     */
    async _handleUnauthorized(response, responseInfo) {
        // If we have a refresh token, try to refresh the access token
        const refreshToken = store.getState("auth.refreshToken");
        
        if (refreshToken && !responseInfo.isRefreshRequest) {
            try {
                // Attempt to refresh the token
                const refreshResponse = await this.post("/auth/refresh", {
                    refreshToken
                }, {
                    skipErrorHandling: true,
                    isRefreshRequest: true
                });
                
                if (refreshResponse && refreshResponse.token) {
                    // Update token in state
                    authHelpers.login(
                        refreshResponse.token, 
                        refreshResponse.refreshToken || refreshToken,
                        store.getState("auth.lastEmail")
                    );
                    
                    // Retry the original request
                    return this.request(responseInfo.path, {
                        method: responseInfo.method,
                        data: responseInfo.body ? JSON.parse(responseInfo.body) : undefined
                    });
                }
            } catch (error) {
                // Token refresh failed, proceed with unauthorized handling
                console.warn("Token refresh failed:", error);
            }
        }
        
        // Token refresh failed or wasn't possible, handle as unauthorized
        authHelpers.setAuthRequired(true);
        
        // Create an error object
        const error = new Error("Authentication required");
        error.response = response;
        error.responseInfo = responseInfo;
        
        // Handle as an auth error
        errorHandler.handleAuthError(error, {
            context: responseInfo
        });
        
        throw error;
    }

    /**
     * Handle an error response from the server
     * @private
     */
    _handleResponseError(response, responseInfo) {
        // Create an error object
        const error = new Error(responseInfo.data?.message || response.statusText);
        error.response = response;
        error.responseInfo = responseInfo;
        
        // Use the error handler to process and display
        errorHandler.handleApiError(error, {
            context: responseInfo
        });
        
        throw error;
    }

    /**
     * Handle request errors (network, timeout, etc.)
     * @private
     */
    _handleRequestError(error, requestInfo) {
        // Determine error type
        let errorType = ERROR_TYPES.NETWORK;
        
        if (error.name === "AbortError") {
            if (requestInfo.retryCount === 0) {
                // If no retries were attempted, it's likely a manual cancellation
                errorType = ERROR_TYPES.UNKNOWN;
            } else {
                // If retries were attempted, it's likely a timeout
                errorType = ERROR_TYPES.NETWORK;
                error.message = `Request timed out after ${this.options.timeout}ms`;
            }
        }
        
        // Add request info to error object
        error.requestInfo = requestInfo;
        
        // Don't show error if it's a health check or manual cancellation
        const skipErrorHandling = 
            requestInfo.skipErrorHandling || 
            (error.name === "AbortError" && requestInfo.retryCount === 0) ||
            requestInfo.url.includes("/health");
        
        if (!skipErrorHandling) {
            // Use the error handler to process and display
            errorHandler.handleNetworkError(error, {
                context: requestInfo,
                showToUser: !skipErrorHandling
            });
        }
        
        throw error;
    }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient; 