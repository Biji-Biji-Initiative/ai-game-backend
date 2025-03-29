/**
 * Auth Manager Module
 * Manages user authentication
 */

/**
 *
 */
export class AuthManager {
    /**
     * Creates a new AuthManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            apiClient: null,
            config: null,
            errorHandler: null,
            tokenStorageKey: "api-tester-auth-token",
            userStorageKey: "api-tester-user-info",
            ...options
        };
        
        this.apiClient = this.options.apiClient;
        this.config = this.options.config;
        this.errorHandler = this.options.errorHandler;
        this.token = null;
        this.user = null;
        this.listeners = new Map();
        
        // Try to load token and user from storage
        this._loadFromStorage();
    }
    
    /**
     * Loads authentication data from storage
     * @private
     */
    _loadFromStorage() {
        try {
            // Load token
            const token = localStorage.getItem(this.options.tokenStorageKey);
            if (token) {
                this.token = token;
            }
            
            // Load user
            const userJson = localStorage.getItem(this.options.userStorageKey);
            if (userJson) {
                this.user = JSON.parse(userJson);
            }
            
            // Update API client with token
            if (this.token && this.apiClient) {
                this.apiClient.setAuthToken(this.token);
            }
        } catch (error) {
            console.error("Error loading authentication data from storage:", error);
        }
    }
    
    /**
     * Saves authentication data to storage
     * @private
     */
    _saveToStorage() {
        try {
            // Save token
            if (this.token) {
                localStorage.setItem(this.options.tokenStorageKey, this.token);
            } else {
                localStorage.removeItem(this.options.tokenStorageKey);
            }
            
            // Save user
            if (this.user) {
                localStorage.setItem(this.options.userStorageKey, JSON.stringify(this.user));
            } else {
                localStorage.removeItem(this.options.userStorageKey);
            }
        } catch (error) {
            console.error("Error saving authentication data to storage:", error);
        }
    }
    
    /**
     * Adds an event listener
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
     * Logs in a user
     * @param {string} email - The user's email
     * @param {string} password - The user's password
     * @returns {Promise<Object>} The login result
     */
    async login(email, password) {
        try {
            // Validate input
            if (!email || !password) {
                throw new Error("Email and password are required");
            }
            
            // Make login request
            const response = await this.apiClient.makeRequest(
                "POST",
                "/api/v1/auth/login",
                { email, password },
                { addAuthToken: false }
            );
            
            // Check response
            if (!response || !response.token) {
                throw new Error("Invalid server response");
            }
            
            // Save token and user
            this.token = response.token;
            this.user = response.user;
            
            // Save to storage
            this._saveToStorage();
            
            // Update API client with token
            if (this.apiClient) {
                this.apiClient.setAuthToken(this.token);
            }
            
            // Emit event
            this.emit("auth:login", { 
                user: this.user 
            });
            
            return {
                success: true,
                user: this.user
            };
        } catch (error) {
            console.error("Login error:", error);
            
            // Emit event
            this.emit("auth:error", { 
                error,
                action: "login"
            });
            
            // Re-throw with more context
            throw new Error(`Login failed: ${error.message}`);
        }
    }
    
    /**
     * Registers a new user
     * @param {string} name - The user's name
     * @param {string} email - The user's email
     * @param {string} password - The user's password
     * @returns {Promise<Object>} The registration result
     */
    async signup(name, email, password) {
        try {
            // Validate input
            if (!name || !email || !password) {
                throw new Error("Name, email, and password are required");
            }
            
            // Make signup request
            const response = await this.apiClient.makeRequest(
                "POST",
                "/api/v1/auth/signup",
                { name, email, password },
                { addAuthToken: false }
            );
            
            // Check response
            if (!response || !response.token) {
                throw new Error("Invalid server response");
            }
            
            // Save token and user
            this.token = response.token;
            this.user = response.user;
            
            // Save to storage
            this._saveToStorage();
            
            // Update API client with token
            if (this.apiClient) {
                this.apiClient.setAuthToken(this.token);
            }
            
            // Emit event
            this.emit("auth:signup", { 
                user: this.user 
            });
            
            return {
                success: true,
                user: this.user
            };
        } catch (error) {
            console.error("Signup error:", error);
            
            // Emit event
            this.emit("auth:error", { 
                error,
                action: "signup"
            });
            
            // Re-throw with more context
            throw new Error(`Signup failed: ${error.message}`);
        }
    }
    
    /**
     * Logs out the current user
     */
    logout() {
        // Clear token and user
        this.token = null;
        this.user = null;
        
        // Clear storage
        this._saveToStorage();
        
        // Clear API client token
        if (this.apiClient) {
            this.apiClient.clearAuthToken();
        }
        
        // Emit event
        this.emit("auth:logout");
    }
    
    /**
     * Checks if the user is logged in
     * @returns {boolean} Whether the user is logged in
     */
    isLoggedIn() {
        return !!this.token;
    }
    
    /**
     * Gets the current user
     * @returns {Object} The current user
     */
    getCurrentUser() {
        return this.user;
    }
    
    /**
     * Gets the current token
     * @returns {string} The current token
     */
    getToken() {
        return this.token;
    }
} 