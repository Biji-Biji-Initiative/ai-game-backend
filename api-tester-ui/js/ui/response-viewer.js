/**
 * Response Viewer Module
 * Handles displaying API responses in a tabbed format
 */

/**
 *
 */
export class ResponseViewer {
    /**
     * Creates a new ResponseViewer instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            container: null,
            tabManager: null,
            config: null,
            errorHandler: null,
            syntaxHighlightLimit: 1000000, // 1MB approximate limit for syntax highlighting
            defaultTab: "formatted",
            enableCopyButtons: true,
            autoFormatJSON: true,
            maxRawLength: 5000000, // 5MB approximate display limit
            ...options
        };
        
        this.container = this.options.container;
        this.tabManager = this.options.tabManager;
        this.config = this.options.config;
        this.errorHandler = this.options.errorHandler;
        
        this.response = null;
        this.request = null;
        this.defaultTabs = ["formatted", "raw", "headers", "preview"];
        this.customTabs = [];
        this.initialized = false;
        this.worker = null;
        this.workerCallbacks = new Map();
        this.workerCallId = 0;
    }
    
    /**
     * Initializes the response viewer
     * @returns {boolean} Whether initialization succeeded
     */
    initialize() {
        try {
            // Check if already initialized
            if (this.initialized) {
                return true;
            }
            
            // Validate options
            if (!this.container) {
                throw new Error("Response Viewer: No container specified");
            }
            
            if (!this.tabManager) {
                throw new Error("Response Viewer: No tab manager specified");
            }
            
            // Create base structure if it doesn't exist
            this._createBaseStructure();
            
            // Initialize tabs
            this._initializeTabs();
            
            // Initialize web worker for parsing large JSON (if browser supports it)
            this._initializeWorker();
            
            // Mark as initialized
            this.initialized = true;
            
            return true;
        } catch (error) {
            console.error("Error initializing Response Viewer:", error);
            
            if (this.errorHandler) {
                this.errorHandler.handleError(error);
            }
            
            return false;
        }
    }
    
    /**
     * Creates the base structure for the response viewer
     * @private
     */
    _createBaseStructure() {
        // Check if structure already exists
        if (this.container.querySelector(".response-content")) {
            return;
        }
        
        // Create container for response tabs if it doesn't exist
        if (!this.container.querySelector("#response-tabs")) {
            const tabsContainer = document.createElement("div");
            tabsContainer.id = "response-tabs";
            tabsContainer.className = "tabs-container";
            this.container.appendChild(tabsContainer);
        }
        
        // Create container for response content if it doesn't exist
        if (!this.container.querySelector("#response-contents")) {
            const contentsContainer = document.createElement("div");
            contentsContainer.id = "response-contents";
            contentsContainer.className = "tab-contents-container";
            this.container.appendChild(contentsContainer);
        }
    }
    
    /**
     * Initializes the response tabs
     * @private
     */
    _initializeTabs() {
        // Make sure tab manager is initialized first
        if (!this.tabManager.isInitialized()) {
            this.tabManager.initialize();
        }
        
        // Clear any existing tabs
        const existingTabs = this.tabManager.getTabs();
        existingTabs.forEach(tab => {
            this.tabManager.removeTab(tab.id);
        });
        
        // Add default tabs
        this.tabManager.addTab({
            id: "tab-formatted",
            title: "Formatted",
            content: "<div class=\"response-formatted\"></div>",
            active: this.options.defaultTab === "formatted"
        });
        
        this.tabManager.addTab({
            id: "tab-raw",
            title: "Raw",
            content: "<div class=\"response-raw\"></div>",
            active: this.options.defaultTab === "raw"
        });
        
        this.tabManager.addTab({
            id: "tab-headers",
            title: "Headers",
            content: "<div class=\"response-headers\"></div>",
            active: this.options.defaultTab === "headers"
        });
        
        this.tabManager.addTab({
            id: "tab-preview",
            title: "Preview",
            content: "<div class=\"response-preview\"></div>",
            active: this.options.defaultTab === "preview"
        });
        
        // Add event listeners for tab changes
        this.tabManager.addEventListener("tabs:activated", event => {
            // You could perform actions when tabs are switched
            console.log("Tab activated:", event.tabId);
        });
    }
    
    /**
     * Initializes the web worker for JSON parsing
     * @private
     */
    _initializeWorker() {
        try {
            // Check if browser supports web workers
            if (window.Worker) {
                // Create blob with worker code
                const workerCode = `
                    self.onmessage = function(e) {
                        const { id, action, data } = e.data;
                        
                        try {
                            let result;
                            
                            if (action === 'parseJSON') {
                                result = JSON.parse(data);
                            } else if (action === 'formatJSON') {
                                const obj = typeof data === 'string' ? JSON.parse(data) : data;
                                result = JSON.stringify(obj, null, 2);
                            } else if (action === 'highlightJSON') {
                                const obj = typeof data === 'string' ? JSON.parse(data) : data;
                                result = self.highlightJSON(obj);
                            }
                            
                            self.postMessage({ id, result, error: null });
                        } catch (error) {
                            self.postMessage({ id, result: null, error: error.message });
                        }
                    };
                    
                    // Simple JSON highlighter function
                    self.highlightJSON = function(json) {
                        const jsonStr = JSON.stringify(json, null, 2);
                        return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
                            let cls = 'json-number';
                            if (/^"/.test(match)) {
                                if (/:$/.test(match)) {
                                    cls = 'json-key';
                                } else {
                                    cls = 'json-string';
                                }
                            } else if (/true|false/.test(match)) {
                                cls = 'json-boolean';
                            } else if (/null/.test(match)) {
                                cls = 'json-null';
                            }
                            return '<span class="' + cls + '">' + match + '</span>';
                        });
                    };
                `;
                
                const blob = new Blob([workerCode], { type: "application/javascript" });
                const url = URL.createObjectURL(blob);
                
                // Create worker
                this.worker = new Worker(url);
                
                // Add message handler
                this.worker.onmessage = e => {
                    const { id, result, error } = e.data;
                    
                    // Get callback for this call
                    if (this.workerCallbacks.has(id)) {
                        const callback = this.workerCallbacks.get(id);
                        
                        // Remove callback
                        this.workerCallbacks.delete(id);
                        
                        // Call callback
                        if (error) {
                            callback.reject(new Error(error));
                        } else {
                            callback.resolve(result);
                        }
                    }
                };
                
                // Add error handler
                this.worker.onerror = error => {
                    console.error("Worker error:", error);
                };
                
                console.log("Worker initialized for JSON processing");
            }
        } catch (error) {
            console.error("Failed to initialize worker:", error);
            // Continue without worker - we'll use main thread for JSON processing
        }
    }
    
    /**
     * Calls a method in the worker
     * @param {string} action - The action to perform
     * @param {*} data - The data to send
     * @returns {Promise<*>} The result
     * @private
     */
    _callWorker(action, data) {
        return new Promise((resolve, reject) => {
            // If worker is not available, process on main thread
            if (!this.worker) {
                try {
                    let result;
                    
                    if (action === "parseJSON") {
                        result = JSON.parse(data);
                    } else if (action === "formatJSON") {
                        const obj = typeof data === "string" ? JSON.parse(data) : data;
                        result = JSON.stringify(obj, null, 2);
                    } else if (action === "highlightJSON") {
                        const obj = typeof data === "string" ? JSON.parse(data) : data;
                        result = this._highlightJSON(obj);
                    }
                    
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
                
                return;
            }
            
            // Generate call ID
            const id = this.workerCallId++;
            
            // Add callback
            this.workerCallbacks.set(id, { resolve, reject });
            
            // Send message to worker
            this.worker.postMessage({ id, action, data });
        });
    }
    
    /**
     * Simple JSON highlighter function for main thread
     * @param {Object} json - The JSON object
     * @returns {string} The highlighted JSON HTML
     * @private
     */
    _highlightJSON(json) {
        const jsonStr = JSON.stringify(json, null, 2);
        return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
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
            return "<span class=\"" + cls + "\">" + match + "</span>";
        });
    }
    
    /**
     * Displays an API response
     * @param {Object} response - The response object
     * @param {Object} request - The request object
     */
    async displayResponse(response, request) {
        try {
            // Store response and request
            this.response = response;
            this.request = request;
            
            // Clear previous response
            this._clearResponse();
            
            // Show response status
            this._showResponseStatus();
            
            // Show response in each tab
            await this._displayFormattedResponse();
            this._displayRawResponse();
            this._displayHeadersResponse();
            this._displayPreviewResponse();
            
            // Show response time
            this._showResponseTime();
            
            // Add copy buttons if enabled
            if (this.options.enableCopyButtons) {
                this._addCopyButtons();
            }
        } catch (error) {
            console.error("Error displaying response:", error);
            
            if (this.errorHandler) {
                this.errorHandler.handleError(error);
            }
        }
    }
    
    /**
     * Displays an error
     * @param {Error} error - The error object
     * @param {Object} request - The request object
     */
    displayError(error, request) {
        try {
            // Store error and request
            this.error = error;
            this.request = request;
            
            // Clear previous response
            this._clearResponse();
            
            // Create error message
            const errorMessage = document.createElement("div");
            errorMessage.className = "response-error";
            errorMessage.innerHTML = `
                <h3>Error</h3>
                <p>${error.message}</p>
                ${error.code ? `<p>Code: ${error.code}</p>` : ""}
                ${error.stack ? `<pre>${error.stack}</pre>` : ""}
            `;
            
            // Add to formatted response
            const formattedContainer = this.container.querySelector(".response-formatted");
            if (formattedContainer) {
                formattedContainer.appendChild(errorMessage.cloneNode(true));
            }
            
            // Add to raw response
            const rawContainer = this.container.querySelector(".response-raw");
            if (rawContainer) {
                rawContainer.appendChild(errorMessage.cloneNode(true));
            }
            
            // Set preview tab to show error
            const previewContainer = this.container.querySelector(".response-preview");
            if (previewContainer) {
                previewContainer.innerHTML = "<div class=\"response-error-preview\">Request failed: " + error.message + "</div>";
            }
        } catch (displayError) {
            console.error("Error displaying error:", displayError);
            
            if (this.errorHandler) {
                this.errorHandler.handleError(displayError);
            }
        }
    }
    
    /**
     * Clears the response display
     * @private
     */
    _clearResponse() {
        // Clear formatted response
        const formattedContainer = this.container.querySelector(".response-formatted");
        if (formattedContainer) {
            formattedContainer.innerHTML = "";
        }
        
        // Clear raw response
        const rawContainer = this.container.querySelector(".response-raw");
        if (rawContainer) {
            rawContainer.innerHTML = "";
        }
        
        // Clear headers response
        const headersContainer = this.container.querySelector(".response-headers");
        if (headersContainer) {
            headersContainer.innerHTML = "";
        }
        
        // Clear preview response
        const previewContainer = this.container.querySelector(".response-preview");
        if (previewContainer) {
            previewContainer.innerHTML = "";
        }
    }
    
    /**
     * Shows the response status
     * @private
     */
    _showResponseStatus() {
        if (!this.response) {
            return;
        }
        
        // Create status element
        const statusElement = document.createElement("div");
        statusElement.className = "response-status";
        
        // Add status color based on code
        const statusClass = this._getStatusClass(this.response.status);
        statusElement.classList.add(statusClass);
        
        // Add status text
        statusElement.innerHTML = `
            <span class="status-code">${this.response.status}</span>
            <span class="status-text">${this.response.statusText}</span>
        `;
        
        // Add to container
        this.container.querySelector(".response-formatted").appendChild(statusElement);
    }
    
    /**
     * Gets the CSS class for a status code
     * @param {number} statusCode - The status code
     * @returns {string} The CSS class
     * @private
     */
    _getStatusClass(statusCode) {
        if (statusCode >= 200 && statusCode < 300) {
            return "status-success";
        } else if (statusCode >= 300 && statusCode < 400) {
            return "status-redirect";
        } else if (statusCode >= 400 && statusCode < 500) {
            return "status-client-error";
        } else if (statusCode >= 500) {
            return "status-server-error";
        } else {
            return "status-unknown";
        }
    }
    
    /**
     * Shows the response time
     * @private
     */
    _showResponseTime() {
        if (!this.response || !this.response.time) {
            return;
        }
        
        // Create time element
        const timeElement = document.createElement("div");
        timeElement.className = "response-time";
        timeElement.innerHTML = `
            <span class="time-label">Time:</span>
            <span class="time-value">${this.response.time}ms</span>
        `;
        
        // Add to container
        this.container.querySelector(".response-formatted").appendChild(timeElement);
    }
    
    /**
     * Displays the formatted response
     * @private
     */
    async _displayFormattedResponse() {
        if (!this.response || !this.response.data) {
            return;
        }
        
        const formattedContainer = this.container.querySelector(".response-formatted");
        
        try {
            // Check content type
            const contentType = this.response.headers["content-type"] || "";
            
            // Format based on content type
            if (contentType.includes("application/json") || this._looksLikeJson(this.response.data)) {
                // Get the container for JSON response
                const jsonContainer = document.createElement("div");
                jsonContainer.className = "json-container";
                
                // Try to parse and format JSON
                try {
                    // Check if the data is already an object (parsed JSON)
                    let data = this.response.data;
                    if (typeof data === "string") {
                        // Parse JSON string
                        data = await this._callWorker("parseJSON", data);
                    }
                    
                    // Check if data size is too large for syntax highlighting
                    const dataSize = JSON.stringify(data).length;
                    
                    if (dataSize > this.options.syntaxHighlightLimit) {
                        // For large data, just format without highlighting
                        const formattedData = await this._callWorker("formatJSON", data);
                        
                        // Create pre element for formatted data
                        const preElement = document.createElement("pre");
                        preElement.className = "json large-json";
                        preElement.textContent = formattedData;
                        
                        // Add large data warning
                        const warningElement = document.createElement("div");
                        warningElement.className = "large-data-warning";
                        warningElement.textContent = `Large JSON response (${this._formatBytes(dataSize)}). Syntax highlighting disabled for performance.`;
                        
                        // Add to container
                        jsonContainer.appendChild(warningElement);
                        jsonContainer.appendChild(preElement);
                    } else {
                        // For smaller data, apply syntax highlighting
                        const highlightedData = await this._callWorker("highlightJSON", data);
                        
                        // Create pre element for highlighted data
                        const preElement = document.createElement("pre");
                        preElement.className = "json json-highlighted";
                        preElement.innerHTML = highlightedData;
                        
                        // Add to container
                        jsonContainer.appendChild(preElement);
                    }
                } catch (error) {
                    // If JSON parsing fails, show as text
                    console.error("JSON parsing error:", error);
                    
                    // Create pre element for raw data
                    const preElement = document.createElement("pre");
                    preElement.className = "json-error";
                    preElement.textContent = this.response.data;
                    
                    // Add error message
                    const errorElement = document.createElement("div");
                    errorElement.className = "json-error-message";
                    errorElement.textContent = `Invalid JSON: ${error.message}`;
                    
                    // Add to container
                    jsonContainer.appendChild(errorElement);
                    jsonContainer.appendChild(preElement);
                }
                
                // Add to formatted container
                formattedContainer.appendChild(jsonContainer);
            } else if (contentType.includes("text/html")) {
                // For HTML, create a container with HTML preview
                const htmlContainer = document.createElement("div");
                htmlContainer.className = "html-container";
                
                // Create pre element for HTML source
                const preElement = document.createElement("pre");
                preElement.className = "html-source";
                preElement.textContent = this.response.data;
                
                // Add to container
                htmlContainer.appendChild(preElement);
                
                // Add to formatted container
                formattedContainer.appendChild(htmlContainer);
            } else if (contentType.includes("text/xml") || contentType.includes("application/xml")) {
                // For XML, create a container with formatted XML
                const xmlContainer = document.createElement("div");
                xmlContainer.className = "xml-container";
                
                // Create pre element for XML
                const preElement = document.createElement("pre");
                preElement.className = "xml-source";
                preElement.textContent = this.response.data;
                
                // Add to container
                xmlContainer.appendChild(preElement);
                
                // Add to formatted container
                formattedContainer.appendChild(xmlContainer);
            } else if (contentType.includes("image/")) {
                // For images, create an image preview
                const imageContainer = document.createElement("div");
                imageContainer.className = "image-container";
                
                // Create image element
                const imgElement = document.createElement("img");
                imgElement.className = "image-preview";
                
                // Set image source based on response data
                if (typeof this.response.data === "string" && this.response.data.startsWith("data:")) {
                    // Data URL
                    imgElement.src = this.response.data;
                } else if (this.response.url) {
                    // Set image URL
                    imgElement.src = this.response.url;
                } else {
                    // Try to create blob URL
                    const blob = new Blob([this.response.data], { type: contentType });
                    imgElement.src = URL.createObjectURL(blob);
                }
                
                // Add to container
                imageContainer.appendChild(imgElement);
                
                // Add to formatted container
                formattedContainer.appendChild(imageContainer);
            } else {
                // For other types, show as text
                const textContainer = document.createElement("div");
                textContainer.className = "text-container";
                
                // Create pre element for text
                const preElement = document.createElement("pre");
                preElement.className = "text-source";
                preElement.textContent = this.response.data;
                
                // Add to container
                textContainer.appendChild(preElement);
                
                // Add to formatted container
                formattedContainer.appendChild(textContainer);
            }
        } catch (error) {
            console.error("Error formatting response:", error);
            
            // Show error message
            const errorElement = document.createElement("div");
            errorElement.className = "format-error";
            errorElement.textContent = `Error formatting response: ${error.message}`;
            
            // Add to formatted container
            formattedContainer.appendChild(errorElement);
        }
    }
    
    /**
     * Displays the raw response
     * @private
     */
    _displayRawResponse() {
        if (!this.response || !this.response.data) {
            return;
        }
        
        const rawContainer = this.container.querySelector(".response-raw");
        
        try {
            // Convert data to string if needed
            let rawData = this.response.data;
            
            if (typeof rawData !== "string") {
                try {
                    rawData = JSON.stringify(rawData, null, 2);
                } catch (error) {
                    rawData = String(rawData);
                }
            }
            
            // Check if data is too large
            if (rawData.length > this.options.maxRawLength) {
                // For very large data, truncate and show warning
                const truncatedData = rawData.substring(0, this.options.maxRawLength);
                
                // Create warning element
                const warningElement = document.createElement("div");
                warningElement.className = "large-data-warning";
                warningElement.textContent = `Large response (${this._formatBytes(rawData.length)}). Showing first ${this._formatBytes(this.options.maxRawLength)}.`;
                
                // Create pre element for truncated data
                const preElement = document.createElement("pre");
                preElement.className = "raw-data truncated";
                preElement.textContent = truncatedData;
                
                // Add to container
                rawContainer.appendChild(warningElement);
                rawContainer.appendChild(preElement);
            } else {
                // For normal-sized data, show everything
                const preElement = document.createElement("pre");
                preElement.className = "raw-data";
                preElement.textContent = rawData;
                
                // Add to container
                rawContainer.appendChild(preElement);
            }
        } catch (error) {
            console.error("Error displaying raw response:", error);
            
            // Show error message
            const errorElement = document.createElement("div");
            errorElement.className = "raw-error";
            errorElement.textContent = `Error displaying raw response: ${error.message}`;
            
            // Add to raw container
            rawContainer.appendChild(errorElement);
        }
    }
    
    /**
     * Displays the headers response
     * @private
     */
    _displayHeadersResponse() {
        if (!this.response || !this.response.headers) {
            return;
        }
        
        const headersContainer = this.container.querySelector(".response-headers");
        
        try {
            // Create table for headers
            const tableElement = document.createElement("table");
            tableElement.className = "headers-table";
            
            // Create table header
            const theadElement = document.createElement("thead");
            theadElement.innerHTML = `
                <tr>
                    <th>Name</th>
                    <th>Value</th>
                </tr>
            `;
            
            // Create table body
            const tbodyElement = document.createElement("tbody");
            
            // Add headers to table
            for (const [name, value] of Object.entries(this.response.headers)) {
                const trElement = document.createElement("tr");
                trElement.innerHTML = `
                    <td>${name}</td>
                    <td>${value}</td>
                `;
                
                tbodyElement.appendChild(trElement);
            }
            
            // Add table header and body to table
            tableElement.appendChild(theadElement);
            tableElement.appendChild(tbodyElement);
            
            // Add to headers container
            headersContainer.appendChild(tableElement);
        } catch (error) {
            console.error("Error displaying headers:", error);
            
            // Show error message
            const errorElement = document.createElement("div");
            errorElement.className = "headers-error";
            errorElement.textContent = `Error displaying headers: ${error.message}`;
            
            // Add to headers container
            headersContainer.appendChild(errorElement);
        }
    }
    
    /**
     * Displays the preview response
     * @private
     */
    _displayPreviewResponse() {
        if (!this.response || !this.response.data) {
            return;
        }
        
        const previewContainer = this.container.querySelector(".response-preview");
        
        try {
            // Check content type
            const contentType = this.response.headers["content-type"] || "";
            
            // Preview based on content type
            if (contentType.includes("text/html")) {
                // For HTML, create iframe preview
                const iframeElement = document.createElement("iframe");
                iframeElement.className = "html-preview";
                iframeElement.srcdoc = this.response.data;
                iframeElement.sandbox = "allow-same-origin";
                
                // Add to preview container
                previewContainer.appendChild(iframeElement);
            } else if (contentType.includes("image/")) {
                // For images, create image preview
                const imgElement = document.createElement("img");
                imgElement.className = "image-preview";
                
                // Set image source based on response data
                if (typeof this.response.data === "string" && this.response.data.startsWith("data:")) {
                    // Data URL
                    imgElement.src = this.response.data;
                } else if (this.response.url) {
                    // Set image URL
                    imgElement.src = this.response.url;
                } else {
                    // Try to create blob URL
                    const blob = new Blob([this.response.data], { type: contentType });
                    imgElement.src = URL.createObjectURL(blob);
                }
                
                // Add to preview container
                previewContainer.appendChild(imgElement);
            } else if (contentType.includes("application/pdf")) {
                // For PDFs, create object or iframe preview
                const objectElement = document.createElement("object");
                objectElement.className = "pdf-preview";
                objectElement.type = "application/pdf";
                
                // Try to set data
                if (this.response.url) {
                    objectElement.data = this.response.url;
                } else {
                    // Show message that preview is not available
                    const messageElement = document.createElement("div");
                    messageElement.className = "preview-message";
                    messageElement.textContent = "PDF preview not available for binary response.";
                    
                    // Add to preview container
                    previewContainer.appendChild(messageElement);
                    return;
                }
                
                // Add to preview container
                previewContainer.appendChild(objectElement);
            } else {
                // For other types, show message that preview is not available
                const messageElement = document.createElement("div");
                messageElement.className = "preview-message";
                messageElement.textContent = `Preview not available for ${contentType}.`;
                
                // Add to preview container
                previewContainer.appendChild(messageElement);
            }
        } catch (error) {
            console.error("Error displaying preview:", error);
            
            // Show error message
            const errorElement = document.createElement("div");
            errorElement.className = "preview-error";
            errorElement.textContent = `Error displaying preview: ${error.message}`;
            
            // Add to preview container
            previewContainer.appendChild(errorElement);
        }
    }
    
    /**
     * Adds copy buttons to copyable elements
     * @private
     */
    _addCopyButtons() {
        // Find all pre elements
        const preElements = this.container.querySelectorAll("pre");
        
        // Add copy button to each pre element
        preElements.forEach(preElement => {
            // Create button
            const buttonElement = document.createElement("button");
            buttonElement.className = "copy-button";
            buttonElement.textContent = "Copy";
            
            // Add click event
            buttonElement.addEventListener("click", () => {
                // Get text to copy
                const textToCopy = preElement.textContent;
                
                // Copy to clipboard
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        // Show copied message
                        buttonElement.textContent = "Copied!";
                        buttonElement.classList.add("copied");
                        
                        // Reset after a delay
                        setTimeout(() => {
                            buttonElement.textContent = "Copy";
                            buttonElement.classList.remove("copied");
                        }, 2000);
                    })
                    .catch(error => {
                        console.error("Copy failed:", error);
                        
                        // Show error message
                        buttonElement.textContent = "Failed!";
                        buttonElement.classList.add("copy-error");
                        
                        // Reset after a delay
                        setTimeout(() => {
                            buttonElement.textContent = "Copy";
                            buttonElement.classList.remove("copy-error");
                        }, 2000);
                    });
            });
            
            // Add button to pre element container
            const container = preElement.parentElement;
            container.classList.add("copyable");
            container.appendChild(buttonElement);
        });
    }
    
    /**
     * Checks if a string looks like JSON
     * @param {string} str - The string to check
     * @returns {boolean} Whether the string looks like JSON
     * @private
     */
    _looksLikeJson(str) {
        if (typeof str !== "string") {
            return false;
        }
        
        str = str.trim();
        return (str.startsWith("{") && str.endsWith("}")) || 
               (str.startsWith("[") && str.endsWith("]"));
    }
    
    /**
     * Formats a byte size into a human-readable string
     * @param {number} bytes - The byte size
     * @returns {string} The formatted size
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return "0 Bytes";
        
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }
} 