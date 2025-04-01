// Types improved by ts-improve-types
/**
 * Domain State Viewer Component
 * Provides UI for selecting and viewing domain entity state snapshots
 */

// Define interfaces for better type safety
interface DomainStateViewerOptions {
  container: HTMLElement | null;
  domainStateManager: any;
  onRequestNeeded?: () => any;
}

interface EntityType {
  id: string;
  name: string;
  description?: string;
}

interface StateSnapshot {
  id: string | number;
  state: any;
  timestamp?: string;
}

interface DiffChange {
  action: 'modified' | 'added' | 'removed';
  from?: any;
  to?: any;
  value?: any;
  changes?: Record<string, DiffChange>;
}

interface DiffResult {
  type: 'new' | 'deleted' | 'modified' | 'unchanged';
  added?: any;
  removed?: any;
  changes?: Record<string, DiffChange>;
}

/**
 * Creates a Domain State Viewer component
 */
export class DomainStateViewer {
    options: DomainStateViewerOptions;
    container: HTMLElement;
    domainStateManager: any;
    selectedEntityTypes: string[];
    entityTypesListElement: HTMLElement;
    takeBeforeSnapshotButton: HTMLElement;
    takeAfterSnapshotButton: HTMLElement;
    snapshotStatusElement: HTMLElement;
    beforeSnapshotDataElement: HTMLElement;
    afterSnapshotDataElement: HTMLElement;
    diffDataElement: HTMLElement;
    tabButtons: NodeListOf<Element>;
    contentPanels: Record<string, HTMLElement>;
    jsonFormatter: any;
    lastBeforeSnapshot: Record<string, StateSnapshot> | null = null;
    lastAfterSnapshot: Record<string, StateSnapshot> | null = null;
    
    /**
     * Creates a new DomainStateViewer
     * @param {Object} options - Configuration options
     */
    constructor(options: Partial<DomainStateViewerOptions> = {}) {
        this.options = {
            container: null,
            domainStateManager: null,
            onRequestNeeded: null,
            ...(options || {})
        };
        
        this.container = this.options.container as HTMLElement;
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
                    <div class="entity-type-controls">
                        <div class="entity-type-filter">
                            <input type="text" id="entity-type-filter" placeholder="Filter entity types...">
                        </div>
                        <div class="entity-type-actions">
                            <button type="button" id="select-all-btn" class="btn btn-sm">Select All</button>
                            <button type="button" id="deselect-all-btn" class="btn btn-sm">Deselect All</button>
                        </div>
                    </div>
                    
                    <div class="entity-types-list" id="entity-types-list">
                        <!-- Entity type checkboxes will be added here -->
                    </div>
                    
                    <div class="snapshot-actions">
                        <button type="button" id="take-before-snapshot-btn" class="btn btn-secondary btn-sm">Take Before Snapshot</button>
                        <button type="button" id="take-after-snapshot-btn" class="btn btn-primary btn-sm">Take After Snapshot</button>
                        <div class="snapshot-status" id="snapshot-status"></div>
                    </div>
                </div>
                
                <div class="domain-state-content-container">
                    <div class="domain-state-tabs">
                        <button type="button" class="domain-state-tab active" data-tab="snapshot-view">Snapshots</button>
                        <button type="button" class="domain-state-tab" data-tab="diff-view">Differences</button>
                    </div>
                    
                    <div class="domain-state-controls">
                        <div class="search-input-group">
                            <input type="text" id="state-search-input" placeholder="Search in state...">
                            <button type="button" id="search-btn" class="btn btn-sm">Search</button>
                        </div>
                        
                        <div class="view-controls">
                            <button type="button" id="expand-all-btn" class="btn btn-sm">Expand All</button>
                            <button type="button" id="collapse-all-btn" class="btn btn-sm">Collapse</button>
                        </div>
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
                        <div class="diff-controls">
                            <div class="diff-filter">
                                <label><input type="checkbox" id="filter-added" checked> Added</label>
                                <label><input type="checkbox" id="filter-removed" checked> Removed</label>
                                <label><input type="checkbox" id="filter-modified" checked> Modified</label>
                                <label><input type="checkbox" id="filter-unchanged"> Unchanged</label>
                            </div>
                        </div>
                        <div class="diff-data" id="diff-data">
                            <div class="empty-diff">No differences to display</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Get elements
        this.entityTypesListElement = this.container.querySelector('#entity-types-list') as HTMLElement;
        this.takeBeforeSnapshotButton = this.container.querySelector('#take-before-snapshot-btn') as HTMLElement;
        this.takeAfterSnapshotButton = this.container.querySelector('#take-after-snapshot-btn') as HTMLElement;
        this.snapshotStatusElement = this.container.querySelector('#snapshot-status') as HTMLElement;
        this.beforeSnapshotDataElement = this.container.querySelector('#before-snapshot-data') as HTMLElement;
        this.afterSnapshotDataElement = this.container.querySelector('#after-snapshot-data') as HTMLElement;
        this.diffDataElement = this.container.querySelector('#diff-data') as HTMLElement;
        this.tabButtons = this.container.querySelectorAll('.domain-state-tab');
        this.contentPanels = {
            'snapshot-view': this.container.querySelector('#snapshot-view') as HTMLElement,
            'diff-view': this.container.querySelector('#diff-view') as HTMLElement
        };
        
        // Get other control elements
        const entityTypeFilter = this.container.querySelector('#entity-type-filter') as HTMLInputElement;
        const selectAllButton = this.container.querySelector('#select-all-btn') as HTMLElement;
        const deselectAllButton = this.container.querySelector('#deselect-all-btn') as HTMLElement;
        const expandAllButton = this.container.querySelector('#expand-all-btn') as HTMLElement;
        const collapseAllButton = this.container.querySelector('#collapse-all-btn') as HTMLElement;
        const stateSearchInput = this.container.querySelector('#state-search-input') as HTMLInputElement;
        const searchButton = this.container.querySelector('#search-btn') as HTMLElement;
        
        // Get diff filter controls
        const filterAdded = this.container.querySelector('#filter-added') as HTMLInputElement;
        const filterRemoved = this.container.querySelector('#filter-removed') as HTMLInputElement;
        const filterModified = this.container.querySelector('#filter-modified') as HTMLInputElement;
        const filterUnchanged = this.container.querySelector('#filter-unchanged') as HTMLInputElement;
        
        // Populate entity types
        this.populateEntityTypes();
        
        // Initially disable the after button (only enabled after taking before snapshot)
        this.takeAfterSnapshotButton.disabled = true;
        
        // Add event listeners
        this.takeBeforeSnapshotButton.addEventListener('click', () => this.takeBeforeSnapshot());
        this.takeAfterSnapshotButton.addEventListener('click', () => this.takeAfterSnapshot());
        
        // Entity type filter
        entityTypeFilter.addEventListener('input', () => {
            this.filterEntityTypes(entityTypeFilter.value);
        });
        
        // Select/deselect all buttons
        selectAllButton.addEventListener('click', () => this.toggleAllEntityTypes(true));
        deselectAllButton.addEventListener('click', () => this.toggleAllEntityTypes(false));
        
        // Expand/collapse buttons
        expandAllButton.addEventListener('click', () => this.expandAllEntities());
        collapseAllButton.addEventListener('click', () => this.collapseAllEntities());
        
        // Search in state
        searchButton.addEventListener('click', () => {
            this.searchInState(stateSearchInput.value);
        });
        stateSearchInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.searchInState(stateSearchInput.value);
            }
        });
        
        // Diff filters
        [filterAdded, filterRemoved, filterModified, filterUnchanged].forEach(filter => {
            filter.addEventListener('change', () => {
                this.applyDiffFilters();
            });
        });
        
        // Add tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setActiveTab((button as HTMLElement).dataset.tab || '');
            });
        });
        
        // Listen to domain state manager events
        this.domainStateManager.onSnapshotChange((phase: string, snapshots: Record<string, StateSnapshot>) => {
            if (phase === 'before') {
                this.lastBeforeSnapshot = snapshots;
                if (snapshots && Object.keys(snapshots).length > 0) {
                    this.takeAfterSnapshotButton.disabled = false;
                }
            } else if (phase === 'after') {
                this.lastAfterSnapshot = snapshots;
            }
            
            this.renderSnapshots(phase, snapshots);
            
            if (phase === 'after') {
                this.renderDiff();
            }
        });
        
        this.domainStateManager.onError((message: string, error: Error) => {
            this.showError(message);
        });
    }
    
    /**
     * Filters entity types in the list based on search term
     * @param {string} searchTerm - The search term
     */
    filterEntityTypes(searchTerm: string) {
        const entityTypeItems = this.entityTypesListElement.querySelectorAll('.entity-type-item');
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        entityTypeItems.forEach(item => {
            const label = item.querySelector('label');
            if (!label) return;
            
            const text = label.textContent || '';
            
            if (text.toLowerCase().includes(lowerSearchTerm)) {
                (item as HTMLElement).style.display = '';
            } else {
                (item as HTMLElement).style.display = 'none';
            }
        });
    }
    
    /**
     * Toggles all entity type checkboxes
     * @param {boolean} selected - Whether to select or deselect all
     */
    toggleAllEntityTypes(selected: boolean) {
        const checkboxes = this.entityTypesListElement.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not([disabled])');
        checkboxes.forEach(checkbox => {
            // Only affect visible checkboxes
            const item = checkbox.closest('.entity-type-item');
            if (item && window.getComputedStyle(item).display !== 'none') {
                checkbox.checked = selected;
            }
        });
        
        this.updateSelectedEntityTypes();
    }
    
    /**
     * Expands all entity accordion elements
     */
    expandAllEntities() {
        const expandElements = (parent: HTMLElement) => {
            parent.querySelectorAll('.entity-snapshot, .entity-diff').forEach(el => {
                el.classList.remove('collapsed');
                
                // Update expand icon
                const expandIcon = el.querySelector('.expand-icon');
                if (expandIcon) {
                    expandIcon.textContent = '▼';
                }
                
                // Also expand nested items
                el.querySelectorAll('.nested-json-container.collapsed').forEach(nestedEl => {
                    nestedEl.classList.remove('collapsed');
                    
                    const nestedIcon = nestedEl.querySelector('.json-toggle');
                    if (nestedIcon) {
                        nestedIcon.textContent = '▼';
                    }
                });
            });
        };
        
        // Apply to both snapshots and diff views
        expandElements(this.beforeSnapshotDataElement);
        expandElements(this.afterSnapshotDataElement);
        expandElements(this.diffDataElement);
    }
    
    /**
     * Collapses all entity accordion elements
     */
    collapseAllEntities() {
        const collapseElements = (parent: HTMLElement) => {
            parent.querySelectorAll('.entity-snapshot, .entity-diff').forEach(el => {
                el.classList.add('collapsed');
                
                // Update expand icon
                const expandIcon = el.querySelector('.expand-icon');
                if (expandIcon) {
                    expandIcon.textContent = '▶';
                }
                
                // Also collapse nested items
                el.querySelectorAll('.nested-json-container:not(.collapsed)').forEach(nestedEl => {
                    nestedEl.classList.add('collapsed');
                    
                    const nestedIcon = nestedEl.querySelector('.json-toggle');
                    if (nestedIcon) {
                        nestedIcon.textContent = '▶';
                    }
                });
            });
        };
        
        // Apply to both snapshots and diff views
        collapseElements(this.beforeSnapshotDataElement);
        collapseElements(this.afterSnapshotDataElement);
        collapseElements(this.diffDataElement);
    }
    
    /**
     * Search in the state data and highlight matches
     * @param {string} searchTerm - The search term
     */
    searchInState(searchTerm: string) {
        if (!searchTerm.trim()) {
            // Clear highlights if search is empty
            this.clearSearchHighlights();
            return;
        }
        
        // Clear previous highlights
        this.clearSearchHighlights();
        
        // Determine which panel to search in based on active tab
        let targetElements: HTMLElement[] = [];
        
        if (this.contentPanels['snapshot-view'].classList.contains('active')) {
            targetElements = [this.beforeSnapshotDataElement, this.afterSnapshotDataElement];
        } else {
            targetElements = [this.diffDataElement];
        }
        
        let totalMatches = 0;
        
        // Expand all to ensure all content is visible for searching
        this.expandAllEntities();
        
        // Helper function to highlight text in an element
        const highlightInElement = (element: HTMLElement) => {
            if (!element) return 0;
            
            let matchesInElement = 0;
            const lowerSearchTerm = searchTerm.toLowerCase();
            
            // Process text nodes (for plain text content)
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        // Skip script, style tags and inputs
                        const parent = node.parentElement;
                        if (parent && ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(parent.tagName)) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        
                        return node.nodeValue && node.nodeValue.toLowerCase().includes(lowerSearchTerm)
                            ? NodeFilter.FILTER_ACCEPT
                            : NodeFilter.FILTER_SKIP;
                    }
                }
            );
            
            const matches: Text[] = [];
            let node: Node | null;
            
            // Find all text nodes with matches
            while ((node = walker.nextNode())) {
                matches.push(node as Text);
            }
            
            // Process matches
            matches.forEach(textNode => {
                const text = textNode.nodeValue || '';
                const parent = textNode.parentNode;
                if (!parent) return;
                
                let lastIndex = 0;
                let index = text.toLowerCase().indexOf(lowerSearchTerm);
                
                if (index === -1) return;
                
                // Create a document fragment to replace the original text node
                const fragment = document.createDocumentFragment();
                
                // For each match in this text node
                while (index !== -1) {
                    // Add text before the match
                    if (index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
                    }
                    
                    // Add highlighted match
                    const matchText = text.substring(index, index + searchTerm.length);
                    const highlight = document.createElement('span');
                    highlight.className = 'search-match';
                    highlight.textContent = matchText;
                    fragment.appendChild(highlight);
                    
                    lastIndex = index + searchTerm.length;
                    matchesInElement++;
                    totalMatches++;
                    
                    // Find next match
                    index = text.toLowerCase().indexOf(lowerSearchTerm, lastIndex);
                }
                
                // Add any remaining text
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                }
                
                // Replace the original text node with our fragment
                parent.replaceChild(fragment, textNode);
            });
            
            return matchesInElement;
        };
        
        // Apply search to target elements
        targetElements.forEach(element => {
            highlightInElement(element);
        });
        
        // Show search results
        this.showStatus(`Found ${totalMatches} matches`, 'info');
        
        // Scroll to first match
        const firstMatch = this.container.querySelector('.search-match');
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    /**
     * Clears search highlights
     */
    clearSearchHighlights() {
        this.container.querySelectorAll('.search-match').forEach(highlight => {
            const parent = highlight.parentNode;
            if (!parent) return;
            
            parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
            if (parent instanceof Element) {
                parent.normalize(); // Merge adjacent text nodes
            }
        });
    }
    
    /**
     * Apply filters to diff view
     */
    applyDiffFilters() {
        const filterAdded = this.container.querySelector('#filter-added') as HTMLInputElement;
        const filterRemoved = this.container.querySelector('#filter-removed') as HTMLInputElement;
        const filterModified = this.container.querySelector('#filter-modified') as HTMLInputElement;
        const filterUnchanged = this.container.querySelector('#filter-unchanged') as HTMLInputElement;
        
        // Get filter states
        const filters = {
            added: filterAdded.checked,
            removed: filterRemoved.checked,
            modified: filterModified.checked,
            unchanged: filterUnchanged.checked
        };
        
        // Apply filters to diff elements
        this.diffDataElement.querySelectorAll('.entity-diff').forEach(el => {
            const diffType = el.querySelector('.diff-type');
            if (!diffType) return;
            
            const type = diffType.textContent?.toLowerCase() || '';
            
            switch (type) {
                case 'new':
                    (el as HTMLElement).style.display = filters.added ? '' : 'none';
                    break;
                case 'deleted':
                    (el as HTMLElement).style.display = filters.removed ? '' : 'none';
                    break;
                case 'modified':
                    (el as HTMLElement).style.display = filters.modified ? '' : 'none';
                    break;
                case 'unchanged':
                    (el as HTMLElement).style.display = filters.unchanged ? '' : 'none';
                    break;
            }
        });
    }
    
    /**
     * Populatess the entity types list
     */
    populateEntityTypes() {
        const entityTypes = this.domainStateManager.getEntityTypes();
        
        if (entityTypes.length === 0) {
            this.entityTypesListElement.innerHTML = '<p>No entity types available</p>';
            return;
        }
        
        const html = entityTypes.map((type: EntityType) => `
            <div class="entity-type-item">
                <label class="entity-type-checkbox">
                    <input type="checkbox" name="entity-type" value="${type.id}">
                    <span class="entity-type-name">${type.name}</span>
                    ${type.description ? `<span class="entity-type-description">${type.description}</span>` : ''}
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
            this.selectedEntityTypes.push((checkbox as HTMLInputElement).value);
        });
        
        // Update UI based on selection
        this.takeBeforeSnapshotButton.disabled = this.selectedEntityTypes.length === 0;
        
        // If we have a before snapshot, enable after snapshot button
        this.takeAfterSnapshotButton.disabled = this.selectedEntityTypes.length === 0 || 
            !this.lastBeforeSnapshot || Object.keys(this.lastBeforeSnapshot).length === 0;
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
            
            // Get the current request from the callback
            const request = this.getCurrentRequest();
            
            if (!request) {
                this.showStatus('No request available', 'error');
                return;
            }
            
            // Take the snapshot
            await this.domainStateManager.takeBeforeSnapshot(request, this.selectedEntityTypes);
            
            this.showStatus('Before snapshot taken', 'success');
            this.takeAfterSnapshotButton.disabled = false;
        } catch (error: any) {
            console.error('Failed to take before snapshot:', error);
            this.showStatus('Failed to take snapshot: ' + error.message, 'error');
        }
    }
    
    /**
     * Takes an after snapshot
     */
    async takeAfterSnapshot() {
        if (this.selectedEntityTypes.length === 0) {
            this.showStatus('Please select at least one entity type', 'warning');
            return;
        }
        
        try {
            this.showStatus('Taking snapshot...', 'info');
            
            // Get the current request from the callback
            const request = this.getCurrentRequest();
            
            if (!request) {
                this.showStatus('No request available', 'error');
                return;
            }
            
            // Take the snapshot
            await this.domainStateManager.takeAfterSnapshot(request, this.selectedEntityTypes);
            
            this.showStatus('After snapshot taken', 'success');
            
            // Automatically switch to diff view when both snapshots are taken
            if (this.lastBeforeSnapshot && this.lastAfterSnapshot) {
                this.setActiveTab('diff-view');
            }
        } catch (error: any) {
            console.error('Failed to take after snapshot:', error);
            this.showStatus('Failed to take after snapshot: ' + error.message, 'error');
        }
    }
    
    /**
     * Gets the current request data from the callback
     * This would typically be provided by the main application
     */
    getCurrentRequest() {
        // Use the callback if provided
        if (typeof this.options.onRequestNeeded === 'function') {
            return this.options.onRequestNeeded();
        }
        
        // Fallback to window.currentRequest for backward compatibility
        return (window as any).currentRequest || null;
    }
    
    /**
     * Renders snapshots in the UI
     * @param {string} phase - 'before' or 'after'
     * @param {Object} snapshots - The snapshots data
     */
    renderSnapshots(phase: string, snapshots: Record<string, StateSnapshot>) {
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
            const entityTypeInfo = this.domainStateManager.getEntityTypes().find((t: EntityType) => t.id === type) || { name: type };
            const entityName = entityTypeInfo.name;
            
            html += `
                <div class="entity-snapshot">
                    <div class="entity-snapshot-header">
                        <h5>${entityName} (ID: ${data.id})</h5>
                        <span class="snapshot-timestamp">${data.timestamp ? new Date(data.timestamp).toLocaleString() : ''}</span>
                        <span class="expand-icon">▼</span>
                    </div>
                    <div class="entity-snapshot-body">
                        ${this.renderJsonWithCollapsibleSections(data.state)}
                    </div>
                </div>
            `;
        });
        
        targetElement.innerHTML = html;
        
        // Add event listeners to accordion headers
        targetElement.querySelectorAll('.entity-snapshot-header').forEach(header => {
            header.addEventListener('click', () => {
                const parent = header.parentElement;
                if (!parent) return;
                
                parent.classList.toggle('collapsed');
                
                const expandIcon = header.querySelector('.expand-icon');
                if (expandIcon) {
                    expandIcon.textContent = parent.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
        });
        
        // Add event listeners to JSON toggles
        targetElement.querySelectorAll('.json-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                
                const container = toggle.closest('.nested-json-container');
                if (!container) return;
                
                container.classList.toggle('collapsed');
                (toggle as HTMLElement).textContent = container.classList.contains('collapsed') ? '▶' : '▼';
            });
        });
    }
    
    /**
     * Renders JSON with collapsible nested objects and arrays
     * @param {any} data - The JSON data to render
     * @param {number} depth - Current nesting depth
     * @returns {string} HTML representation of the JSON data
     */
    renderJsonWithCollapsibleSections(data: any, depth = 0): string {
        if (data === null) return '<span class="json-null">null</span>';
        if (data === undefined) return '<span class="json-undefined">undefined</span>';
        
        if (typeof data !== 'object') {
            // Handle primitive values
            if (typeof data === 'string') {
                return `<span class="json-string">"${this.escapeHtml(data)}"</span>`;
            }
            if (typeof data === 'number') {
                return `<span class="json-number">${data}</span>`;
            }
            if (typeof data === 'boolean') {
                return `<span class="json-boolean">${data}</span>`;
            }
            return this.escapeHtml(String(data));
        }
        
        // Handle arrays and objects
        const isArray = Array.isArray(data);
        const isEmpty = Object.keys(data).length === 0;
        
        if (isEmpty) {
            return isArray ? '[]' : '{}';
        }
        
        const indent = ' '.repeat(depth * 2);
        const collapsible = depth > 0; // Only make nested objects collapsible
        
        let html = '';
        
        if (collapsible) {
            html += `<div class="nested-json-container">
                <span class="json-toggle">▼</span>`;
        }
        
        html += isArray ? '[' : '{';
        
        if (!isEmpty) {
            html += '<div class="json-content">';
            
            Object.entries(data).forEach(([key, value], index) => {
                html += '<div class="json-line">';
                
                if (!isArray) {
                    html += `<span class="json-key">"${this.escapeHtml(key)}"</span>: `;
                }
                
                html += this.renderJsonWithCollapsibleSections(value, depth + 1);
                
                if (index < Object.keys(data).length - 1) {
                    html += ',';
                }
                
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        html += isArray ? ']' : '}';
        
        if (collapsible) {
            html += '</div>';
        }
        
        return html;
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
        Object.entries(diffs).forEach(([type, diff]: [string, DiffResult]) => {
            const entityTypeInfo = this.domainStateManager.getEntityTypes().find((t: EntityType) => t.id === type) || { name: type };
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
                            ${this.renderJsonWithCollapsibleSections(diff.added)}
                        </div>
                    `;
                    break;
                    
                case 'deleted':
                    html += `
                        <div class="diff-deleted">
                            <h6>Deleted Entity:</h6>
                            ${this.renderJsonWithCollapsibleSections(diff.removed)}
                        </div>
                    `;
                    break;
                    
                case 'modified':
                    html += `
                        <div class="diff-modified">
                            <h6>Modified Properties:</h6>
                            ${this.renderChanges(diff.changes || {})}
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
                if (!parent) return;
                
                parent.classList.toggle('collapsed');
                
                const expandIcon = header.querySelector('.expand-icon');
                if (expandIcon) {
                    expandIcon.textContent = parent.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
        });
        
        // Add event listeners to JSON toggles in diff view
        this.diffDataElement.querySelectorAll('.json-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                
                const container = toggle.closest('.nested-json-container');
                if (!container) return;
                
                container.classList.toggle('collapsed');
                (toggle as HTMLElement).textContent = container.classList.contains('collapsed') ? '▶' : '▼';
            });
        });
        
        // Apply diff filters
        this.applyDiffFilters();
    }
    
    /**
     * Renders changes recursively
     * @param {Object} changes - The changes object
     * @param {string} path - Current property path
     * @returns {string} HTML for changes
     */
    renderChanges(changes: Record<string, DiffChange>, path = ''): string {
        let html = '<ul class="changes-list">';
        
        Object.entries(changes).forEach(([key, change]) => {
            const propertyPath = path ? `${path}.${key}` : key;
            
            if (change.action === 'modified' && change.changes) {
                // Nested changes
                html += `
                    <li class="change-item">
                        <div class="change-header">
                            <span class="change-path">${key}</span>
                            <span class="change-action change-action-${change.action}">modified</span>
                            <span class="change-toggle">▼</span>
                        </div>
                        <div class="change-details">${this.renderChanges(change.changes, propertyPath)}</div>
                    </li>
                `;
            } else if (change.action === 'modified') {
                // Value change
                html += `
                    <li class="change-item">
                        <div class="change-header">
                            <span class="change-path">${key}</span>
                            <span class="change-action change-action-${change.action}">modified</span>
                        </div>
                        <div class="change-details">
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
                        </div>
                    </li>
                `;
            } else if (change.action === 'added') {
                // Added property
                html += `
                    <li class="change-item">
                        <div class="change-header">
                            <span class="change-path">${key}</span>
                            <span class="change-action change-action-${change.action}">added</span>
                        </div>
                        <div class="change-details">
                            <div class="change-value">
                                <span class="change-value-new">${this.formatValue(change.value)}</span>
                            </div>
                        </div>
                    </li>
                `;
            } else if (change.action === 'removed') {
                // Removed property
                html += `
                    <li class="change-item">
                        <div class="change-header">
                            <span class="change-path">${key}</span>
                            <span class="change-action change-action-${change.action}">removed</span>
                        </div>
                        <div class="change-details">
                            <div class="change-value">
                                <span class="change-value-old">${this.formatValue(change.value)}</span>
                            </div>
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
    formatJson(value: any): string {
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
    formatValue(value: any): string {
        if (value === null) return '<span class="null-value">null</span>';
        if (value === undefined) return '<span class="undefined-value">undefined</span>';
        
        if (typeof value === 'object') {
            try {
                return this.renderJsonWithCollapsibleSections(value);
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
    escapeHtml(str: string): string {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    /**
     * Sets the active tab
     * @param {string} tabName - Tab name to activate
     */
    setActiveTab(tabName: string) {
        if (!this.contentPanels[tabName]) return;
        
        // Update tab buttons
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', (button as HTMLElement).dataset.tab === tabName);
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
    showStatus(message: string, type = 'info') {
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
    showError(message: string) {
        this.showStatus(message, 'error');
    }
}

export default DomainStateViewer; 