/**
 * Variable Manager
 * 
 * Manages variables extracted from API responses that can be used in subsequent requests.
 * Supports storing, retrieving, and interpolating variables.
 */
class VariableManager {
    constructor() {
        this.variables = {};
        this.variablePattern = /\${([^}]+)}/g;
        this.listeners = [];
        
        // Load variables from localStorage if available
        this.loadFromStorage();
        
        console.log("VariableManager initialized with", Object.keys(this.variables).length, "variables");
    }
    
    /**
     * Load variables from localStorage
     */
    loadFromStorage() {
        try {
            const storedVariables = localStorage.getItem("apiTesterVariables");
            
            if (storedVariables) {
                this.variables = JSON.parse(storedVariables);
            }
        } catch (error) {
            console.error("Error loading variables from storage:", error);
        }
    }
    
    /**
     * Save variables to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem("apiTesterVariables", JSON.stringify(this.variables));
        } catch (error) {
            console.error("Error saving variables to storage:", error);
        }
    }
    
    /**
     * Set a variable
     * @param {string} name - Variable name
     * @param {*} value - Variable value
     * @param {boolean} [silent=false] - If true, don't notify listeners
     */
    setVariable(name, value, silent = false) {
        this.variables[name] = value;
        
        // Save to storage
        this.saveToStorage();
        
        // Notify listeners
        if (!silent) {
            this.notifyListeners({ type: "set", name, value });
        }
    }
    
    /**
     * Delete a variable
     * @param {string} name - Variable name
     * @param {boolean} [silent=false] - If true, don't notify listeners
     */
    deleteVariable(name, silent = false) {
        if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
            delete this.variables[name];
            
            // Save to storage
            this.saveToStorage();
            
            // Notify listeners
            if (!silent) {
                this.notifyListeners({ type: "delete", name });
            }
        }
    }
    
    /**
     * Get a variable
     * @param {string} name - Variable name
     * @returns {*} Variable value or undefined if not found
     */
    getVariable(name) {
        return this.variables[name];
    }
    
    /**
     * Get all variables
     * @returns {Object} All variables
     */
    getAllVariables() {
        return { ...this.variables };
    }
    
    /**
     * Clear all variables
     * @param {boolean} [silent=false] - If true, don't notify listeners
     */
    clearVariables(silent = false) {
        this.variables = {};
        
        // Save to storage
        this.saveToStorage();
        
        // Notify listeners
        if (!silent) {
            this.notifyListeners({ type: "clear" });
        }
    }
    
    /**
     * Check if a string contains variable references
     * @param {string} str - String to check
     * @returns {boolean} True if string contains variable references
     */
    hasVariables(str) {
        if (typeof str !== "string") return false;
        return this.variablePattern.test(str);
    }
    
    /**
     * Extract variables from an object or response
     * @param {Object} data - Data to extract variables from
     * @param {string} [prefix=""] - Prefix for variable names
     * @param {Object} [options={ maxDepth: 3 }] - Options for extraction
     */
    extractVariables(data, prefix = "", options = { maxDepth: 3 }) {
        if (!data || typeof data !== "object") return;
        
        // Don't go too deep in the object
        if (options.maxDepth <= 0) return;
        
        // Iterate through properties
        Object.entries(data).forEach(([key, value]) => {
            const varName = prefix ? `${prefix}.${key}` : key;
            
            if (value === null || value === undefined) {
                // Skip null or undefined values
                return;
            } else if (typeof value === "object" && !Array.isArray(value)) {
                // Recursively process objects
                this.extractVariables(value, varName, { 
                    ...options, 
                    maxDepth: options.maxDepth - 1 
                });
            } else {
                // Store primitive values and arrays
                this.setVariable(varName, value);
            }
        });
    }
    
    /**
     * Replace variables in a string
     * @param {string} str - String to interpolate
     * @returns {string} Interpolated string
     */
    interpolate(str) {
        if (typeof str !== "string") return str;
        
        return str.replace(this.variablePattern, (match, varName) => {
            const value = this.getVariable(varName);
            return value !== undefined ? value : match;
        });
    }
    
    /**
     * Replace variables in an object
     * @param {Object} obj - Object to interpolate
     * @returns {Object} New object with interpolated values
     */
    interpolateObject(obj) {
        if (!obj || typeof obj !== "object") return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.interpolateObject(item));
        }
        
        const result = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "string") {
                result[key] = this.interpolate(value);
            } else if (typeof value === "object" && value !== null) {
                result[key] = this.interpolateObject(value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }
    
    /**
     * Add a listener for variable changes
     * @param {Function} listener - Listener function
     */
    addListener(listener) {
        if (typeof listener === "function") {
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
     * Notify all listeners of a change
     * @param {Object} event - Event object
     */
    notifyListeners(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error("Error in variable listener:", error);
            }
        });
    }
}

export default VariableManager; 