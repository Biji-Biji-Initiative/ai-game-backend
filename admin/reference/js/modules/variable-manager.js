/**
 * Variable Manager Module
 * Handles extracting, storing, and applying variables from responses 
 * to be used in subsequent requests
 */

/**
 * Class for managing variables extracted from API responses
 */
export class VariableManager {
    /**
     * Creates a new VariableManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            // Whether to persist variables to localStorage
            persistVariables: true,
            // localStorage key for variable storage
            storageKey: 'api_tester_variables',
            // Variable syntax, used for pattern matching
            variableSyntax: {
                prefix: '{{',
                suffix: '}}',
                jsonPathIndicator: '$.'
            },
            ...options
        };
        
        this.variables = new Map();
        this.listeners = new Map();
        
        // Load variables from localStorage if enabled
        if (this.options.persistVariables) {
            this.loadVariables();
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
     * Loads variables from localStorage
     * @private
     */
    loadVariables() {
        try {
            const storedVariables = localStorage.getItem(this.options.storageKey);
            if (storedVariables) {
                const parsedVariables = JSON.parse(storedVariables);
                Object.entries(parsedVariables).forEach(([key, value]) => {
                    this.variables.set(key, value);
                });
                
                this.emit('variables:loaded', {
                    count: this.variables.size,
                    variables: this.getVariables()
                });
            }
        } catch (error) {
            console.error('Error loading variables from localStorage:', error);
        }
    }
    
    /**
     * Saves variables to localStorage
     * @private
     */
    saveVariables() {
        if (!this.options.persistVariables) return;
        
        try {
            const variables = Object.fromEntries(this.variables.entries());
            localStorage.setItem(this.options.storageKey, JSON.stringify(variables));
        } catch (error) {
            console.error('Error saving variables to localStorage:', error);
        }
    }
    
    /**
     * Extracts a value from a response using a JSONPath-like syntax
     * @param {Object} response - The response object to extract from
     * @param {string} path - JSONPath-like path, e.g. $.data.id
     * @returns {*} The extracted value or undefined if not found
     */
    extractValueFromResponse(response, path) {
        // Remove the JSONPath indicator if present
        const actualPath = path.startsWith(this.options.variableSyntax.jsonPathIndicator)
            ? path.substring(this.options.variableSyntax.jsonPathIndicator.length)
            : path;
        
        // Split the path into parts
        const parts = actualPath.split('.');
        
        // Traverse the response object
        let current = response;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            
            // Handle array indices, e.g. data.items[0].id
            if (part.includes('[') && part.includes(']')) {
                const [arrayName, indexStr] = part.split('[');
                const index = parseInt(indexStr.replace(']', ''), 10);
                
                if (current[arrayName] && Array.isArray(current[arrayName]) && current[arrayName][index] !== undefined) {
                    current = current[arrayName][index];
                } else {
                    return undefined;
                }
            } else {
                current = current[part];
            }
        }
        
        return current;
    }
    
    /**
     * Extracts variables from a response based on defined extraction rules
     * @param {Object} response - The response object
     * @param {Array} extractionRules - Rules for extracting variables
     * @returns {Map} Extracted variables
     */
    extractVariablesFromResponse(response, extractionRules) {
        const extractedVariables = new Map();
        
        extractionRules.forEach(rule => {
            const { name, path, defaultValue } = rule;
            
            if (!name || !path) {
                console.warn('Invalid extraction rule: name and path are required', rule);
                return;
            }
            
            try {
                const value = this.extractValueFromResponse(response, path);
                
                if (value !== undefined) {
                    extractedVariables.set(name, value);
                } else if (defaultValue !== undefined) {
                    extractedVariables.set(name, defaultValue);
                }
            } catch (error) {
                console.error(`Error extracting variable '${name}' from path '${path}':`, error);
                
                if (defaultValue !== undefined) {
                    extractedVariables.set(name, defaultValue);
                }
            }
        });
        
        // Add the extracted variables to our variables map
        extractedVariables.forEach((value, name) => {
            this.setVariable(name, value);
        });
        
        return extractedVariables;
    }
    
    /**
     * Sets a variable
     * @param {string} name - The variable name
     * @param {*} value - The variable value
     */
    setVariable(name, value) {
        // Don't store undefined values
        if (value === undefined) {
            return;
        }
        
        const oldValue = this.variables.get(name);
        this.variables.set(name, value);
        
        // Save to localStorage if enabled
        if (this.options.persistVariables) {
            this.saveVariables();
        }
        
        // Emit event
        this.emit('variable:set', {
            name,
            value,
            oldValue
        });
    }
    
    /**
     * Gets a variable by name
     * @param {string} name - The variable name
     * @returns {*} The variable value or undefined if not found
     */
    getVariable(name) {
        return this.variables.get(name);
    }
    
    /**
     * Checks if a variable exists
     * @param {string} name - The variable name
     * @returns {boolean} Whether the variable exists
     */
    hasVariable(name) {
        return this.variables.has(name);
    }
    
    /**
     * Deletes a variable
     * @param {string} name - The variable name
     * @returns {boolean} Whether the variable was deleted
     */
    deleteVariable(name) {
        const deleted = this.variables.delete(name);
        
        if (deleted) {
            // Save to localStorage if enabled
            if (this.options.persistVariables) {
                this.saveVariables();
            }
            
            // Emit event
            this.emit('variable:deleted', { name });
        }
        
        return deleted;
    }
    
    /**
     * Clears all variables
     */
    clearVariables() {
        this.variables.clear();
        
        // Save to localStorage if enabled
        if (this.options.persistVariables) {
            this.saveVariables();
        }
        
        // Emit event
        this.emit('variables:cleared');
    }
    
    /**
     * Gets all variables
     * @returns {Object} All variables as an object
     */
    getVariables() {
        return Object.fromEntries(this.variables.entries());
    }
    
    /**
     * Checks if a string contains variable references
     * @param {string} str - The string to check
     * @returns {boolean} Whether the string contains variable references
     */
    containsVariables(str) {
        if (typeof str !== 'string') return false;
        
        const { prefix, suffix } = this.options.variableSyntax;
        
        // Create regex to match variable references
        const variableRegex = new RegExp(`${escapeRegExp(prefix)}\\s*([^${escapeRegExp(suffix)}]+?)\\s*${escapeRegExp(suffix)}`, 'g');
        
        return variableRegex.test(str);
    }
    
    /**
     * Extracts variable names from a string
     * @param {string} str - The string to extract variable names from
     * @returns {Array<string>} Array of variable names
     */
    extractVariableNames(str) {
        if (typeof str !== 'string') return [];
        
        const { prefix, suffix } = this.options.variableSyntax;
        
        // Create regex to match variable references
        const variableRegex = new RegExp(`${escapeRegExp(prefix)}\\s*([^${escapeRegExp(suffix)}]+?)\\s*${escapeRegExp(suffix)}`, 'g');
        
        const variableNames = [];
        let match;
        
        while ((match = variableRegex.exec(str)) !== null) {
            // Extract just the variable name without whitespace
            const varName = match[1].trim();
            
            if (varName && !variableNames.includes(varName)) {
                variableNames.push(varName);
            }
        }
        
        return variableNames;
    }
    
    /**
     * Replaces variable references in a string with their values
     * @param {string} str - The string to process
     * @returns {string} The processed string
     */
    replaceVariablesInString(str) {
        if (typeof str !== 'string') {
            return str;
        }
        
        const { prefix, suffix } = this.options.variableSyntax;
        const pattern = new RegExp(`${prefix}([^${suffix}]+)${suffix}`, 'g');
        
        return str.replace(pattern, (match, variableName) => {
            const value = this.getVariable(variableName);
            
            if (value === undefined) {
                // Keep the reference if the variable is not found
                return match;
            }
            
            // Convert non-string values to strings
            return typeof value === 'string' ? value : JSON.stringify(value);
        });
    }
    
    /**
     * Processes an object or array to replace all variable references
     * @param {Object|Array|string} input - The input to process
     * @returns {Object|Array|string} The processed input
     */
    processVariables(input) {
        if (input === null || input === undefined) {
            return input;
        }
        
        if (typeof input === 'string') {
            return this.replaceVariablesInString(input);
        }
        
        if (typeof input === 'object') {
            // Handle arrays
            if (Array.isArray(input)) {
                return input.map(item => this.processVariables(item));
            }
            
            // Handle objects
            const result = {};
            for (const [key, value] of Object.entries(input)) {
                result[key] = this.processVariables(value);
            }
            return result;
        }
        
        // For other types, return as is
        return input;
    }
    
    /**
     * Processes a request by replacing variable references with their values
     * @param {Object} request - The request object to process
     * @returns {Object} The processed request with variables replaced
     */
    processRequest(request) {
        // Create a deep copy to avoid modifying the original
        const processedRequest = JSON.parse(JSON.stringify(request));
        
        // Process URL path
        if (processedRequest.path) {
            processedRequest.path = this.replaceVariables(processedRequest.path);
        }
        
        // Process headers
        if (processedRequest.headers) {
            for (const key in processedRequest.headers) {
                if (Object.prototype.hasOwnProperty.call(processedRequest.headers, key)) {
                    processedRequest.headers[key] = this.replaceVariables(processedRequest.headers[key]);
                }
            }
        }
        
        // Process body
        if (processedRequest.body) {
            if (typeof processedRequest.body === 'string') {
                processedRequest.body = this.replaceVariables(processedRequest.body);
            } else {
                // For object bodies, we need to convert to string and back
                const bodyStr = JSON.stringify(processedRequest.body);
                const processedBodyStr = this.replaceVariables(bodyStr);
                
                try {
                    processedRequest.body = JSON.parse(processedBodyStr);
                } catch (error) {
                    // If parsing fails, use the string version
                    processedRequest.body = processedBodyStr;
                }
            }
        }
        
        // Process params
        if (processedRequest.params) {
            for (const key in processedRequest.params) {
                if (Object.prototype.hasOwnProperty.call(processedRequest.params, key)) {
                    processedRequest.params[key] = this.replaceVariables(processedRequest.params[key]);
                }
            }
        }
        
        return processedRequest;
    }
}

// Helper function to escape special characters for use in RegExp
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
} 