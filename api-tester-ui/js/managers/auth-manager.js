/**
 * Auth Manager
 * 
 * Handles user authentication, token management, and login state.
 */
class AuthManager {
    constructor(options = {}) {
        this.options = {
            tokenKey: "auth_token",
            userKey: "auth_user",
            lastEmailKey: "last_email",
            loginEndpoint: "/api/auth/login",
            registerEndpoint: "/api/auth/register",
            logoutEndpoint: "/api/auth/logout",
            profileEndpoint: "/api/users/profile",
            onAuthStateChange: null,
            ...options
        };
        
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authToken = null;
        this.lastEmail = localStorage.getItem(this.options.lastEmailKey) || "";
        this.listeners = [];
        
        // Initialize authentication state
        this.init();
    }
    
    /**
     * Initialize the auth manager and load saved auth state
     */
    init() {
        console.log("Initializing AuthManager");
        
        // Load token from storage
        this.authToken = localStorage.getItem(this.options.tokenKey);
        
        // Load user from storage if available
        const savedUser = localStorage.getItem(this.options.userKey);
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
            } catch (error) {
                console.error("Error parsing saved user:", error);
                this.currentUser = null;
                localStorage.removeItem(this.options.userKey);
            }
        }
        
        // Update authentication state
        this.isAuthenticated = !!this.authToken;
        
        // Notify listeners of initial state
        if (this.isAuthenticated) {
            this.notifyListeners({
                type: "auth:initialized",
                isAuthenticated: true,
                user: this.currentUser
            });
        } else {
            this.notifyListeners({
                type: "auth:initialized",
                isAuthenticated: false
            });
        }
        
        console.log("Auth state initialized:", this.isAuthenticated ? "Authenticated" : "Not authenticated");
    }
    
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} Registration result
     */
    async register(userData) {
        try {
            const response = await fetch(this.options.registerEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }
            
            // Save the email for future logins
            if (userData.email) {
                this.lastEmail = userData.email;
                localStorage.setItem(this.options.lastEmailKey, userData.email);
            }
            
            // If registration auto-logs in the user, handle the token
            if (data.token) {
                return this.handleAuthResponse(data);
            }
            
            return {
                success: true,
                message: "Registration successful",
                data
            };
        } catch (error) {
            console.error("Registration error:", error);
            throw error;
        }
    }
    
    /**
     * Login a user
     * @param {Object} credentials - User login credentials
     * @returns {Promise<Object>} Login result
     */
    async login(credentials) {
        try {
            const response = await fetch(this.options.loginEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }
            
            // Save the email for future logins
            if (credentials.email) {
                this.lastEmail = credentials.email;
                localStorage.setItem(this.options.lastEmailKey, credentials.email);
            }
            
            return this.handleAuthResponse(data);
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    }
    
    /**
     * Logout the current user
     * @returns {Promise<Object>} Logout result
     */
    async logout() {
        try {
            // Call logout endpoint if available
            if (this.authToken) {
                try {
                    await fetch(this.options.logoutEndpoint, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${this.authToken}`,
                            "Content-Type": "application/json"
                        }
                    });
                } catch (error) {
                    console.warn("Error calling logout endpoint:", error);
                    // Continue with local logout even if the API call fails
                }
            }
            
            // Clear local auth data
            this.clearAuthData();
            
            // Notify listeners
            this.notifyListeners({
                type: "auth:logout",
                isAuthenticated: false
            });
            
            return {
                success: true,
                message: "Logout successful"
            };
        } catch (error) {
            console.error("Logout error:", error);
            
            // Force logout locally even if the API call fails
            this.clearAuthData();
            
            this.notifyListeners({
                type: "auth:logout",
                isAuthenticated: false,
                error: error.message
            });
            
            throw error;
        }
    }
    
    /**
     * Get the current user profile
     * @returns {Promise<Object>} User profile
     */
    async getProfile() {
        if (!this.isAuthenticated) {
            throw new Error("Not authenticated");
        }
        
        try {
            const response = await fetch(this.options.profileEndpoint, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.authToken}`,
                    "Content-Type": "application/json"
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || "Failed to get profile");
            }
            
            // Update user data
            this.currentUser = data.user || data;
            localStorage.setItem(this.options.userKey, JSON.stringify(this.currentUser));
            
            // Notify listeners
            this.notifyListeners({
                type: "auth:profile-updated",
                isAuthenticated: true,
                user: this.currentUser
            });
            
            return {
                success: true,
                user: this.currentUser
            };
        } catch (error) {
            console.error("Get profile error:", error);
            
            // If unauthorized, clear auth data
            if (error.message.includes("unauthorized") || error.message.includes("Unauthorized")) {
                this.clearAuthData();
                
                this.notifyListeners({
                    type: "auth:session-expired",
                    isAuthenticated: false,
                    error: "Session expired"
                });
            }
            
            throw error;
        }
    }
    
    /**
     * Handle authentication response
     * @param {Object} data - Response data from login or register
     * @returns {Object} Processing result
     */
    handleAuthResponse(data) {
        // Extract token from response
        const token = data.token || data.access_token || data.authToken;
        
        if (!token) {
            throw new Error("No authentication token received");
        }
        
        // Extract user data
        const user = data.user || data.userData || data;
        
        // Save authentication data
        this.authToken = token;
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Save to local storage
        localStorage.setItem(this.options.tokenKey, token);
        localStorage.setItem(this.options.userKey, JSON.stringify(user));
        
        // Notify listeners
        this.notifyListeners({
            type: "auth:login",
            isAuthenticated: true,
            user: this.currentUser
        });
        
        return {
            success: true,
            message: "Authentication successful",
            user: this.currentUser,
            token
        };
    }
    
    /**
     * Clear authentication data
     */
    clearAuthData() {
        this.authToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem(this.options.tokenKey);
        localStorage.removeItem(this.options.userKey);
        
        // Note: We keep the last email for convenience
    }
    
    /**
     * Check if the user is authenticated
     * @returns {boolean} Authentication status
     */
    checkAuthenticated() {
        return this.isAuthenticated && !!this.authToken;
    }
    
    /**
     * Get the current authentication token
     * @returns {string|null} Auth token
     */
    getToken() {
        return this.authToken;
    }
    
    /**
     * Get the current user
     * @returns {Object|null} User object
     */
    getUser() {
        return this.currentUser;
    }
    
    /**
     * Get the last used email
     * @returns {string} Last email
     */
    getLastEmail() {
        return this.lastEmail;
    }
    
    /**
     * Add a listener for auth events
     * @param {Function} listener - Listener function
     */
    addListener(listener) {
        if (typeof listener === "function" && !this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }
    
    /**
     * Remove a listener
     * @param {Function} listener - Listener function to remove
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    /**
     * Notify all listeners of an event
     * @param {Object} event - Event object
     */
    notifyListeners(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error("Error in auth manager listener:", error);
            }
        });
        
        // Call the onAuthStateChange callback if provided
        if (typeof this.options.onAuthStateChange === "function") {
            try {
                this.options.onAuthStateChange(event);
            } catch (error) {
                console.error("Error in onAuthStateChange callback:", error);
            }
        }
    }
}

export default AuthManager; 