/**
 * Application State Management
 * This module initializes the state store with the initial application state
 * and provides helper functions for common state operations.
 */

import StateStore from "./store.js";

// Storage keys for persistent data
export const STORAGE_KEYS = {
    AUTH_TOKEN: "authToken",
    REFRESH_TOKEN: "refreshToken",
    LAST_EMAIL: "apiTesterLastEmail",
    VARIABLES: "api_tester_variables",
    THEME: "api_tester_theme"
};

// Initial application state
const initialState = {
    // Authentication state
    auth: {
        token: localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || null,
        refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null,
        lastEmail: localStorage.getItem(STORAGE_KEYS.LAST_EMAIL) || "admin@example.com",
        isAuthenticated: !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        authRequired: false
    },
    
    // Flow and step state
    flows: {
        items: [],
        categories: {},
        currentFlowId: null,
        steps: [],
        currentStepId: null,
        stepResults: {}
    },
    
    // UI state
    ui: {
        isDarkMode: localStorage.getItem(STORAGE_KEYS.THEME) === "dark",
        isLoading: false,
        loadingMessage: "",
        modals: {
            login: {
                isVisible: false
            },
            errorBanner: {
                isVisible: false,
                message: "",
                details: ""
            }
        },
        notifications: []
    },
    
    // System status
    system: {
        isBackendHealthy: null,
        mode: "",
        version: "",
        node: "",
        lastUpdated: null
    },
    
    // Logs state
    logs: {
        frontend: [],
        backend: [],
        activeTab: "frontend",
        filters: {
            frontend: {
                debug: true,
                info: true,
                warning: true,
                error: true,
                searchTerm: ""
            },
            backend: {
                debug: true,
                info: true,
                warning: true,
                error: true,
                searchTerm: "",
                correlationId: ""
            }
        }
    },
    
    // Variables and context
    variables: {
        items: {},
        currentResponse: null,
        currentRequest: null
    },
    
    // Domain state
    domain: {
        currentState: null,
        history: []
    }
};

// Create and export the store instance
const store = new StateStore(initialState);
export default store;

/**
 * Helper functions for common state operations
 */

// Authentication helpers
export const authHelpers = {
    /**
     * Login a user
     * @param {string} token - Authentication token
     * @param {string} refreshToken - Refresh token
     * @param {string} email - User email
     */
    login(token, refreshToken, email) {
        // Update local storage
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        localStorage.setItem(STORAGE_KEYS.LAST_EMAIL, email);
        
        // Update state
        store.setState({
            auth: {
                token,
                refreshToken,
                lastEmail: email,
                isAuthenticated: true,
                authRequired: false
            }
        }, "User logged in");
    },
    
    /**
     * Logout the current user
     */
    logout() {
        // Clear tokens from storage
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        
        // Update state
        store.setState({
            auth: {
                ...store.getState("auth"),
                token: null,
                refreshToken: null,
                isAuthenticated: false
            }
        }, "User logged out");
    },
    
    /**
     * Set the auth required flag
     * @param {boolean} required - Whether auth is required
     */
    setAuthRequired(required) {
        store.setState({
            auth: {
                ...store.getState("auth"),
                authRequired: required
            }
        }, "Auth required updated");
    }
};

// Flow helpers
export const flowHelpers = {
    /**
     * Set the available flows
     * @param {Array} flows - Array of flow objects
     */
    setFlows(flows) {
        // Organize flows by category
        const categories = {};
        flows.forEach(flow => {
            const category = flow.category || "Uncategorized";
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(flow);
        });
        
        store.setState({
            flows: {
                ...store.getState("flows"),
                items: flows,
                categories
            }
        }, "Flows updated");
    },
    
    /**
     * Select a flow
     * @param {string} flowId - ID of the flow to select
     */
    selectFlow(flowId) {
        store.setState({
            flows: {
                ...store.getState("flows"),
                currentFlowId: flowId,
                currentStepId: null,
                steps: []
            }
        }, "Flow selected");
    },
    
    /**
     * Set the steps for the current flow
     * @param {Array} steps - Array of step objects
     */
    setSteps(steps) {
        store.setState({
            flows: {
                ...store.getState("flows"),
                steps
            }
        }, "Steps updated");
    },
    
    /**
     * Select a step
     * @param {string} stepId - ID of the step to select
     */
    selectStep(stepId) {
        store.setState({
            flows: {
                ...store.getState("flows"),
                currentStepId: stepId
            }
        }, "Step selected");
    },
    
    /**
     * Update a step result
     * @param {string} stepId - ID of the step
     * @param {Object} result - Result object
     */
    updateStepResult(stepId, result) {
        const currentResults = store.getState("flows.stepResults");
        store.setState({
            flows: {
                ...store.getState("flows"),
                stepResults: {
                    ...currentResults,
                    [stepId]: result
                }
            }
        }, "Step result updated");
    }
};

// UI helpers
export const uiHelpers = {
    /**
     * Show loading indicator
     * @param {string} message - Loading message
     */
    showLoading(message = "Loading...") {
        store.setState({
            ui: {
                ...store.getState("ui"),
                isLoading: true,
                loadingMessage: message
            }
        }, "Show loading");
    },
    
    /**
     * Hide loading indicator
     */
    hideLoading() {
        store.setState({
            ui: {
                ...store.getState("ui"),
                isLoading: false,
                loadingMessage: ""
            }
        }, "Hide loading");
    },
    
    /**
     * Show an error banner
     * @param {string} message - Error message
     * @param {string} details - Error details
     */
    showErrorBanner(message, details = "") {
        store.setState({
            ui: {
                ...store.getState("ui"),
                modals: {
                    ...store.getState("ui.modals"),
                    errorBanner: {
                        isVisible: true,
                        message,
                        details
                    }
                }
            }
        }, "Show error banner");
    },
    
    /**
     * Hide the error banner
     */
    hideErrorBanner() {
        store.setState({
            ui: {
                ...store.getState("ui"),
                modals: {
                    ...store.getState("ui.modals"),
                    errorBanner: {
                        isVisible: false,
                        message: "",
                        details: ""
                    }
                }
            }
        }, "Hide error banner");
    },
    
    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        const currentDarkMode = store.getState("ui.isDarkMode");
        const newDarkMode = !currentDarkMode;
        
        // Update local storage
        localStorage.setItem(STORAGE_KEYS.THEME, newDarkMode ? "dark" : "light");
        
        // Update state
        store.setState({
            ui: {
                ...store.getState("ui"),
                isDarkMode: newDarkMode
            }
        }, "Toggle dark mode");
    }
};

// System helpers
export const systemHelpers = {
    /**
     * Update backend health status
     * @param {boolean} isHealthy - Whether the backend is healthy
     */
    updateBackendHealth(isHealthy) {
        store.setState({
            system: {
                ...store.getState("system"),
                isBackendHealthy: isHealthy,
                lastUpdated: new Date()
            }
        }, "Backend health updated");
    },
    
    /**
     * Update system information
     * @param {Object} info - System information object
     */
    updateSystemInfo(info) {
        store.setState({
            system: {
                ...store.getState("system"),
                ...info,
                lastUpdated: new Date()
            }
        }, "System info updated");
    }
}; 