/**
 * Steps UI Component
 * Handles rendering of flow steps and step selection
 */

import store, { flowHelpers } from "../state/index.js";

/**
 * Get a user-friendly label for HTTP methods
 * @param {string} method - HTTP method
 * @returns {Object} Method style and label
 */
function getMethodLabel(method) {
    const methodLabels = {
        "GET": { label: "GET", class: "method-get", description: "View" },
        "POST": { label: "POST", class: "method-post", description: "Create" },
        "PUT": { label: "PUT", class: "method-put", description: "Update" },
        "PATCH": { label: "PATCH", class: "method-patch", description: "Modify" },
        "DELETE": { label: "DELETE", class: "method-delete", description: "Delete" }
    };
    
    return methodLabels[method.toUpperCase()] || { 
        label: method, 
        class: "method-default", 
        description: method 
    };
}

/**
 * Generate a user-friendly step name
 * @param {Object} step - Step object
 * @returns {string} User-friendly name
 */
function getSimplifiedStepName(step) {
    // Extract the last part of the path
    const pathParts = step.path.split("/").filter(part => part);
    const lastPart = pathParts[pathParts.length - 1] || "";
    
    // Create a readable format
    return lastPart
        // Add spaces before capitals
        .replace(/([A-Z])/g, " $1")
        // Replace - and _ with spaces
        .replace(/[-_]/g, " ")
        // Capitalize first letter
        .replace(/^./, match => match.toUpperCase())
        // Clean up
        .trim();
}

/**
 * StepsUI class for rendering and managing flow steps
 */
class StepsUI {
    constructor() {
        this.stepsContainer = null;
        this.initialized = false;
    }

    /**
     * Initialize the Steps UI component
     * @param {string|Element} container - Container element or ID
     */
    init(container) {
        // Get container element
        if (typeof container === "string") {
            this.stepsContainer = document.getElementById(container);
        } else if (container instanceof Element) {
            this.stepsContainer = container;
        }

        if (!this.stepsContainer) {
            console.error("Steps container not found");
            return;
        }

        // Subscribe to flow and step changes
        store.subscribe(
            "steps-ui", 
            this.handleStateChange.bind(this), 
            "flows"
        );
        
        // First render
        this.render();
        
        this.initialized = true;
    }

    /**
     * Handle state changes
     * @param {Object} state - Current state
     * @param {Object} prevState - Previous state
     */
    handleStateChange(state, prevState) {
        const flows = state.flows;
        const prevFlows = prevState.flows;
        
        // Check if we need to re-render
        const needsRender = 
            flows.steps !== prevFlows.steps ||
            flows.currentStepId !== prevFlows.currentStepId ||
            flows.currentFlowId !== prevFlows.currentFlowId ||
            flows.stepResults !== prevFlows.stepResults;
            
        if (needsRender) {
            this.render();
        }
    }

    /**
     * Render the steps UI
     */
    render() {
        if (!this.stepsContainer) return;
        
        const state = store.getState();
        const { steps, currentStepId, currentFlowId, stepResults } = state.flows;
        
        // Clear existing content
        this.stepsContainer.innerHTML = "";
        
        // If no flow is selected, show welcome message
        if (!currentFlowId) {
            this.renderWelcomeMessage();
            return;
        }
        
        // If no steps, show loading or empty message
        if (!steps || steps.length === 0) {
            this.renderEmptySteps();
            return;
        }
        
        // Add steps header
        const header = document.createElement("div");
        header.className = "steps-header";
        header.innerHTML = `
            <h3>Flow Steps</h3>
            <p class="steps-description">
                Complete these steps in order to test the API flow.
            </p>
        `;
        this.stepsContainer.appendChild(header);
        
        // Add steps list
        const stepsList = document.createElement("div");
        stepsList.className = "steps-list";
        
        // Render each step
        steps.forEach((step, index) => {
            const stepElement = this.createStepElement(
                step, 
                index, 
                currentStepId, 
                stepResults[step.id]
            );
            stepsList.appendChild(stepElement);
        });
        
        this.stepsContainer.appendChild(stepsList);
        
        // Add help content
        this.renderStepsHelp();
    }

    /**
     * Render a welcome message when no flow is selected
     */
    renderWelcomeMessage() {
        const welcomeElement = document.createElement("div");
        welcomeElement.className = "welcome-message";
        
        welcomeElement.innerHTML = `
            <h2>Welcome to API Tester</h2>
            <p>This tool helps you test API endpoints without writing code.</p>
            
            <div class="welcome-steps">
                <h3>Getting Started</h3>
                <ol>
                    <li>Select a flow from the sidebar</li>
                    <li>Follow the steps for the selected flow</li>
                    <li>Fill in the required information for each step</li>
                    <li>Run the steps and view the results</li>
                </ol>
            </div>
            
            <div class="welcome-tips">
                <h3>Tips</h3>
                <ul>
                    <li>Use the variable system to pass data between steps</li>
                    <li>Check the logs if you encounter any issues</li>
                    <li>Authentication may be required for some endpoints</li>
                </ul>
            </div>
        `;
        
        this.stepsContainer.appendChild(welcomeElement);
    }

    /**
     * Render a message when a flow has no steps
     */
    renderEmptySteps() {
        const emptyElement = document.createElement("div");
        emptyElement.className = "empty-steps";
        
        emptyElement.innerHTML = `
            <h3>No Steps Available</h3>
            <p>This flow doesn't have any defined steps.</p>
            <p>Try selecting a different flow from the sidebar.</p>
        `;
        
        this.stepsContainer.appendChild(emptyElement);
    }

    /**
     * Create a step card element
     * @param {Object} step - Step data
     * @param {number} index - Step index
     * @param {string} currentStepId - Current selected step ID
     * @param {Object} result - Step result if available
     * @returns {Element} Step element
     */
    createStepElement(step, index, currentStepId, result) {
        const stepElement = document.createElement("div");
        stepElement.className = "step-card";
        stepElement.dataset.stepId = step.id;
        
        // Add active class if this is the current step
        if (step.id === currentStepId) {
            stepElement.classList.add("active");
        }
        
        // Add completion status class
        if (result) {
            if (result.success) {
                stepElement.classList.add("completed");
            } else {
                stepElement.classList.add("failed");
            }
        }
        
        // Get method styling
        const method = getMethodLabel(step.method);
        
        // Generate simplified step name
        const simpleName = getSimplifiedStepName(step);
        
        // Create the step content
        stepElement.innerHTML = `
            <div class="step-header">
                <div class="step-number">${index + 1}</div>
                <div class="step-method ${method.class}">${method.label}</div>
                <div class="step-action">${method.description}</div>
            </div>
            <div class="step-body">
                <div class="step-name">${step.name || simpleName}</div>
                <div class="step-path">${step.path}</div>
                <div class="step-description">${step.description || ""}</div>
            </div>
            <div class="step-status">
                ${result ? this.getStatusIcon(result.success) : ""}
            </div>
        `;
        
        // Add click handler
        stepElement.addEventListener("click", () => this.handleStepClick(step.id));
        
        return stepElement;
    }

    /**
     * Get status icon based on result
     * @param {boolean} success - Whether the step was successful
     * @returns {string} Status icon HTML
     */
    getStatusIcon(success) {
        return success
            ? '<span class="status-icon success">✓</span>'
            : '<span class="status-icon failure">✗</span>';
    }

    /**
     * Render help content for steps
     */
    renderStepsHelp() {
        const helpElement = document.createElement("div");
        helpElement.className = "steps-help";
        
        helpElement.innerHTML = `
            <h4>How to Complete Steps</h4>
            <ol>
                <li>Click on a step to view its details</li>
                <li>Fill in the required fields</li>
                <li>Click "Run" to execute the step</li>
                <li>View the results and proceed to the next step</li>
            </ol>
            <div class="steps-help-note">
                <strong>Note:</strong> Steps may depend on previous steps.
                Complete them in order for best results.
            </div>
        `;
        
        this.stepsContainer.appendChild(helpElement);
    }

    /**
     * Handle step click
     * @param {string} stepId - Step ID
     */
    handleStepClick(stepId) {
        // Update selected step in state
        flowHelpers.selectStep(stepId);
        
        // Mark step as active in UI
        const stepElements = this.stepsContainer.querySelectorAll(".step-card");
        stepElements.forEach(item => {
            item.classList.remove("active");
            if (item.dataset.stepId === stepId) {
                item.classList.add("active");
            }
        });
    }
}

// Create and export singleton instance
const stepsUI = new StepsUI();
export default stepsUI; 