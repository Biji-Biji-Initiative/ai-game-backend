/**
 * Variable Extractor
 * 
 * Extracts and displays variables from API responses.
 * Allows users to manually add, edit, and delete variables.
 */
class VariableExtractor {
    constructor(variableManager, container) {
        if (!variableManager) {
            throw new Error("VariableManager is required for VariableExtractor");
        }
        
        if (!container) {
            throw new Error("Container element is required for VariableExtractor");
        }
        
        this.variableManager = variableManager;
        this.container = typeof container === "string" 
            ? document.getElementById(container) 
            : container;
            
        if (!this.container) {
            throw new Error(`VariableExtractor container not found: ${container}`);
        }
        
        // Initialize the component
        this.init();
    }
    
    /**
     * Initialize the variable extractor
     */
    init() {
        // Create the UI
        this.createUI();
        
        // Add event listener for variable changes
        this.variableManager.addListener(this.handleVariableChange.bind(this));
        
        // Initial render of variables
        this.renderVariables();
        
        console.log("VariableExtractor initialized");
    }
    
    /**
     * Create the UI components
     */
    createUI() {
        // Clear container
        this.container.innerHTML = "";
        
        // Create header
        const header = document.createElement("div");
        header.className = "variable-header";
        
        const title = document.createElement("h3");
        title.textContent = "Variables";
        header.appendChild(title);
        
        // Create actions
        const actions = document.createElement("div");
        actions.className = "variable-actions";
        
        const addButton = document.createElement("button");
        addButton.className = "btn btn-sm";
        addButton.textContent = "Add";
        addButton.addEventListener("click", () => this.showAddVariableForm());
        
        const clearButton = document.createElement("button");
        clearButton.className = "btn btn-sm";
        clearButton.textContent = "Clear All";
        clearButton.addEventListener("click", () => this.clearAllVariables());
        
        actions.appendChild(addButton);
        actions.appendChild(clearButton);
        header.appendChild(actions);
        
        this.container.appendChild(header);
        
        // Create variables list
        this.variablesList = document.createElement("div");
        this.variablesList.className = "variable-list";
        this.container.appendChild(this.variablesList);
        
        // Create add variable form (hidden initially)
        this.addVariableForm = document.createElement("div");
        this.addVariableForm.className = "add-variable-form hidden";
        
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "form-control";
        nameInput.placeholder = "Variable name";
        
        const valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.className = "form-control";
        valueInput.placeholder = "Variable value";
        
        const formActions = document.createElement("div");
        formActions.className = "form-actions";
        
        const saveButton = document.createElement("button");
        saveButton.className = "btn btn-sm btn-primary";
        saveButton.textContent = "Save";
        saveButton.addEventListener("click", () => {
            this.addVariable(nameInput.value, valueInput.value);
            nameInput.value = "";
            valueInput.value = "";
            this.toggleAddForm(false);
        });
        
        const cancelButton = document.createElement("button");
        cancelButton.className = "btn btn-sm";
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", () => {
            nameInput.value = "";
            valueInput.value = "";
            this.toggleAddForm(false);
        });
        
        formActions.appendChild(saveButton);
        formActions.appendChild(cancelButton);
        
        this.addVariableForm.appendChild(nameInput);
        this.addVariableForm.appendChild(valueInput);
        this.addVariableForm.appendChild(formActions);
        
        this.container.appendChild(this.addVariableForm);
    }
    
    /**
     * Render variables in the list
     */
    renderVariables() {
        const variables = this.variableManager.getAllVariables();
        
        // Clear previous variables
        this.variablesList.innerHTML = "";
        
        if (Object.keys(variables).length === 0) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "empty-variables";
            emptyMessage.textContent = "No variables available";
            this.variablesList.appendChild(emptyMessage);
            return;
        }
        
        // Sort variable names alphabetically
        const sortedNames = Object.keys(variables).sort();
        
        // Create variable items
        sortedNames.forEach(name => {
            const value = variables[name];
            this.createVariableItem(name, value);
        });
    }
    
    /**
     * Create a variable item in the list
     * @param {string} name - Variable name
     * @param {*} value - Variable value
     */
    createVariableItem(name, value) {
        const item = document.createElement("div");
        item.className = "variable-item";
        item.title = `${name}=${JSON.stringify(value)}`;
        
        const nameEl = document.createElement("div");
        nameEl.className = "variable-name";
        nameEl.textContent = name;
        
        const valueEl = document.createElement("div");
        valueEl.className = "variable-value";
        valueEl.textContent = this.formatVariableValue(value);
        
        const actions = document.createElement("div");
        actions.className = "variable-item-actions";
        
        const editButton = document.createElement("button");
        editButton.className = "btn-icon";
        editButton.innerHTML = "✏️";
        editButton.title = "Edit";
        editButton.addEventListener("click", () => this.showEditVariableForm(name, value));
        
        const deleteButton = document.createElement("button");
        deleteButton.className = "btn-icon";
        deleteButton.innerHTML = "🗑️";
        deleteButton.title = "Delete";
        deleteButton.addEventListener("click", () => this.deleteVariable(name));
        
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        
        item.appendChild(nameEl);
        item.appendChild(valueEl);
        item.appendChild(actions);
        
        this.variablesList.appendChild(item);
    }
    
    /**
     * Format variable value for display
     * @param {*} value - Variable value
     * @returns {string} Formatted value
     */
    formatVariableValue(value) {
        if (value === null) return "null";
        if (value === undefined) return "undefined";
        
        if (typeof value === "object") {
            return Array.isArray(value) 
                ? `Array(${value.length})` 
                : `Object(${Object.keys(value).length})`;
        }
        
        if (typeof value === "string") {
            return value.length > 50 ? value.substring(0, 50) + "..." : value;
        }
        
        return String(value);
    }
    
    /**
     * Show the add variable form
     */
    showAddVariableForm() {
        this.toggleAddForm(true);
    }
    
    /**
     * Show the edit variable form
     * @param {string} name - Variable name
     * @param {*} value - Variable value
     */
    showEditVariableForm(name, value) {
        // Create edit form (replacing the add form temporarily)
        const form = this.addVariableForm;
        form.innerHTML = "";
        form.className = "edit-variable-form";
        
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "form-control";
        nameInput.placeholder = "Variable name";
        nameInput.value = name;
        
        const valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.className = "form-control";
        valueInput.placeholder = "Variable value";
        valueInput.value = typeof value === "object" 
            ? JSON.stringify(value)
            : String(value);
        
        const formActions = document.createElement("div");
        formActions.className = "form-actions";
        
        const updateButton = document.createElement("button");
        updateButton.className = "btn btn-sm btn-primary";
        updateButton.textContent = "Update";
        updateButton.addEventListener("click", () => {
            // Delete old variable if name changed
            if (nameInput.value !== name) {
                this.variableManager.deleteVariable(name);
            }
            
            // Parse value if it looks like JSON
            let parsedValue = valueInput.value;
            if (valueInput.value.trim().startsWith("{") || 
                valueInput.value.trim().startsWith("[")) {
                try {
                    parsedValue = JSON.parse(valueInput.value);
                } catch (e) {
                    // Keep as string if parsing fails
                }
            }
            
            // Add updated variable
            this.variableManager.setVariable(nameInput.value, parsedValue);
            
            // Restore add form
            this.createUI();
            this.renderVariables();
        });
        
        const cancelButton = document.createElement("button");
        cancelButton.className = "btn btn-sm";
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", () => {
            // Restore add form
            this.createUI();
            this.renderVariables();
        });
        
        formActions.appendChild(updateButton);
        formActions.appendChild(cancelButton);
        
        form.appendChild(nameInput);
        form.appendChild(valueInput);
        form.appendChild(formActions);
        
        // Show the form
        form.classList.remove("hidden");
    }
    
    /**
     * Toggle the add variable form
     * @param {boolean} show - Whether to show the form
     */
    toggleAddForm(show) {
        this.addVariableForm.classList.toggle("hidden", !show);
    }
    
    /**
     * Add a new variable
     * @param {string} name - Variable name
     * @param {string} value - Variable value
     */
    addVariable(name, value) {
        if (!name.trim()) {
            alert("Variable name cannot be empty");
            return;
        }
        
        // Try to parse value if it looks like JSON
        let parsedValue = value;
        if (value.trim().startsWith("{") || value.trim().startsWith("[")) {
            try {
                parsedValue = JSON.parse(value);
            } catch (e) {
                // Keep as string if parsing fails
            }
        }
        
        this.variableManager.setVariable(name, parsedValue);
    }
    
    /**
     * Delete a variable
     * @param {string} name - Variable name
     */
    deleteVariable(name) {
        if (confirm(`Delete variable "${name}"?`)) {
            this.variableManager.deleteVariable(name);
        }
    }
    
    /**
     * Clear all variables
     */
    clearAllVariables() {
        if (confirm("Clear all variables?")) {
            this.variableManager.clearVariables();
        }
    }
    
    /**
     * Handle variable changes
     * @param {Object} event - Variable change event
     */
    handleVariableChange(event) {
        // Re-render variables when they change
        this.renderVariables();
    }
    
    /**
     * Extract variables from an API response
     * @param {Object} response - The response object
     * @param {*} data - The response data
     * @param {Object} options - Extraction options
     */
    extractFromResponse(response, data, options = {}) {
        try {
            if (!data) return;
            
            // Default options
            const extractOptions = {
                prefix: options.prefix || "",
                maxDepth: options.maxDepth || 3
            };
            
            // Extract variables from response data
            this.variableManager.extractVariables(data, extractOptions.prefix, extractOptions);
            
            console.log("Variables extracted from response");
        } catch (error) {
            console.error("Error extracting variables:", error);
        }
    }
}

export default VariableExtractor; 