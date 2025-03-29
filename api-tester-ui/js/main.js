/**
 * API Tester UI - Main Application
 * Main entry point for the application
 */

import { Config } from "./config/config.js";
import { APIClient } from "./api/api-client.js";
import { ErrorHandler } from "./utils/error-handler.js";
import { EndpointManager } from "./modules/endpoint-manager.js";
import { HistoryManager } from "./modules/history-manager.js";
import { TabManager } from "./modules/tab-manager.js";
import { ResponseViewer } from "./ui/response-viewer.js";
import { UIController } from "./ui/ui-controller.js";
import { AuthManager } from "./api/auth-manager.js";
import { JSONEditorManager } from "./utils/json-editor-manager.js";
import { initializeTheme } from "./utils/css-utils.js";

// Define bundled endpoints for fallback
const bundledEndpoints = [
    {
        "name": "Get Users",
        "method": "GET",
        "path": "/api/users",
        "description": "Retrieves a list of users",
        "category": "Users",
        "parameters": []
    },
    {
        "name": "Get User by ID",
        "method": "GET",
        "path": "/api/users/{id}",
        "description": "Retrieves a specific user by ID",
        "category": "Users",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "required": true,
                "type": "string",
                "description": "User ID"
            }
        ]
    },
    {
        "name": "Create User",
        "method": "POST",
        "path": "/api/users",
        "description": "Creates a new user",
        "category": "Users",
        "parameters": [],
        "requestBody": {
            "name": "User object",
            "required": true,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string"
                            },
                            "email": {
                                "type": "string"
                            },
                            "role": {
                                "type": "string"
                            }
                        }
                    }
                }
            }
        }
    }
];

/**
 * Main application class that initializes and connects all components
 */
class Application {
    /**
     * Creates a new Application instance
     */
    constructor() {
        this.initialized = false;
        this.initPromise = null;
        this.components = {};
        this.initErrors = [];
    }
    
    /**
     * Initializes the application
     * @returns {Promise<boolean>} Promise that resolves to true if initialization succeeded
     */
    initialize() {
        // Prevent multiple initializations
        if (this.initialized || this.initPromise) {
            return this.initPromise;
        }
        
        // Create initialization promise
        this.initPromise = this._initializeInternal();
        return this.initPromise;
    }
    
    /**
     * Internal initialization method
     * @returns {Promise<boolean>} Promise that resolves to true if initialization succeeded
     * @private
     */
    async _initializeInternal() {
        try {
            console.log("Initializing API Tester UI...");
            
            // 1. Initialize Config
            await this._initializeConfig();
            
            // 2. Initialize ErrorHandler
            await this._initializeErrorHandler();
            
            // 3. Initialize APIClient
            this._initializeAPIClient();
            
            // 4. Initialize AuthManager
            this._initializeAuthManager();
            
            // 5. Initialize EndpointManager
            this._initializeEndpointManager();
            
            // 6. Initialize HistoryManager
            await this._initializeHistoryManager();
            
            // 7. Initialize TabManager
            this._initializeTabManager();
            
            // 8. Initialize JSONEditorManager
            this._initializeJSONEditorManager();
            
            // 9. Initialize ResponseViewer
            this._initializeResponseViewer();
            
            // 10. Initialize UIController
            await this._initializeUIController();
            
            // 11. Connect components
            this._connectComponents();
            
            // Mark as initialized
            this.initialized = true;
            console.log("API Tester UI initialized successfully");
            
            return true;
        } catch (error) {
            console.error("Failed to initialize API Tester UI:", error);
            this.initErrors.push(error);
            
            // Try to show error if ErrorHandler is available
            if (this.components.errorHandler) {
                this.components.errorHandler.handleError(error);
            } else {
                // Fallback error display
                this._showFallbackError(error);
            }
            
            return false;
        }
    }
    
    /**
     * Initializes the Config component
     * @private
     */
    async _initializeConfig() {
        try {
            // Create Config instance
            this.components.config = new Config({
                storageKey: "api-tester-config",
                defaults: {
                    apiBaseUrl: "https://api.example.com",
                    apiVersion: "v1",
                    useApiVersionPrefix: true,
                    requestTimeout: 30000,
                    maxHistoryItems: 50,
                    theme: "light",
                    showAdvancedOptions: false,
                    defaultResponseTab: "formatted"
                }
            });
            
            // Load saved config
            await this.components.config.load();
            
            console.log("Config initialized");
        } catch (error) {
            console.error("Failed to initialize Config:", error);
            throw new Error(`Config initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the ErrorHandler component
     * @private
     */
    _initializeErrorHandler() {
        try {
            // Create ErrorHandler instance
            this.components.errorHandler = new ErrorHandler({
                config: this.components.config,
                notificationContainer: document.getElementById("notifications"),
                logToConsole: true
            });
            
            console.log("ErrorHandler initialized");
        } catch (error) {
            console.error("Failed to initialize ErrorHandler:", error);
            throw new Error(`ErrorHandler initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the APIClient component
     * @private
     */
    _initializeAPIClient() {
        try {
            // Create APIClient instance
            this.components.apiClient = new APIClient({
                errorHandler: this.components.errorHandler,
                config: this.components.config
            });
            
            console.log("APIClient initialized");
        } catch (error) {
            console.error("Failed to initialize APIClient:", error);
            throw new Error(`APIClient initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the AuthManager component
     * @private
     */
    _initializeAuthManager() {
        try {
            // Create AuthManager instance
            this.components.authManager = new AuthManager({
                apiClient: this.components.apiClient,
                config: this.components.config,
                errorHandler: this.components.errorHandler
            });
            
            console.log("AuthManager initialized");
        } catch (error) {
            console.error("Failed to initialize AuthManager:", error);
            throw new Error(`AuthManager initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the EndpointManager component
     * @private
     */
    _initializeEndpointManager() {
        try {
            // Create EndpointManager instance
            this.components.endpointManager = new EndpointManager({
                apiClient: this.components.apiClient,
                config: this.components.config,
                maxRetries: 2,
                useLocalEndpoints: true,
                endpointsFilePath: "data/endpoints.json"
            });
            
            // Set bundled endpoints for fallback
            this.components.endpointManager.setBundledEndpoints(bundledEndpoints);
            
            console.log("EndpointManager initialized");
        } catch (error) {
            console.error("Failed to initialize EndpointManager:", error);
            throw new Error(`EndpointManager initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the HistoryManager component
     * @private
     */
    async _initializeHistoryManager() {
        try {
            // Create HistoryManager instance
            this.components.historyManager = new HistoryManager({
                config: this.components.config,
                errorHandler: this.components.errorHandler,
                storageKey: "api-tester-history",
                compressionEnabled: true,
                compressionThreshold: 10000, // 10KB
                maxItems: this.components.config.get("maxHistoryItems", 50)
            });
            
            // Load history
            await this.components.historyManager.loadHistory();
            
            console.log("HistoryManager initialized");
        } catch (error) {
            console.error("Failed to initialize HistoryManager:", error);
            throw new Error(`HistoryManager initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the TabManager component
     * @private
     */
    _initializeTabManager() {
        try {
            // Create TabManager instance
            this.components.tabManager = new TabManager({
                tabsContainer: document.getElementById("response-tabs"),
                contentContainer: document.getElementById("response-contents"),
                storageKey: "api-tester-tabs",
                defaultTabId: "tab-formatted"
            });
            
            // Initialize TabManager
            this.components.tabManager.initialize();
            
            console.log("TabManager initialized");
        } catch (error) {
            console.error("Failed to initialize TabManager:", error);
            throw new Error(`TabManager initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the JSONEditorManager component
     * @private
     */
    _initializeJSONEditorManager() {
        try {
            // Create JSONEditorManager instance
            this.components.jsonEditorManager = new JSONEditorManager({
                defaultMode: "code",
                defaultModes: ["code", "view", "form", "text"],
                placeholderSelector: ".json-editor-container",
                onChange: () => {
                    // Validate the editor content via UIController when available
                    if (this.components.uiController) {
                        this.components.uiController.validateRequest();
                    }
                }
            });
            
            console.log("JSONEditorManager initialized");
        } catch (error) {
            console.error("Failed to initialize JSONEditorManager:", error);
            throw new Error(`JSONEditorManager initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the ResponseViewer component
     * @private
     */
    _initializeResponseViewer() {
        try {
            // Create ResponseViewer instance
            this.components.responseViewer = new ResponseViewer({
                container: document.getElementById("response-section"),
                tabManager: this.components.tabManager,
                config: this.components.config,
                errorHandler: this.components.errorHandler
            });
            
            // Initialize ResponseViewer
            this.components.responseViewer.initialize();
            
            console.log("ResponseViewer initialized");
        } catch (error) {
            console.error("Failed to initialize ResponseViewer:", error);
            throw new Error(`ResponseViewer initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initializes the UIController component
     * @private
     */
    async _initializeUIController() {
        try {
            // Create UIController instance
            this.components.uiController = new UIController({
                apiClient: this.components.apiClient,
                endpointManager: this.components.endpointManager,
                historyManager: this.components.historyManager,
                responseViewer: this.components.responseViewer,
                tabManager: this.components.tabManager,
                config: this.components.config,
                errorHandler: this.components.errorHandler,
                authManager: this.components.authManager,
                jsonEditorManager: this.components.jsonEditorManager
            });
            
            // Initialize UIController
            await this.components.uiController.initialize();
            
            console.log("UIController initialized");
        } catch (error) {
            console.error("Failed to initialize UIController:", error);
            throw new Error(`UIController initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Connects components by setting up event listeners
     * @private
     */
    _connectComponents() {
        try {
            // Connect APIClient and ResponseViewer
            this.components.apiClient.addEventListener("api:response", 
                data => this.components.responseViewer.displayResponse(data.response, data.request));
                
            this.components.apiClient.addEventListener("api:error", 
                data => this.components.responseViewer.displayError(data.error, data.request));
            
            // Connect EndpointManager and UIController
            this.components.endpointManager.addEventListener("endpoints:loaded", 
                data => this.components.uiController.updateEndpointsList(data.endpoints, data.categories));
                
            this.components.endpointManager.addEventListener("endpoints:error", 
                data => this.components.errorHandler.handleError(data.error));
            
            // Connect HistoryManager and UIController
            this.components.historyManager.addEventListener("history:loaded", 
                data => this.components.uiController.updateHistoryList(data.history));
                
            this.components.historyManager.addEventListener("history:updated", 
                data => this.components.uiController.updateHistoryList(data.history));
            
            console.log("Components connected");
        } catch (error) {
            console.error("Failed to connect components:", error);
            this.components.errorHandler.handleError(
                new Error(`Failed to connect components: ${error.message}`)
            );
        }
    }
    
    /**
     * Shows a fallback error when ErrorHandler is not available
     * @param {Error} error - The error to display
     * @private
     */
    _showFallbackError(error) {
        const errorContainer = document.createElement("div");
        errorContainer.className = "error-container";
        errorContainer.innerHTML = `
            <div class="error-box">
                <h2>Initialization Error</h2>
                <p>${error.message}</p>
                <button id="retry-init">Retry</button>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
        
        // Add retry button functionality
        document.getElementById("retry-init").addEventListener("click", () => {
            errorContainer.remove();
            this.initialized = false;
            this.initPromise = null;
            this.initialize();
        });
    }
    
    /**
     * Gets a component by name
     * @param {string} name - The component name
     * @returns {Object} The component instance
     */
    getComponent(name) {
        return this.components[name];
    }
    
    /**
     * Gets all components
     * @returns {Object} The components object
     */
    getComponents() {
        return { ...this.components };
    }
    
    /**
     * Gets initialization errors
     * @returns {Array} The initialization errors
     */
    getInitErrors() {
        return [...this.initErrors];
    }
    
    /**
     * Checks whether the application is initialized
     * @returns {boolean} Whether the application is initialized
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Resets the application
     * @returns {Promise<boolean>} Promise that resolves to true if reset succeeded
     */
    async reset() {
        try {
            // Clear config
            if (this.components.config) {
                await this.components.config.reset();
            }
            
            // Clear history
            if (this.components.historyManager) {
                await this.components.historyManager.clearHistory();
            }
            
            // Reset UI
            if (this.components.uiController) {
                await this.components.uiController.reset();
            }
            
            return true;
        } catch (error) {
            console.error("Failed to reset application:", error);
            
            if (this.components.errorHandler) {
                this.components.errorHandler.handleError(error);
            }
            
            return false;
        }
    }
}

// Create and initialize application
const app = new Application();

// Initialize on DOM content loaded
document.addEventListener("DOMContentLoaded", () => {
    // Initialize theme
    initializeTheme();
    
    app.initialize()
        .then(success => {
            if (success) {
                // Load endpoints after initialization
                app.getComponent("endpointManager").loadEndpoints()
                    .catch(error => {
                        console.error("Failed to load endpoints:", error);
                        app.getComponent("errorHandler").handleError(error);
                    });
            }
        })
        .catch(error => {
            console.error("Application initialization failed:", error);
        });
});

// Export app for debugging
window.apiTesterApp = app; 