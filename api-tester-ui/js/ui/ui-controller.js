/**
 * UI Controller Module
 * Main controller for the API Tester UI
 */

import { JSONEditor } from "../vendor/jsoneditor.min.js";
import { formatDate, formatDuration } from "../utils/date-utils.js";
import { serializeForm, validateForm } from "../utils/form-utils.js";

/**
 *
 */
export class UIController {
    /**
     * Creates a new UIController instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            apiClient: null,
            config: null,
            errorHandler: null,
            endpointManager: null,
            historyManager: null,
            tabManager: null,
            responseViewer: null,
            authManager: null,
            jsonEditorManager: null,
            ...options
        };
        
        // Extract dependencies
        this.apiClient = this.options.apiClient;
        this.config = this.options.config;
        this.errorHandler = this.options.errorHandler;
        this.endpointManager = this.options.endpointManager;
        this.historyManager = this.options.historyManager;
        this.tabManager = this.options.tabManager;
        this.responseViewer = this.options.responseViewer;
        this.authManager = this.options.authManager;
        this.jsonEditorManager = this.options.jsonEditorManager;
        
        // UI elements
        this.elements = {};
        
        // JSON editors
        this.requestBodyEditor = null;
        this.requestHeadersEditor = null;
        
        // Current endpoint
        this.currentEndpoint = null;
        
        // Loading state
        this.isLoading = false;
    }
    
    /**
     * Initializes UI elements
     */
    initElements() {
        // Get references to UI elements
        this.elements = {
            endpointSelector: document.getElementById("endpoint-selector"),
            methodSelector: document.getElementById("method-selector"),
            urlInput: document.getElementById("url-input"),
            requestBodyContainer: document.getElementById("request-body-container"),
            requestHeadersContainer: document.getElementById("request-headers-container"),
            sendButton: document.getElementById("send-request-btn"),
            clearButton: document.getElementById("clear-request-btn"),
            historyList: document.getElementById("history-list"),
            historyContainer: document.getElementById("history-container"),
            responseContainer: document.getElementById("response-container"),
            loadingIndicator: document.getElementById("loading-indicator")
        };
        
        // Check if elements exist
        if (!this.elements.endpointSelector) {
            console.error("UIController: Endpoint selector element not found");
        }
        
        if (!this.elements.methodSelector) {
            console.error("UIController: Method selector element not found");
        }
        
        if (!this.elements.sendButton) {
            console.error("UIController: Send button element not found");
        }
    }
    
    /**
     * Renders the UI
     */
    render() {
        // Initialize UI elements
        this.initElements();
        
        // Initialize JSON editors
        this.initJsonEditors();
        
        // Populate UI with initial data
        this.populateEndpointSelector();
        this.populateMethodSelector();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up API client listeners
        this.setupApiClientListeners();
        
        // Render history
        this.renderHistory();
    }
    
    /**
     * Initializes JSON editors
     */
    initJsonEditors() {
        // Use the JSONEditorManager if available
        if (this.jsonEditorManager) {
            // Add classes to the containers to make them selectable for the manager
            if (this.elements.requestBodyContainer) {
                this.elements.requestBodyContainer.classList.add("json-editor-container");
                this.elements.requestBodyContainer.id = "request-body-editor";
            }
            
            if (this.elements.requestHeadersContainer) {
                this.elements.requestHeadersContainer.classList.add("json-editor-container");
                this.elements.requestHeadersContainer.id = "request-headers-editor";
            }
            
            // Initialize editors
            this.jsonEditorManager.initializeEditors();
            
            // Get references to the editors
            this.requestBodyEditor = this.jsonEditorManager.getEditor("request-body-editor");
            this.requestHeadersEditor = this.jsonEditorManager.getEditor("request-headers-editor");
            
            // Set default content for headers
            if (this.requestHeadersEditor) {
                this.requestHeadersEditor.set({
                    "Content-Type": "application/json"
                });
            }
            
            return;
        }
        
        // Fallback to direct initialization if JSONEditorManager is not available
        // Initialize request body editor
        if (this.elements.requestBodyContainer) {
            try {
                this.requestBodyEditor = new JSONEditor(this.elements.requestBodyContainer, {
                    mode: "code",
                    modes: ["code", "view", "form", "text"],
                    onChange: () => {
                        this.validateRequest();
                    }
                });
                
                // Set default empty object
                this.requestBodyEditor.set({});
            } catch (error) {
                console.error("Failed to initialize request body editor:", error);
            }
        }
        
        // Initialize request headers editor
        if (this.elements.requestHeadersContainer) {
            try {
                this.requestHeadersEditor = new JSONEditor(this.elements.requestHeadersContainer, {
                    mode: "code",
                    modes: ["code", "view", "form", "text"],
                    onChange: () => {
                        this.validateRequest();
                    }
                });
                
                // Set default headers
                this.requestHeadersEditor.set({
                    "Content-Type": "application/json"
                });
            } catch (error) {
                console.error("Failed to initialize request headers editor:", error);
            }
        }
    }
    
    /**
     * Sets up event listeners for UI elements
     */
    setupEventListeners() {
        // Set up endpoint selector change event
        if (this.elements.endpointSelector) {
            this.elements.endpointSelector.addEventListener("change", event => {
                this.handleEndpointChange(event.target.value);
            });
        }
        
        // Set up method selector change event
        if (this.elements.methodSelector) {
            this.elements.methodSelector.addEventListener("change", event => {
                this.handleMethodChange(event.target.value);
            });
        }
        
        // Set up send button click event
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener("click", () => {
                this.handleSendRequest();
            });
        }
        
        // Set up clear button click event
        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener("click", () => {
                this.handleClearRequest();
            });
        }
        
        // Set up auth form events if auth elements exist
        const loginForm = document.getElementById("login-form");
        if (loginForm) {
            loginForm.addEventListener("submit", e => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        const signupForm = document.getElementById("signup-form");
        if (signupForm) {
            signupForm.addEventListener("submit", e => {
                e.preventDefault();
                this.handleSignup();
            });
        }
        
        const logoutButton = document.getElementById("logout-btn");
        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                this.handleLogout();
            });
        }
    }
    
    /**
     * Sets up API client event listeners
     */
    setupApiClientListeners() {
        if (!this.apiClient) return;
        
        // Listen for request start
        this.apiClient.addEventListener("request:start", _data => {
            // Show loading indicator
            this.setLoading(true);
        });
        
        // Listen for successful response
        this.apiClient.addEventListener("response:success", data => {
            // Hide loading indicator
            this.setLoading(false);
            
            // Display response
            this.handleApiResponse(data);
            
            // Add to history
            this.addToHistory(data.requestInfo, {
                status: data.response.status,
                statusText: data.response.statusText,
                data: data.responseData,
                success: data.response.ok
            });
        });
        
        // Listen for response error
        this.apiClient.addEventListener("response:error", error => {
            // Hide loading indicator
            this.setLoading(false);
            
            // Display error response
            this.handleApiError(error);
            
            // Add to history
            this.addToHistory(error.requestInfo, {
                status: error.statusCode,
                statusText: error.statusText,
                data: error.responseData,
                success: false
            });
        });
        
        // Listen for network error
        this.apiClient.addEventListener("response:network-error", error => {
            // Hide loading indicator
            this.setLoading(false);
            
            // Display network error
            this.handleNetworkError(error);
            
            // Add to history
            this.addToHistory(error.requestInfo, {
                status: 0,
                statusText: "Network Error",
                data: { error: error.message },
                success: false
            });
        });
    }
    
    /**
     * Populates the endpoint selector with available endpoints
     */
    populateEndpointSelector() {
        if (!this.elements.endpointSelector || !this.endpointManager) return;
        
        // Clear current options
        this.elements.endpointSelector.innerHTML = "";
        
        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "-- Select Endpoint --";
        this.elements.endpointSelector.appendChild(defaultOption);
        
        // Get categories and endpoints
        const categories = this.endpointManager.getCategories();
        
        // Add endpoints by category
        categories.forEach(category => {
            const endpoints = this.endpointManager.getEndpointsByCategory(category);
            
            if (endpoints.length > 0) {
                // Create optgroup for category
                const optgroup = document.createElement("optgroup");
                optgroup.label = category;
                
                // Add endpoints to optgroup
                endpoints.forEach(endpoint => {
                    const option = document.createElement("option");
                    option.value = endpoint.id;
                    option.textContent = endpoint.name;
                    option.dataset.path = endpoint.path;
                    option.dataset.method = endpoint.method;
                    optgroup.appendChild(option);
                });
                
                // Add optgroup to selector
                this.elements.endpointSelector.appendChild(optgroup);
            }
        });
    }
    
    /**
     * Populates the method selector with available HTTP methods
     */
    populateMethodSelector() {
        if (!this.elements.methodSelector) return;
        
        // Clear current options
        this.elements.methodSelector.innerHTML = "";
        
        // Add method options
        const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
        
        methods.forEach(method => {
            const option = document.createElement("option");
            option.value = method;
            option.textContent = method;
            this.elements.methodSelector.appendChild(option);
        });
        
        // Select GET by default
        this.elements.methodSelector.value = "GET";
    }
    
    /**
     * Handles endpoint change
     * @param {string} endpointId - The selected endpoint ID
     */
    handleEndpointChange(endpointId) {
        if (!endpointId || !this.endpointManager) return;
        
        // Get endpoint
        const endpoint = this.endpointManager.getEndpointById(endpointId);
        
        if (!endpoint) return;
        
        // Set current endpoint
        this.currentEndpoint = endpoint;
        
        // Update URL input
        if (this.elements.urlInput) {
            this.elements.urlInput.value = endpoint.path;
        }
        
        // Update method selector
        if (this.elements.methodSelector) {
            this.elements.methodSelector.value = endpoint.method;
        }
        
        // Update request body editor
        if (this.requestBodyEditor && endpoint.requestBody) {
            this.requestBodyEditor.set(endpoint.requestBody);
        } else if (this.requestBodyEditor) {
            this.requestBodyEditor.set({});
        }
        
        // Update request headers editor
        if (this.requestHeadersEditor && endpoint.headers) {
            this.requestHeadersEditor.set(endpoint.headers);
        }
    }
    
    /**
     * Handles method change
     * @param {string} method - The selected method
     */
    handleMethodChange(method) {
        // Enable/disable request body based on method
        const methodsWithBody = ["POST", "PUT", "PATCH"];
        
        if (this.elements.requestBodyContainer) {
            if (methodsWithBody.includes(method)) {
                this.elements.requestBodyContainer.parentElement.style.display = "block";
            } else {
                this.elements.requestBodyContainer.parentElement.style.display = "none";
            }
        }
    }
    
    /**
     * Handles send request
     */
    handleSendRequest() {
        if (!this.apiClient) return;
        
        // Get request details
        const method = this.elements.methodSelector.value;
        const url = this.elements.urlInput.value;
        
        // Get request body
        let body = null;
        if (this.requestBodyEditor) {
            try {
                body = this.requestBodyEditor.get();
            } catch (error) {
                // Handle invalid JSON
                this.errorHandler.processValidationError({
                    message: "Invalid JSON in request body",
                    field: "request-body"
                });
                return;
            }
        }
        
        // Get request headers
        let headers = {};
        if (this.requestHeadersEditor) {
            try {
                headers = this.requestHeadersEditor.get();
            } catch (error) {
                // Handle invalid JSON
                this.errorHandler.processValidationError({
                    message: "Invalid JSON in request headers",
                    field: "request-headers"
                });
                return;
            }
        }
        
        // Make request
        this.apiClient.makeRequest(method, url, body, { headers });
    }
    
    /**
     * Handles clear request
     */
    handleClearRequest() {
        // Clear URL input
        if (this.elements.urlInput) {
            this.elements.urlInput.value = "";
        }
        
        // Reset method selector
        if (this.elements.methodSelector) {
            this.elements.methodSelector.value = "GET";
        }
        
        // Clear request body editor
        if (this.requestBodyEditor) {
            this.requestBodyEditor.set({});
        }
        
        // Reset request headers editor
        if (this.requestHeadersEditor) {
            this.requestHeadersEditor.set({ "Content-Type": "application/json" });
        }
        
        // Reset endpoint selector
        if (this.elements.endpointSelector) {
            this.elements.endpointSelector.value = "";
        }
        
        // Clear current endpoint
        this.currentEndpoint = null;
    }
    
    /**
     * Handles API response
     * @param {Object} data - The response data
     */
    handleApiResponse(data) {
        if (!this.responseViewer) return;
        
        // Format response for viewer
        const response = {
            status: data.response.status,
            statusText: data.response.statusText,
            headers: this.extractHeaders(data.response.headers),
            body: data.responseData,
            time: data.time || 0,
            size: this.estimateResponseSize(data.responseData)
        };
        
        // Format time using date-utils
        response.formattedTime = formatDuration(response.time);
        
        // Display response
        this.responseViewer.showResponse(response);
    }
    
    /**
     * Handles API error
     * @param {Object} error - The error data
     */
    handleApiError(error) {
        if (!this.responseViewer) return;
        
        // Format error for viewer
        const response = {
            status: error.statusCode,
            statusText: error.statusText,
            headers: error.headers || {},
            body: error.responseData,
            time: error.time || 0,
            size: this.estimateResponseSize(error.responseData)
        };
        
        // Display response
        this.responseViewer.showResponse(response);
    }
    
    /**
     * Handles network error
     * @param {Object} error - The error data
     */
    handleNetworkError(error) {
        if (!this.responseViewer) return;
        
        // Display error
        this.responseViewer.showError({
            message: error.message,
            details: JSON.stringify({
                url: error.requestInfo.url,
                method: error.requestInfo.method,
                error: error.message
            }, null, 2)
        });
    }
    
    /**
     * Adds a request to history
     * @param {Object} requestInfo - Information about the request
     * @param {Object} responseData - Response data from the request
     */
    addToHistory(requestInfo, responseData) {
        if (!this.historyManager) return;
        
        // Add to history using the modules historyManager
        const entry = this.historyManager.addEntry(requestInfo, responseData);
        
        // Update history UI
        this.renderHistoryEntry(entry);
    }
    
    /**
     * Renders the history
     */
    renderHistory() {
        if (!this.historyManager || !this.elements.historyList) return;
        
        // Clear current history
        this.elements.historyList.innerHTML = "";
        
        // Get history entries from the modules historyManager
        const entries = this.historyManager.getEntries();
        
        // Render entries
        entries.forEach(entry => {
            this.renderHistoryEntry(entry);
        });
    }
    
    /**
     * Renders a history entry
     * @param {Object} entry - The history entry
     */
    renderHistoryEntry(entry) {
        if (!this.elements.historyList) return;
        
        // Create entry element
        const entryElement = document.createElement("div");
        entryElement.className = "history-entry";
        entryElement.dataset.id = entry.id;
        
        // Determine status class
        let statusClass = "status-unknown";
        if (entry.status >= 200 && entry.status < 300) {
            statusClass = "status-success";
        } else if (entry.status >= 400) {
            statusClass = "status-error";
        } else if (entry.status >= 300) {
            statusClass = "status-redirect";
        }
        
        // Format timestamp using date-utils
        const formattedTime = formatDate(entry.timestamp, "time");
        
        // Create entry content
        entryElement.innerHTML = `
            <div class="history-entry-header">
                <span class="history-method ${entry.method.toLowerCase()}">${entry.method}</span>
                <span class="history-path">${entry.path}</span>
                <span class="history-status ${statusClass}">${entry.status}</span>
            </div>
            <div class="history-entry-meta">
                <span class="history-time">${formattedTime}</span>
            </div>
        `;
        
        // Add click event to replay request
        entryElement.addEventListener("click", () => {
            this.replayHistoryEntry(entry);
        });
        
        // Add to history list
        this.elements.historyList.prepend(entryElement);
    }
    
    /**
     * Replays a history entry
     * @param {Object} entry - The history entry
     */
    replayHistoryEntry(entry) {
        // Set URL input
        if (this.elements.urlInput) {
            this.elements.urlInput.value = entry.path || entry.url;
        }
        
        // Set method selector
        if (this.elements.methodSelector) {
            this.elements.methodSelector.value = entry.method;
        }
        
        // Set request body
        if (this.requestBodyEditor && entry.requestBody) {
            try {
                // Handle both string and object formats
                const body = typeof entry.requestBody === "string" 
                    ? JSON.parse(entry.requestBody) 
                    : entry.requestBody;
                    
                this.requestBodyEditor.set(body);
            } catch (error) {
                console.error("Error parsing request body:", error);
                this.requestBodyEditor.set({});
            }
        }
        
        // Set request headers
        if (this.requestHeadersEditor && entry.headers) {
            this.requestHeadersEditor.set(entry.headers);
        }
    }
    
    /**
     * Validates the request
     */
    validateRequest() {
        // Validate URL
        const url = this.elements.urlInput.value;
        if (!url) {
            this.elements.sendButton.disabled = true;
            return;
        }
        
        // Validate JSON in editors
        let isValid = true;
        
        // Validate request body if visible
        const method = this.elements.methodSelector.value;
        const methodsWithBody = ["POST", "PUT", "PATCH"];
        
        if (methodsWithBody.includes(method) && this.requestBodyEditor) {
            try {
                this.requestBodyEditor.get();
            } catch (error) {
                isValid = false;
            }
        }
        
        // Validate request headers
        if (this.requestHeadersEditor) {
            try {
                this.requestHeadersEditor.get();
            } catch (error) {
                isValid = false;
            }
        }
        
        // Enable/disable send button
        this.elements.sendButton.disabled = !isValid;
    }
    
    /**
     * Sets the loading state
     * @param {boolean} isLoading - Whether the UI is loading
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        
        // Update loading indicator
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = isLoading ? "block" : "none";
        }
        
        // Disable/enable send button
        if (this.elements.sendButton) {
            this.elements.sendButton.disabled = isLoading;
        }
    }
    
    /**
     * Extracts headers from a Headers object
     * @param {Headers} headers - The Headers object
     * @returns {Object} The headers as an object
     */
    extractHeaders(headers) {
        if (!headers) return {};
        
        const result = {};
        
        try {
            if (headers instanceof Headers) {
                // Convert Headers object to plain object
                for (const [key, value] of headers.entries()) {
                    result[key] = value;
                }
            } else if (typeof headers === "object") {
                // Already an object
                Object.assign(result, headers);
            }
        } catch (error) {
            console.error("Error extracting headers:", error);
        }
        
        return result;
    }
    
    /**
     * Estimates the size of a response
     * @param {*} data - The response data
     * @returns {number} The estimated size in bytes
     */
    estimateResponseSize(data) {
        if (!data) return 0;
        
        try {
            const json = JSON.stringify(data);
            return json.length;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Handles user login
     */
    async handleLogin() {
        if (!this.authManager) return;
        
        try {
            // Show loading
            this.setLoading(true);
            
            // Get login form
            const loginForm = document.getElementById("login-form");
            
            if (!loginForm) {
                throw new Error("Login form not found");
            }
            
            // Validate form using form-utils
            if (!validateForm(loginForm)) {
                throw new Error("Please fill in all required fields");
            }
            
            // Get form data using form-utils
            const formData = serializeForm(loginForm);
            
            // Attempt login
            const result = await this.authManager.login(formData.email, formData.password);
            
            // Clear password
            document.getElementById("login-password").value = "";
            
            // Update UI with logged in state
            this.updateAuthUI(true, result.user);
            
            // Show success message
            if (this.errorHandler) {
                this.errorHandler.showSuccess("Login successful");
            }
        } catch (error) {
            console.error("Login error:", error);
            
            // Show error
            if (this.errorHandler) {
                this.errorHandler.handleError(error);
            }
        } finally {
            // Hide loading
            this.setLoading(false);
        }
    }
    
    /**
     * Handles user signup
     */
    async handleSignup() {
        if (!this.authManager) return;
        
        try {
            // Show loading
            this.setLoading(true);
            
            // Get signup form
            const signupForm = document.getElementById("signup-form");
            
            if (!signupForm) {
                throw new Error("Signup form not found");
            }
            
            // Validate form using form-utils
            if (!validateForm(signupForm)) {
                throw new Error("Please fill in all required fields");
            }
            
            // Get form data using form-utils
            const formData = serializeForm(signupForm);
            
            // Attempt signup
            const result = await this.authManager.signup(formData.name, formData.email, formData.password);
            
            // Clear form
            signupForm.reset();
            
            // Update UI with logged in state
            this.updateAuthUI(true, result.user);
            
            // Show success message
            if (this.errorHandler) {
                this.errorHandler.showSuccess("Signup successful");
            }
        } catch (error) {
            console.error("Signup error:", error);
            
            // Show error
            if (this.errorHandler) {
                this.errorHandler.handleError(error);
            }
        } finally {
            // Hide loading
            this.setLoading(false);
        }
    }
    
    /**
     * Handles user logout
     */
    handleLogout() {
        if (!this.authManager) return;
        
        // Perform logout
        this.authManager.logout();
        
        // Update UI with logged out state
        this.updateAuthUI(false, null);
        
        // Show success message
        if (this.errorHandler) {
            this.errorHandler.showSuccess("Logged out successfully");
        }
    }
    
    /**
     * Updates the auth UI based on login state
     * @param {boolean} isLoggedIn - Whether the user is logged in
     * @param {Object} user - The user object
     */
    updateAuthUI(isLoggedIn, user) {
        const loginSection = document.getElementById("login-section");
        const loggedInSection = document.getElementById("logged-in-section");
        const userNameElement = document.getElementById("user-name");
        
        if (loginSection && loggedInSection) {
            if (isLoggedIn) {
                loginSection.style.display = "none";
                loggedInSection.style.display = "block";
                
                if (userNameElement && user) {
                    userNameElement.textContent = user.name || user.email;
                }
            } else {
                loginSection.style.display = "block";
                loggedInSection.style.display = "none";
                
                if (userNameElement) {
                    userNameElement.textContent = "";
                }
            }
        }
    }

    /**
     * Initializes the UI controller
     */
    initialize() {
        // Initialize UI elements
        this.initElements();
        
        // Initialize JSON editors
        this.initJsonEditors();
        
        // Populate UI with initial data
        this.populateEndpointSelector();
        this.populateMethodSelector();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up API client listeners
        this.setupApiClientListeners();
        
        // Render history
        this.renderHistory();
        
        // Initialize auth UI
        this.initializeAuthUI();
    }
    
    /**
     * Initializes the auth UI based on current auth state
     */
    initializeAuthUI() {
        if (!this.authManager) return;
        
        // Check if user is logged in
        const isLoggedIn = this.authManager.isLoggedIn();
        const user = this.authManager.getCurrentUser();
        
        // Update UI
        this.updateAuthUI(isLoggedIn, user);
        
        // Set up auth event listeners
        this.authManager.addEventListener("auth:login", data => {
            this.updateAuthUI(true, data.user);
        });
        
        this.authManager.addEventListener("auth:logout", () => {
            this.updateAuthUI(false, null);
        });
    }

    /**
     * Handles authentication state change
     * @param {Object} _data - Authentication data
     */
    handleAuthStateChange(_data) {
        this.updateAuthUI();
    }
} 