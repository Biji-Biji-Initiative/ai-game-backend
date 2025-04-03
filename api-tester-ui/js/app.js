/**
 * Main application module for API Tester UI
 */
import EndpointManager from "./managers/endpoint-manager.js";
import VariableManager from "./managers/variable-manager.js";
import StatusManager from "./managers/status-manager.js";
import VariableExtractor from "./ui/variable-extractor.js";
import ResponseViewer from "./ui/response-viewer.js";
import StepsUI from "./ui/steps.js";
import DomainStateViewer from "./ui/domain-state-viewer.js";
import Logger from "./utils/logger.js";
import apiService from "./services/api-service.js";

// Application state
export const appState = {
    endpoints: [],
    flows: [],
    currentFlow: null,
    currentStep: null,
    currentResponse: null,
    isAuthenticated: false,
    authToken: null,
    lastEmail: "",
    isDarkMode: localStorage.getItem("darkTheme") === "true",
    variables: {}
};

// State change subscribers
const subscribers = [];

/**
 * Subscribe to state changes
 * @param {Function} callback - Function to call when state changes
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToState(callback) {
    subscribers.push(callback);
    return () => {
        const index = subscribers.indexOf(callback);
        if (index !== -1) {
            subscribers.splice(index, 1);
        }
    };
}

/**
 * Update application state
 * @param {Object} newState - Partial state to update
 */
export function updateState(newState) {
    const prevState = { ...appState };
    Object.assign(appState, newState);
    
    // Notify subscribers
    subscribers.forEach(callback => {
        try {
            callback(appState, prevState);
        } catch (error) {
            console.error("Error in state subscriber:", error);
        }
    });
}

/**
 * Create a container element if it doesn't exist
 * @param {string} id - Container ID
 * @param {string} parentSelector - Parent element selector
 * @param {string} title - Container title
 * @returns {HTMLElement} - Container element
 */
function createContainer(id, parentSelector, title) {
    let container = document.getElementById(id);
    
    if (!container) {
        container = document.createElement("div");
        container.id = id;
        container.className = "card";
        
        if (title) {
            const header = document.createElement("h3");
            header.textContent = title;
            container.appendChild(header);
        }
        
        const parent = document.querySelector(parentSelector);
        if (parent) {
            parent.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
    }
    
    return container;
}

/**
 * Process endpoints into flows
 * @param {Array} endpoints - List of endpoints
 * @returns {Array} - Processed flows
 */
function processEndpointsFromManager(endpoints) {
    try {
        // Group endpoints by category
        const categories = {};
        endpoints.forEach(endpoint => {
            const category = endpoint.category || "Uncategorized";
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(endpoint);
        });
        
        // Convert categories to flows
        const flows = Object.keys(categories).map(category => {
            return {
                id: category.toLowerCase().replace(/\s+/g, "-"),
                name: category,
                description: `${category} related operations`,
                steps: categories[category].map(endpoint => ({
                    id: endpoint.id,
                    name: endpoint.name,
                    description: endpoint.description,
                    method: endpoint.method,
                    path: endpoint.path,
                    params: endpoint.params || []
                }))
            };
        });
        
        console.log(`Processed ${flows.length} flows with ${endpoints.length} total steps`);
        return flows;
    } catch (error) {
        console.error("Error processing endpoints:", error);
        showErrorBanner(`Failed to process endpoints: ${error.message}`);
        return [];
    }
}

/**
 * Show an error banner
 * @param {string} message - Error message
 */
function showErrorBanner(message) {
    const banner = document.createElement("div");
    banner.className = "error-banner";
    
    const text = document.createElement("span");
    text.textContent = message;
    
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.addEventListener("click", () => banner.remove());
    
    banner.appendChild(text);
    banner.appendChild(closeBtn);
    
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(banner)) {
            banner.remove();
        }
    }, 5000);
}

/**
 * Update authentication status indicator
 * @param {boolean} isAuthenticated - Authentication status
 */
function updateAuthStatusIndicator(isAuthenticated) {
    let indicator = document.querySelector(".auth-status");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "auth-status";
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = isAuthenticated ? "Authenticated" : "Not Authenticated";
    indicator.className = isAuthenticated 
        ? "auth-status authenticated" 
        : "auth-status not-authenticated";
}

/**
 * Update theme based on state
 * @param {boolean} isDarkMode - Dark mode state
 */
function updateTheme(isDarkMode) {
    if (isDarkMode) {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
    
    localStorage.setItem("darkTheme", isDarkMode);
}

/**
 * Initialize all UI components
 */
export function initializeUI() {
    try {
        // Show loading indicator
        document.getElementById("loading").style.display = "block";
        
        // Create managers
        const endpointManager = new EndpointManager();
        const variableManager = new VariableManager();
        const statusManager = new StatusManager();
        
        // Log the API base URL being used
        console.log(`API Tester UI using API base URL: ${apiService.apiBaseUrl}`);
        
        // Create UI containers
        const variableContainer = createContainer("variable-container", "#flow-sidebar", "Extracted Variables");
        const responseContainer = createContainer("response-container", ".main-content", "Response");
        const stepsContainer = createContainer("steps-container", "#flow-sidebar", "Steps");
        const domainContainer = createContainer("domain-state-container", "#flow-sidebar", "Domain State");
        
        // Create UI components
        const variableExtractor = new VariableExtractor(variableManager, variableContainer);
        const responseViewer = new ResponseViewer(responseContainer);
        const stepsUI = new StepsUI({
            container: stepsContainer,
            endpointManager,
            variableManager,
            responseViewer,
            variableExtractor,
            apiService
        });
        const domainStateViewer = new DomainStateViewer(domainContainer);
        
        // Initialize components
        stepsUI.init();
        domainStateViewer.init();
        
        // Start health checks
        statusManager.startHealthChecks();
        
        // Set up state change listeners
        subscribeToState((state, prevState) => {
            if (state.isAuthenticated !== prevState.isAuthenticated) {
                updateAuthStatusIndicator(state.isAuthenticated);
            }
            
            if (state.isDarkMode !== prevState.isDarkMode) {
                updateTheme(state.isDarkMode);
            }
        });
        
        // Load endpoints
        endpointManager.loadEndpoints()
            .then(endpoints => {
                // Hide loading indicator
                document.getElementById("loading").style.display = "none";
                
                // Process endpoints
                const flows = processEndpointsFromManager(endpoints);
                updateState({ endpoints, flows });
            })
            .catch(error => {
                console.error("Failed to load endpoints:", error);
                showErrorBanner("Failed to load endpoints. Using static endpoints as fallback.");
                
                // Try to load from static file
                fetch("./data/endpoints.json")
                    .then(response => response.json())
                    .then(data => {
                        const endpoints = data.endpoints;
                        const flows = processEndpointsFromManager(endpoints);
                        updateState({ endpoints, flows });
                        document.getElementById("loading").style.display = "none";
                    })
                    .catch(staticError => {
                        console.error("Failed to load static endpoints:", staticError);
                        showErrorBanner("Failed to load endpoints from any source. Please try again later.");
                        document.getElementById("loading").style.display = "none";
                    });
            });
        
        // Set up event listeners
        document.getElementById("theme-toggle").addEventListener("click", () => {
            updateState({ isDarkMode: !appState.isDarkMode });
        });
        
        // Initialize theme
        updateTheme(appState.isDarkMode);
        
    } catch (error) {
        console.error("Error initializing UI:", error);
        showErrorBanner(`Failed to initialize UI: ${error.message}`);
        document.getElementById("loading").style.display = "none";
    }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeUI); 