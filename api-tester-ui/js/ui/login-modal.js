/**
 * Login Modal Component
 * 
 * Provides a modal dialog for user authentication.
 * Supports login and registration forms.
 */
class LoginModal {
    constructor(options = {}) {
        this.options = {
            authManager: null,
            onLogin: null,
            onRegister: null,
            onClose: null,
            ...options
        };
        
        this.authManager = this.options.authManager;
        
        if (!this.authManager) {
            throw new Error("AuthManager is required for LoginModal");
        }
        
        this.modal = null;
        this.isOpen = false;
        this.isLoading = false;
        this.isRegisterMode = false;
        
        this.init();
    }
    
    /**
     * Initialize the login modal
     */
    init() {
        // Create the modal element
        this.createModal();
        
        console.log("LoginModal initialized");
    }
    
    /**
     * Create the modal element
     */
    createModal() {
        // Create modal container
        this.modal = document.createElement("div");
        this.modal.className = "login-modal-container hidden";
        
        // Create modal content
        const modalContent = document.createElement("div");
        modalContent.className = "login-modal-content";
        
        // Create modal header
        const modalHeader = document.createElement("div");
        modalHeader.className = "login-modal-header";
        
        this.modalTitle = document.createElement("h3");
        this.modalTitle.textContent = "Login";
        modalHeader.appendChild(this.modalTitle);
        
        const closeButton = document.createElement("button");
        closeButton.className = "close-button";
        closeButton.innerHTML = "&times;";
        closeButton.addEventListener("click", () => this.close());
        modalHeader.appendChild(closeButton);
        
        modalContent.appendChild(modalHeader);
        
        // Create modal body
        this.modalBody = document.createElement("div");
        this.modalBody.className = "login-modal-body";
        
        // Create login form
        this.loginForm = this.createLoginForm();
        this.modalBody.appendChild(this.loginForm);
        
        // Create register form (hidden initially)
        this.registerForm = this.createRegisterForm();
        this.registerForm.classList.add("hidden");
        this.modalBody.appendChild(this.registerForm);
        
        modalContent.appendChild(this.modalBody);
        
        // Create modal footer
        const modalFooter = document.createElement("div");
        modalFooter.className = "login-modal-footer";
        
        // Create mode toggle link
        this.toggleLink = document.createElement("a");
        this.toggleLink.href = "#";
        this.toggleLink.className = "mode-toggle";
        this.toggleLink.textContent = "Need an account? Register";
        this.toggleLink.addEventListener("click", (e) => {
            e.preventDefault();
            this.toggleMode();
        });
        
        modalFooter.appendChild(this.toggleLink);
        modalContent.appendChild(modalFooter);
        
        // Error message container
        this.errorContainer = document.createElement("div");
        this.errorContainer.className = "error-message hidden";
        modalContent.appendChild(this.errorContainer);
        
        this.modal.appendChild(modalContent);
        
        // Add modal to the body
        document.body.appendChild(this.modal);
        
        // Handle clicks outside the modal
        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }
    
    /**
     * Create the login form
     * @returns {HTMLElement} The login form element
     */
    createLoginForm() {
        const form = document.createElement("form");
        form.className = "login-form";
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Email field
        const emailGroup = document.createElement("div");
        emailGroup.className = "form-group";
        
        const emailLabel = document.createElement("label");
        emailLabel.htmlFor = "login-email";
        emailLabel.textContent = "Email";
        
        this.emailInput = document.createElement("input");
        this.emailInput.type = "email";
        this.emailInput.id = "login-email";
        this.emailInput.className = "form-control";
        this.emailInput.placeholder = "Enter your email";
        this.emailInput.required = true;
        this.emailInput.value = this.authManager.getLastEmail();
        
        emailGroup.appendChild(emailLabel);
        emailGroup.appendChild(this.emailInput);
        form.appendChild(emailGroup);
        
        // Password field
        const passwordGroup = document.createElement("div");
        passwordGroup.className = "form-group";
        
        const passwordLabel = document.createElement("label");
        passwordLabel.htmlFor = "login-password";
        passwordLabel.textContent = "Password";
        
        this.passwordInput = document.createElement("input");
        this.passwordInput.type = "password";
        this.passwordInput.id = "login-password";
        this.passwordInput.className = "form-control";
        this.passwordInput.placeholder = "Enter your password";
        this.passwordInput.required = true;
        
        passwordGroup.appendChild(passwordLabel);
        passwordGroup.appendChild(this.passwordInput);
        form.appendChild(passwordGroup);
        
        // Remember me
        const rememberGroup = document.createElement("div");
        rememberGroup.className = "form-check";
        
        this.rememberInput = document.createElement("input");
        this.rememberInput.type = "checkbox";
        this.rememberInput.id = "remember-me";
        this.rememberInput.className = "form-check-input";
        
        const rememberLabel = document.createElement("label");
        rememberLabel.htmlFor = "remember-me";
        rememberLabel.className = "form-check-label";
        rememberLabel.textContent = "Remember me";
        
        rememberGroup.appendChild(this.rememberInput);
        rememberGroup.appendChild(rememberLabel);
        form.appendChild(rememberGroup);
        
        // Submit button
        this.loginButton = document.createElement("button");
        this.loginButton.type = "submit";
        this.loginButton.className = "btn btn-primary btn-block";
        this.loginButton.textContent = "Login";
        form.appendChild(this.loginButton);
        
        return form;
    }
    
    /**
     * Create the registration form
     * @returns {HTMLElement} The registration form element
     */
    createRegisterForm() {
        const form = document.createElement("form");
        form.className = "register-form";
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Name field
        const nameGroup = document.createElement("div");
        nameGroup.className = "form-group";
        
        const nameLabel = document.createElement("label");
        nameLabel.htmlFor = "register-name";
        nameLabel.textContent = "Name";
        
        this.nameInput = document.createElement("input");
        this.nameInput.type = "text";
        this.nameInput.id = "register-name";
        this.nameInput.className = "form-control";
        this.nameInput.placeholder = "Enter your name";
        this.nameInput.required = true;
        
        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(this.nameInput);
        form.appendChild(nameGroup);
        
        // Email field
        const emailGroup = document.createElement("div");
        emailGroup.className = "form-group";
        
        const emailLabel = document.createElement("label");
        emailLabel.htmlFor = "register-email";
        emailLabel.textContent = "Email";
        
        this.registerEmailInput = document.createElement("input");
        this.registerEmailInput.type = "email";
        this.registerEmailInput.id = "register-email";
        this.registerEmailInput.className = "form-control";
        this.registerEmailInput.placeholder = "Enter your email";
        this.registerEmailInput.required = true;
        
        emailGroup.appendChild(emailLabel);
        emailGroup.appendChild(this.registerEmailInput);
        form.appendChild(emailGroup);
        
        // Password field
        const passwordGroup = document.createElement("div");
        passwordGroup.className = "form-group";
        
        const passwordLabel = document.createElement("label");
        passwordLabel.htmlFor = "register-password";
        passwordLabel.textContent = "Password";
        
        this.registerPasswordInput = document.createElement("input");
        this.registerPasswordInput.type = "password";
        this.registerPasswordInput.id = "register-password";
        this.registerPasswordInput.className = "form-control";
        this.registerPasswordInput.placeholder = "Enter your password";
        this.registerPasswordInput.required = true;
        
        passwordGroup.appendChild(passwordLabel);
        passwordGroup.appendChild(this.registerPasswordInput);
        form.appendChild(passwordGroup);
        
        // Confirm password field
        const confirmGroup = document.createElement("div");
        confirmGroup.className = "form-group";
        
        const confirmLabel = document.createElement("label");
        confirmLabel.htmlFor = "register-confirm";
        confirmLabel.textContent = "Confirm Password";
        
        this.confirmPasswordInput = document.createElement("input");
        this.confirmPasswordInput.type = "password";
        this.confirmPasswordInput.id = "register-confirm";
        this.confirmPasswordInput.className = "form-control";
        this.confirmPasswordInput.placeholder = "Confirm your password";
        this.confirmPasswordInput.required = true;
        
        confirmGroup.appendChild(confirmLabel);
        confirmGroup.appendChild(this.confirmPasswordInput);
        form.appendChild(confirmGroup);
        
        // Submit button
        this.registerButton = document.createElement("button");
        this.registerButton.type = "submit";
        this.registerButton.className = "btn btn-primary btn-block";
        this.registerButton.textContent = "Register";
        form.appendChild(this.registerButton);
        
        return form;
    }
    
    /**
     * Toggle between login and register modes
     */
    toggleMode() {
        this.isRegisterMode = !this.isRegisterMode;
        
        if (this.isRegisterMode) {
            // Switch to register mode
            this.modalTitle.textContent = "Register";
            this.loginForm.classList.add("hidden");
            this.registerForm.classList.remove("hidden");
            this.toggleLink.textContent = "Already have an account? Login";
        } else {
            // Switch to login mode
            this.modalTitle.textContent = "Login";
            this.registerForm.classList.add("hidden");
            this.loginForm.classList.remove("hidden");
            this.toggleLink.textContent = "Need an account? Register";
        }
        
        // Clear any error messages
        this.hideError();
    }
    
    /**
     * Handle login form submission
     */
    async handleLogin() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.hideError();
        this.setLoading(true);
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const remember = this.rememberInput.checked;
        
        try {
            const result = await this.authManager.login({
                email,
                password,
                remember
            });
            
            console.log("Login successful:", result);
            
            // Close the modal
            this.close();
            
            // Call the onLogin callback if provided
            if (typeof this.options.onLogin === "function") {
                this.options.onLogin(result);
            }
        } catch (error) {
            console.error("Login error:", error);
            this.showError(error.message || "Login failed");
        } finally {
            this.isLoading = false;
            this.setLoading(false);
        }
    }
    
    /**
     * Handle register form submission
     */
    async handleRegister() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.hideError();
        this.setLoading(true);
        
        const name = this.nameInput.value.trim();
        const email = this.registerEmailInput.value.trim();
        const password = this.registerPasswordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            this.showError("Passwords do not match");
            this.isLoading = false;
            this.setLoading(false);
            return;
        }
        
        try {
            const result = await this.authManager.register({
                name,
                email,
                password
            });
            
            console.log("Registration successful:", result);
            
            // Close the modal if registration automatically logs in
            if (result.token || this.authManager.checkAuthenticated()) {
                this.close();
                
                // Call the onLogin callback if provided
                if (typeof this.options.onLogin === "function") {
                    this.options.onLogin(result);
                }
            } else {
                // Switch to login mode
                this.isRegisterMode = false;
                this.modalTitle.textContent = "Login";
                this.registerForm.classList.add("hidden");
                this.loginForm.classList.remove("hidden");
                this.toggleLink.textContent = "Need an account? Register";
                
                // Prefill email
                this.emailInput.value = email;
                
                // Show success message
                this.showError("Registration successful! Please login.", "success");
            }
            
            // Call the onRegister callback if provided
            if (typeof this.options.onRegister === "function") {
                this.options.onRegister(result);
            }
        } catch (error) {
            console.error("Registration error:", error);
            this.showError(error.message || "Registration failed");
        } finally {
            this.isLoading = false;
            this.setLoading(false);
        }
    }
    
    /**
     * Set loading state
     * @param {boolean} isLoading - Whether the form is loading
     */
    setLoading(isLoading) {
        if (isLoading) {
            this.loginButton.disabled = true;
            this.loginButton.textContent = "Loading...";
            this.registerButton.disabled = true;
            this.registerButton.textContent = "Loading...";
        } else {
            this.loginButton.disabled = false;
            this.loginButton.textContent = "Login";
            this.registerButton.disabled = false;
            this.registerButton.textContent = "Register";
        }
    }
    
    /**
     * Show an error message
     * @param {string} message - The error message
     * @param {string} type - The message type (error or success)
     */
    showError(message, type = "error") {
        this.errorContainer.textContent = message;
        this.errorContainer.classList.remove("hidden");
        
        // Set the appropriate class based on type
        this.errorContainer.classList.remove("error-message", "success-message");
        this.errorContainer.classList.add(type === "error" ? "error-message" : "success-message");
    }
    
    /**
     * Hide the error message
     */
    hideError() {
        this.errorContainer.textContent = "";
        this.errorContainer.classList.add("hidden");
    }
    
    /**
     * Open the login modal
     * @param {boolean} registerMode - Whether to open in register mode
     */
    open(registerMode = false) {
        this.isRegisterMode = registerMode;
        
        // Set the appropriate mode
        if (this.isRegisterMode) {
            this.modalTitle.textContent = "Register";
            this.loginForm.classList.add("hidden");
            this.registerForm.classList.remove("hidden");
            this.toggleLink.textContent = "Already have an account? Login";
        } else {
            this.modalTitle.textContent = "Login";
            this.registerForm.classList.add("hidden");
            this.loginForm.classList.remove("hidden");
            this.toggleLink.textContent = "Need an account? Register";
        }
        
        // Show the modal
        this.modal.classList.remove("hidden");
        this.isOpen = true;
        
        // Focus the appropriate field
        if (this.isRegisterMode) {
            this.nameInput.focus();
        } else {
            this.emailInput.focus();
        }
        
        // Clear any error messages
        this.hideError();
    }
    
    /**
     * Close the login modal
     */
    close() {
        this.modal.classList.add("hidden");
        this.isOpen = false;
        
        // Clear any error messages
        this.hideError();
        
        // Call the onClose callback if provided
        if (typeof this.options.onClose === "function") {
            this.options.onClose();
        }
    }
    
    /**
     * Check if the modal is open
     * @returns {boolean} Whether the modal is open
     */
    isModalOpen() {
        return this.isOpen;
    }
}

export default LoginModal; 