/**
 * Variable Extractor UI Component
 * Provides UI for extracting and managing variables from API responses
 */

/**
 * Creates a Variable Extractor component
 */
export class VariableExtractor {
    /**
     * Creates a new VariableExtractor
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            variableManager: null,
            container: null,
            onVariableExtract: null,
            ...options
        };
        
        this.variableManager = this.options.variableManager;
        this.container = this.options.container;
        this.extractionRules = [];
        this.currentResponse = null;
        
        if (!this.variableManager) {
            throw new Error('VariableManager is required for VariableExtractor');
        }
        
        if (!this.container) {
            throw new Error('Container element is required for VariableExtractor');
        }
        
        this.init();
    }
    
    /**
     * Initializes the component
     * @private
     */
    init() {
        // Create the base elements
        this.container.innerHTML = `
            <div class="variable-extractor">
                <div class="section-header">
                    <h3>Variables</h3>
                    <div class="section-actions">
                        <button type="button" class="btn btn-sm btn-secondary" id="extract-variables-btn">
                            Extract from Response
                        </button>
                        <button type="button" class="btn btn-sm" id="clear-variables-btn">
                            Clear All
                        </button>
                    </div>
                </div>
                
                <div class="variable-list-container">
                    <table class="variable-list">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Value</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="variable-list-body">
                            <!-- Variables will be added here -->
                            <tr class="empty-row">
                                <td colspan="3">No variables defined. Extract from response or add manually.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="variable-add">
                    <div class="input-group">
                        <input type="text" id="new-variable-name" placeholder="Variable name" class="form-control">
                        <input type="text" id="new-variable-value" placeholder="Value or JSONPath (e.g. $.data.id)" class="form-control">
                        <button type="button" class="btn btn-primary" id="add-variable-btn">Add</button>
                    </div>
                </div>
                
                <div class="extraction-modal hidden" id="extraction-modal">
                    <div class="extraction-modal-content">
                        <div class="extraction-modal-header">
                            <h4>Extract Variables from Response</h4>
                            <button type="button" class="close-btn" id="close-extraction-modal">&times;</button>
                        </div>
                        <div class="extraction-modal-body">
                            <p>Specify JSONPath expressions to extract values from the response. Use the $ symbol to reference the response object root.</p>
                            
                            <div class="extraction-rules" id="extraction-rules">
                                <!-- Extraction rules will be added here -->
                            </div>
                            
                            <div class="extraction-actions">
                                <button type="button" class="btn btn-secondary" id="add-extraction-rule">Add Rule</button>
                                <button type="button" class="btn btn-primary" id="apply-extraction-rules">Extract Variables</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Get the elements
        this.variableListBody = this.container.querySelector('#variable-list-body');
        this.extractVariablesBtn = this.container.querySelector('#extract-variables-btn');
        this.clearVariablesBtn = this.container.querySelector('#clear-variables-btn');
        this.addVariableBtn = this.container.querySelector('#add-variable-btn');
        this.newVariableName = this.container.querySelector('#new-variable-name');
        this.newVariableValue = this.container.querySelector('#new-variable-value');
        this.extractionModal = this.container.querySelector('#extraction-modal');
        this.closeExtractionModalBtn = this.container.querySelector('#close-extraction-modal');
        this.extractionRulesContainer = this.container.querySelector('#extraction-rules');
        this.addExtractionRuleBtn = this.container.querySelector('#add-extraction-rule');
        this.applyExtractionRulesBtn = this.container.querySelector('#apply-extraction-rules');
        
        // Add event listeners
        this.extractVariablesBtn.addEventListener('click', () => this.showExtractionModal());
        this.clearVariablesBtn.addEventListener('click', () => this.clearVariables());
        this.addVariableBtn.addEventListener('click', () => this.addVariable());
        this.closeExtractionModalBtn.addEventListener('click', () => this.hideExtractionModal());
        this.addExtractionRuleBtn.addEventListener('click', () => this.addExtractionRule());
        this.applyExtractionRulesBtn.addEventListener('click', () => this.applyExtractionRules());
        
        // Listen for variable changes
        this.variableManager.addEventListener('variable:set', () => this.renderVariables());
        this.variableManager.addEventListener('variable:deleted', () => this.renderVariables());
        this.variableManager.addEventListener('variables:cleared', () => this.renderVariables());
        this.variableManager.addEventListener('variables:loaded', () => this.renderVariables());
        
        // Initial render
        this.renderVariables();
    }
    
    /**
     * Updates the UI with the current variables
     */
    renderVariables() {
        const variables = this.variableManager.getVariables();
        const entries = Object.entries(variables);
        
        if (entries.length === 0) {
            this.variableListBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="3">No variables defined. Extract from response or add manually.</td>
                </tr>
            `;
            return;
        }
        
        this.variableListBody.innerHTML = '';
        
        entries.forEach(([name, value]) => {
            const row = document.createElement('tr');
            
            // Format value for display
            let displayValue = value;
            if (typeof value === 'object') {
                displayValue = JSON.stringify(value);
            }
            
            // Truncate long values
            const truncatedValue = typeof displayValue === 'string' && displayValue.length > 50
                ? displayValue.substring(0, 50) + '...'
                : displayValue;
            
            row.innerHTML = `
                <td class="variable-name">${name}</td>
                <td class="variable-value" title="${displayValue}">${truncatedValue}</td>
                <td class="variable-actions">
                    <button type="button" class="btn btn-sm btn-icon delete-variable" data-variable="${name}">🗑️</button>
                    <button type="button" class="btn btn-sm btn-icon copy-variable" data-variable="${name}">📋</button>
                </td>
            `;
            
            // Add event listeners for buttons
            row.querySelector('.delete-variable').addEventListener('click', () => {
                this.variableManager.deleteVariable(name);
            });
            
            row.querySelector('.copy-variable').addEventListener('click', () => {
                const variableSyntax = this.variableManager.options.variableSyntax;
                const variableRef = `${variableSyntax.prefix}${name}${variableSyntax.suffix}`;
                
                // Copy to clipboard
                navigator.clipboard.writeText(variableRef)
                    .then(() => {
                        // Show a notification
                        this.showNotification(`Copied ${variableRef} to clipboard`);
                    })
                    .catch(err => {
                        console.error('Failed to copy variable reference:', err);
                    });
            });
            
            this.variableListBody.appendChild(row);
        });
    }
    
    /**
     * Shows extraction modal
     */
    showExtractionModal() {
        if (!this.currentResponse) {
            this.showNotification('No response data available for extraction', 'warning');
            return;
        }
        
        // Clear existing rules
        this.extractionRules = [];
        this.extractionRulesContainer.innerHTML = '';
        
        // Add a default rule
        this.addExtractionRule();
        
        // Show the modal
        this.extractionModal.classList.remove('hidden');
        
        // Add a new section for common path suggestions based on the current response
        this.addPathSuggestions();
    }
    
    /**
     * Hides extraction modal
     */
    hideExtractionModal() {
        this.extractionModal.classList.add('hidden');
    }
    
    /**
     * Adds a new extraction rule to the UI
     */
    addExtractionRule() {
        const ruleId = `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const ruleContainer = document.createElement('div');
        ruleContainer.className = 'extraction-rule';
        ruleContainer.dataset.ruleId = ruleId;
        
        ruleContainer.innerHTML = `
            <div class="rule-inputs">
                <input type="text" class="form-control rule-name" placeholder="Variable name">
                <input type="text" class="form-control rule-path" placeholder="JSONPath (e.g. $.data.id)">
                <input type="text" class="form-control rule-default" placeholder="Default value (optional)">
            </div>
            <button type="button" class="btn btn-sm btn-icon remove-rule">🗑️</button>
            <div class="path-validation-result"></div>
        `;
        
        // Add event listener for remove button
        ruleContainer.querySelector('.remove-rule').addEventListener('click', () => {
            ruleContainer.remove();
        });
        
        // Add event listener for path input to validate JSONPath
        const pathInput = ruleContainer.querySelector('.rule-path');
        const validationResult = ruleContainer.querySelector('.path-validation-result');
        
        pathInput.addEventListener('input', () => {
            this.validateJsonPath(pathInput.value, validationResult);
        });
        
        // Add event listeners for blurand focus to perform real-time validation
        pathInput.addEventListener('blur', () => {
            if (pathInput.value && this.currentResponse) {
                this.testJsonPathExtraction(pathInput.value, validationResult);
            }
        });
        
        this.extractionRulesContainer.appendChild(ruleContainer);
        
        // Add to extraction rules array
        this.extractionRules.push({
            id: ruleId,
            name: '',
            path: '',
            defaultValue: ''
        });
    }
    
    /**
     * Validates if a string is a proper JSONPath
     */
    validateJsonPath(path, validationElement) {
        if (!path) {
            validationElement.innerHTML = '';
            return;
        }
        
        // Basic validation for JSONPath pattern
        const jsonPathIndicator = this.variableManager.options.variableSyntax.jsonPathIndicator;
        
        if (!path.startsWith(jsonPathIndicator)) {
            validationElement.innerHTML = `<small class="text-warning">Should start with ${jsonPathIndicator}</small>`;
            return;
        }
        
        // Check for common syntax issues
        if (path.includes('..') || path.includes('//')) {
            validationElement.innerHTML = '<small class="text-danger">Invalid path syntax</small>';
            return;
        }
        
        validationElement.innerHTML = '<small class="text-success">Valid syntax</small>';
    }
    
    /**
     * Tests if a JSONPath actually extracts a value from the current response
     */
    testJsonPathExtraction(path, validationElement) {
        if (!this.currentResponse || !path) return;
        
        try {
            const extractedValue = this.variableManager.extractValueFromResponse(this.currentResponse, path);
            
            if (extractedValue !== undefined) {
                let displayValue = typeof extractedValue === 'object' 
                    ? JSON.stringify(extractedValue).substring(0, 30) + (JSON.stringify(extractedValue).length > 30 ? '...' : '')
                    : String(extractedValue);
                    
                validationElement.innerHTML = `<small class="text-success">Found: ${displayValue}</small>`;
            } else {
                validationElement.innerHTML = '<small class="text-danger">No value found at this path</small>';
            }
        } catch (error) {
            validationElement.innerHTML = `<small class="text-danger">Error: ${error.message}</small>`;
        }
    }
    
    /**
     * Applies the extraction rules to the current response
     */
    applyExtractionRules() {
        if (!this.currentResponse) {
            this.showNotification('No response data available for extraction', 'warning');
            return;
        }
        
        // Update extraction rules from UI
        const ruleElements = this.extractionRulesContainer.querySelectorAll('.extraction-rule');
        
        const rules = Array.from(ruleElements).map(element => {
            const ruleId = element.dataset.ruleId;
            const name = element.querySelector('.rule-name').value.trim();
            const path = element.querySelector('.rule-path').value.trim();
            const defaultValue = element.querySelector('.rule-default').value.trim();
            
            return {
                id: ruleId,
                name,
                path,
                defaultValue: defaultValue || undefined
            };
        }).filter(rule => rule.name && rule.path);
        
        if (rules.length === 0) {
            this.showNotification('No valid extraction rules defined', 'warning');
            return;
        }
        
        // Extract variables
        try {
            const extractedVariables = this.variableManager.extractVariablesFromResponse(
                this.currentResponse,
                rules
            );
            
            // Close the modal
            this.hideExtractionModal();
            
            // Show notification
            if (extractedVariables.size > 0) {
                this.showNotification(`Successfully extracted ${extractedVariables.size} variables`, 'success');
                
                // Call the onVariableExtract callback if provided
                if (typeof this.options.onVariableExtract === 'function') {
                    this.options.onVariableExtract(extractedVariables);
                }
            } else {
                this.showNotification('No variables were extracted', 'warning');
            }
        } catch (error) {
            console.error('Error extracting variables:', error);
            this.showNotification('Error extracting variables', 'error');
        }
    }
    
    /**
     * Updates the current response data
     * @param {Object} response - The response data
     */
    setResponseData(response) {
        this.currentResponse = response;
    }
    
    /**
     * Adds a variable manually
     */
    addVariable() {
        const name = this.newVariableName.value.trim();
        let value = this.newVariableValue.value.trim();
        
        if (!name) {
            this.showNotification('Variable name is required', 'warning');
            return;
        }
        
        // Check if the value is a JSONPath and the current response is available
        if (value.startsWith('$.') && this.currentResponse) {
            try {
                const extractedValue = this.variableManager.extractValueFromResponse(
                    this.currentResponse,
                    value
                );
                
                if (extractedValue !== undefined) {
                    value = extractedValue;
                } else {
                    this.showNotification('JSONPath did not match any value in the response', 'warning');
                    return;
                }
            } catch (error) {
                console.error('Error extracting value from JSONPath:', error);
                this.showNotification('Error extracting value from JSONPath', 'error');
                return;
            }
        }
        
        // Add the variable
        this.variableManager.setVariable(name, value);
        
        // Clear the inputs
        this.newVariableName.value = '';
        this.newVariableValue.value = '';
        
        // Show notification
        this.showNotification(`Variable '${name}' added successfully`, 'success');
    }
    
    /**
     * Clears all variables
     */
    clearVariables() {
        if (confirm('Are you sure you want to clear all variables?')) {
            this.variableManager.clearVariables();
            this.showNotification('All variables cleared', 'success');
        }
    }
    
    /**
     * Shows a notification
     * @param {string} message - The notification message
     * @param {string} type - The notification type (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    /**
     * Adds a new section for common path suggestions based on the current response
     */
    addPathSuggestions() {
        if (!this.currentResponse) return;
        
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'path-suggestions';
        suggestionsContainer.innerHTML = '<h5>Suggested Paths</h5><div class="suggestion-chips"></div>';
        
        const chipsContainer = suggestionsContainer.querySelector('.suggestion-chips');
        
        // Generate suggestions based on response structure
        const suggestions = this.generatePathSuggestions(this.currentResponse);
        
        suggestions.forEach(suggestion => {
            const chip = document.createElement('span');
            chip.className = 'suggestion-chip';
            chip.textContent = suggestion;
            chip.title = 'Click to use this path';
            
            chip.addEventListener('click', () => {
                // Find the active/last rule input and set this value
                const lastRule = this.extractionRulesContainer.querySelector('.extraction-rule:last-child');
                if (lastRule) {
                    const pathInput = lastRule.querySelector('.rule-path');
                    pathInput.value = suggestion;
                    
                    // Trigger validation
                    const validationResult = lastRule.querySelector('.path-validation-result');
                    this.testJsonPathExtraction(suggestion, validationResult);
                    
                    // Set a suggested name
                    const nameInput = lastRule.querySelector('.rule-name');
                    if (!nameInput.value) {
                        // Extract a sensible name from the path
                        const parts = suggestion.replace(/^\$\./, '').split('.');
                        nameInput.value = parts[parts.length - 1];
                    }
                }
            });
            
            chipsContainer.appendChild(chip);
        });
        
        // Add to modal before the extraction rules
        const modalBody = this.extractionModal.querySelector('.extraction-modal-body');
        modalBody.insertBefore(suggestionsContainer, modalBody.firstChild);
    }
    
    /**
     * Generates path suggestions based on response structure
     */
    generatePathSuggestions(obj, prefix = '$', suggestions = []) {
        if (!obj || typeof obj !== 'object') return suggestions;
        
        // Limit to first level for arrays to prevent too many suggestions
        if (Array.isArray(obj)) {
            if (obj.length > 0 && typeof obj[0] === 'object') {
                // Add suggestions for first array item's properties
                this.generatePathSuggestions(obj[0], `${prefix}[0]`, suggestions);
            }
            return suggestions;
        }
        
        // For regular objects, add all properties
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const path = `${prefix}.${key}`;
                suggestions.push(path);
                
                // Only go one level deep to avoid too many suggestions
                if (typeof obj[key] === 'object' && obj[key] !== null && Object.keys(obj[key]).length < 5) {
                    this.generatePathSuggestions(obj[key], path, suggestions);
                }
            }
        }
        
        return suggestions;
    }
} 