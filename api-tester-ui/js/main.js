/**
 * Main entry point for the API Tester UI
 * 
 * This file is kept simple and just imports the core functionality
 * from app.js, which contains most of the application logic.
 */

// Import core functionality from app.js
import { appState, updateState, subscribeToState, initializeUI } from "./app.js";
import supabaseClient from "./services/supabase-client.js";
import settingsModal from "./ui/settings-modal.js";

// Make these accessible globally
window.appState = appState;
window.updateState = updateState;
window.subscribeToState = subscribeToState;
window.initializeUI = initializeUI;

console.log("API Tester UI initializing...");

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    // Initialize the UI
    initializeUI();
    
    // Check for authentication (both local and Supabase)
    checkAndRestoreAuthState();
    
    // Show welcome message if this is first visit
    if (!localStorage.getItem("hasVisitedBefore")) {
        showWelcomeMessage();
        localStorage.setItem("hasVisitedBefore", "true");
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Add settings button to header
    addSettingsButton();
});

/**
 * Add settings button to the header
 */
function addSettingsButton() {
    const headerActions = document.querySelector(".header-actions");
    if (!headerActions) return;
    
    // Create settings button
    const settingsButton = document.createElement("button");
    settingsButton.id = "settings-button";
    settingsButton.className = "btn";
    settingsButton.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"3\"></circle><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z\"></path></svg>";
    settingsButton.setAttribute("title", "Settings");
    
    // Add button just before the login button
    const loginButton = headerActions.querySelector("#login-button");
    if (loginButton) {
        headerActions.insertBefore(settingsButton, loginButton);
    } else {
        headerActions.appendChild(settingsButton);
    }
    
    // Add click event listener
    settingsButton.addEventListener("click", () => {
        settingsModal.show();
    });
}

/**
 * Check and restore authentication state from localStorage or Supabase
 */
async function checkAndRestoreAuthState() {
    // First check for local auth token (temporary solution)
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
        console.log("Found existing auth token, restoring authentication state");
        updateState({ 
            isAuthenticated: true,
            authToken
        });
    }
    
    // Then check for Supabase session (more reliable)
    try {
        const session = await supabaseClient.getSession();
        if (session) {
            console.log("Found active Supabase session, restoring authentication state");
            
            // Get user info
            const user = await supabaseClient.getUser();
            
            // Update app state with user info and token
            updateState({
                isAuthenticated: true,
                authToken: session.access_token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.email
                },
                lastEmail: user.email
            });
            
            // Store the token in localStorage for other parts of the app
            localStorage.setItem("authToken", session.access_token);
            localStorage.setItem("lastEmail", user.email);
        }
    } catch (error) {
        console.warn("Failed to restore Supabase session:", error);
    }
}

/**
 * Set up event listeners for the application
 */
function setupEventListeners() {
    // Login button in header
    const loginButton = document.getElementById("login-button");
    if (loginButton) {
        loginButton.addEventListener("click", () => {
            showLoginModal();
        });
    }
    
    // Theme toggle button
    const themeButton = document.getElementById("theme-toggle");
    if (themeButton) {
        themeButton.addEventListener("click", () => {
            const isDarkMode = document.body.classList.contains("dark-mode");
            updateState({ isDarkMode: !isDarkMode });
        });
    }
    
    // Refresh endpoints button
    const refreshButton = document.getElementById("refresh-endpoints");
    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            document.getElementById("loading").style.display = "block";
            
            // Force reload of endpoints
            // This will trigger a reload through the EndpointManager
            window.location.reload();
        });
    }
}

/**
 * Shows a welcome message for first-time users with quick start guide
 */
function showWelcomeMessage() {
    const mainContent = document.querySelector("#main-content");
    if (!mainContent) return;
    
    const welcomeMessage = document.createElement("div");
    welcomeMessage.className = "welcome-message";
    welcomeMessage.innerHTML = `
        <h2>Welcome to the API Tester UI</h2>
        <p>This tool helps you test the AI Back End Game API step by step, with no coding required.</p>
        
        <h3>Quick Start Guide:</h3>
        <ol>
            <li>Select a test flow from the sidebar or create your own</li>
            <li>Follow the steps in order to test API functionality</li>
            <li>View responses and extracted variables automatically</li>
            <li>Use variables from previous steps in subsequent requests</li>
        </ol>
        
        <h3>Tips for Non-Coders:</h3>
        <ul>
            <li>Green responses (200-299) mean the request was successful</li>
            <li>Red responses (400-599) indicate an error occurred</li>
            <li>Click on variable names to copy their values</li>
            <li>Use the "Run All Steps" button to execute a complete flow</li>
            <li><a href="docs/user-guide-for-non-coders.md" target="_blank">Read the detailed User Guide for Non-Coders</a></li>
        </ul>
        
        <div class="welcome-actions">
            <button id="welcome-login-btn" class="btn btn-primary">Login to Get Started</button>
            <button id="welcome-close-btn" class="btn btn-secondary">Close</button>
        </div>
    `;
    
    mainContent.appendChild(welcomeMessage);
    
    // Add event listeners to buttons
    welcomeMessage.querySelector("#welcome-login-btn").addEventListener("click", () => {
        welcomeMessage.remove();
        document.getElementById("login-button").click();
    });
    
    welcomeMessage.querySelector("#welcome-close-btn").addEventListener("click", () => {
        welcomeMessage.remove();
    });
}

/**
 * Shows the login modal
 */
function showLoginModal() {
    // Create modal container if it doesn't exist
    let modalContainer = document.querySelector(".modal-container");
    if (!modalContainer) {
        modalContainer = document.createElement("div");
        modalContainer.className = "modal-container";
        document.body.appendChild(modalContainer);
    }
    
    // Check for last used email
    const lastEmail = localStorage.getItem("lastEmail") || "";
    
    // Create modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Login to API Tester</h2>
                <button class="close-button">&times;</button>
            </div>
            <div class="modal-body">
                <div id="login-error" class="error-message" style="display: none;"></div>
                <div id="login-success" class="success-message" style="display: none;">Login successful!</div>
                
                <form id="login-form">
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" value="${lastEmail}" placeholder="Enter your email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" placeholder="Enter your password" required>
                        <small>Use at least 8 characters</small>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Login</button>
                        <div id="login-loading" class="loading-spinner" style="display: none;">
                            <div class="spinner"></div>
                            <span>Logging in...</span>
                        </div>
                    </div>
                </form>
                
                <div class="alternative-login">
                    <p>Or login with:</p>
                    <button id="supabase-login-button" class="btn btn-supabase">
                        <span class="supabase-icon">⚡</span> Supabase
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Show the modal
    modalContainer.style.display = "flex";
    
    // Add event listeners
    const closeButton = modalContainer.querySelector(".close-button");
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            modalContainer.style.display = "none";
        });
    }
    
    // Close on click outside
    modalContainer.addEventListener("click", (e) => {
        if (e.target === modalContainer) {
            modalContainer.style.display = "none";
        }
    });
    
    // Handle form submission
    const form = modalContainer.querySelector("#login-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // Handle Supabase login button click
    const supabaseLoginButton = modalContainer.querySelector("#supabase-login-button");
    if (supabaseLoginButton) {
        supabaseLoginButton.addEventListener("click", handleSupabaseLogin);
    }
}

/**
 * Handle standard login form submission
 */
async function handleLogin() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginLoading = document.getElementById("login-loading");
    const loginError = document.getElementById("login-error");
    const loginSuccess = document.getElementById("login-success");
    
    // Reset states
    loginLoading.style.display = "none";
    loginError.style.display = "none";
    loginSuccess.style.display = "none";
    
    // Validate inputs
    if (!emailInput.value) {
        loginError.textContent = "Please enter your email address";
        loginError.style.display = "block";
        return;
    }
    
    if (!passwordInput.value) {
        loginError.textContent = "Please enter your password";
        loginError.style.display = "block";
        return;
    }
    
    if (passwordInput.value.length < 8) {
        loginError.textContent = "Password must be at least 8 characters";
        loginError.style.display = "block";
        return;
    }
    
    // Save the email for next time
    localStorage.setItem("lastEmail", emailInput.value);
    
    // Show loading
    loginLoading.style.display = "flex";
    
    try {
        // Login with Supabase
        const { session, user } = await supabaseClient.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value
        });
        
        // Success
        loginLoading.style.display = "none";
        loginSuccess.style.display = "block";
        
        // Store auth token
        localStorage.setItem("authToken", session.access_token);
        
        // Update app state
        updateState({
            isAuthenticated: true,
            authToken: session.access_token,
            user: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.email
            },
            lastEmail: emailInput.value
        });
        
        // Close modal after a delay
        setTimeout(() => {
            const modalContainer = document.querySelector(".modal-container");
            if (modalContainer) {
                modalContainer.style.display = "none";
            }
            
            // Reload endpoints with the authenticated user
            window.location.reload();
        }, 1500);
    } catch (error) {
        loginLoading.style.display = "none";
        loginError.textContent = `Login failed: ${error.message}`;
        loginError.style.display = "block";
    }
}

/**
 * Handle Supabase OAuth login
 */
async function handleSupabaseLogin() {
    const loginLoading = document.getElementById("login-loading");
    const loginError = document.getElementById("login-error");
    const loginSuccess = document.getElementById("login-success");
    
    // Reset states
    loginLoading.style.display = "none";
    loginError.style.display = "none";
    loginSuccess.style.display = "none";
    
    // Show loading
    loginLoading.style.display = "flex";
    
    try {
        // Start the OAuth flow with Google (or any other provider)
        const { data, error } = await supabaseClient.signInWithOAuth({
            provider: "google"
        });
        
        if (error) {
            throw error;
        }
        
        // If successful, the page will redirect to the OAuth provider
        // The login will be handled after redirect in the checkAndRestoreAuthState function
        
        // If there's no redirect, show success and close
        loginLoading.style.display = "none";
        loginSuccess.style.display = "block";
        loginSuccess.textContent = "Redirecting to authentication provider...";
    } catch (error) {
        loginLoading.style.display = "none";
        loginError.textContent = `Supabase login failed: ${error.message}`;
        loginError.style.display = "block";
    }
}
