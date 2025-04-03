/**
 * Steps UI Component
 * 
 * Manages and displays test steps in a flow.
 * Handles step execution, parameters, and results.
 */
import apiService from "../services/api-service.js";

class StepsUI {
    constructor(options = {}) {
        this.options = {
            container: null,
            endpointManager: null,
            variableManager: null,
            responseViewer: null,
            variableExtractor: null,
            apiService: null,
            onStepExecute: null,
            ...options
        };
        
        this.container = this.options.container;
        this.endpointManager = this.options.endpointManager;
        this.variableManager = this.options.variableManager;
        this.responseViewer = this.options.responseViewer;
        this.variableExtractor = this.options.variableExtractor;
        this.apiService = this.options.apiService || apiService; // Use provided or default apiService
        
        this.currentFlow = null;
        this.currentSteps = [];
        this.stepResponses = new Map();
        
        if (!this.container) {
            throw new Error("Container element is required for StepsUI");
        }
        
        if (!this.endpointManager) {
            throw new Error("EndpointManager is required for StepsUI");
        }
        
        if (!this.variableManager) {
            throw new Error("VariableManager is required for StepsUI");
        }
        
        this.init();
    }
    
    /**
     * Initialize the component
     */
    init() {
        // Create the UI structure
        this.createUI();
        
        console.log("StepsUI initialized");
    }
    
    /**
     * Create the UI components
     */
    createUI() {
        // Clear container
        this.container.innerHTML = "";
        
        // Create header
        const header = document.createElement("div");
        header.className = "steps-header";
        
        const title = document.createElement("h3");
        title.className = "steps-title";
        title.textContent = "Test Steps";
        header.appendChild(title);
        
        this.stepsInfo = document.createElement("div");
        this.stepsInfo.className = "steps-info";
        this.stepsInfo.textContent = "No flow selected";
        header.appendChild(this.stepsInfo);
        
        this.container.appendChild(header);
        
        // Create steps list container
        this.stepsList = document.createElement("div");
        this.stepsList.className = "steps-list";
        this.container.appendChild(this.stepsList);
        
        // Create step details container
        this.stepDetails = document.createElement("div");
        this.stepDetails.className = "step-details";
        this.container.appendChild(this.stepDetails);
        
        // Create actions container
        this.actionsContainer = document.createElement("div");
        this.actionsContainer.className = "steps-actions";
        
        this.runAllButton = document.createElement("button");
        this.runAllButton.className = "btn btn-primary";
        this.runAllButton.textContent = "Run All Steps";
        this.runAllButton.disabled = true;
        this.runAllButton.addEventListener("click", () => this.runAllSteps());
        
        this.clearResultsButton = document.createElement("button");
        this.clearResultsButton.className = "btn";
        this.clearResultsButton.textContent = "Clear Results";
        this.clearResultsButton.disabled = true;
        this.clearResultsButton.addEventListener("click", () => this.clearAllResults());
        
        this.actionsContainer.appendChild(this.runAllButton);
        this.actionsContainer.appendChild(this.clearResultsButton);
        
        this.container.appendChild(this.actionsContainer);
    }
    
    /**
     * Set the current flow and its steps
     * @param {Object} flow - The flow object
     */
    setFlow(flow) {
        if (!flow) {
            this.currentFlow = null;
            this.currentSteps = [];
            this.stepResponses.clear();
            this.stepsInfo.textContent = "No flow selected";
            this.stepsList.innerHTML = "";
            this.stepDetails.innerHTML = "";
            this.runAllButton.disabled = true;
            this.clearResultsButton.disabled = true;
            return;
        }
        
        this.currentFlow = flow;
        this.currentSteps = flow.steps || [];
        this.stepResponses.clear();
        
        // Update steps info
        this.stepsInfo.textContent = `${flow.name} (${this.currentSteps.length} steps)`;
        
        // Render steps
        this.renderSteps();
        
        // Enable/disable buttons
        this.runAllButton.disabled = this.currentSteps.length === 0;
        this.clearResultsButton.disabled = true;
    }
    
    /**
     * Render the steps list
     */
    renderSteps() {
        // Clear the steps list
        this.stepsList.innerHTML = "";
        
        if (this.currentSteps.length === 0) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "empty-steps";
            emptyMessage.textContent = "No steps defined for this flow";
            this.stepsList.appendChild(emptyMessage);
            return;
        }
        
        // Create step items
        this.currentSteps.forEach((step, index) => {
            const stepItem = this.createStepItem(step, index);
            this.stepsList.appendChild(stepItem);
        });
    }
    
    /**
     * Create a step item
     * @param {Object} step - The step object
     * @param {number} index - The step index
     * @returns {HTMLElement} The step item element
     */
    createStepItem(step, index) {
        const item = document.createElement("div");
        item.className = "step-item";
        item.dataset.stepIndex = index;
        
        // Get endpoint details
        const endpoint = this.endpointManager.getEndpointById(step.endpointId);
        
        if (!endpoint) {
            item.classList.add("error");
            item.innerHTML = `
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-name">Unknown Endpoint</div>
                    <div class="step-error">Endpoint not found: ${step.endpointId}</div>
                </div>
            `;
            return item;
        }
        
        // Create step header
        const stepNumber = document.createElement("div");
        stepNumber.className = "step-number";
        stepNumber.textContent = index + 1;
        
        // Add status indicator
        const stepStatus = document.createElement("div");
        stepStatus.className = "step-status";
        
        // Create step content
        const stepContent = document.createElement("div");
        stepContent.className = "step-content";
        
        const stepName = document.createElement("div");
        stepName.className = "step-name";
        stepName.textContent = step.name || endpoint.name;
        
        const stepDetails = document.createElement("div");
        stepDetails.className = "step-details-mini";
        stepDetails.innerHTML = `
            <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <span class="path">${endpoint.path}</span>
        `;
        
        stepContent.appendChild(stepName);
        stepContent.appendChild(stepDetails);
        
        // Create step actions
        const stepActions = document.createElement("div");
        stepActions.className = "step-actions";
        
        const runButton = document.createElement("button");
        runButton.className = "btn btn-sm btn-primary run-step";
        runButton.textContent = "Run";
        runButton.addEventListener("click", (e) => {
            e.stopPropagation();
            this.runStep(index);
        });
        
        stepActions.appendChild(runButton);
        
        // Assemble the step item
        item.appendChild(stepNumber);
        item.appendChild(stepStatus);
        item.appendChild(stepContent);
        item.appendChild(stepActions);
        
        // Handle click to show step details
        item.addEventListener("click", () => {
            this.showStepDetails(index);
        });
        
        // Check if step has a response and update status
        if (this.stepResponses.has(index)) {
            const response = this.stepResponses.get(index);
            this.updateStepStatus(item, response);
        }
        
        return item;
    }
    
    /**
     * Show details for a step
     * @param {number} index - The step index
     */
    showStepDetails(index) {
        // Clear previous details
        this.stepDetails.innerHTML = "";
        
        // Get step and endpoint
        const step = this.currentSteps[index];
        if (!step) return;
        
        const endpoint = this.endpointManager.getEndpointById(step.endpointId);
        if (!endpoint) {
            this.stepDetails.innerHTML = `
                <div class="step-error-details">
                    <h4>Error</h4>
                    <p>Endpoint not found: ${step.endpointId}</p>
                </div>
            `;
            return;
        }
        
        // Create details view
        const detailsContainer = document.createElement("div");
        detailsContainer.className = "step-details-container";
        
        // Step header
        const header = document.createElement("div");
        header.className = "step-details-header";
        
        const title = document.createElement("h4");
        title.textContent = step.name || endpoint.name;
        
        const subtitle = document.createElement("div");
        subtitle.className = "step-details-subtitle";
        subtitle.innerHTML = `
            <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <span class="path">${endpoint.path}</span>
        `;
        
        header.appendChild(title);
        header.appendChild(subtitle);
        
        // Parameter editor
        const paramsContainer = document.createElement("div");
        paramsContainer.className = "step-params-container";
        
        const paramsTitle = document.createElement("h5");
        paramsTitle.textContent = "Request Parameters";
        paramsContainer.appendChild(paramsTitle);
        
        if (endpoint.params && endpoint.params.length > 0) {
            const paramsTable = document.createElement("table");
            paramsTable.className = "params-table";
            
            const thead = document.createElement("thead");
            thead.innerHTML = `
                <tr>
                    <th>Parameter</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Value</th>
                </tr>
            `;
            paramsTable.appendChild(thead);
            
            const tbody = document.createElement("tbody");
            
            endpoint.params.forEach(param => {
                const row = document.createElement("tr");
                
                // Parameter name cell
                const nameCell = document.createElement("td");
                nameCell.className = "param-name";
                nameCell.textContent = param.name;
                if (param.description) {
                    nameCell.title = param.description;
                }
                
                // Parameter type cell
                const typeCell = document.createElement("td");
                typeCell.className = "param-type";
                typeCell.textContent = param.type || "string";
                
                // Parameter required cell
                const requiredCell = document.createElement("td");
                requiredCell.className = "param-required";
                requiredCell.textContent = param.required ? "Yes" : "No";
                
                // Parameter value cell
                const valueCell = document.createElement("td");
                valueCell.className = "param-value";
                
                const valueInput = document.createElement("input");
                valueInput.type = "text";
                valueInput.className = "form-control param-input";
                valueInput.name = `param-${param.name}`;
                valueInput.dataset.paramName = param.name;
                
                // Set value from step parameters if available
                if (step.params && step.params[param.name] !== undefined) {
                    valueInput.value = step.params[param.name];
                }
                
                valueCell.appendChild(valueInput);
                
                // Add cells to row
                row.appendChild(nameCell);
                row.appendChild(typeCell);
                row.appendChild(requiredCell);
                row.appendChild(valueCell);
                
                tbody.appendChild(row);
            });
            
            paramsTable.appendChild(tbody);
            paramsContainer.appendChild(paramsTable);
        } else {
            const noParams = document.createElement("p");
            noParams.className = "no-params";
            noParams.textContent = "This endpoint has no parameters";
            paramsContainer.appendChild(noParams);
        }
        
        // Actions container
        const actionsContainer = document.createElement("div");
        actionsContainer.className = "step-details-actions";
        
        const runButton = document.createElement("button");
        runButton.className = "btn btn-primary";
        runButton.textContent = "Run Step";
        runButton.addEventListener("click", () => this.runStepFromDetails(index));
        
        actionsContainer.appendChild(runButton);
        
        // Response container (if available)
        let responseContainer = null;
        if (this.stepResponses.has(index)) {
            responseContainer = document.createElement("div");
            responseContainer.className = "step-response-container";
            
            const responseTitle = document.createElement("h5");
            responseTitle.textContent = "Response";
            
            const response = this.stepResponses.get(index);
            const statusClass = response.ok ? "success" : "error";
            
            const responseStatus = document.createElement("div");
            responseStatus.className = `response-status ${statusClass}`;
            responseStatus.textContent = response.status 
                ? `Status: ${response.status} ${response.statusText || ""}`
                : response.error || "Unknown error";
            
            responseContainer.appendChild(responseTitle);
            responseContainer.appendChild(responseStatus);
            
            if (response.data) {
                const responseData = document.createElement("pre");
                responseData.className = "response-data";
                responseData.textContent = typeof response.data === "object" 
                    ? JSON.stringify(response.data, null, 2)
                    : String(response.data);
                
                responseContainer.appendChild(responseData);
            }
        }
        
        // Assemble details view
        detailsContainer.appendChild(header);
        detailsContainer.appendChild(paramsContainer);
        detailsContainer.appendChild(actionsContainer);
        
        if (responseContainer) {
            detailsContainer.appendChild(responseContainer);
        }
        
        this.stepDetails.appendChild(detailsContainer);
    }
    
    /**
     * Run a step from the step details view
     * @param {number} index - The step index
     */
    runStepFromDetails(index) {
        // Collect parameter values from inputs
        const step = this.currentSteps[index];
        const endpoint = this.endpointManager.getEndpointById(step.endpointId);
        
        if (!step || !endpoint) return;
        
        // Update step parameters from inputs
        const paramInputs = this.stepDetails.querySelectorAll(".param-input");
        const params = {};
        
        paramInputs.forEach(input => {
            const paramName = input.dataset.paramName;
            if (paramName) {
                params[paramName] = input.value;
            }
        });
        
        // Update step parameters
        step.params = params;
        
        // Run the step
        this.runStep(index);
    }
    
    /**
     * Run a step by index
     * @param {number} index - The step index
     */
    async runStep(index) {
        const step = this.currentSteps[index];
        const endpoint = this.endpointManager.getEndpointById(step.endpointId);
        
        if (!step || !endpoint) {
            console.error("Cannot run step: step or endpoint not found");
            return;
        }
        
        // Get the step item element
        const stepItem = this.stepsList.querySelector(`.step-item[data-step-index="${index}"]`);
        if (stepItem) {
            const statusEl = stepItem.querySelector(".step-status");
            if (statusEl) {
                statusEl.className = "step-status loading";
            }
            stepItem.classList.add("running");
        }
        
        try {
            // Interpolate variables in parameters
            const interpolatedParams = this.interpolateParams(step.params || {});
            
            // Execute the step
            const response = await this.executeStep(endpoint, interpolatedParams);
            
            // Store the response
            this.stepResponses.set(index, response);
            
            // Update step status
            if (stepItem) {
                this.updateStepStatus(stepItem, response);
                stepItem.classList.remove("running");
            }
            
            // Update response viewer if available
            if (this.responseViewer) {
                if (response.error) {
                    this.responseViewer.showError(response.error);
                } else {
                    this.responseViewer.showResponse(response);
                }
            }
            
            // Extract variables if available
            if (this.variableExtractor && response.data) {
                this.variableExtractor.extractFromResponse(response, response.data, {
                    prefix: step.variablePrefix || ""
                });
            }
            
            // Update step details if currently showing this step
            const currentStepIndex = this.stepDetails.querySelector(".step-details-container")?.dataset.stepIndex;
            if (currentStepIndex === index.toString()) {
                this.showStepDetails(index);
            }
            
            // Enable clear results button
            this.clearResultsButton.disabled = false;
            
            // Call step execute callback if provided
            if (typeof this.options.onStepExecute === "function") {
                this.options.onStepExecute(step, response, index);
            }
            
            return response;
        } catch (error) {
            console.error("Error running step:", error);
            
            // Create error response
            const errorResponse = {
                ok: false,
                error: error.message || "Unknown error occurred",
                status: 0,
                data: null
            };
            
            // Store the error response
            this.stepResponses.set(index, errorResponse);
            
            // Update step status
            if (stepItem) {
                this.updateStepStatus(stepItem, errorResponse);
                stepItem.classList.remove("running");
            }
            
            // Update response viewer if available
            if (this.responseViewer) {
                this.responseViewer.showError(errorResponse.error);
            }
            
            // Enable clear results button
            this.clearResultsButton.disabled = false;
            
            // Call step execute callback if provided
            if (typeof this.options.onStepExecute === "function") {
                this.options.onStepExecute(step, errorResponse, index);
            }
            
            return errorResponse;
        }
    }
    
    /**
     * Execute a step using the API Service
     * @param {Object} endpoint - The endpoint object
     * @param {Object} params - The parameters for the request
     * @returns {Promise<Object>} The response object
     */
    async executeStep(endpoint, params) {
        try {
            const method = endpoint.method.toUpperCase();
            let path = endpoint.path;
            
            // Replace path parameters
            for (const [key, value] of Object.entries(params)) {
                if (path.includes(`{${key}}`)) {
                    path = path.replace(`{${key}}`, encodeURIComponent(value));
                    delete params[key]; // Remove path params from the params object
                }
            }
            
            // Prepare body and query parameters
            let body = null;
            let queryParams = null;

            // For GET requests, use query parameters
            if (method === "GET" && Object.keys(params).length > 0) {
                queryParams = params;
            }
            // For non-GET requests, use request body
            else if (method !== "GET" && Object.keys(params).length > 0) {
                body = params;
            }
            
            // Additional headers if needed
            const headers = {
                "Accept": "application/json"
            };
            
            // Create step object for ApiService.makeRequest
            const step = {
                method,
                path,
                params: queryParams,
                body,
                headers
            };
            
            console.log(`Executing step: ${method} ${path}`);
            
            // Use ApiService to make the request
            const data = await this.apiService.makeRequest(step);
            
            // Return the response object in a format expected by the UI
            return {
                ok: true,  // ApiService throws on error, so if we get here, it's a success
                status: 200, // We don't have access to status code from ApiService directly
                statusText: "OK",
                headers: {},
                data,
                url: `${this.apiService.apiBaseUrl}${path}`,
                method
            };
        } catch (error) {
            console.error("Error executing step:", error);
            
            // Return an error response object
            return {
                ok: false,
                status: error.status || 500,
                statusText: error.statusText || "Error",
                error: error.message || "An error occurred while executing the step",
                data: error.response || { error: error.message },
                url: `${this.apiService.apiBaseUrl}${endpoint.path}`,
                method: endpoint.method.toUpperCase()
            };
        }
    }
    
    /**
     * Interpolate variables in parameters
     * @param {Object} params - The parameters object
     * @returns {Object} The interpolated parameters
     */
    interpolateParams(params) {
        if (!params || typeof params !== "object") {
            return params;
        }
        
        const result = {};
        
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === "string") {
                result[key] = this.variableManager.interpolate(value);
            } else if (typeof value === "object" && value !== null) {
                result[key] = this.interpolateParams(value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }
    
    /**
     * Update step status based on response
     * @param {HTMLElement} stepItem - The step item element
     * @param {Object} response - The response object
     */
    updateStepStatus(stepItem, response) {
        const statusEl = stepItem.querySelector(".step-status");
        if (!statusEl) return;
        
        statusEl.className = "step-status";
        
        if (response.ok) {
            statusEl.classList.add("success");
            statusEl.title = `Status: ${response.status} ${response.statusText || ""}`;
        } else {
            statusEl.classList.add("error");
            statusEl.title = response.error || `Status: ${response.status} ${response.statusText || ""}`;
        }
    }
    
    /**
     * Run all steps in sequence
     */
    async runAllSteps() {
        if (!this.currentSteps || this.currentSteps.length === 0) {
            return;
        }
        
        // Disable run button during execution
        this.runAllButton.disabled = true;
        this.runAllButton.textContent = "Running...";
        
        for (let i = 0; i < this.currentSteps.length; i++) {
            const response = await this.runStep(i);
            
            // Stop if a step fails and stopOnError is true
            if (this.currentFlow.stopOnError && !response.ok) {
                break;
            }
        }
        
        // Re-enable run button
        this.runAllButton.disabled = false;
        this.runAllButton.textContent = "Run All Steps";
    }
    
    /**
     * Clear all step results
     */
    clearAllResults() {
        this.stepResponses.clear();
        
        // Reset step status indicators
        const stepItems = this.stepsList.querySelectorAll(".step-item");
        stepItems.forEach(item => {
            const statusEl = item.querySelector(".step-status");
            if (statusEl) {
                statusEl.className = "step-status";
                statusEl.title = "";
            }
        });
        
        // Update step details if visible
        const currentStepIndex = this.stepDetails.querySelector(".step-details-container")?.dataset.stepIndex;
        if (currentStepIndex !== undefined) {
            this.showStepDetails(parseInt(currentStepIndex));
        }
        
        // Clear response viewer if available
        if (this.responseViewer) {
            this.responseViewer.showResponse({
                data: null,
                ok: true,
                status: null,
                statusText: "Cleared"
            });
        }
        
        // Disable clear results button
        this.clearResultsButton.disabled = true;
    }
    
    /**
     * Get the API base URL
     * @returns {string} The API base URL
     */
    getApiBaseUrl() {
        // Try to get from meta tag
        const metaBaseUrl = document.querySelector("meta[name=\"api-base-url\"]")?.content;
        if (metaBaseUrl) {
            return metaBaseUrl;
        }
        
        // Default to current host
        const currentHost = window.location.origin;
        return currentHost;
    }
}

export default StepsUI; 