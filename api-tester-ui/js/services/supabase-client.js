/**
 * Supabase Client Service
 * 
 * Handles Supabase authentication and database operations.
 * This service acts as a wrapper around the Supabase JavaScript client.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm";

class SupabaseClient {
    constructor() {
        // Default configuration - you can update these in the UI settings
        this.config = {
            url: localStorage.getItem("supabaseUrl") || "https://your-project-url.supabase.co",
            publicKey: localStorage.getItem("supabasePublicKey") || "your-public-key",
        };
        
        this.client = null;
        this.authListeners = [];
        
        // Initialize the client
        this.init();
        
        console.log("SupabaseClient initialized");
    }
    
    /**
     * Initialize the Supabase client
     * @returns {Object} Supabase client instance
     */
    init() {
        try {
            // Create the Supabase client
            this.client = createClient(this.config.url, this.config.publicKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    storage: localStorage
                }
            });
            
            // Set up auth state change listener
            this.client.auth.onAuthStateChange((event, session) => {
                console.log("Supabase auth state changed:", event, session ? "User authenticated" : "User signed out");
                
                // Notify listeners
                this.notifyAuthListeners(event, session);
            });
            
            return this.client;
        } catch (error) {
            console.error("Error initializing Supabase client:", error);
            throw error;
        }
    }
    
    /**
     * Update Supabase configuration
     * @param {Object} config - New configuration
     * @param {string} config.url - Supabase project URL
     * @param {string} config.publicKey - Supabase public (anon) key
     */
    updateConfig(config) {
        if (config.url) {
            this.config.url = config.url;
            localStorage.setItem("supabaseUrl", config.url);
        }
        
        if (config.publicKey) {
            this.config.publicKey = config.publicKey;
            localStorage.setItem("supabasePublicKey", config.publicKey);
        }
        
        // Re-initialize the client with new config
        this.init();
    }
    
    /**
     * Get the current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * Get the Supabase client instance
     * @returns {Object} Supabase client
     */
    getClient() {
        if (!this.client) {
            this.init();
        }
        return this.client;
    }
    
    /**
     * Sign up a new user
     * @param {Object} credentials - User credentials
     * @param {string} credentials.email - User email
     * @param {string} credentials.password - User password
     * @param {Object} [credentials.options] - Additional options
     * @returns {Promise<Object>} - Signup result
     */
    async signUp({ email, password, options = {} }) {
        try {
            const { data, error } = await this.client.auth.signUp({
                email,
                password,
                options
            });
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error("Error signing up:", error);
            throw error;
        }
    }
    
    /**
     * Sign in with email and password
     * @param {Object} credentials - User credentials
     * @param {string} credentials.email - User email
     * @param {string} credentials.password - User password
     * @returns {Promise<Object>} - Login result
     */
    async signInWithPassword({ email, password }) {
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error("Error signing in:", error);
            throw error;
        }
    }
    
    /**
     * Sign in with OAuth provider
     * @param {Object} options - OAuth options
     * @param {string} options.provider - OAuth provider (google, github, etc.)
     * @returns {Promise<Object>} - OAuth sign in result
     */
    async signInWithOAuth({ provider }) {
        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error(`Error signing in with ${provider}:`, error);
            throw error;
        }
    }
    
    /**
     * Sign out the current user
     * @returns {Promise<void>}
     */
    async signOut() {
        try {
            const { error } = await this.client.auth.signOut();
            
            if (error) {
                throw error;
            }
        } catch (error) {
            console.error("Error signing out:", error);
            throw error;
        }
    }
    
    /**
     * Get the current session
     * @returns {Promise<Object>} - Current session or null
     */
    async getSession() {
        try {
            const { data, error } = await this.client.auth.getSession();
            
            if (error) {
                throw error;
            }
            
            return data.session;
        } catch (error) {
            console.error("Error getting session:", error);
            throw error;
        }
    }
    
    /**
     * Get the current user
     * @returns {Promise<Object>} - Current user or null
     */
    async getUser() {
        try {
            const { data, error } = await this.client.auth.getUser();
            
            if (error) {
                throw error;
            }
            
            return data.user;
        } catch (error) {
            console.error("Error getting user:", error);
            throw error;
        }
    }
    
    /**
     * Refresh the current session
     * @returns {Promise<Object>} - New session
     */
    async refreshSession() {
        try {
            const { data, error } = await this.client.auth.refreshSession();
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error("Error refreshing session:", error);
            throw error;
        }
    }
    
    /**
     * Perform a database query
     * @param {string} table - Table name
     * @returns {Object} - Query builder
     */
    from(table) {
        return this.client.from(table);
    }
    
    /**
     * Add an auth state change listener
     * @param {Function} listener - Listener function
     */
    addAuthListener(listener) {
        if (typeof listener === "function") {
            this.authListeners.push(listener);
        }
    }
    
    /**
     * Remove an auth state change listener
     * @param {Function} listener - Listener function to remove
     */
    removeAuthListener(listener) {
        const index = this.authListeners.indexOf(listener);
        if (index !== -1) {
            this.authListeners.splice(index, 1);
        }
    }
    
    /**
     * Notify all auth state change listeners
     * @param {string} event - Auth event name
     * @param {Object} session - Auth session
     */
    notifyAuthListeners(event, session) {
        this.authListeners.forEach(listener => {
            try {
                listener(event, session);
            } catch (error) {
                console.error("Error in auth listener:", error);
            }
        });
    }
}

// Export a singleton instance
const supabaseClient = new SupabaseClient();
export default supabaseClient; 