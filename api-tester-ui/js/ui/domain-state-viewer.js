/**
 * Domain State Viewer
 * 
 * Displays and visualizes the current application state.
 * Allows users to view state updates in real-time.
 */
class DomainStateViewer {
    constructor(options = {}) {
        this.options = {
            container: null,
            initialState: {},
            ...options
        };
        
        this.container = this.options.container;
        
        if (!this.container) {
            throw new Error("Container element is required for DomainStateViewer");
        }
        
        this.currentState = JSON.parse(JSON.stringify(this.options.initialState || {}));
        this.stateHistory = [];
        this.maxHistoryItems = 50;
        
        this.init();
    }
    
    /**
     * Initialize the component
     */
    init() {
        this.createUI();
        console.log("DomainStateViewer initialized");
    }
    
    /**
     * Create the UI components
     */
    createUI() {
        // Clear container
        this.container.innerHTML = "";
        
        // Create header
        const header = document.createElement("div");
        header.className = "state-viewer-header";
        
        const title = document.createElement("h3");
        title.textContent = "Domain State";
        header.appendChild(title);
        
        // Create view options
        const viewOptions = document.createElement("div");
        viewOptions.className = "view-options";
        
        const toggleHistoryBtn = document.createElement("button");
        toggleHistoryBtn.className = "btn btn-sm";
        toggleHistoryBtn.textContent = "Show History";
        toggleHistoryBtn.addEventListener("click", () => this.toggleHistoryView(toggleHistoryBtn));
        viewOptions.appendChild(toggleHistoryBtn);
        
        header.appendChild(viewOptions);
        this.container.appendChild(header);
        
        // Create main content area
        const contentContainer = document.createElement("div");
        contentContainer.className = "state-viewer-content";
        
        // Create state display
        this.stateDisplay = document.createElement("div");
        this.stateDisplay.className = "state-display";
        contentContainer.appendChild(this.stateDisplay);
        
        // Create history display (hidden by default)
        this.historyDisplay = document.createElement("div");
        this.historyDisplay.className = "history-display hidden";
        contentContainer.appendChild(this.historyDisplay);
        
        this.container.appendChild(contentContainer);
        
        // Initial render
        this.renderState();
    }
    
    /**
     * Toggle between current state and history view
     * @param {HTMLElement} button - The toggle button
     */
    toggleHistoryView(button) {
        const isHistoryVisible = !this.historyDisplay.classList.contains("hidden");
        
        if (isHistoryVisible) {
            this.historyDisplay.classList.add("hidden");
            this.stateDisplay.classList.remove("hidden");
            button.textContent = "Show History";
        } else {
            this.stateDisplay.classList.add("hidden");
            this.historyDisplay.classList.remove("hidden");
            button.textContent = "Show Current";
            this.renderHistory();
        }
    }
    
    /**
     * Update the state and re-render
     * @param {Object} newState - The new state to display
     */
    updateState(newState) {
        if (!newState) return;
        
        // Add current state to history before updating
        this.addToHistory(this.currentState);
        
        // Update the current state (deep clone to avoid reference issues)
        this.currentState = JSON.parse(JSON.stringify(newState));
        
        // Re-render the state
        this.renderState();
    }
    
    /**
     * Add a state snapshot to the history
     * @param {Object} state - The state to add to history
     */
    addToHistory(state) {
        if (!state) return;
        
        // Create a history item with timestamp
        const historyItem = {
            timestamp: new Date(),
            state: JSON.parse(JSON.stringify(state))
        };
        
        // Add to the beginning of the array
        this.stateHistory.unshift(historyItem);
        
        // Limit the history size
        if (this.stateHistory.length > this.maxHistoryItems) {
            this.stateHistory = this.stateHistory.slice(0, this.maxHistoryItems);
        }
    }
    
    /**
     * Render the current state
     */
    renderState() {
        // Clear the current display
        this.stateDisplay.innerHTML = "";
        
        // Create section for each major state section
        const sections = this.groupStateBySection(this.currentState);
        
        for (const [sectionName, sectionData] of Object.entries(sections)) {
            const section = this.createStateSection(sectionName, sectionData);
            this.stateDisplay.appendChild(section);
        }
        
        // If no state, show a message
        if (Object.keys(sections).length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";
            emptyState.textContent = "No state data available";
            this.stateDisplay.appendChild(emptyState);
        }
    }
    
    /**
     * Group state data into logical sections
     * @param {Object} state - The state to group
     * @returns {Object} Grouped state sections
     */
    groupStateBySection(state) {
        const sections = {};
        
        for (const [key, value] of Object.entries(state)) {
            let sectionName = "General";
            
            // Determine section based on key name
            if (key.includes("auth") || key.includes("user")) {
                sectionName = "Authentication";
            } else if (key.includes("end") || key.includes("flow")) {
                sectionName = "API Flows";
            } else if (key.includes("response") || key.includes("request")) {
                sectionName = "Request/Response";
            } else if (key.includes("variable")) {
                sectionName = "Variables";
            } else if (key.includes("status") || key.includes("health")) {
                sectionName = "System Status";
            } else if (key.includes("theme") || key.includes("mode") || key.includes("ui")) {
                sectionName = "UI Settings";
            }
            
            // Create section if it doesn't exist
            if (!sections[sectionName]) {
                sections[sectionName] = {};
            }
            
            // Add data to section
            sections[sectionName][key] = value;
        }
        
        return sections;
    }
    
    /**
     * Create a section element for a state section
     * @param {string} name - Section name
     * @param {Object} data - Section data
     * @returns {HTMLElement} The section element
     */
    createStateSection(name, data) {
        const section = document.createElement("div");
        section.className = "state-section";
        
        const header = document.createElement("div");
        header.className = "section-header";
        
        const title = document.createElement("h4");
        title.textContent = name;
        header.appendChild(title);
        
        const content = document.createElement("div");
        content.className = "section-content";
        
        for (const [key, value] of Object.entries(data)) {
            const item = this.createStateItem(key, value);
            content.appendChild(item);
        }
        
        section.appendChild(header);
        section.appendChild(content);
        
        return section;
    }
    
    /**
     * Create a state item element
     * @param {string} key - State key
     * @param {*} value - State value
     * @returns {HTMLElement} The state item element
     */
    createStateItem(key, value) {
        const item = document.createElement("div");
        item.className = "state-item";
        
        const keyEl = document.createElement("div");
        keyEl.className = "state-key";
        keyEl.textContent = key;
        
        const valueEl = document.createElement("div");
        valueEl.className = "state-value";
        
        if (value === null) {
            valueEl.textContent = "null";
            valueEl.classList.add("null-value");
        } else if (value === undefined) {
            valueEl.textContent = "undefined";
            valueEl.classList.add("undefined-value");
        } else if (typeof value === "object") {
            // For objects and arrays, create a collapsible section
            const summary = document.createElement("div");
            summary.className = "object-summary";
            
            const type = Array.isArray(value) ? "Array" : "Object";
            const count = Array.isArray(value) ? value.length : Object.keys(value).length;
            
            summary.textContent = `${type} (${count} items)`;
            summary.addEventListener("click", () => this.toggleObjectDetails(details));
            
            const details = document.createElement("div");
            details.className = "object-details hidden";
            details.innerHTML = this.formatObjectValue(value);
            
            valueEl.appendChild(summary);
            valueEl.appendChild(details);
        } else if (typeof value === "boolean") {
            valueEl.textContent = value.toString();
            valueEl.classList.add("boolean-value");
        } else if (typeof value === "number") {
            valueEl.textContent = value.toString();
            valueEl.classList.add("number-value");
        } else {
            valueEl.textContent = String(value);
            valueEl.classList.add("string-value");
        }
        
        item.appendChild(keyEl);
        item.appendChild(valueEl);
        
        return item;
    }
    
    /**
     * Format an object value as HTML
     * @param {Object} obj - The object to format
     * @param {number} depth - Current depth for recursion limit
     * @returns {string} HTML representation of the object
     */
    formatObjectValue(obj, depth = 0) {
        if (depth > 2) {
            return "<div class=\"object-truncated\">Object too deep to display</div>";
        }
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                return "<div class=\"array-empty\">[]</div>";
            }
            
            let html = "<div class=\"array-value\">";
            obj.forEach((item, index) => {
                html += `<div class="array-item"><span class="array-index">${index}:</span> `;
                
                if (item === null) {
                    html += "<span class=\"null-value\">null</span>";
                } else if (item === undefined) {
                    html += "<span class=\"undefined-value\">undefined</span>";
                } else if (typeof item === "object") {
                    html += this.formatObjectValue(item, depth + 1);
                } else if (typeof item === "boolean") {
                    html += `<span class="boolean-value">${item.toString()}</span>`;
                } else if (typeof item === "number") {
                    html += `<span class="number-value">${item.toString()}</span>`;
                } else {
                    html += `<span class="string-value">"${this.escapeHtml(String(item))}"</span>`;
                }
                
                html += "</div>";
            });
            
            html += "</div>";
            return html;
        } else {
            if (Object.keys(obj).length === 0) {
                return "<div class=\"object-empty\">{}</div>";
            }
            
            let html = "<div class=\"object-value\">";
            for (const [key, value] of Object.entries(obj)) {
                html += `<div class="object-property"><span class="property-key">${key}:</span> `;
                
                if (value === null) {
                    html += "<span class=\"null-value\">null</span>";
                } else if (value === undefined) {
                    html += "<span class=\"undefined-value\">undefined</span>";
                } else if (typeof value === "object") {
                    html += this.formatObjectValue(value, depth + 1);
                } else if (typeof value === "boolean") {
                    html += `<span class="boolean-value">${value.toString()}</span>`;
                } else if (typeof value === "number") {
                    html += `<span class="number-value">${value.toString()}</span>`;
                } else {
                    html += `<span class="string-value">"${this.escapeHtml(String(value))}"</span>`;
                }
                
                html += "</div>";
            }
            
            html += "</div>";
            return html;
        }
    }
    
    /**
     * Render the state history
     */
    renderHistory() {
        // Clear the history display
        this.historyDisplay.innerHTML = "";
        
        if (this.stateHistory.length === 0) {
            const emptyHistory = document.createElement("div");
            emptyHistory.className = "empty-history";
            emptyHistory.textContent = "No state history available";
            this.historyDisplay.appendChild(emptyHistory);
            return;
        }
        
        // Create a timeline element
        const timeline = document.createElement("div");
        timeline.className = "state-timeline";
        
        // Add each history item
        this.stateHistory.forEach((item, index) => {
            const timelineItem = document.createElement("div");
            timelineItem.className = "timeline-item";
            
            const timestamp = document.createElement("div");
            timestamp.className = "timeline-timestamp";
            timestamp.textContent = this.formatTimestamp(item.timestamp);
            
            const preview = document.createElement("div");
            preview.className = "timeline-preview";
            preview.textContent = this.generateStateSummary(item.state);
            
            // View button
            const viewButton = document.createElement("button");
            viewButton.className = "btn btn-sm btn-icon";
            viewButton.innerHTML = "👁️";
            viewButton.title = "View state snapshot";
            viewButton.addEventListener("click", () => this.viewHistorySnapshot(index));
            
            timelineItem.appendChild(timestamp);
            timelineItem.appendChild(preview);
            timelineItem.appendChild(viewButton);
            
            timeline.appendChild(timelineItem);
        });
        
        this.historyDisplay.appendChild(timeline);
    }
    
    /**
     * View a specific history snapshot
     * @param {number} index - The index of the history item to view
     */
    viewHistorySnapshot(index) {
        const item = this.stateHistory[index];
        if (!item) return;
        
        // Create modal
        const modal = document.createElement("div");
        modal.className = "state-modal";
        
        const modalContent = document.createElement("div");
        modalContent.className = "state-modal-content";
        
        const modalHeader = document.createElement("div");
        modalHeader.className = "state-modal-header";
        
        const modalTitle = document.createElement("h4");
        modalTitle.textContent = `State Snapshot: ${this.formatTimestamp(item.timestamp)}`;
        
        const closeButton = document.createElement("button");
        closeButton.className = "btn-close";
        closeButton.innerHTML = "×";
        closeButton.addEventListener("click", () => modal.remove());
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        const modalBody = document.createElement("div");
        modalBody.className = "state-modal-body";
        
        // Create sections for the state
        const sections = this.groupStateBySection(item.state);
        
        for (const [sectionName, sectionData] of Object.entries(sections)) {
            const section = this.createStateSection(sectionName, sectionData);
            modalBody.appendChild(section);
        }
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modal.appendChild(modalContent);
        
        // Add modal to the body and handle backdrop clicks
        document.body.appendChild(modal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Generate a summary of the state
     * @param {Object} state - The state to summarize
     * @returns {string} A summary of the state
     */
    generateStateSummary(state) {
        const keys = Object.keys(state);
        if (keys.length === 0) return "Empty state";
        
        // Pick a few keys for the summary
        const displayKeys = keys.slice(0, 3);
        const remaining = keys.length - displayKeys.length;
        
        const summary = displayKeys.map(key => key).join(", ");
        return remaining > 0 ? `${summary}, +${remaining} more keys` : summary;
    }
    
    /**
     * Format a timestamp for display
     * @param {Date} date - The date to format
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(date) {
        return date.toLocaleTimeString();
    }
    
    /**
     * Toggle visibility of object details
     * @param {HTMLElement} element - The element to toggle
     */
    toggleObjectDetails(element) {
        element.classList.toggle("hidden");
    }
    
    /**
     * Escape HTML special characters
     * @param {string} html - The string to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(html) {
        const div = document.createElement("div");
        div.textContent = html;
        return div.innerHTML;
    }
}

export default DomainStateViewer; 