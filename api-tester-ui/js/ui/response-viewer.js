/**
 * Response Viewer
 * 
 * Displays API response data in a formatted way, with syntax highlighting
 * and the ability to copy response data.
 */
class ResponseViewer {
    constructor(container) {
        if (!container) {
            throw new Error("Container element is required for ResponseViewer");
        }
        
        this.container = typeof container === "string" 
            ? document.getElementById(container) 
            : container;
            
        if (!this.container) {
            throw new Error(`ResponseViewer container not found: ${container}`);
        }
        
        // Initialize the viewer
        this.init();
    }
    
    /**
     * Initialize the response viewer
     */
    init() {
        // Create components
        this.createComponents();
        
        // Add copy functionality
        this.addCopyButton();
        
        console.log("ResponseViewer initialized");
    }
    
    /**
     * Create the response viewer components
     */
    createComponents() {
        // Clear container
        this.container.innerHTML = "";
        
        // Create header
        this.header = document.createElement("div");
        this.header.className = "response-header";
        this.container.appendChild(this.header);
        
        // Create status indicator
        this.statusIndicator = document.createElement("div");
        this.statusIndicator.className = "response-status";
        this.header.appendChild(this.statusIndicator);
        
        // Create content area
        this.content = document.createElement("div");
        this.content.className = "response-content";
        this.container.appendChild(this.content);
    }
    
    /**
     * Add a copy button to the response viewer
     */
    addCopyButton() {
        // Create copy button
        this.copyButton = document.createElement("button");
        this.copyButton.className = "btn btn-sm copy-button";
        this.copyButton.textContent = "Copy";
        this.copyButton.style.display = "none"; // Hide until there's content
        this.header.appendChild(this.copyButton);
        
        // Add click handler
        this.copyButton.addEventListener("click", () => {
            this.copyResponseToClipboard();
        });
    }
    
    /**
     * Copy response data to clipboard
     */
    copyResponseToClipboard() {
        if (!this.responseData) return;
        
        try {
            const text = JSON.stringify(this.responseData, null, 2);
            navigator.clipboard.writeText(text)
                .then(() => {
                    // Show success message
                    const originalText = this.copyButton.textContent;
                    this.copyButton.textContent = "Copied!";
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        this.copyButton.textContent = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error("Failed to copy response:", err);
                });
        } catch (error) {
            console.error("Error copying response to clipboard:", error);
        }
    }
    
    /**
     * Display an API response
     * @param {Object} response - Fetch API Response object
     * @param {Object} data - Parsed response data
     */
    showResponse(response, data) {
        // Store response data
        this.responseData = data;
        
        // Show status
        this.showStatus(response.status, response.statusText);
        
        // Format and display content
        this.formatContent(data);
        
        // Show copy button
        this.copyButton.style.display = "inline-block";
    }
    
    /**
     * Display an error response
     * @param {Error} error - Error object
     */
    showError(error) {
        // Show error status
        this.showStatus(0, "Error");
        
        // Create error content
        this.content.innerHTML = "";
        
        const errorMessage = document.createElement("div");
        errorMessage.className = "error-message";
        errorMessage.textContent = error.message || "An unknown error occurred";
        
        this.content.appendChild(errorMessage);
        
        // Hide copy button
        this.copyButton.style.display = "none";
    }
    
    /**
     * Show response status
     * @param {number} status - HTTP status code
     * @param {string} statusText - Status text
     */
    showStatus(status, statusText) {
        // Clear previous status
        this.statusIndicator.innerHTML = "";
        this.statusIndicator.className = "response-status";
        
        // Determine status class
        if (status >= 200 && status < 300) {
            this.statusIndicator.classList.add("success");
        } else if (status >= 400) {
            this.statusIndicator.classList.add("error");
        } else {
            this.statusIndicator.classList.add("info");
        }
        
        // Set status text
        this.statusIndicator.textContent = status ? `${status} ${statusText}` : statusText;
    }
    
    /**
     * Format and display content
     * @param {*} data - Response data
     */
    formatContent(data) {
        // Clear previous content
        this.content.innerHTML = "";
        
        try {
            if (typeof data === "object" && data !== null) {
                // Format JSON
                this.formatJson(data);
            } else if (typeof data === "string") {
                // Try to parse as JSON first
                try {
                    const jsonData = JSON.parse(data);
                    this.formatJson(jsonData);
                } catch (error) {
                    // Not JSON, display as text
                    this.formatText(data);
                }
            } else {
                // Display as text
                this.formatText(String(data));
            }
        } catch (error) {
            console.error("Error formatting response content:", error);
            this.formatText(String(data));
        }
    }
    
    /**
     * Format and display JSON content
     * @param {Object} data - JSON data
     */
    formatJson(data) {
        // Create pre element for code
        const pre = document.createElement("pre");
        pre.className = "json-content";
        
        try {
            // Format JSON with indentation
            const formattedJson = JSON.stringify(data, null, 2);
            
            // Add syntax highlighting
            pre.innerHTML = this.highlightJson(formattedJson);
            
            // Add to content
            this.content.appendChild(pre);
        } catch (error) {
            console.error("Error formatting JSON:", error);
            pre.textContent = JSON.stringify(data);
            this.content.appendChild(pre);
        }
    }
    
    /**
     * Format and display text content
     * @param {string} text - Text content
     */
    formatText(text) {
        // Create pre element for text
        const pre = document.createElement("pre");
        pre.className = "text-content";
        pre.textContent = text;
        
        // Add to content
        this.content.appendChild(pre);
    }
    
    /**
     * Add syntax highlighting to JSON string
     * @param {string} json - Formatted JSON string
     * @returns {string} HTML with syntax highlighting
     */
    highlightJson(json) {
        // Simple syntax highlighting
        return json
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
                match => {
                    let cls = "json-number";
                    if (/^"/.test(match)) {
                        if (/:$/.test(match)) {
                            cls = "json-key";
                        } else {
                            cls = "json-string";
                        }
                    } else if (/true|false/.test(match)) {
                        cls = "json-boolean";
                    } else if (/null/.test(match)) {
                        cls = "json-null";
                    }
                    return `<span class="${cls}">${match}</span>`;
                });
    }
    
    /**
     * Clear the response viewer
     */
    clear() {
        // Clear status and content
        this.statusIndicator.innerHTML = "";
        this.statusIndicator.className = "response-status";
        this.content.innerHTML = "";
        
        // Hide copy button
        this.copyButton.style.display = "none";
        
        // Clear stored data
        this.responseData = null;
    }
}

// Add styles for JSON highlighting
function addJsonHighlightStyles() {
    if (!document.getElementById("json-highlight-styles")) {
        const style = document.createElement("style");
        style.id = "json-highlight-styles";
        style.textContent = `
            .json-key { color: #2196F3; }
            .json-string { color: #4CAF50; }
            .json-number { color: #FF9800; }
            .json-boolean { color: #9C27B0; }
            .json-null { color: #F44336; }
            
            /* Dark mode overrides */
            body.dark-mode .json-key { color: #64B5F6; }
            body.dark-mode .json-string { color: #81C784; }
            body.dark-mode .json-number { color: #FFB74D; }
            body.dark-mode .json-boolean { color: #CE93D8; }
            body.dark-mode .json-null { color: #E57373; }
        `;
        document.head.appendChild(style);
    }
}

// Add JSON highlighting styles when loaded
addJsonHighlightStyles();

export default ResponseViewer; 