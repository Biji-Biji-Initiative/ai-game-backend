/**
 * Configuration Module
 * Handles global configuration for the API Tester
 */

/**
 *
 */
export class Config {
    /**
     * Default configuration settings
     */
    static defaults = {
        // API settings
        apiBaseUrl: "/api",
        apiVersion: "v1",
        useApiVersionPrefix: true,
        authTokenName: "authToken",
        requestTimeout: 30000, // 30 seconds
        
        // UI settings
        theme: "light",
        jsonEditorHeight: "300px",
        responsePaneHeight: "400px",
        maxHistoryEntries: 50,
        maxInitialResponseSize: 20000, // characters to display in response viewer initially
        
        // Feature flags
        enableAuthentication: true,
        enableHistory: true,
        enableJSONEditor: true,
        enableTabs: true,
        enableDynamicEndpoints: true,
        
        // Performance
        historyStorageType: "localStorage", // 'localStorage', 'sessionStorage', 'memory'
        compressionEnabled: true,
        
        // Debugging
        logLevel: "info", // 'debug', 'info', 'warn', 'error', 'none'
        enablePerformanceMetrics: false,
        
        // Endpoints file location
        endpointsFilePath: "data/endpoints.json",
        
        // Notification settings
        maxNotifications: 3,
        notificationDuration: 5000
    };
    
    /**
     * Settings validation schema
     */
    static validationSchema = {
        apiBaseUrl: { type: "string", required: true },
        apiVersion: { type: "string", required: true },
        useApiVersionPrefix: { type: "boolean", required: false },
        authTokenName: { type: "string", required: false },
        requestTimeout: { type: "number", required: false, min: 1000, max: 120000 },
        
        theme: { type: "string", required: false, enum: ["light", "dark", "system"] },
        jsonEditorHeight: { type: "string", required: false },
        responsePaneHeight: { type: "string", required: false },
        maxHistoryEntries: { type: "number", required: false, min: 1, max: 1000 },
        maxInitialResponseSize: { type: "number", required: false, min: 100 },
        
        enableAuthentication: { type: "boolean", required: false },
        enableHistory: { type: "boolean", required: false },
        enableJSONEditor: { type: "boolean", required: false },
        enableTabs: { type: "boolean", required: false },
        enableDynamicEndpoints: { type: "boolean", required: false },
        
        historyStorageType: { type: "string", required: false, enum: ["localStorage", "sessionStorage", "memory"] },
        compressionEnabled: { type: "boolean", required: false },
        
        logLevel: { type: "string", required: false, enum: ["debug", "info", "warn", "error", "none"] },
        enablePerformanceMetrics: { type: "boolean", required: false },
        
        endpointsFilePath: { type: "string", required: false },
        
        maxNotifications: { type: "number", required: false, min: 1, max: 10 },
        notificationDuration: { type: "number", required: false, min: 1000, max: 60000 }
    };
    
    /**
     * Creates a new Config instance
     * @param {Object} customSettings - Custom configuration settings to override defaults
     */
    constructor(customSettings = {}) {
        // Merge default settings with custom settings
        this.settings = {
            ...Config.defaults
        };
        
        // Load settings from local storage
        this.loadFromStorage();
        
        // Override with custom settings provided
        this.update(customSettings, false);
        
        // Set storage key
        this.storageKey = "apiTesterConfig";
    }
    
    /**
     * Gets the value of a configuration setting
     * @param {string} key - The setting key
     * @param {*} defaultValue - The default value if the setting doesn't exist
     * @returns {*} The setting value
     */
    get(key, defaultValue) {
        return key in this.settings ? this.settings[key] : defaultValue;
    }
    
    /**
     * Sets the value of a configuration setting
     * @param {string} key - The setting key
     * @param {*} value - The setting value
     * @param {boolean} save - Whether to save to storage
     * @returns {boolean} Whether the set was successful
     */
    set(key, value, save = true) {
        // Validate the key/value
        const validation = this.validateSetting(key, value);
        if (!validation.valid) {
            console.error(`Invalid configuration setting ${key}:`, validation.error);
            return false;
        }
        
        this.settings[key] = value;
        
        // Save to storage if requested
        if (save) {
            this.saveToStorage();
        }
        
        return true;
    }
    
    /**
     * Updates multiple configuration settings at once
     * @param {Object} settings - The settings to update
     * @param {boolean} save - Whether to save to storage
     * @returns {Object} Object with success status and any validation errors
     */
    update(settings, save = true) {
        if (!settings || typeof settings !== "object") {
            return { success: false, errors: ["Settings must be an object"] };
        }
        
        const errors = {};
        let hasErrors = false;
        
        // Validate and update each setting
        for (const [key, value] of Object.entries(settings)) {
            const validation = this.validateSetting(key, value);
            
            if (validation.valid) {
                this.settings[key] = value;
            } else {
                errors[key] = validation.error;
                hasErrors = true;
            }
        }
        
        // Save to storage if requested and no errors
        if (save && !hasErrors) {
            this.saveToStorage();
        }
        
        return {
            success: !hasErrors,
            errors: hasErrors ? errors : null
        };
    }
    
    /**
     * Validates a single setting
     * @param {string} key - The setting key
     * @param {*} value - The setting value
     * @returns {Object} Validation result
     */
    validateSetting(key, value) {
        // Check if the key is in the schema
        const schema = Config.validationSchema[key];
        
        // If not in schema, accept any value
        if (!schema) {
            return { valid: true };
        }
        
        // Check if required and present
        if (schema.required && (value === undefined || value === null)) {
            return { valid: false, error: "Required setting is missing" };
        }
        
        // Skip further validation if value is undefined or null
        if (value === undefined || value === null) {
            return { valid: true };
        }
        
        // Validate by type
        switch (schema.type) {
        case "string":
            if (typeof value !== "string") {
                return { valid: false, error: "Must be a string" };
            }
                
            // Check enum if specified
            if (schema.enum && !schema.enum.includes(value)) {
                return { valid: false, error: `Must be one of: ${schema.enum.join(", ")}` };
            }
            break;
                
        case "number":
            if (typeof value !== "number" || isNaN(value)) {
                return { valid: false, error: "Must be a number" };
            }
                
            // Check min/max if specified
            if (schema.min !== undefined && value < schema.min) {
                return { valid: false, error: `Must be at least ${schema.min}` };
            }
                
            if (schema.max !== undefined && value > schema.max) {
                return { valid: false, error: `Must be at most ${schema.max}` };
            }
            break;
                
        case "boolean":
            if (typeof value !== "boolean") {
                return { valid: false, error: "Must be a boolean" };
            }
            break;
                
        case "object":
            if (typeof value !== "object" || value === null || Array.isArray(value)) {
                return { valid: false, error: "Must be an object" };
            }
            break;
                
        case "array":
            if (!Array.isArray(value)) {
                return { valid: false, error: "Must be an array" };
            }
            break;
                
        default:
            // Accept any type if not specified
            break;
        }
        
        return { valid: true };
    }
    
    /**
     * Reset all settings to their default values
     */
    resetToDefaults() {
        this.settings = {...Config.defaults};
        
        // Save to storage
        this.saveToStorage();
    }
    
    /**
     * Loads configuration settings from local storage
     */
    loadFromStorage() {
        try {
            const storedSettings = localStorage.getItem(this.storageKey);
            
            if (storedSettings) {
                try {
                    const parsedSettings = JSON.parse(storedSettings);
                    
                    // Only update with valid settings
                    if (parsedSettings && typeof parsedSettings === "object") {
                        // Validate each setting before applying
                        for (const [key, value] of Object.entries(parsedSettings)) {
                            const validation = this.validateSetting(key, value);
                            
                            if (validation.valid) {
                                this.settings[key] = value;
                            } else {
                                console.warn(`Invalid stored setting ${key}: ${validation.error}`);
                            }
                        }
                    }
                } catch (parseError) {
                    console.error("Failed to parse stored settings:", parseError);
                    // If parsing fails, try to recover by removing the corrupted settings
                    this.clearStorage();
                }
            }
        } catch (error) {
            console.error("Failed to load settings from storage:", error);
            // Attempt to recover by using defaults
            this.settings = {...Config.defaults};
        }
    }
    
    /**
     * Saves configuration settings to local storage
     * @returns {boolean} Whether settings were saved successfully
     */
    saveToStorage() {
        try {
            // Only save serializable settings (skip functions, etc.)
            const settingsToSave = {};
            
            for (const [key, value] of Object.entries(this.settings)) {
                // Skip functions and other non-serializable types
                if (
                    typeof value !== "function" &&
                    typeof value !== "symbol" &&
                    value !== undefined
                ) {
                    settingsToSave[key] = value;
                }
            }
            
            const settingsString = JSON.stringify(settingsToSave);
            localStorage.setItem(this.storageKey, settingsString);
            return true;
        } catch (error) {
            console.error("Failed to save settings to storage:", error);
            return false;
        }
    }
    
    /**
     * Clears saved settings from storage
     * @returns {boolean} Whether settings were cleared successfully
     */
    clearStorage() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error("Failed to clear settings from storage:", error);
            return false;
        }
    }
    
    /**
     * Checks if localStorage is available
     * @returns {boolean} Whether localStorage is available
     */
    isStorageAvailable() {
        try {
            const testKey = "__storage_test__";
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Gets the full API base URL including version
     * @returns {string} The API base URL
     */
    getApiBaseUrl() {
        const baseUrl = this.settings.apiBaseUrl || "/api";
        
        if (!this.settings.useApiVersionPrefix) {
            return baseUrl;
        }
        
        const version = this.settings.apiVersion || "v1";
        
        // Handle trailing slashes correctly
        const separator = baseUrl.endsWith("/") ? "" : "/";
        return `${baseUrl}${separator}${version}`;
    }
} 