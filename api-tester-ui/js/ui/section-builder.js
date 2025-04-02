/**
 * Section Builder Module
 * Responsible for creating API sections and endpoints
 */

/**
 *
 */
export class SectionBuilder {
    /**
     * Creates a new SectionBuilder
     * @param {HTMLElement} container - The container element for API sections
     * @param {Function} executeCallback - Callback function for endpoint execution
     */
    constructor(container, executeCallback) {
        this.container = container;
        this.executeCallback = executeCallback || function () {};
        this.sections = {};
    }
    
    /**
     * Builds all API sections from the provided configuration
     * @param {Object} apiEndpoints - The API_ENDPOINTS configuration object
     */
    buildSections(apiEndpoints) {
        if (!this.container || !apiEndpoints) {
            console.error("Container element or API endpoints not found");
            return;
        }
        
        // Clear existing content
        this.container.innerHTML = "";
        
        // Add each section
        Object.keys(apiEndpoints).forEach(key => {
            const sectionData = apiEndpoints[key];
            const section = this.createApiSection(sectionData.section, sectionData.endpoints);
            this.container.appendChild(section);
        });
    }
    
    /**
     * Creates a section element with its endpoints
     * @param {Object} sectionInfo - The section information
     * @param {Array} endpoints - The endpoints in this section
     * @returns {HTMLElement} The created section element
     */
    createApiSection(sectionInfo, endpoints) {
        const section = document.createElement("div");
        section.className = "api-section";
        section.id = `section-${sectionInfo.id}`;
        
        const header = document.createElement("h2");
        header.className = "section-header";
        header.textContent = sectionInfo.title;
        section.appendChild(header);
        
        const endpointsContainer = document.createElement("div");
        endpointsContainer.className = "endpoints-container";
        
        endpoints.forEach(endpoint => {
            const endpointElement = this.createEndpoint(endpoint);
            endpointsContainer.appendChild(endpointElement);
        });
        
        section.appendChild(endpointsContainer);
        return section;
    }
    
    /**
     * Creates an endpoint element with its fields
     * @param {Object} endpoint - The endpoint configuration
     * @returns {HTMLElement} The created endpoint element
     */
    createEndpoint(endpoint) {
        const endpointEl = document.createElement("div");
        endpointEl.className = "endpoint";
        endpointEl.id = `endpoint-${endpoint.id}`;
        
        // Add title
        const title = document.createElement("h3");
        title.className = "endpoint-title";
        title.textContent = endpoint.name;
        endpointEl.appendChild(title);
        
        // Add path and method
        if (endpoint.path) {
            const pathMethod = document.createElement("div");
            pathMethod.className = "endpoint-path-method";
            
            // Create the method selector
            const methodSelector = document.createElement("div");
            methodSelector.className = "method-selector";
            
            const methods = ["GET", "POST", "PUT", "DELETE"];
            methods.forEach(methodName => {
                const methodBtn = document.createElement("button");
                methodBtn.type = "button";
                methodBtn.className = `btn-method-select ${methodName.toLowerCase()}`;
                methodBtn.dataset.method = methodName.toLowerCase();
                methodBtn.textContent = methodName;
                
                // Set active class on default method
                if (methodName === endpoint.method) {
                    methodBtn.classList.add("active");
                }
                
                methodSelector.appendChild(methodBtn);
            });
            
            pathMethod.appendChild(methodSelector);
            
            // Add path display
            const pathDisplay = document.createElement("span");
            pathDisplay.className = "path";
            pathDisplay.textContent = endpoint.path;
            pathMethod.appendChild(pathDisplay);
            
            endpointEl.appendChild(pathMethod);
        }
        
        // Add description if available
        if (endpoint.description) {
            const desc = document.createElement("div");
            desc.className = "endpoint-description";
            desc.textContent = endpoint.description;
            endpointEl.appendChild(desc);
        }
        
        // Add form
        const form = document.createElement("form");
        form.className = "endpoint-form";
        form.id = `form-${endpoint.id}`;
        
        // Add fields
        if (endpoint.fields && endpoint.fields.length > 0) {
            const fieldsContainer = document.createElement("div");
            fieldsContainer.className = "fields-container";
            
            endpoint.fields.forEach(field => {
                const fieldContainer = document.createElement("div");
                fieldContainer.className = "field-container";
                
                const label = document.createElement("label");
                label.htmlFor = `${endpoint.id}-${field.id}`;
                label.textContent = field.label;
                fieldContainer.appendChild(label);
                
                let input;
                
                // Handle different field types
                if (field.type === "textarea") {
                    input = document.createElement("textarea");
                    input.rows = field.rows || 3;
                } else if (field.type === "json") {
                    // Create container for JSON editor
                    const editorContainer = document.createElement("div");
                    editorContainer.id = `${endpoint.id}-${field.id}-container`;
                    editorContainer.className = "json-input-container";
                    fieldContainer.appendChild(editorContainer);
                    
                    // We'll initialize the JSON editor after the DOM is ready
                    setTimeout(() => {
                        try {
                            const container = document.getElementById(`${endpoint.id}-${field.id}`);
                            const editor = new JSONEditor(container, {
                                mode: "code",
                                modes: ["code", "view"]
                            });
                            
                            // Set default or placeholder value
                            if (field.defaultValue) {
                                try {
                                    editor.set(JSON.parse(field.defaultValue));
                                } catch (e) {
                                    editor.set({});
                                }
                            } else if (field.placeholder) {
                                try {
                                    editor.set(JSON.parse(field.placeholder));
                                } catch (e) {
                                    editor.set({});
                                }
                            } else {
                                editor.set({});
                            }
                        } catch (e) {
                            console.error(`Error creating JSON editor for ${endpoint.id}-${field.id}:`, e);
                            // Fallback to textarea if JSONEditor fails
                            const textarea = document.createElement("textarea");
                            textarea.id = `${endpoint.id}-${field.id}`;
                            textarea.rows = field.rows || 5;
                            textarea.placeholder = field.placeholder || "";
                            if (field.defaultValue) textarea.value = field.defaultValue;
                            const editorContainer = document.getElementById(`${endpoint.id}-${field.id}-container`);
                            if (editorContainer) {
                                editorContainer.parentNode.replaceChild(textarea, editorContainer);
                            }
                        }
                    }, 0);
                    
                    // Skip the rest of this iteration since we've added the editor container
                    return;
                } else if (field.type === "select") {
                    input = document.createElement("select");
                    if (field.options && field.options.length > 0) {
                        field.options.forEach(option => {
                            const optionEl = document.createElement("option");
                            optionEl.value = option.value;
                            optionEl.textContent = option.label;
                            input.appendChild(optionEl);
                        });
                    }
                    if (field.defaultValue) {
                        input.value = field.defaultValue;
                    }
                } else {
                    input = document.createElement("input");
                    input.type = field.type;
                }
                
                // Set common input attributes
                if (input) {
                    input.id = `${endpoint.id}-${field.id}`;
                    input.name = field.id;
                    input.placeholder = field.placeholder || "";
                    if (field.defaultValue && field.type !== "select") {
                        input.value = field.defaultValue;
                    }
                    
                    fieldContainer.appendChild(input);
                }
                
                fieldsContainer.appendChild(fieldContainer);
            });
            
            form.appendChild(fieldsContainer);
        }
        
        // Add execute button
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "button-container";
        
        const submitBtn = document.createElement("button");
        submitBtn.type = "button";
        submitBtn.className = "btn-execute";
        submitBtn.textContent = `Send ${endpoint.method} Request`;
        submitBtn.id = `btn-${endpoint.id}`;
        submitBtn.dataset.method = endpoint.method.toLowerCase();
        
        // Add click handler that calls the execute callback
        submitBtn.addEventListener("click", () => {
            // Get the active method
            const activeMethodBtn = form.querySelector(".btn-method-select.active");
            const method = activeMethodBtn ? activeMethodBtn.dataset.method : endpoint.method;
            
            // Call the execute callback with the endpoint and method
            this.executeCallback(endpoint, method);
        });
        
        buttonContainer.appendChild(submitBtn);
        form.appendChild(buttonContainer);
        
        // Add method button event listeners
        setTimeout(() => {
            const methodBtns = endpointEl.querySelectorAll(".btn-method-select");
            methodBtns.forEach(btn => {
                btn.addEventListener("click", _e => {
                    // Remove active class from all buttons
                    methodBtns.forEach(b => b.classList.remove("active"));
                    
                    // Add active class to clicked button
                    btn.classList.add("active");
                    
                    // Update execute button text
                    const executeBtn = endpointEl.querySelector(".btn-execute");
                    if (executeBtn) {
                        executeBtn.textContent = `Send ${btn.dataset.method.toUpperCase()} Request`;
                        executeBtn.dataset.method = btn.dataset.method;
                    }
                    
                    // Show/hide body fields based on method
                    const shouldShowBody = ["post", "put"].includes(btn.dataset.method);
                    const jsonContainers = endpointEl.querySelectorAll(".json-input-container");
                    const textareas = endpointEl.querySelectorAll("textarea");
                    
                    [...jsonContainers, ...textareas].forEach(el => {
                        // Find the parent field container
                        const fieldContainer = el.closest(".field-container");
                        if (!fieldContainer) return;
                        
                        // Check if this is a body field (usually contains "body" in the id)
                        if (el.id.toLowerCase().includes("body")) {
                            fieldContainer.style.display = shouldShowBody ? "block" : "none";
                        }
                    });
                });
            });
        }, 0);
        
        endpointEl.appendChild(form);
        return endpointEl;
    }

    /**
     * Builds the endpoint form
     * @param {Object} endpoint - The endpoint configuration
     * @param {HTMLElement} containerElement - The container element
     * @returns {HTMLElement} The created form element
     */
    buildEndpointForm(endpoint, containerElement) {
        // Create form container
        const formContainer = document.createElement("div");
        formContainer.className = "endpoint-form-container";
        formContainer.dataset.endpointId = endpoint.id;
        
        // Create form
        const form = document.createElement("form");
        form.className = "endpoint-form";
        form.id = `endpoint-form-${endpoint.id}`;
        
        // Add URL field
        const urlField = this._buildURLField(endpoint);
        form.appendChild(urlField);
        
        // Add parameters fields if any
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            const paramsContainer = this._buildParametersSection(endpoint.parameters);
            form.appendChild(paramsContainer);
        }
        
        // Add headers fields if any
        if (endpoint.headers && endpoint.headers.length > 0) {
            const headersContainer = this._buildHeadersSection(endpoint.headers);
            form.appendChild(headersContainer);
        }
        
        // Add body container if needed
        if (endpoint.method !== "GET" && endpoint.method !== "DELETE") {
            const bodyContainer = this._buildBodySection(endpoint);
            form.appendChild(bodyContainer);
        }
        
        // Add submit button
        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.className = "send-request-btn";
        submitButton.textContent = "Send Request";
        form.appendChild(submitButton);
        
        // Add form to container
        formContainer.appendChild(form);
        
        // Add form to the provided container element
        containerElement.appendChild(formContainer);
        
        return formContainer;
    }

    /**
     * Handles editor toggle click
     * @param {Event} _e - The click event
     * @param {string} editorId - The editor ID
     */
    _handleEditorToggle(_e, editorId) {
        const editorContainer = document.getElementById(editorId);
        if (editorContainer) {
            editorContainer.classList.toggle("expanded");
        }
    }
} 