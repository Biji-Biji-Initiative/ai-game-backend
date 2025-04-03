/**
 * Flow UI Component
 * Handles rendering and interaction with flow list in sidebar
 */

class FlowUI {
    constructor() {
        this.container = null;
        this.flows = [];
        this.selectedFlowId = null;
    }

    /**
     * Initialize the flows UI
     * @param {HTMLElement} container - Container element for flows
     */
    init(container) {
        this.container = container;
        
        // Subscribe to app state changes
        if (window.subscribeToState) {
            window.subscribeToState((state) => {
                if (state.flows !== this.flows || state.currentFlow !== this.selectedFlowId) {
                    this.flows = state.flows || [];
                    this.selectedFlowId = state.currentFlow;
                    this.render();
                }
            });
        } else {
            console.warn("State management not available for FlowUI");
        }
        
        // Initial render
        this.render();
    }

    /**
     * Render the flows UI
     */
    render() {
        if (!this.container) return;
        
        // Clear existing content
        this.container.innerHTML = "";
        
        if (!this.flows || this.flows.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Group flows by category
        const flowsByCategory = this.groupFlowsByCategory();
        
        // Render flows
        Object.entries(flowsByCategory).forEach(([category, flows]) => {
            this.renderCategory(category, flows);
        });
        
        // Add help section at the bottom
        this.addHelpSection();
    }

    /**
     * Group flows by their category
     * @returns {Object} Object with categories as keys and arrays of flows as values
     */
    groupFlowsByCategory() {
        const categories = {};
        
        this.flows.forEach(flow => {
            const category = flow.category || "General";
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push(flow);
        });
        
        return categories;
    }

    /**
     * Render empty state when no flows are available
     */
    renderEmptyState() {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-flows";
        emptyState.innerHTML = `
            <div class="empty-flows-message">
                <p>No test flows found</p>
                <p class="small">This could be because:</p>
                <ul>
                    <li>You are not logged in</li>
                    <li>The backend is not available</li>
                    <li>No flows have been defined</li>
                </ul>
                <button class="btn btn-sm btn-refresh-flows">Refresh</button>
            </div>
        `;
        
        // Add refresh button handler
        const refreshButton = emptyState.querySelector(".btn-refresh-flows");
        if (refreshButton) {
            refreshButton.addEventListener("click", () => {
                window.location.reload();
            });
        }
        
        this.container.appendChild(emptyState);
    }

    /**
     * Render a category of flows
     * @param {string} category - Category name
     * @param {Array} flows - Flows in this category
     */
    renderCategory(category, flows) {
        const categoryElement = document.createElement("div");
        categoryElement.className = "flow-category";
        categoryElement.innerHTML = `
            <div class="flow-category-header">
                <h3>${category}</h3>
                <span class="flow-count">${flows.length} flow${flows.length !== 1 ? "s" : ""}</span>
            </div>
            <div class="flow-category-content"></div>
        `;
        
        const contentElement = categoryElement.querySelector(".flow-category-content");
        
        // Render each flow in the category
        flows.forEach(flow => {
            this.renderFlowItem(contentElement, flow);
        });
        
        this.container.appendChild(categoryElement);
    }

    /**
     * Render a single flow item
     * @param {HTMLElement} container - Container to append the flow to
     * @param {Object} flow - Flow data
     */
    renderFlowItem(container, flow) {
        const flowElement = document.createElement("div");
        flowElement.className = "flow-item";
        if (flow.id === this.selectedFlowId) {
            flowElement.classList.add("active");
        }
        
        // Get a user-friendly name
        const displayName = this.getDisplayName(flow.name);
        
        flowElement.innerHTML = `
            <div class="flow-item-header">
                <span class="flow-name">${displayName}</span>
                <span class="flow-steps-count">${flow.steps ? flow.steps.length : 0} steps</span>
            </div>
        `;
        
        // Add click handler
        flowElement.addEventListener("click", () => {
            this.selectFlow(flow.id);
        });
        
        container.appendChild(flowElement);
    }

    /**
     * Get a display-friendly name for a flow
     * @param {string} name - Original flow name
     * @returns {string} User-friendly name
     */
    getDisplayName(name) {
        if (!name) return "Unnamed Flow";
        
        // Remove common prefixes and technical jargon
        return name
            .replace(/^(api|test|flow|endpoint)\s*/i, "")
            .replace(/\s+(api|test|flow|endpoint)$/i, "")
            // Add spaces before capitals in camelCase
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            // Replace underscores and hyphens with spaces
            .replace(/[_-]/g, " ")
            // Capitalize first letter
            .replace(/^./, match => match.toUpperCase());
    }

    /**
     * Add a help section at the bottom of the flow list
     */
    addHelpSection() {
        const helpSection = document.createElement("div");
        helpSection.className = "flows-help-section";
        helpSection.innerHTML = `
            <h4>How to use:</h4>
            <p>Select a test flow from the list above to see its steps.</p>
            <p>If you don't see any flows, try logging in or refreshing the endpoints.</p>
            <button class="btn btn-sm btn-refresh-flows">Refresh Endpoints</button>
        `;
        
        // Add refresh button handler
        const refreshButton = helpSection.querySelector(".btn-refresh-flows");
        if (refreshButton) {
            refreshButton.addEventListener("click", () => {
                // Trigger endpoint refresh
                if (window.refreshEndpoints) {
                    window.refreshEndpoints();
                } else {
                    window.location.reload();
                }
            });
        }
        
        this.container.appendChild(helpSection);
    }

    /**
     * Handle flow selection
     * @param {string} flowId - ID of the selected flow
     */
    selectFlow(flowId) {
        if (window.updateState) {
            const flow = this.flows.find(f => f.id === flowId);
            window.updateState({
                currentFlow: flowId,
                steps: flow ? flow.steps : []
            });
            
            // Mark the selected flow as active in the UI
            const flowItems = this.container.querySelectorAll(".flow-item");
            flowItems.forEach(item => {
                item.classList.toggle("active", item.dataset.flowId === flowId);
            });
        } else {
            console.warn("State management not available for flow selection");
        }
    }
}

export { FlowUI };