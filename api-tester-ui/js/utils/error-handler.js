/**
 * Error Handler Utility
 * Provides centralized error handling with different error types and severities
 */

import store, { uiHelpers } from "../state/index.js";

// Error types
export const ERROR_TYPES = {
    NETWORK: "network",
    AUTH: "authentication",
    VALIDATION: "validation",
    API: "api",
    SYSTEM: "system",
    UNKNOWN: "unknown"
};

// Error severities
export const ERROR_SEVERITIES = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error",
    CRITICAL: "critical"
};

/**
 * Error handler class
 */
class ErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.maxErrorHistory = 50;
    }

    /**
     * Handle an error
     * @param {Error|Object} error - Error object or message
     * @param {Object} options - Error handling options
     * @param {string} options.type - Error type (from ERROR_TYPES)
     * @param {string} options.severity - Error severity (from ERROR_SEVERITIES)
     * @param {string} options.userMessage - User-friendly error message
     * @param {boolean} options.showToUser - Whether to show the error to the user
     * @param {Object} options.context - Additional context for the error
     * @returns {Object} Processed error object
     */
    handleError(error, options = {}) {
        // Default options
        const defaults = {
            type: ERROR_TYPES.UNKNOWN,
            severity: ERROR_SEVERITIES.ERROR,
            userMessage: "An error occurred",
            showToUser: true,
            context: {}
        };

        const settings = { ...defaults, ...options };
        
        // Process the error object
        const processedError = this._processError(error, settings);
        
        // Add to history
        this._addToHistory(processedError);
        
        // Log the error
        this._logError(processedError);
        
        // Show to user if needed
        if (settings.showToUser) {
            this._showErrorToUser(processedError);
        }
        
        return processedError;
    }

    /**
     * Handle a network error
     * @param {Error|Object} error - Error object or message
     * @param {Object} options - Additional options
     * @returns {Object} Processed error object
     */
    handleNetworkError(error, options = {}) {
        const userMessage = this._getNetworkErrorMessage(error);
        
        return this.handleError(error, {
            type: ERROR_TYPES.NETWORK,
            severity: ERROR_SEVERITIES.ERROR,
            userMessage,
            ...options
        });
    }

    /**
     * Handle an authentication error
     * @param {Error|Object} error - Error object or message
     * @param {Object} options - Additional options
     * @returns {Object} Processed error object
     */
    handleAuthError(error, options = {}) {
        return this.handleError(error, {
            type: ERROR_TYPES.AUTH,
            severity: ERROR_SEVERITIES.WARNING,
            userMessage: "Authentication failed. Please log in again.",
            ...options
        });
    }

    /**
     * Handle an API error
     * @param {Error|Object} error - Error object or message
     * @param {Object} options - Additional options
     * @returns {Object} Processed error object
     */
    handleApiError(error, options = {}) {
        const { status, statusText } = error.response || {};
        let userMessage = "API request failed";
        let severity = ERROR_SEVERITIES.ERROR;
        
        // Determine user message based on status code
        if (status) {
            if (status === 401) {
                userMessage = "You need to log in to access this resource";
                severity = ERROR_SEVERITIES.WARNING;
            } else if (status === 403) {
                userMessage = "You don't have permission to access this resource";
                severity = ERROR_SEVERITIES.WARNING;
            } else if (status === 404) {
                userMessage = "The requested resource was not found";
                severity = ERROR_SEVERITIES.WARNING;
            } else if (status === 429) {
                userMessage = "Too many requests. Please try again later";
                severity = ERROR_SEVERITIES.WARNING;
            } else if (status >= 500) {
                userMessage = "Server error. Please try again later";
                severity = ERROR_SEVERITIES.ERROR;
            } else {
                userMessage = `API error (${status}: ${statusText})`;
            }
        }
        
        return this.handleError(error, {
            type: ERROR_TYPES.API,
            severity,
            userMessage,
            ...options
        });
    }

    /**
     * Get all errors from history
     * @returns {Array} Error history
     */
    getErrorHistory() {
        return [...this.errorHistory];
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
    }

    // Private methods

    /**
     * Process an error to create a standardized error object
     * @private
     */
    _processError(error, settings) {
        const isErrorObject = error instanceof Error;
        
        const processedError = {
            timestamp: new Date(),
            type: settings.type,
            severity: settings.severity,
            originalError: error,
            message: isErrorObject ? error.message : String(error),
            userMessage: settings.userMessage,
            stack: isErrorObject ? error.stack : null,
            context: {
                ...settings.context,
                url: window.location.href
            }
        };

        // Add response data for API errors
        if (error.response) {
            processedError.response = {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            };
        }

        return processedError;
    }

    /**
     * Add error to history
     * @private
     */
    _addToHistory(error) {
        this.errorHistory.push(error);
        
        // Limit history size
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory.shift();
        }
    }

    /**
     * Log the error to console
     * @private
     */
    _logError(error) {
        const { severity, userMessage, message, context, type } = error;
        
        // Log to console based on severity
        if (severity === ERROR_SEVERITIES.CRITICAL || severity === ERROR_SEVERITIES.ERROR) {
            console.error(`[${type.toUpperCase()}] ${userMessage}`, {
                details: message,
                context
            });
        } else if (severity === ERROR_SEVERITIES.WARNING) {
            console.warn(`[${type.toUpperCase()}] ${userMessage}`, {
                details: message,
                context
            });
        } else {
            console.info(`[${type.toUpperCase()}] ${userMessage}`, {
                details: message,
                context
            });
        }
    }

    /**
     * Show error to user
     * @private
     */
    _showErrorToUser(error) {
        const { severity, userMessage, message } = error;
        
        // Show different types of notifications based on severity
        if (severity === ERROR_SEVERITIES.CRITICAL) {
            // Show modal error banner for critical errors
            uiHelpers.showErrorBanner(userMessage, message);
        } else {
            // Show notification for less severe errors
            // This would call showNotification which will be implemented as part of UI module
            console.log("Show notification:", userMessage);
        }
    }

    /**
     * Get a user-friendly message for network errors
     * @private
     */
    _getNetworkErrorMessage(error) {
        // Determine network error type
        if (error.message && error.message.includes("Network Error")) {
            return "Cannot connect to the server. Please check your internet connection.";
        }
        
        if (error.message && error.message.includes("timeout")) {
            return "The server is taking too long to respond. Please try again later.";
        }
        
        if (error.message && error.message.includes("aborted")) {
            return "The request was cancelled.";
        }
        
        return "Network error. Please check your connection and try again.";
    }
}

// Export a singleton instance
const errorHandler = new ErrorHandler();
export default errorHandler; 