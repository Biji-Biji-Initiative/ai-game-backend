/**
 * Domain State Viewer Component
 * Provides UI for selecting and viewing domain entity state snapshots
 */

/**
 * Creates a Domain State Viewer component
 */
export class DomainStateViewer {
    /**
     * Creates a new DomainStateViewer
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            container: null,
            domainStateManager: null,
            ...(options || {})
        };
        
        this.container = this.options.container;
        this.domainStateManager = this.options.domainStateManager;
        this.selectedEntityTypes = [];
        
        if (!this.container) {
            throw new Error('Container element is required for DomainStateViewer');
        }
        
        if (!this.domainStateManager) {
            throw new Error('DomainStateManager is required for DomainStateViewer');
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
            <div class="domain-state-viewer">
                <div class="domain-state-header">
                    <h3>Domain State Snapshot</h3>
                    <p class="domain-state-description">
                        Select entity types to capture state snapshots before and after executing the step.
                    </p>
                </div>
                
                <div class="domain-state-selector">
                    <div class="entity-types-list" id="entity-types-list">
                        <!-- Entity type checkboxes will be added here -->
                    </div>
                    
                    <div class="snapshot-actions">
                        <button type="button" id="take-before-snapshot-btn" class="btn btn-secondary btn-sm">Take Before Snapshot</button>
                        <div class="snapshot-status" id="snapshot-status"></div>
                    </div>
                </div>
                
                <div class="domain-state-content-container">
                    <div class="domain-state-tabs">
                        <button type="button" class="domain-state-tab active" data-tab="snapshot-view">Snapshots</button>
                        <button type="button" class="domain-state-tab" data-tab="diff-view">Differences</button>
                    </div>
                    
                    <div class="domain-state-content active" id="snapshot-view">
                        <div class="snapshot-panels">
                            <div class="snapshot-panel">
                                <h4>Before State</h4>
                                <div class="snapshot-data" id="before-snapshot-data">
                                    <div class="empty-snapshot">No snapshot taken yet</div>
                                </div>
                            </div>
                            
                            <div class="snapshot-panel">
                                <h4>After State</h4>
                                <div class="snapshot-data" id="after-snapshot-data">
                                    <div class="empty-snapshot">No snapshot taken yet</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="domain-state-content" id="diff-view">
                        <div class="diff-data" id="diff-data">
                            <div class="empty-diff">No differences to display</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Get elements
        this.entityTypesListElement = this.container.querySelector('#entity-types-list');
        this.takeBeforeSnapshotButton = this.container.querySelector('#take-before-snapshot-btn');
        this.snapshotStatusElement = this.container.querySelector('#snapshot-status');
        this.beforeSnapshotDataElement = this.container.querySelector('#before-snapshot-data');
        this.afterSnapshotDataElement = this.container.querySelector('#after-snapshot-data');
        this.diffDataElement = this.container.querySelector('#diff-data');
        this.tabButtons = this.container.querySelectorAll('.domain-state-tab');
        this.contentPanels = {
            'snapshot-view': this.container.querySelector('#snapshot-view'),
            'diff-view': this.container.querySelector('#diff-view')
        };
        
        // Populate entity types
        this.populateEntityTypes();
        
        // Add event listeners
        this.takeBeforeSnapshotButton.addEventListener('click', () => this.takeBeforeSnapshot());
        
        // Add tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setActiveTab(button.dataset.tab);
            });
        });
        
        // Listen to domain state manager events
        this.domainStateManager.onSnapshotChange((phase, snapshots) => {
            this.renderSnapshots(phase, snapshots);
            
            if (phase === 'after') {
                this.renderDiff();
            }
        });
        
        this.domainStateManager.onError((message, error) => {
            this.showError(message);
        });
    }
    
    /**
     * Populates the entity types list
     */
    populateEntityTypes() {
        const entityTypes = this.domainStateManager.getEntityTypes();
        
        if (entityTypes.length === 0) {
            this.entityTypesListElement.innerHTML = '<p>No entity types available</p>';
            return;
        }
        
        const html = entityTypes.map(type => `
            <div class="entity-type-item">
                <label class="entity-type-checkbox">
                    <input type="checkbox" name="entity-type" value="${type.id}">
                    ${type.name}
                </label>
            </div>
        `).join('');
        
        this.entityTypesListElement.innerHTML = html;
        
        // Add event listeners to checkboxes
        this.entityTypesListElement.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectedEntityTypes());
        });
    }
    
    /**
     * Updates the selected entity types based on checkboxes
     */
    updateSelectedEntityTypes() {
        this.selectedEntityTypes = [];
        
        this.entityTypesListElement.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            this.selectedEntityTypes.push(checkbox.value);
        });
        
        // Update UI based on selection
        this.takeBeforeSnapshotButton.disabled = this.selectedEntityTypes.length === 0;
    }
    
    /**
     * Takes a before snapshot
     */
    async takeBeforeSnapshot() {
        if (this.selectedEntityTypes.length === 0) {
            this.showStatus('Please select at least one entity type', 'warning');
            return;
        }
        
        try {
            this.showStatus('Taking snapshot...', 'info');
            
            // Get the current request from the form (this will be provided by the main app)
            const request = this.getCurrentRequest();
            
            if (!request) {
                this.showStatus('No request available', 'error');
                return;
            }
            
            // Take the snapshot
            await this.domainStateManager.takeBeforeSnapshot(request, this.selectedEntityTypes);
            
            this.showStatus('Before snapshot taken', 'success');
        } catch (error) {
            console.error('Failed to take before snapshot:', error);
            this.showStatus('Failed to take snapshot: ' + error.message, 'error');
        }
    }
    
    /**
     * Takes an after snapshot
     */
    async takeAfterSnapshot(request) {
        if (this.selectedEntityTypes.length === 0) {
            return;
        }
        
        try {
            // Take the snapshot
            await this.domainStateManager.takeAfterSnapshot(request, this.selectedEntityTypes);
            
            this.showStatus('After snapshot taken', 'success');
        } catch (error) {
            console.error('Failed to take after snapshot:', error);
            this.showStatus('Failed to take after snapshot: ' + error.message, 'error');
        }
    }
    
    /**
     * Gets the current request data from the form
     * This would typically be provided by the main application
     */
    getCurrentRequest() {
        // This is a placeholder - the actual implementation will get the request from the form
        return window.currentRequest || null;
    }
    
    /**
     * Renders snapshots in the UI
     * @param {string} phase - 'before' or 'after'
     * @param {Object} snapshots - The snapshots data
     */
    renderSnapshots(phase, snapshots) {
        const targetElement = phase === 'before' 
            ? this.beforeSnapshotDataElement 
            : this.afterSnapshotDataElement;
        
        if (!snapshots || Object.keys(snapshots).length === 0) {
            targetElement.innerHTML = '<div class="empty-snapshot">No snapshot data</div>';
            return;
        }
        
        let html = '';
        
        // Create accordion for each entity type
        Object.entries(snapshots).forEach(([type, data]) => {
            const entityTypeInfo = this.domainStateManager.getEntityTypes().find(t => t.id === type) || { name: type };
            const entityName = entityTypeInfo.name;
            
            html += `
                <div class="entity-snapshot">
                    <div class="entity-snapshot-header">
                        <h5>${entityName} (ID: ${data.id})</h5>
                        <span class="expand-icon">▼</span>
                    </div>
                    <div class="entity-snapshot-body">
                        <pre class="snapshot-json">${this.formatJson(data.state)}</pre>
                    </div>
                </div>
            `;
        });
        
        targetElement.innerHTML = html;
        
        // Add event listeners to accordion headers
        targetElement.querySelectorAll('.entity-snapshot-header').forEach(header => {
            header.addEventListener('click', () => {
                const parent = header.parentElement;
                parent.classList.toggle('collapsed');
                
                const expandIcon = header.querySelector('.expand-icon');
                expandIcon.textContent = parent.classList.contains('collapsed') ? '▶' : '▼';
            });
        });
    }
    
    /**
     * Renders diff view
     */
    renderDiff() {
        const diffs = this.domainStateManager.calculateDiff();
        
        if (!diffs || Object.keys(diffs).length === 0) {
            this.diffDataElement.innerHTML = '<div class="empty-diff">No differences found</div>';
            return;
        }
        
        let html = '';
        
        // Create diff view for each entity type
        Object.entries(diffs).forEach(([type, diff]) => {
            const entityTypeInfo = this.domainStateManager.getEntityTypes().find(t => t.id === type) || { name: type };
            const entityName = entityTypeInfo.name;
            
            html += `
                <div class="entity-diff">
                    <div class="entity-diff-header">
                        <h5>${entityName}</h5>
                        <span class="diff-type diff-type-${diff.type}">${diff.type}</span>
                        <span class="expand-icon">▼</span>
                    </div>
                    <div class="entity-diff-body">
            `;
            
            switch (diff.type) {
                case 'new':
                    html += `
                        <div class="diff-new">
                            <h6>New Entity:</h6>
                            <pre class="diff-json">${this.formatJson(diff.added)}</pre>
                        </div>
                    `;
                    break;
                    
                case 'deleted':
                    html += `
                        <div class="diff-deleted">
                            <h6>Deleted Entity:</h6>
                            <pre class="diff-json">${this.formatJson(diff.removed)}</pre>
                        </div>
                    `;
                    break;
                    
                case 'modified':
                    html += `
                        <div class="diff-modified">
                            <h6>Modified Properties:</h6>
                            ${this.renderChanges(diff.changes)}
                        </div>
                    `;
                    break;
                    
                case 'unchanged':
                    html += `
                        <div class="diff-unchanged">
                            <p>No changes detected</p>
                        </div>
                    `;
                    break;
            }
            
            html += `
                    </div>
                </div>
            `;
        });
        
        this.diffDataElement.innerHTML = html;
        
        // Add event listeners to accordion headers
        this.diffDataElement.querySelectorAll('.entity-diff-header').forEach(header => {
            header.addEventListener('click', () => {
                const parent = header.parentElement;
                parent.classList.toggle('collapsed');
                
                const expandIcon = header.querySelector('.expand-icon');
                expandIcon.textContent = parent.classList.contains('collapsed') ? '▶' : '▼';
            });
        });
    }
    
    /**
     * Renders changes recursively
     * @param {Object} changes - The changes object
     * @param {string} path - Current property path
     * @returns {string} HTML for changes
     */
    renderChanges(changes, path = '') {
        let html = '<ul class="changes-list">';
        
        Object.entries(changes).forEach(([key, change]) => {
            const propertyPath = path ? `${path}.${key}` : key;
            
            if (change.action === 'modified' && change.changes) {
                // Nested changes
                html += `
                    <li class="change-item">
                        <span class="change-path">${key}</span>
                        <span class="change-action change-action-${change.action}">modified</span>
                        ${this.renderChanges(change.changes, propertyPath)}
                    </li>
                `;
            } else if (change.action === 'modified') {
                // Value change
                html += `
                    <li class="change-item">
                        <span class="change-path">${key}</span>
                        <span class="change-action change-action-${change.action}">modified</span>
                        <div class="change-value">
                            <div class="change-from">
                                <span class="change-label">From:</span> 
                                <span class="change-value-old">${this.formatValue(change.from)}</span>
                            </div>
                            <div class="change-to">
                                <span class="change-label">To:</span> 
                                <span class="change-value-new">${this.formatValue(change.to)}</span>
                            </div>
                        </div>
                    </li>
                `;
            } else if (change.action === 'added') {
                // Added property
                html += `
                    <li class="change-item">
                        <span class="change-path">${key}</span>
                        <span class="change-action change-action-${change.action}">added</span>
                        <div class="change-value">
                            <span class="change-value-new">${this.formatValue(change.value)}</span>
                        </div>
                    </li>
                `;
            } else if (change.action === 'removed') {
                // Removed property
                html += `
                    <li class="change-item">
                        <span class="change-path">${key}</span>
                        <span class="change-action change-action-${change.action}">removed</span>
                        <div class="change-value">
                            <span class="change-value-old">${this.formatValue(change.value)}</span>
                        </div>
                    </li>
                `;
            }
        });
        
        html += '</ul>';
        return html;
    }
    
    /**
     * Formats a JSON value
     * @param {*} value - The value to format
     * @returns {string} Formatted JSON string
     */
    formatJson(value) {
        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return String(value);
        }
    }
    
    /**
     * Formats a value for display
     * @param {*} value - The value to format
     * @returns {string} Formatted value
     */
    formatValue(value) {
        if (value === null) return '<span class="null-value">null</span>';
        if (value === undefined) return '<span class="undefined-value">undefined</span>';
        
        if (typeof value === 'object') {
            try {
                return `<pre class="json-value">${JSON.stringify(value, null, 2)}</pre>`;
            } catch (error) {
                return String(value);
            }
        }
        
        if (typeof value === 'string') {
            return `<span class="string-value">"${this.escapeHtml(value)}"</span>`;
        }
        
        if (typeof value === 'number') {
            return `<span class="number-value">${value}</span>`;
        }
        
        if (typeof value === 'boolean') {
            return `<span class="boolean-value">${value}</span>`;
        }
        
        return String(value);
    }
    
    /**
     * Escapes HTML in a string
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    /**
     * Sets the active tab
     * @param {string} tabName - Tab name to activate
     */
    setActiveTab(tabName) {
        if (!this.contentPanels[tabName]) return;
        
        // Update tab buttons
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });
        
        // Update content panels
        Object.entries(this.contentPanels).forEach(([name, panel]) => {
            panel.classList.toggle('active', name === tabName);
        });
        
        // If switching to diff view, ensure diff is rendered
        if (tabName === 'diff-view') {
            this.renderDiff();
        }
    }
    
    /**
     * Shows a status message
     * @param {string} message - The message to show
     * @param {string} type - Message type (info, success, error, warning)
     */
    showStatus(message, type = 'info') {
        this.snapshotStatusElement.innerHTML = message;
        this.snapshotStatusElement.className = `snapshot-status snapshot-status-${type}`;
        
        // Clear the message after a delay for success messages
        if (type === 'success') {
            setTimeout(() => {
                this.snapshotStatusElement.innerHTML = '';
                this.snapshotStatusElement.className = 'snapshot-status';
            }, 3000);
        }
    }
    
    /**
     * Shows an error message
     * @param {string} message - The error message
     */
    showError(message) {
        this.showStatus(message, 'error');
    }
}

export default DomainStateViewer; 