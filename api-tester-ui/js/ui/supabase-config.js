/**
 * Supabase Configuration UI
 * 
 * Provides a user interface for configuring Supabase connection details.
 * This allows users to easily set their project URL and API key without coding.
 */
import supabaseClient from "../services/supabase-client.js";

class SupabaseConfigUI {
    constructor(container) {
        this.container = typeof container === "string" 
            ? document.getElementById(container) 
            : container;
            
        if (!this.container) {
            throw new Error("Container element is required for SupabaseConfigUI");
        }
        
        this.init();
    }
    
    /**
     * Initialize the Supabase configuration UI
     */
    init() {
        // Create the UI
        this.createUI();
        
        // Load current configuration
        this.loadConfig();
        
        console.log("SupabaseConfigUI initialized");
    }
    
    /**
     * Create the configuration UI
     */
    createUI() {
        this.container.innerHTML = "";
        
        // Create header
        const header = document.createElement("div");
        header.className = "config-header";
        header.innerHTML = `
            <h3>Supabase Configuration</h3>
            <p class="config-description">
                Connect to your Supabase project by providing your project URL and anonymous key.
                You can find these details in your Supabase project settings under "API".
            </p>
        `;
        this.container.appendChild(header);
        
        // Create form
        const form = document.createElement("form");
        form.className = "config-form";
        form.innerHTML = `
            <div class="form-group">
                <label for="supabase-url">Project URL</label>
                <input type="url" id="supabase-url" placeholder="https://your-project-id.supabase.co" required>
                <small>Your Supabase project URL</small>
            </div>
            
            <div class="form-group">
                <label for="supabase-key">API Key</label>
                <input type="text" id="supabase-key" placeholder="eyJh..." required>
                <small>Your Supabase <strong>anon/public</strong> key (NOT the service key)</small>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Save Configuration</button>
                <button type="button" class="btn btn-secondary" id="test-connection-btn">Test Connection</button>
            </div>
            
            <div class="connection-status" style="display: none;"></div>
        `;
        this.container.appendChild(form);
        
        // Add event listeners
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.saveConfig();
        });
        
        const testBtn = form.querySelector("#test-connection-btn");
        testBtn.addEventListener("click", () => {
            this.testConnection();
        });
        
        // Store references to elements
        this.form = form;
        this.urlInput = form.querySelector("#supabase-url");
        this.keyInput = form.querySelector("#supabase-key");
        this.statusEl = form.querySelector(".connection-status");
    }
    
    /**
     * Load current configuration
     */
    loadConfig() {
        const config = supabaseClient.getConfig();
        
        if (config.url && config.url !== "https://your-project-url.supabase.co") {
            this.urlInput.value = config.url;
        }
        
        if (config.publicKey && config.publicKey !== "your-public-key") {
            this.keyInput.value = config.publicKey;
        }
    }
    
    /**
     * Save the configuration
     */
    saveConfig() {
        const url = this.urlInput.value.trim();
        const key = this.keyInput.value.trim();
        
        if (!url) {
            this.showStatus("Please enter your Supabase project URL", "error");
            return;
        }
        
        if (!key) {
            this.showStatus("Please enter your Supabase API key", "error");
            return;
        }
        
        try {
            // Update Supabase client configuration
            supabaseClient.updateConfig({
                url,
                publicKey: key
            });
            
            this.showStatus("Configuration saved successfully", "success");
            
            // Test the connection
            setTimeout(() => {
                this.testConnection();
            }, 500);
        } catch (error) {
            console.error("Error saving Supabase configuration:", error);
            this.showStatus(`Error saving configuration: ${error.message}`, "error");
        }
    }
    
    /**
     * Test the Supabase connection
     */
    async testConnection() {
        this.showStatus("Testing connection...", "info");
        
        try {
            // Try to get the current session
            await supabaseClient.getClient().auth.getSession();
            
            // If no error, connection is successful
            this.showStatus("Connection successful! Your Supabase configuration is working.", "success");
        } catch (error) {
            console.error("Supabase connection test failed:", error);
            this.showStatus(`Connection failed: ${error.message}`, "error");
        }
    }
    
    /**
     * Show a status message
     * @param {string} message - Status message
     * @param {string} type - Message type (success, error, info)
     */
    showStatus(message, type = "info") {
        this.statusEl.textContent = message;
        this.statusEl.className = `connection-status ${type}`;
        this.statusEl.style.display = "block";
        
        // Auto-hide info messages after 5 seconds
        if (type === "info") {
            setTimeout(() => {
                this.statusEl.style.display = "none";
            }, 5000);
        }
    }
    
    /**
     * Show the configuration UI
     */
    show() {
        this.container.style.display = "block";
    }
    
    /**
     * Hide the configuration UI
     */
    hide() {
        this.container.style.display = "none";
    }
}

export default SupabaseConfigUI; 