import ApiClient from "../api/api-client.js";
import variableManager from "../managers/variable-manager.js";
import authManager from "../managers/auth-manager.js";
import { appState } from "../app.js";

/**
 * ApiService
 *
 * Central service for making API requests.
 * Handles variable interpolation, authentication, and uses ApiClient for actual requests.
 */
class ApiService {
    constructor() {
        // Get the API base URL from localStorage or default
        // Use document.location instead of window.location for broader compatibility
        const defaultApiBaseUrl = `${document.location.origin}/api`;
        this.apiBaseUrl = localStorage.getItem("apiBaseUrl") || defaultApiBaseUrl;

        // Initialize ApiClient with the base URL
        this.apiClient = new ApiClient({
            baseUrl: this.apiBaseUrl
        });

        console.log(`ApiService initialized with base URL: ${this.apiBaseUrl}`);

        // Listen for changes to apiBaseUrl in settings
        // We'll use a custom event dispatched when settings are saved
        document.addEventListener("settingsSaved", (event) => {
            const newBaseUrl = localStorage.getItem("apiBaseUrl");
            if (newBaseUrl && newBaseUrl !== this.apiBaseUrl) {
                 console.log("Detected apiBaseUrl change in settings, updating ApiService.");
                 this.updateBaseUrl(newBaseUrl);
            }
        });
    }

    /**
     * Updates the API base URL and reinitializes the ApiClient.
     * @param {string} newBaseUrl - The new base URL for the API.
     */
    updateBaseUrl(newBaseUrl) {
        this.apiBaseUrl = newBaseUrl || `${document.location.origin}/api`;
        this.apiClient = new ApiClient({
            baseUrl: this.apiBaseUrl
        });
        console.log(`ApiService base URL updated to: ${this.apiBaseUrl}`);
    }

    /**
     * Logs API request and response details in a user-friendly format.
     * Helps non-coders understand what's happening with their API calls.
     * 
     * @param {Object} requestInfo - Information about the request 
     * @param {Object} responseInfo - Information about the response
     * @param {boolean} isError - Whether this was an error response
     */
    logApiDetails(requestInfo, responseInfo, isError = false) {
        // Only log if debug mode is enabled
        if (!(localStorage.getItem("debugMode") === "true") && 
            !(appState.settings && appState.settings.debugMode)) {
            return;
        }
        
        const titleStyle = "font-weight: bold; font-size: 1.1em;";
        const sectionStyle = "font-weight: bold; color: #666;";
        const methodColors = {
            "GET": "color: #2196F3;",     // Blue 
            "POST": "color: #4CAF50;",    // Green
            "PUT": "color: #FF9800;",     // Orange
            "PATCH": "color: #9C27B0;",   // Purple
            "DELETE": "color: #F44336;"   // Red
        };
        
        const methodStyle = methodColors[requestInfo.method] || "color: #757575;";
        const errorStyle = "color: #F44336; font-weight: bold;";
        const successStyle = "color: #4CAF50; font-weight: bold;";
        
        // Create header
        console.groupCollapsed(
            `%cAPI ${isError ? 'ERROR' : 'Call'}: %c${requestInfo.method} %c${requestInfo.url}`,
            titleStyle,
            methodStyle,
            "color: #000;"
        );
        
        // Request details
        console.log("%cRequest Details:", sectionStyle);
        console.log("URL:", requestInfo.url);
        console.log("Method:", requestInfo.method);
        console.log("Headers:", requestInfo.headers);
        
        if (requestInfo.params) {
            console.log("Query Parameters:", requestInfo.params);
        }
        
        if (requestInfo.body) {
            console.log("Request Body:", requestInfo.body);
        }
        
        // Response details
        console.log("%cResponse Details:", sectionStyle);
        
        if (isError) {
            console.log("%cStatus: Error", errorStyle);
            console.log("Error Message:", responseInfo.message);
            if (responseInfo.status) {
                console.log("Status Code:", responseInfo.status);
            }
        } else {
            console.log("%cStatus: Success", successStyle);
            console.log("Response Data:", responseInfo);
        }
        
        // Troubleshooting Tips for non-coders
        if (isError) {
            console.log("%cTroubleshooting Tips:", "color: #FF9800; font-weight: bold;");
            
            if (responseInfo.status === 401 || responseInfo.status === 403) {
                console.log("• Authentication error. Try logging in again or check your API key.");
            }
            else if (responseInfo.status === 404) {
                console.log("• The requested resource was not found. Check if the URL is correct.");
            }
            else if (responseInfo.status === 400) {
                console.log("• Bad request. Check if all required parameters are provided correctly.");
            }
            else if (responseInfo.status >= 500) {
                console.log("• Server error. The API server might be experiencing issues. Try again later.");
            }
            else if (responseInfo.message?.includes("NetworkError") || responseInfo.message?.includes("Failed to fetch")) {
                console.log("• Network error. Check your internet connection or if the API server is running.");
            }
            else {
                console.log("• Check the error message and response data for more details.");
            }
        }
        
        console.groupEnd();
    }

    /**
     * Makes an API request based on the provided step data.
     *
     * @param {object} step - The step object containing request details.
     * @param {string} step.method - The HTTP method (GET, POST, PUT, DELETE, etc.).
     * @param {string} step.path - The API endpoint path (can contain variables like {{userId}}).
     * @param {object} [step.params] - Optional query parameters.
     * @param {object|string} [step.body] - Optional request body (can be object or string).
     * @param {object} [step.headers] - Optional request headers.
     * @returns {Promise<object>} - A promise that resolves with the API response.
     */
    async makeRequest(step) {
        if (!step || !step.method || !step.path) {
            throw new Error("Invalid step data provided to makeRequest. Method and path are required.");
        }

        // 1. Interpolate variables in path, params, headers, and body
        const interpolatedPath = variableManager.interpolate(step.path);
        const interpolatedParams = step.params ? variableManager.interpolateObject(step.params) : undefined;
        const interpolatedHeaders = step.headers ? variableManager.interpolateObject(step.headers) : {};
        let interpolatedBody = step.body;
        if (step.body) {
            if (typeof step.body === "string") {
                // Interpolate string body first
                const tempInterpolatedBody = variableManager.interpolate(step.body);
                try {
                    // Attempt to parse if it looks like JSON, then interpolate any remaining object variables
                    // This handles cases where the string itself is JSON with nested variables
                    const parsedBody = JSON.parse(tempInterpolatedBody);
                    interpolatedBody = variableManager.interpolateObject(parsedBody);
                } catch (e) {
                    // If parsing fails, use the string-interpolated result
                    interpolatedBody = tempInterpolatedBody;
                }
            } else if (typeof step.body === "object" && step.body !== null) {
                interpolatedBody = variableManager.interpolateObject(step.body);
            }
            // Handle other types like FormData if necessary in the future
        }

        // 2. Prepare request options
        const requestOptions = {
            method: step.method.toUpperCase(),
            headers: {
                ...interpolatedHeaders
            },
            params: interpolatedParams,
            body: interpolatedBody // Body might be string, object, or other types
        };

        // 3. Add Authentication Token if available
        const token = authManager.getToken();
        if (token) {
            // Ensure Authorization header isn't already set by the user
            if (!requestOptions.headers["Authorization"] && !requestOptions.headers["authorization"]) {
                requestOptions.headers["Authorization"] = `Bearer ${token}`;
            }
        }

        // 4. Add Content-Type if body exists and not already set
        // Only set Content-Type for object bodies, let ApiClient or browser handle others
        if (requestOptions.body && typeof requestOptions.body === "object" && requestOptions.body !== null && !(requestOptions.body instanceof FormData) && !requestOptions.headers["Content-Type"] && !requestOptions.headers["content-type"]) {
             requestOptions.headers["Content-Type"] = "application/json";
             // Ensure body is stringified for JSON content type
             requestOptions.body = JSON.stringify(requestOptions.body);
        }

        // Log the request details if debug mode is enabled
        const isDebugMode = localStorage.getItem("debugMode") === "true" || 
                          (appState.settings && appState.settings.debugMode);
        
        if (isDebugMode) {
            // Use our new logging method instead of basic console.log
            this.logApiDetails({
                method: requestOptions.method,
                url: `${this.apiBaseUrl}${interpolatedPath}`,
                headers: requestOptions.headers,
                params: requestOptions.params,
                body: requestOptions.body
            }, "Request sent, awaiting response...");
        }

        // 5. Make the request using ApiClient
        try {
            const response = await this.apiClient.request(interpolatedPath, requestOptions);

            if (isDebugMode) {
                // Use our logging method for successful response
                this.logApiDetails({
                    method: requestOptions.method,
                    url: `${this.apiBaseUrl}${interpolatedPath}`,
                    headers: requestOptions.headers,
                    params: requestOptions.params,
                    body: requestOptions.body
                }, response);
            }

            return response;
        } catch (error) {
            console.error("ApiService Error making request:", error);
            
            if (isDebugMode) {
                // Use our logging method for error response
                this.logApiDetails({
                    method: requestOptions.method,
                    url: `${this.apiBaseUrl}${interpolatedPath}`,
                    headers: requestOptions.headers,
                    params: requestOptions.params,
                    body: requestOptions.body
                }, {
                    message: error.message,
                    status: error.status,
                    response: error.response
                }, true);
            }
            
            // Re-throw the error so the calling code can handle it
            throw error;
        }
    }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 