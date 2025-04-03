/**
 * Settings Modal
 * 
 * Provides a modal interface for application settings including Supabase configuration.
 * Designed to be user-friendly for non-coders.
 */
import { appState, updateState } from "../app.js";
import SupabaseConfigUI from "./supabase-config.js";

class SettingsModal {
    constructor() {
        this.modalContainer = null;
        this.supabaseConfig = null;
        this.init();
    }
    
    /**
     * Initialize the settings modal
     */
    init() {
        // Create modal container if it doesn't exist
        if (!this.modalContainer) {
            this.modalContainer = document.createElement("div");
            this.modalContainer.className = "settings-modal-container";
            this.modalContainer.style.display = "none";
            document.body.appendChild(this.modalContainer);
        }
        
        console.log("SettingsModal initialized");
    }
    
    /**
     * Create the settings modal content
     */
    createModalContent() {
        this.modalContainer.innerHTML = `
            <div class="modal settings-modal">
                <div class="modal-header">
                    <h2>Application Settings</h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-tabs">
                        <button class="tab-button active" data-tab="general">General</button>
                        <button class="tab-button" data-tab="appearance">Appearance</button>
                        <button class="tab-button" data-tab="supabase">Supabase</button>
                        <button class="tab-button" data-tab="advanced">Advanced</button>
                    </div>
                    
                    <div class="tab-content">
                        <!-- General Settings Tab -->
                        <div class="tab-pane active" id="general-tab">
                            <h3>General Settings</h3>
                            
                            <div class="form-group">
                                <label for="api-base-url">API Base URL</label>
                                <input type="text" id="api-base-url" placeholder="https://your-api.example.com/api">
                                <small>Base URL for API requests</small>
                            </div>
                            
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="auto-extract-variables">
                                    Automatically extract variables from responses
                                </label>
                            </div>
                            
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="save-history">
                                    Save request history
                                </label>
                            </div>
                        </div>
                        
                        <!-- Appearance Tab -->
                        <div class="tab-pane" id="appearance-tab">
                            <h3>Appearance Settings</h3>
                            
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="dark-mode" ${appState.isDarkMode ? "checked" : ""}>
                                    Dark Mode
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label for="font-size">Font Size</label>
                                <select id="font-size">
                                    <option value="small">Small</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="large">Large</option>
                                </select>
                            </div>
                            
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="compact-view">
                                    Compact View
                                </label>
                            </div>
                        </div>
                        
                        <!-- Supabase Tab -->
                        <div class="tab-pane" id="supabase-tab">
                            <div id="supabase-config-container"></div>
                        </div>
                        
                        <!-- Advanced Tab -->
                        <div class="tab-pane" id="advanced-tab">
                            <h3>Advanced Settings</h3>
                            
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="debug-mode">
                                    Debug Mode
                                </label>
                                <small>Show detailed logs in the console</small>
                            </div>
                            
                            <div class="setting-item">
                                <label>
                                    <input type="checkbox" id="cache-enabled" checked>
                                    Enable Cache
                                </label>
                                <small>Cache API responses for faster loading</small>
                            </div>
                            
                            <div class="danger-zone">
                                <h4>Danger Zone</h4>
                                <button class="btn btn-danger" id="clear-data-btn">Clear All Data</button>
                                <small>This will clear all saved settings, variables, and history</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-settings">Cancel</button>
                    <button class="btn btn-primary" id="save-settings">Save Settings</button>
                </div>
            </div>
        `;
        
        // Initialize tab switching
        const tabButtons = this.modalContainer.querySelectorAll(".tab-button");
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                const tabName = button.getAttribute("data-tab");
                this.switchTab(tabName);
            });
        });
        
        // Initialize Supabase config UI
        const supabaseContainer = this.modalContainer.querySelector("#supabase-config-container");
        this.supabaseConfig = new SupabaseConfigUI(supabaseContainer);
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for the modal
     */
    setupEventListeners() {
        // Close button
        const closeButton = this.modalContainer.querySelector(".close-button");
        closeButton.addEventListener("click", () => {
            this.hide();
        });
        
        // Click outside to close
        this.modalContainer.addEventListener("click", (e) => {
            if (e.target === this.modalContainer) {
                this.hide();
            }
        });
        
        // Cancel button
        const cancelButton = this.modalContainer.querySelector("#cancel-settings");
        cancelButton.addEventListener("click", () => {
            this.hide();
        });
        
        // Save button
        const saveButton = this.modalContainer.querySelector("#save-settings");
        saveButton.addEventListener("click", () => {
            this.saveSettings();
        });
        
        // Dark mode toggle
        const darkModeCheckbox = this.modalContainer.querySelector("#dark-mode");
        darkModeCheckbox.addEventListener("change", () => {
            updateState({ isDarkMode: darkModeCheckbox.checked });
        });
        
        // Clear data button
        const clearDataBtn = this.modalContainer.querySelector("#clear-data-btn");
        clearDataBtn.addEventListener("click", () => {
            this.confirmClearData();
        });
    }
    
    /**
     * Switch between settings tabs
     * @param {string} tabName - Name of the tab to switch to
     */
    switchTab(tabName) {
        // Update tab buttons
        const tabButtons = this.modalContainer.querySelectorAll(".tab-button");
        tabButtons.forEach(button => {
            if (button.getAttribute("data-tab") === tabName) {
                button.classList.add("active");
            } else {
                button.classList.remove("active");
            }
        });
        
        // Update tab panes
        const tabPanes = this.modalContainer.querySelectorAll(".tab-pane");
        tabPanes.forEach(pane => {
            if (pane.id === `${tabName}-tab`) {
                pane.classList.add("active");
            } else {
                pane.classList.remove("active");
            }
        });
    }
    
    /**
     * Load current settings into the form
     */
    loadSettings() {
        // Load general settings
        const apiBaseUrlInput = this.modalContainer.querySelector("#api-base-url");
        apiBaseUrlInput.value = localStorage.getItem("apiBaseUrl") || "";
        
        const autoExtractVariables = this.modalContainer.querySelector("#auto-extract-variables");
        autoExtractVariables.checked = localStorage.getItem("autoExtractVariables") !== "false";
        
        const saveHistory = this.modalContainer.querySelector("#save-history");
        saveHistory.checked = localStorage.getItem("saveHistory") !== "false";
        
        // Load appearance settings
        const darkMode = this.modalContainer.querySelector("#dark-mode");
        darkMode.checked = appState.isDarkMode;
        
        const fontSize = this.modalContainer.querySelector("#font-size");
        fontSize.value = localStorage.getItem("fontSize") || "medium";
        
        const compactView = this.modalContainer.querySelector("#compact-view");
        compactView.checked = localStorage.getItem("compactView") === "true";
        
        // Load advanced settings
        const debugMode = this.modalContainer.querySelector("#debug-mode");
        debugMode.checked = localStorage.getItem("debugMode") === "true";
        
        const cacheEnabled = this.modalContainer.querySelector("#cache-enabled");
        cacheEnabled.checked = localStorage.getItem("cacheEnabled") !== "false";
    }
    
    /**
     * Save settings from the form
     */
    saveSettings() {
        // Save general settings
        const apiBaseUrlInput = this.modalContainer.querySelector("#api-base-url");
        const prevApiBaseUrl = localStorage.getItem("apiBaseUrl") || "";
        const newApiBaseUrl = apiBaseUrlInput.value;
        
        localStorage.setItem("apiBaseUrl", newApiBaseUrl);
        
        const autoExtractVariables = this.modalContainer.querySelector("#auto-extract-variables");
        localStorage.setItem("autoExtractVariables", autoExtractVariables.checked);
        
        const saveHistory = this.modalContainer.querySelector("#save-history");
        localStorage.setItem("saveHistory", saveHistory.checked);
        
        // Save appearance settings
        const darkMode = this.modalContainer.querySelector("#dark-mode");
        updateState({ isDarkMode: darkMode.checked });
        
        const fontSize = this.modalContainer.querySelector("#font-size");
        localStorage.setItem("fontSize", fontSize.value);
        document.documentElement.style.fontSize = this.getFontSizeValue(fontSize.value);
        
        const compactView = this.modalContainer.querySelector("#compact-view");
        localStorage.setItem("compactView", compactView.checked);
        if (compactView.checked) {
            document.body.classList.add("compact-view");
        } else {
            document.body.classList.remove("compact-view");
        }
        
        // Save advanced settings
        const debugMode = this.modalContainer.querySelector("#debug-mode");
        localStorage.setItem("debugMode", debugMode.checked);
        
        const cacheEnabled = this.modalContainer.querySelector("#cache-enabled");
        localStorage.setItem("cacheEnabled", cacheEnabled.checked);
        
        // Show success message and close
        this.showMessage("Settings saved successfully", "success");
        
        // Dispatch settingsSaved event for other components to react
        const settingsEvent = new CustomEvent("settingsSaved", {
            detail: {
                apiBaseUrl: newApiBaseUrl,
                apiBaseUrlChanged: prevApiBaseUrl !== newApiBaseUrl,
                debugMode: debugMode.checked,
                cacheEnabled: cacheEnabled.checked
            }
        });
        document.dispatchEvent(settingsEvent);
        
        setTimeout(() => {
            this.hide();
        }, 1500);
    }
    
    /**
     * Get CSS font size value
     * @param {string} size - Size name (small, medium, large)
     * @returns {string} CSS font size value
     */
    getFontSizeValue(size) {
        switch (size) {
            case "small":
                return "14px";
            case "large":
                return "18px";
            default:
                return "16px";
        }
    }
    
    /**
     * Show a message in the modal
     * @param {string} message - Message to show
     * @param {string} type - Message type (success, error, info)
     */
    showMessage(message, type = "info") {
        let messageEl = this.modalContainer.querySelector(".settings-message");
        
        if (!messageEl) {
            messageEl = document.createElement("div");
            messageEl.className = "settings-message";
            const footer = this.modalContainer.querySelector(".modal-footer");
            footer.prepend(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.className = `settings-message ${type}`;
        messageEl.style.display = "block";
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageEl.style.display = "none";
        }, 3000);
    }
    
    /**
     * Confirm and clear all data
     */
    confirmClearData() {
        const confirm = window.confirm(
            "Are you sure you want to clear all data? This will remove all saved settings, variables, and history."
        );
        
        if (confirm) {
            // Clear localStorage except for essential items
            const essentialItems = ["hasVisitedBefore"]; // Keep onboarding status
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!essentialItems.includes(key)) {
                    localStorage.removeItem(key);
                }
            }
            
            // Show success message
            this.showMessage("All data cleared successfully", "success");
            
            // Reload the page after a delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    }
    
    /**
     * Show the settings modal
     */
    show() {
        if (!this.modalContainer.innerHTML) {
            this.createModalContent();
        }
        
        // Load current settings
        this.loadSettings();
        
        // Show the modal
        this.modalContainer.style.display = "flex";
    }
    
    /**
     * Hide the settings modal
     */
    hide() {
        this.modalContainer.style.display = "none";
    }
}

// Create and export a singleton instance
const settingsModal = new SettingsModal();
export default settingsModal; 