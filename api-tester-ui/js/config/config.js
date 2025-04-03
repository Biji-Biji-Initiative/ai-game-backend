/**
 * Configuration Manager
 * Handles application configuration
 */

export class Config {
    /**
     * Creates a new Config instance
     * @param {Object} initialConfig - Initial configuration values
     */
    constructor(initialConfig = {}) {
        this.config = {
            // Default configuration
            apiBaseUrl: 'http://localhost:3080', // Base URL for API requests
            apiVersion: 'v1', // API version
            useApiVersionPrefix: true, // Whether to use API version in URL
            requestTimeout: 30000, // Request timeout in milliseconds
            maxHistoryItems: 50, // Maximum number of history items to store
            theme: 'light', // UI theme (light, dark, auto)
            ...initialConfig // Override with provided values
        };
        
        // Load configuration from storage
        this._loadFromStorage();
    }
    
    /**
     * Gets a configuration value
     * @param {string} key - The configuration key
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} The configuration value
     */
    get(key, defaultValue = null) {
        return key in this.config ? this.config[key] : defaultValue;
    }
    
    /**
     * Sets a configuration value
     * @param {string} key - The configuration key
     * @param {*} value - The configuration value
     */
    set(key, value) {
        this.config[key] = value;
        
        // Save to storage
        this._saveToStorage();
    }
    
    /**
     * Sets multiple configuration values
     * @param {Object} values - The configuration values
     */
    setMultiple(values) {
        Object.assign(this.config, values);
        
        // Save to storage
        this._saveToStorage();
    }
    
    /**
     * Gets all configuration values
     * @returns {Object} The configuration object
     */
    getAll() {
        return { ...this.config };
    }
    
    /**
     * Resets configuration to defaults
     * @returns {Promise<void>} Promise that resolves when reset is complete
     */
    async reset() {
        // Reset to defaults
        this.config = {
            apiBaseUrl: 'http://localhost:3080',
            apiVersion: 'v1',
            useApiVersionPrefix: true,
            requestTimeout: 30000,
            maxHistoryItems: 50,
            theme: 'light'
        };
        
        // Save to storage
        this._saveToStorage();
    }
    
    /**
     * Loads configuration from storage
     * @private
     */
    _loadFromStorage() {
        try {
            const storedConfig = localStorage.getItem('api-tester-config');
            if (storedConfig) {
                this.config = {
                    ...this.config,
                    ...JSON.parse(storedConfig)
                };
            }
        } catch (error) {
            console.error('Error loading configuration from storage:', error);
        }
    }
    
    /**
     * Saves configuration to storage
     * @private
     */
    _saveToStorage() {
        try {
            localStorage.setItem('api-tester-config', JSON.stringify(this.config));
        } catch (error) {
            console.error('Error saving configuration to storage:', error);
        }
    }
} 