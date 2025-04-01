/**
 * API Client Module
 * Handles making API requests and processing responses
 */

/**
 *
 */
export class APIClient {
    /**
     * Creates a new APIClient instance
     * @param {Object} errorHandler - Error handler for processing API errors
     * @param {Object} config - Configuration settings
     */
    constructor(errorHandler, config = null) {
        this.errorHandler = errorHandler;
        this.config = config;
        this.baseUrl = config ? config.get("apiBaseUrl", "/api") : "/api";
        this.apiVersion = config ? config.get("apiVersion", "v1") : "v1";
        this.useApiVersionPrefix = config ? config.get("useApiVersionPrefix", true) : true;
        this.listeners = new Map();
    }
    
    /**
     * Adds an event listener for API events
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Removes an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function to remove
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emits an event to all registered listeners
     * @param {string} event - The event name
     * @param {Object} data - The event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }
    
    /**
     * Makes an API request
     * @param {string} method - The HTTP method to use
     * @param {string} endpoint - The API endpoint
     * @param {Object} body - The request body
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} The response data
     */
    async makeRequest(method, endpoint, body = null, options = {}) {
        const useAuthToken = options.useAuthToken !== false; // Default to true
        const headers = {
            "Content-Type": "application/json",
            ...options.headers
        };
        
        // Add auth token if available and should be used
        if (useAuthToken && this.getAuthToken()) {
            headers["Authorization"] = `Bearer ${this.getAuthToken()}`;
        }

        const requestOptions = {
            method: method.toUpperCase(),
            headers: headers
        };

        if (body && (method.toUpperCase() === "POST" || method.toUpperCase() === "PUT" || method.toUpperCase() === "PATCH")) {
            requestOptions.body = JSON.stringify(body);
        }

        // Ensure endpoint is formatted correctly
        if (!endpoint.startsWith("/") && !endpoint.startsWith("http")) {
            endpoint = "/" + endpoint;
        }
        
        // Only add API version prefix if needed and not already present
        if (this.useApiVersionPrefix && this.apiVersion && 
            !endpoint.includes(`/${this.apiVersion}/`) && !endpoint.startsWith("http")) {
            endpoint = `/${this.apiVersion}${endpoint}`;
        }

        // Construct full URL
        const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;

        // Create request info for logging and displaying
        const requestInfo = {
            method: requestOptions.method,
            url: url,
            headers: {...headers, Authorization: headers.Authorization ? "Bearer ...REDACTED" : undefined},
            body: requestOptions.body
        };
        
        // Emit request start event
        this.emit("request:start", {
            method: requestOptions.method,
            endpoint: endpoint,
            body: body
        });
        
        // Set up timeout if specified
        const timeout = options.timeout || (this.config ? this.config.get("requestTimeout", 30000) : 30000);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        requestOptions.signal = controller.signal;
        
        // Start request time
        const startTime = Date.now();
        
        try {
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            let responseData;
            const contentType = response.headers.get("content-type") || "";
            
            // Try to parse as JSON if content type includes json, but fallback to text if it fails
            if (contentType.includes("application/json")) {
                try {
                    responseData = await response.json();
                } catch (e) {
                    const textResponse = await response.text();
                    responseData = { 
                        rawTextResponse: textResponse,
                        parseError: e.message 
                    };
                }
            } else if (contentType.includes("text/")) {
                // Handle text content types
                const textResponse = await response.text();
                responseData = { 
                    rawTextResponse: textResponse,
                    contentType: contentType 
                };
            } else {
                // For binary or other content types, use blob
                try {
                    const blob = await response.blob();
                    responseData = { 
                        blobData: blob,
                        contentType: contentType,
                        size: blob.size
                    };
                } catch (e) {
                    // If that fails too, just get the text
                    const textResponse = await response.text();
                    responseData = { 
                        rawTextResponse: textResponse,
                        contentType: contentType 
                    };
                }
            }
            
            // Emit response event
            this.emit("response:success", {
                method: requestOptions.method,
                endpoint: endpoint,
                requestInfo: requestInfo,
                response: response,
                responseData: responseData,
                duration: duration,
                contentType: contentType
            });
            
            // Handle errors
            if (!response.ok) {
                const errorData = {
                    method: requestOptions.method,
                    endpoint: endpoint,
                    statusCode: response.status,
                    statusText: response.statusText,
                    message: this.extractErrorMessage(responseData),
                    errorCode: this.extractErrorCode(responseData),
                    requestInfo: requestInfo,
                    responseData: responseData,
                    duration: duration,
                    contentType: contentType
                };
                
                // Emit error event
                this.emit("response:error", errorData);
                
                // Process the error using the error handler
                if (this.errorHandler) {
                    this.errorHandler.processApiError(errorData);
                }
                
                return responseData;
            }
            
            return responseData;
        } catch (error) {
            clearTimeout(timeoutId);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Check if this is an abort error (timeout)
            if (error.name === "AbortError") {
                const timeoutError = {
                    method: requestOptions.method,
                    endpoint: endpoint,
                    message: `Request timed out after ${timeout}ms`,
                    requestInfo: requestInfo,
                    isTimeoutError: true,
                    duration: duration
                };
                
                // Emit timeout event
                this.emit("response:timeout", timeoutError);
                
                // Process the error using the error handler
                if (this.errorHandler) {
                    this.errorHandler.processTimeoutError(timeoutError);
                }
                
                throw new Error(`Request timed out after ${timeout}ms`);
            }
            
            // Network or other fetch error
            const errorData = {
                method: requestOptions.method,
                endpoint: endpoint,
                message: error.message,
                requestInfo: requestInfo,
                isNetworkError: true,
                duration: duration
            };
            
            // Emit error event
            this.emit("response:network-error", errorData);
            
            // Process the error using the error handler
            if (this.errorHandler) {
                this.errorHandler.processNetworkError(errorData);
            }
            
            throw error;
        }
    }
    
    /**
     * Extracts error message from response data
     * @param {Object} responseData - The response data
     * @returns {string} The error message
     */
    extractErrorMessage(responseData) {
        if (!responseData) return "Unknown API error";
        
        // Try common error message fields
        return responseData.message || 
               responseData.error || 
               responseData.errorMessage ||
               (responseData.errors && responseData.errors[0]?.message) ||
               "Unknown API error";
    }
    
    /**
     * Extracts error code from response data
     * @param {Object} responseData - The response data
     * @returns {string} The error code
     */
    extractErrorCode(responseData) {
        if (!responseData) return "";
        
        // Try common error code fields
        return responseData.errorCode || 
               responseData.code || 
               responseData.status ||
               (responseData.errors && responseData.errors[0]?.code) ||
               "";
    }
    
    /**
     * Gets the current auth token from storage
     * @returns {string} The auth token
     */
    getAuthToken() {
        const tokenKey = this.config ? this.config.get("authTokenName", "authToken") : "authToken";
        // Try getting from localStorage
        const token = localStorage.getItem(tokenKey);
        // Fallback to window object
        return token || window[tokenKey] || null;
    }
    
    /**
     * Sets the base URL for API requests
     * @param {string} baseUrl - The base URL
     */
    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
    }
    
    /**
     * Sets the API version prefix
     * @param {string} version - The API version
     */
    setApiVersion(version) {
        this.apiVersion = version;
    }
    
    /**
     * Enables or disables API version prefix
     * @param {boolean} use - Whether to use API version prefix
     */
    setUseApiVersionPrefix(use) {
        this.useApiVersionPrefix = use;
    }
} 