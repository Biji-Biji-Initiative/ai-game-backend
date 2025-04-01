/**
 * Response Viewer Component
 * Provides enhanced formatting for API responses
 */

/**
 * Creates a Response Viewer component
 */
export class ResponseViewer {
    /**
     * Creates a new ResponseViewer
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            container: null,
            previewSandboxed: true,
            jsonMaxDepth: 10,
            jsonMaxLines: 5000,
            ...(options || {})
        };
        
        this.container = this.options.container;
        this.currentResponse = null;
        this.activeTab = 'formatted';
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        
        if (!this.container) {
            throw new Error('Container element is required for ResponseViewer');
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
            <div class="response-viewer">
                <div class="response-tabs">
                    <button type="button" class="response-tab active" data-tab="formatted">Formatted</button>
                    <button type="button" class="response-tab" data-tab="raw">Raw</button>
                    <button type="button" class="response-tab" data-tab="headers">Headers</button>
                    <button type="button" class="response-tab" data-tab="preview">Preview</button>
                </div>
                
                <div class="response-search">
                    <div class="search-input-group">
                        <input type="text" id="response-search-input" placeholder="Search in response...">
                        <button type="button" id="search-prev-btn" title="Previous match">▲</button>
                        <button type="button" id="search-next-btn" title="Next match">▼</button>
                        <button type="button" id="search-close-btn" title="Close search">×</button>
                        <span class="search-results-count"></span>
                    </div>
                    <button type="button" id="show-search-btn" class="btn btn-sm">
                        <span class="search-icon">🔍</span> Search
                    </button>
                </div>
                
                <div class="response-content-container">
                    <div class="response-content active" id="formatted-content">
                        <div class="empty-content">No response data</div>
                    </div>
                    <div class="response-content" id="raw-content">
                        <div class="empty-content">No response data</div>
                    </div>
                    <div class="response-content" id="headers-content">
                        <div class="empty-content">No headers available</div>
                    </div>
                    <div class="response-content" id="preview-content">
                        <div class="empty-content">No preview available</div>
                    </div>
                </div>
                
                <div class="response-tools">
                    <div class="response-tools-left">
                        <button type="button" class="btn btn-sm" id="expand-all-btn">Expand All</button>
                        <button type="button" class="btn btn-sm" id="collapse-all-btn">Collapse All</button>
                    </div>
                    <div class="response-tools-right">
                        <button type="button" class="btn btn-sm" id="copy-response-btn">Copy Response</button>
                        <button type="button" class="btn btn-sm" id="download-response-btn">Download</button>
                    </div>
                </div>
            </div>
        `;
        
        // Get elements
        this.tabButtons = this.container.querySelectorAll('.response-tab');
        this.contentPanels = {
            formatted: this.container.querySelector('#formatted-content'),
            raw: this.container.querySelector('#raw-content'),
            headers: this.container.querySelector('#headers-content'),
            preview: this.container.querySelector('#preview-content')
        };
        
        this.copyButton = this.container.querySelector('#copy-response-btn');
        this.downloadButton = this.container.querySelector('#download-response-btn');
        this.expandAllButton = this.container.querySelector('#expand-all-btn');
        this.collapseAllButton = this.container.querySelector('#collapse-all-btn');
        
        // Search elements
        this.searchInput = this.container.querySelector('#response-search-input');
        this.searchPrevButton = this.container.querySelector('#search-prev-btn');
        this.searchNextButton = this.container.querySelector('#search-next-btn');
        this.searchCloseButton = this.container.querySelector('#search-close-btn');
        this.showSearchButton = this.container.querySelector('#show-search-btn');
        this.searchResultsCount = this.container.querySelector('.search-results-count');
        this.searchContainer = this.container.querySelector('.response-search');
        
        // Set initial state of search - hidden by default
        this.searchContainer.classList.add('search-collapsed');
        
        // Add event listeners
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setActiveTab(button.dataset.tab);
            });
        });
        
        this.copyButton.addEventListener('click', () => this.copyResponseToClipboard());
        this.downloadButton.addEventListener('click', () => this.downloadResponse());
        this.expandAllButton.addEventListener('click', () => this.expandAll());
        this.collapseAllButton.addEventListener('click', () => this.collapseAll());
        
        // Search event listeners
        this.showSearchButton.addEventListener('click', () => this.toggleSearch());
        this.searchCloseButton.addEventListener('click', () => this.toggleSearch(false));
        this.searchInput.addEventListener('input', () => this.performSearch());
        this.searchPrevButton.addEventListener('click', () => this.navigateSearch('prev'));
        this.searchNextButton.addEventListener('click', () => this.navigateSearch('next'));
        
        // Add keyboard shortcut for search
        this.container.addEventListener('keydown', (e) => {
            // Ctrl+F / Cmd+F to open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.toggleSearch(true);
            }
            
            // Escape to close search
            if (e.key === 'Escape') {
                this.toggleSearch(false);
            }
            
            // Enter to navigate to next match
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    this.navigateSearch('prev');
                } else {
                    this.navigateSearch('next');
                }
            }
        });
    }
    
    /**
     * Sets the active tab
     * @param {string} tabName - The tab name to activate
     */
    setActiveTab(tabName) {
        if (!this.contentPanels[tabName]) return;
        
        // Update active tab
        this.activeTab = tabName;
        
        // Update tab buttons
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });
        
        // Update content panels
        Object.entries(this.contentPanels).forEach(([name, panel]) => {
            panel.classList.toggle('active', name === tabName);
        });
        
        // Special handling for preview tab
        if (tabName === 'preview' && this.currentResponse) {
            this.renderPreview();
        }
        
        // Reset search when changing tabs
        this.clearSearch();
        
        // Toggle expand/collapse buttons visibility based on active tab
        const isJsonOrXml = tabName === 'formatted' && 
            this.currentResponse && 
            (typeof this.currentResponse.data === 'object' || 
            (typeof this.currentResponse.data === 'string' && 
            (this.currentResponse.data.trim().startsWith('{') || 
             this.currentResponse.data.trim().startsWith('<'))));
             
        this.expandAllButton.style.display = isJsonOrXml ? 'inline-block' : 'none';
        this.collapseAllButton.style.display = isJsonOrXml ? 'inline-block' : 'none';
    }
    
    /**
     * Toggles the search UI
     * @param {boolean} show - Whether to show or hide the search
     */
    toggleSearch(show) {
        const isCurrentlyShown = !this.searchContainer.classList.contains('search-collapsed');
        
        // Toggle based on parameter or current state
        const shouldShow = show !== undefined ? show : !isCurrentlyShown;
        
        if (shouldShow) {
            this.searchContainer.classList.remove('search-collapsed');
            this.searchInput.focus();
            
            // If there's text in the input, perform search
            if (this.searchInput.value.trim()) {
                this.performSearch();
            }
        } else {
            this.searchContainer.classList.add('search-collapsed');
            this.clearSearch();
        }
    }
    
    /**
     * Performs a search in the current response content
     */
    performSearch() {
        // Clear previous search
        this.clearSearchHighlights();
        
        const searchTerm = this.searchInput.value.trim();
        if (!searchTerm) {
            this.searchResultsCount.textContent = '';
            this.searchMatches = [];
            this.currentMatchIndex = -1;
            return;
        }
        
        // Get the active content panel
        const contentPanel = this.contentPanels[this.activeTab];
        if (!contentPanel) return;
        
        // For formatted JSON/XML with collapsibles, we need to expand all to search properly
        if (this.activeTab === 'formatted') {
            this.expandAll(false); // Expand without scrolling
        }
        
        // Highlight matches in the content panel
        this.searchMatches = [];
        
        // Function to highlight text in an element
        const highlightInElement = (element) => {
            if (!element) return;
            
            // Skip if it's a script, style, or input element
            if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(element.tagName)) return;
            
            // Process text nodes
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            const textNodes = [];
            let node;
            
            // Collect all text nodes first
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            
            // Now process them
            textNodes.forEach(textNode => {
                const parent = textNode.parentNode;
                const text = textNode.nodeValue;
                const searchRegex = new RegExp(this.escapeRegExp(searchTerm), 'gi');
                
                let match;
                let lastIndex = 0;
                const matches = [];
                
                // Find all matches in the text
                while ((match = searchRegex.exec(text)) !== null) {
                    matches.push({
                        index: match.index,
                        length: match[0].length
                    });
                }
                
                // If there are matches in this text node
                if (matches.length > 0) {
                    const fragment = document.createDocumentFragment();
                    
                    // Process each match
                    matches.forEach((match, i) => {
                        // Add text before the match
                        if (match.index > lastIndex) {
                            fragment.appendChild(document.createTextNode(
                                text.substring(lastIndex, match.index)
                            ));
                        }
                        
                        // Create a highlighted span for the match
                        const matchText = text.substr(match.index, match.length);
                        const highlightSpan = document.createElement('span');
                        highlightSpan.className = 'search-match';
                        highlightSpan.textContent = matchText;
                        
                        // Store reference to the match element
                        this.searchMatches.push(highlightSpan);
                        
                        fragment.appendChild(highlightSpan);
                        lastIndex = match.index + match.length;
                    });
                    
                    // Add any remaining text
                    if (lastIndex < text.length) {
                        fragment.appendChild(document.createTextNode(
                            text.substring(lastIndex)
                        ));
                    }
                    
                    // Replace the original text node with the fragment
                    parent.replaceChild(fragment, textNode);
                }
            });
        };
        
        // Highlight in the active content panel
        highlightInElement(contentPanel);
        
        // Update search results count
        this.updateSearchResultsCount();
        
        // Navigate to first match if there are matches
        if (this.searchMatches.length > 0) {
            this.navigateSearch('next');
        }
    }
    
    /**
     * Navigates between search matches
     * @param {string} direction - Direction to navigate ('next' or 'prev')
     */
    navigateSearch(direction) {
        if (this.searchMatches.length === 0) return;
        
        // Remove active class from current match
        if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.searchMatches.length) {
            this.searchMatches[this.currentMatchIndex].classList.remove('search-match-active');
        }
        
        // Update index based on direction
        if (direction === 'next') {
            this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
        } else {
            this.currentMatchIndex = this.currentMatchIndex <= 0 
                ? this.searchMatches.length - 1 
                : this.currentMatchIndex - 1;
        }
        
        // Add active class to new current match
        const activeMatch = this.searchMatches[this.currentMatchIndex];
        activeMatch.classList.add('search-match-active');
        
        // Scroll to the match
        activeMatch.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Update search results count
        this.updateSearchResultsCount();
    }
    
    /**
     * Updates the search results count display
     */
    updateSearchResultsCount() {
        if (this.searchMatches.length === 0) {
            this.searchResultsCount.textContent = 'No matches';
            return;
        }
        
        this.searchResultsCount.textContent = `${this.currentMatchIndex + 1} of ${this.searchMatches.length}`;
    }
    
    /**
     * Clears search highlights
     */
    clearSearchHighlights() {
        // Remove all search highlight spans
        this.container.querySelectorAll('.search-match').forEach(span => {
            const parent = span.parentNode;
            parent.replaceChild(document.createTextNode(span.textContent), span);
            parent.normalize(); // Merge adjacent text nodes
        });
        
        this.searchMatches = [];
        this.currentMatchIndex = -1;
    }
    
    /**
     * Completely clears the search state
     */
    clearSearch() {
        this.clearSearchHighlights();
        this.searchResultsCount.textContent = '';
        // Don't clear the search input text to allow for searching in different tabs
    }
    
    /**
     * Expands all collapsible sections in the response
     * @param {boolean} scroll - Whether to scroll to the top after expanding
     */
    expandAll(scroll = true) {
        // For JSON formatter
        const jsonfContent = this.contentPanels.formatted.querySelector('.json-formatter-root');
        if (jsonfContent) {
            // Use JSONFormatter's API if available
            if (typeof JSONFormatter === 'function' && jsonfContent.__jsonFormatter) {
                jsonfContent.__jsonFormatter.openAtDepth(Infinity);
            } else {
                // Manual expansion for custom implementation
                this.contentPanels.formatted.querySelectorAll('.json-formatter-closed').forEach(el => {
                    el.classList.remove('json-formatter-closed');
                    el.classList.add('json-formatter-open');
                });
            }
        }
        
        // For XML content
        this.contentPanels.formatted.querySelectorAll('.xml-collapsible.collapsed').forEach(el => {
            el.classList.remove('collapsed');
        });
        
        // Scroll back to top if requested
        if (scroll) {
            this.contentPanels[this.activeTab].scrollTop = 0;
        }
    }
    
    /**
     * Collapses all expandable sections in the response
     */
    collapseAll() {
        // For JSON formatter
        const jsonfContent = this.contentPanels.formatted.querySelector('.json-formatter-root');
        if (jsonfContent) {
            // Use JSONFormatter's API if available
            if (typeof JSONFormatter === 'function' && jsonfContent.__jsonFormatter) {
                jsonfContent.__jsonFormatter.openAtDepth(1);
            } else {
                // Manual collapse for custom implementation
                this.contentPanels.formatted.querySelectorAll('.json-formatter-open').forEach(el => {
                    // Only collapse top level
                    if (el.parentNode.classList.contains('json-formatter-root')) {
                        el.classList.remove('json-formatter-open');
                        el.classList.add('json-formatter-closed');
                    }
                });
            }
        }
        
        // For XML content
        this.contentPanels.formatted.querySelectorAll('.xml-collapsible:not(.collapsed)').forEach(el => {
            el.classList.add('collapsed');
        });
        
        // Scroll back to top
        this.contentPanels[this.activeTab].scrollTop = 0;
    }
    
    /**
     * Updates the response data and renders it
     * @param {Object} response - The response object
     */
    setResponse(response) {
        this.currentResponse = response;
        
        if (!response) {
            this.clearContent();
            return;
        }
        
        // Render each tab content
        this.renderFormattedContent();
        this.renderRawContent();
        this.renderHeadersContent();
        
        // Only pre-render preview if it's the active tab
        if (this.activeTab === 'preview') {
            this.renderPreview();
        }
        
        // Update expand/collapse buttons visibility
        const isJsonOrXml = 
            typeof response.data === 'object' || 
            (typeof response.data === 'string' && 
            (response.data.trim().startsWith('{') || 
             response.data.startsWith('<')));
             
        this.expandAllButton.style.display = isJsonOrXml ? 'inline-block' : 'none';
        this.collapseAllButton.style.display = isJsonOrXml ? 'inline-block' : 'none';
    }
    
    /**
     * Clears all content
     */
    clearContent() {
        Object.values(this.contentPanels).forEach(panel => {
            panel.innerHTML = '<div class="empty-content">No response data</div>';
        });
    }
    
    /**
     * Renders the formatted content tab
     */
    renderFormattedContent() {
        const panel = this.contentPanels.formatted;
        
        if (!this.currentResponse || !this.currentResponse.data) {
            panel.innerHTML = '<div class="empty-content">No response data</div>';
            return;
        }
        
        const data = this.currentResponse.data;
        
        // Handle different content types
        if (typeof data === 'string') {
            try {
                // Try to parse as JSON
                const jsonData = JSON.parse(data);
                this.renderJsonContent(panel, jsonData);
            } catch (error) {
                // Check if it's XML
                if (data.trim().startsWith('<') && data.includes('</')) {
                    this.renderXmlContent(panel, data);
                } else {
                    // Treat as plain text
                    this.renderTextContent(panel, data);
                }
            }
        } else if (typeof data === 'object') {
            this.renderJsonContent(panel, data);
        } else {
            this.renderTextContent(panel, String(data));
        }
    }
    
    /**
     * Renders JSON content with virtualization for very large objects
     * @param {Element} container - The container to render into
     * @param {Object} data - The JSON data
     */
    renderJsonContent(container, data) {
        try {
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            
            // Estimate size of the JSON data
            const jsonSize = JSON.stringify(data).length;
            const isVeryLarge = jsonSize > 500000;
            
            if (isVeryLarge) {
                // For very large responses, use a simplified renderer with virtualization
                this.renderLargeJsonContent(container, data);
                return;
            }
            
            // Check if JSONFormatter is available
            if (typeof JSONFormatter === 'function') {
                // Standard JSONFormatter for regular-sized JSON
                const formatter = new JSONFormatter(data, this.options.jsonMaxDepth, {
                    animateOpen: true,
                    animateClose: true,
                    theme,
                    hoverPreviewEnabled: true
                });
                
                container.innerHTML = '';
                const formatterEl = formatter.render();
                
                // Store reference to formatter instance for expand/collapse all
                formatterEl.__jsonFormatter = formatter;
                
                container.appendChild(formatterEl);
            } else {
                // Fallback to syntax-highlighted pre
                const jsonString = JSON.stringify(data, null, 2);
                container.innerHTML = `
                    <pre class="json-content">${this.syntaxHighlightJson(jsonString)}</pre>
                `;
            }
        } catch (error) {
            console.error('Error rendering JSON content:', error);
            
            // Ultimate fallback with no formatting
            container.innerHTML = `
                <div class="rendering-error">Error formatting JSON: ${error.message}</div>
                <pre class="fallback-content">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
            `;
        }
    }
    
    /**
     * Renders a very large JSON object using virtualization
     * @param {Element} container - The container to render into
     * @param {Object} data - The JSON data
     */
    renderLargeJsonContent(container, data) {
        // Convert to string with proper indentation
        const jsonString = JSON.stringify(data, null, 2);
        const lines = jsonString.split('\n');
        
        // Create virtualized container
        container.innerHTML = '<div class="virtualized-content" id="virtualized-json"></div>';
        
        const virtualContainer = container.querySelector('#virtualized-json');
        const lineHeight = 20; // Estimated line height in pixels
        const totalHeight = lines.length * lineHeight;
        const viewportHeight = virtualContainer.clientHeight;
        const bufferSize = 100; // Number of lines to render above/below viewport
        
        // Create the inner container for absolute positioning
        const innerContainer = document.createElement('div');
        innerContainer.className = 'virtualized-content-inner';
        innerContainer.style.height = `${totalHeight}px`;
        virtualContainer.appendChild(innerContainer);
        
        // Function to render visible lines with syntax highlighting
        const renderVisibleLines = () => {
            // Clear current content
            innerContainer.innerHTML = '';
            
            // Calculate visible range
            const scrollTop = virtualContainer.scrollTop;
            const startLine = Math.max(0, Math.floor(scrollTop / lineHeight) - bufferSize);
            const endLine = Math.min(
                lines.length - 1, 
                Math.ceil((scrollTop + viewportHeight) / lineHeight) + bufferSize
            );
            
            // Get visible slice
            const visibleLines = lines.slice(startLine, endLine + 1);
            const visibleText = visibleLines.join('\n');
            
            // Highlight the visible portion
            const highlightedHtml = this.syntaxHighlightJson(visibleText);
            
            // Create the highlighted block
            const highlightedBlock = document.createElement('div');
            highlightedBlock.className = 'virtualized-item';
            highlightedBlock.style.top = `${startLine * lineHeight}px`;
            highlightedBlock.innerHTML = `<pre class="json-content">${highlightedHtml}</pre>`;
            
            innerContainer.appendChild(highlightedBlock);
            
            // Update notice
            if (!virtualContainer.querySelector('.virtualization-notice')) {
                const notice = document.createElement('div');
                notice.className = 'virtualization-notice';
                notice.textContent = 'Large response - using simplified view for better performance';
                virtualContainer.appendChild(notice);
            }
        };
        
        // Initial render
        renderVisibleLines();
        
        // Add scroll listener with debounce
        let scrollTimeout;
        const scrollHandler = () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            scrollTimeout = setTimeout(() => {
                window.requestAnimationFrame(renderVisibleLines);
            }, 100); // Debounce to improve performance
        };
        
        virtualContainer.addEventListener('scroll', scrollHandler);
        
        // Store a reference to the handler for cleanup
        virtualContainer._scrollHandler = scrollHandler;
    }
    
    /**
     * Simple JSON syntax highlighting
     * @param {string} json - The JSON string
     * @returns {string} HTML with syntax highlighting
     */
    syntaxHighlightJson(json) {
        if (!json) return '';
        
        // Limit the number of lines to prevent browser hanging
        const lines = json.split('\n');
        if (lines.length > this.options.jsonMaxLines) {
            json = lines.slice(0, this.options.jsonMaxLines).join('\n') + 
                `\n\n/* Response truncated. ${lines.length - this.options.jsonMaxLines} more lines... */`;
        }
        
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
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
            return `<span class="${cls}">${match}</span>`;
        });
    }
    
    /**
     * Renders XML content
     * @param {Element} container - The container to render into
     * @param {string} data - The XML data
     */
    renderXmlContent(container, data) {
        try {
            // Format the XML with proper indentation
            const formattedXml = this.formatXml(data);
            
            // Add collapsible behavior to XML
            const collapsibleXml = this.makeXmlCollapsible(formattedXml);
            
            container.innerHTML = `
                <pre class="xml-content">${collapsibleXml}</pre>
            `;
            
            // Add event listeners for collapse/expand
            container.querySelectorAll('.xml-toggle').forEach(toggle => {
                toggle.addEventListener('click', (e) => {
                    const collapsible = e.target.closest('.xml-collapsible');
                    if (collapsible) {
                        collapsible.classList.toggle('collapsed');
                        e.stopPropagation(); // Prevent parent toggles from being triggered
                    }
                });
            });
        } catch (error) {
            console.error('Error rendering XML content:', error);
            
            container.innerHTML = `
                <div class="rendering-error">Error formatting XML: ${error.message}</div>
                <pre class="fallback-content">${escapeHtml(data)}</pre>
            `;
        }
    }
    
    /**
     * Simple XML formatting
     * @param {string} xml - The XML string
     * @returns {string} Formatted XML
     */
    formatXml(xml) {
        let formatted = '';
        let indent = '';
        const tab = '  '; // 2 spaces
        
        xml.split(/>\s*</).forEach(node => {
            if (node.match(/^\/\w/)) {
                // Closing tag
                indent = indent.substring(tab.length);
            }
            
            formatted += indent + '<' + node + '>\n';
            
            if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('?')) {
                // Opening tag
                indent += tab;
            }
        });
        
        return formatted.substring(1, formatted.length - 2);
    }
    
    /**
     * Simple XML syntax highlighting
     * @param {string} xml - The XML string
     * @returns {string} HTML with syntax highlighting
     */
    syntaxHighlightXml(xml) {
        if (!xml) return '';
        
        const lines = xml.split('\n');
        if (lines.length > this.options.jsonMaxLines) {
            xml = lines.slice(0, this.options.jsonMaxLines).join('\n') + 
                `\n\n<!-- Response truncated. ${lines.length - this.options.jsonMaxLines} more lines... -->`;
        }
        
        // Escape HTML characters
        xml = xml.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        
        // Replace XML tokens with spans
        return xml
            // Tag name
            .replace(/&lt;\/?([\w:-]+)(\s.*?)?\/?\s*&gt;/g, (match, p1, p2) => {
                let attribs = p2 ? p2 : '';
                // Highlight attributes
                attribs = attribs.replace(/([\w:-]+)="([^"]*)"/g, '<span class="xml-attr">$1</span>=<span class="xml-string">"$2"</span>');
                return `&lt;<span class="xml-tag">${p1}</span>${attribs}&gt;`;
            })
            // Comments
            .replace(/&lt;!--(.*)--&gt;/g, '&lt;!--<span class="xml-comment">$1</span>--&gt;')
            // CDATA
            .replace(/&lt;!\[CDATA\[(.*?)\]\]&gt;/g, '&lt;![CDATA[<span class="xml-cdata">$1</span>]]&gt;');
    }
    
    /**
     * Renders plain text content
     * @param {Element} container - The container to render into
     * @param {string} data - The text data
     */
    renderTextContent(container, data) {
        // Limit the size to prevent browser hanging
        const maxLength = 100000;
        let displayData = data;
        
        if (data.length > maxLength) {
            displayData = data.substring(0, maxLength) + 
                `\n\n/* Response truncated. ${data.length - maxLength} more characters... */`;
        }
        
        container.innerHTML = `
            <pre class="text-content">${escapeHtml(displayData)}</pre>
        `;
    }
    
    /**
     * Renders the raw content tab with virtualization for large responses
     */
    renderRawContent() {
        const panel = this.contentPanels.raw;
        
        if (!this.currentResponse || !this.currentResponse.rawText) {
            panel.innerHTML = '<div class="empty-content">No raw response data</div>';
            return;
        }
        
        const rawText = this.currentResponse.rawText;
        
        // Check if response is too large for standard rendering
        const isLarge = rawText.length > 100000 || rawText.split('\n').length > 2000;
        
        if (!isLarge) {
            // Standard rendering for smaller responses
            panel.innerHTML = `<pre class="raw-content">${escapeHtml(rawText)}</pre>`;
            return;
        }
        
        // Virtualized rendering for large responses
        panel.innerHTML = '<div class="virtualized-content" id="virtualized-raw"></div>';
        
        const virtualContainer = panel.querySelector('#virtualized-raw');
        const lines = rawText.split('\n');
        const lineHeight = 20; // Estimated line height in pixels
        const totalHeight = lines.length * lineHeight;
        const viewportHeight = virtualContainer.clientHeight;
        const bufferSize = 50; // Number of lines to render above/below viewport
        
        // Create the inner container for absolute positioning
        const innerContainer = document.createElement('div');
        innerContainer.className = 'virtualized-content-inner';
        innerContainer.style.height = `${totalHeight}px`;
        virtualContainer.appendChild(innerContainer);
        
        // Function to render visible lines
        const renderVisibleLines = () => {
            // Clear current content
            innerContainer.innerHTML = '';
            
            // Calculate visible range
            const scrollTop = virtualContainer.scrollTop;
            const startLine = Math.max(0, Math.floor(scrollTop / lineHeight) - bufferSize);
            const endLine = Math.min(
                lines.length - 1, 
                Math.ceil((scrollTop + viewportHeight) / lineHeight) + bufferSize
            );
            
            // Create fragment for batch DOM update
            const fragment = document.createDocumentFragment();
            
            // Add visible lines
            for (let i = startLine; i <= endLine; i++) {
                const lineEl = document.createElement('div');
                lineEl.className = 'virtualized-item';
                lineEl.style.top = `${i * lineHeight}px`;
                lineEl.style.height = `${lineHeight}px`;
                lineEl.textContent = lines[i] || '';
                fragment.appendChild(lineEl);
            }
            
            innerContainer.appendChild(fragment);
        };
        
        // Initial render
        renderVisibleLines();
        
        // Add scroll listener
        const scrollHandler = () => {
            window.requestAnimationFrame(renderVisibleLines);
        };
        
        virtualContainer.addEventListener('scroll', scrollHandler);
        
        // Store a reference to the handler for cleanup
        virtualContainer._scrollHandler = scrollHandler;
    }
    
    /**
     * Renders the headers content tab
     */
    renderHeadersContent() {
        const panel = this.contentPanels.headers;
        
        if (!this.currentResponse || !this.currentResponse.headers || 
            Object.keys(this.currentResponse.headers).length === 0) {
            panel.innerHTML = '<div class="empty-content">No headers available</div>';
            return;
        }
        
        const headers = this.currentResponse.headers;
        
        let headersList = '<table class="headers-table">';
        
        // Add status code row if available
        if (this.currentResponse.status) {
            const statusText = this.getStatusText(this.currentResponse.status);
            headersList += `
                <tr class="status-row">
                    <th>Status</th>
                    <td><strong>${this.currentResponse.status} ${statusText}</strong></td>
                </tr>
            `;
        }
        
        // Sort headers alphabetically
        const sortedHeaders = Object.keys(headers).sort().map(key => ({
            key,
            value: headers[key]
        }));
        
        // Add header rows
        sortedHeaders.forEach(({ key, value }) => {
            headersList += `
                <tr>
                    <th>${escapeHtml(key)}</th>
                    <td>${escapeHtml(value)}</td>
                </tr>
            `;
        });
        
        headersList += '</table>';
        
        panel.innerHTML = headersList;
    }
    
    /**
     * Renders the preview content tab
     */
    renderPreview() {
        const panel = this.contentPanels.preview;
        
        if (!this.currentResponse || !this.currentResponse.data) {
            panel.innerHTML = '<div class="empty-content">No content to preview</div>';
            return;
        }
        
        const data = this.currentResponse.data;
        const contentType = this.getContentType();
        
        // Handle different content types
        if (contentType.includes('image/')) {
            this.renderImagePreview(panel, data, contentType);
        } else if (contentType.includes('text/html') || (typeof data === 'string' && data.trim().startsWith('<html'))) {
            this.renderHtmlPreview(panel, data);
        } else if (contentType.includes('application/pdf')) {
            this.renderPdfPreview(panel, data);
        } else {
            panel.innerHTML = '<div class="empty-content">No preview available for this content type</div>';
        }
    }
    
    /**
     * Renders an image preview
     * @param {Element} container - The container to render into
     * @param {*} data - The image data
     * @param {string} contentType - The content type
     */
    renderImagePreview(container, data, contentType) {
        // Try to extract image URL or data URL
        let imageUrl = '';
        
        if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('data:'))) {
            // Direct URL or data URL
            imageUrl = data;
        } else if (this.currentResponse.url) {
            // Use the response URL
            imageUrl = this.currentResponse.url;
        } else if (typeof data === 'object' && data.url) {
            // Object with URL property
            imageUrl = data.url;
        }
        
        if (imageUrl) {
            container.innerHTML = `
                <div class="image-preview">
                    <img src="${imageUrl}" alt="Image Preview" />
                </div>
            `;
        } else {
            container.innerHTML = '<div class="empty-content">Unable to render image preview</div>';
        }
    }
    
    /**
     * Renders an HTML preview
     * @param {Element} container - The container to render into
     * @param {string} data - The HTML data
     */
    renderHtmlPreview(container, data) {
        if (typeof data !== 'string') {
            container.innerHTML = '<div class="empty-content">Invalid HTML content</div>';
            return;
        }
        
        // Use sandboxed iframe for security
        const useSandbox = this.options.previewSandboxed;
        const sandboxAttributes = useSandbox ? 
            'sandbox="allow-same-origin allow-scripts allow-forms"' : '';
        
        container.innerHTML = `
            <div class="html-preview">
                <iframe ${sandboxAttributes} class="preview-iframe"></iframe>
            </div>
        `;
        
        const iframe = container.querySelector('iframe');
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        
        doc.open();
        doc.write(data);
        doc.close();
    }
    
    /**
     * Renders a PDF preview
     * @param {Element} container - The container to render into
     * @param {*} data - The PDF data
     */
    renderPdfPreview(container, data) {
        // Try to extract PDF URL
        let pdfUrl = '';
        
        if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('data:'))) {
            // Direct URL or data URL
            pdfUrl = data;
        } else if (this.currentResponse.url) {
            // Use the response URL
            pdfUrl = this.currentResponse.url;
        } else if (typeof data === 'object' && data.url) {
            // Object with URL property
            pdfUrl = data.url;
        }
        
        if (pdfUrl) {
            container.innerHTML = `
                <div class="pdf-preview">
                    <iframe src="${pdfUrl}" class="preview-iframe"></iframe>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="empty-content">Unable to render PDF preview</div>';
        }
    }
    
    /**
     * Gets the content type from the response
     * @returns {string} The content type
     */
    getContentType() {
        if (!this.currentResponse || !this.currentResponse.headers) {
            return '';
        }
        
        // Look for content-type header (case insensitive)
        const headers = this.currentResponse.headers;
        const contentTypeKey = Object.keys(headers).find(
            key => key.toLowerCase() === 'content-type'
        );
        
        return contentTypeKey ? headers[contentTypeKey] : '';
    }
    
    /**
     * Get HTTP status text
     * @param {number} status - The HTTP status code
     * @returns {string} The status text
     */
    getStatusText(status) {
        const statusTexts = {
            100: 'Continue',
            101: 'Switching Protocols',
            200: 'OK',
            201: 'Created',
            202: 'Accepted',
            203: 'Non-Authoritative Information',
            204: 'No Content',
            205: 'Reset Content',
            206: 'Partial Content',
            300: 'Multiple Choices',
            301: 'Moved Permanently',
            302: 'Found',
            303: 'See Other',
            304: 'Not Modified',
            305: 'Use Proxy',
            307: 'Temporary Redirect',
            400: 'Bad Request',
            401: 'Unauthorized',
            402: 'Payment Required',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            406: 'Not Acceptable',
            407: 'Proxy Authentication Required',
            408: 'Request Timeout',
            409: 'Conflict',
            410: 'Gone',
            411: 'Length Required',
            412: 'Precondition Failed',
            413: 'Payload Too Large',
            414: 'URI Too Long',
            415: 'Unsupported Media Type',
            416: 'Range Not Satisfiable',
            417: 'Expectation Failed',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            501: 'Not Implemented',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout',
            505: 'HTTP Version Not Supported'
        };
        
        return statusTexts[status] || 'Unknown Status';
    }
    
    /**
     * Copies the response to clipboard
     */
    copyResponseToClipboard() {
        if (!this.currentResponse) {
            return;
        }
        
        let content = '';
        
        // Get content based on active tab
        switch (this.activeTab) {
            case 'formatted':
            case 'raw':
                if (typeof this.currentResponse.data === 'object') {
                    content = JSON.stringify(this.currentResponse.data, null, 2);
                } else {
                    content = String(this.currentResponse.data || '');
                }
                break;
                
            case 'headers':
                content = Object.entries(this.currentResponse.headers || {})
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
                break;
                
            default:
                if (typeof this.currentResponse.data === 'object') {
                    content = JSON.stringify(this.currentResponse.data, null, 2);
                } else {
                    content = String(this.currentResponse.data || '');
                }
        }
        
        // Copy to clipboard
        navigator.clipboard.writeText(content)
            .then(() => {
                this.showNotification('Copied to clipboard');
            })
            .catch(error => {
                console.error('Failed to copy to clipboard:', error);
                this.showNotification('Failed to copy to clipboard', 'error');
            });
    }
    
    /**
     * Downloads the response
     */
    downloadResponse() {
        if (!this.currentResponse) {
            return;
        }
        
        let content = '';
        let fileName = 'response';
        let mimeType = 'text/plain';
        
        // Determine content and file type based on response
        if (typeof this.currentResponse.data === 'object') {
            content = JSON.stringify(this.currentResponse.data, null, 2);
            fileName = 'response.json';
            mimeType = 'application/json';
        } else if (typeof this.currentResponse.data === 'string') {
            content = this.currentResponse.data;
            
            // Try to determine file type from content
            if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                fileName = 'response.json';
                mimeType = 'application/json';
            } else if (content.trim().startsWith('<')) {
                if (content.includes('<!DOCTYPE html') || content.includes('<html')) {
                    fileName = 'response.html';
                    mimeType = 'text/html';
                } else {
                    fileName = 'response.xml';
                    mimeType = 'application/xml';
                }
            } else {
                fileName = 'response.txt';
            }
        } else {
            content = String(this.currentResponse.data || '');
            fileName = 'response.txt';
        }
        
        // Create and trigger download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    /**
     * Shows a notification
     * @param {string} message - The notification message
     * @param {string} type - The notification type
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    /**
     * Escapes special characters in a string for use in a RegExp
     * @param {string} string - The string to escape
     * @returns {string} The escaped string
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Makes XML collapsible by adding toggle controls to elements
     * @param {string} xml - The formatted XML string
     * @returns {string} HTML with collapsible elements
     */
    makeXmlCollapsible(xml) {
        if (!xml) return '';
        
        // Use a regex to match XML tags and their content
        const tagRegex = /<(\w+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
        
        // Check if the XML has at least one element with children
        let hasNestedElements = false;
        let testXml = xml;
        let match;
        
        while ((match = tagRegex.exec(testXml)) !== null) {
            const [, , content] = match;
            if (content.trim() && content.includes('<')) {
                hasNestedElements = true;
                break;
            }
        }
        
        // If there are no nested elements, just syntax highlight without collapsing
        if (!hasNestedElements) {
            return this.syntaxHighlightXml(xml);
        }
        
        // Process the XML to add collapsible sections
        let processedXml = this.syntaxHighlightXml(xml);
        
        // Wrap tags with nested content in collapsible divs
        // This is a simplified approach - for real XML with complex nesting, a proper parser would be better
        let depth = 0;
        const lines = processedXml.split('\n');
        const outputLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const indentMatch = line.match(/^(\s+)</);
            const indent = indentMatch ? indentMatch[1].length : 0;
            
            // Detect opening tag
            if (line.match(/<\w+[^>]*>/) && !line.includes('</') && !line.endsWith('/>')) {
                // Check if next lines contain a closing tag (not immediate self-closing)
                let hasChildren = false;
                let j = i + 1;
                
                while (j < lines.length) {
                    if (lines[j].match(/<\w+[^>]*>/) && !lines[j].includes('</') && indent < lines[j].match(/^(\s+)</)?.[1].length) {
                        hasChildren = true;
                        break;
                    }
                    if (lines[j].includes('</' + line.match(/<(\w+)[^>]*>/)[1] + '>')) {
                        break;
                    }
                    j++;
                }
                
                if (hasChildren) {
                    // This is a parent tag with children, make it collapsible
                    const toggleButton = `<span class="xml-toggle" title="Toggle">▼</span>`;
                    const processedLine = line.replace(/^(\s*)(<)/, `$1<span class="xml-collapsible">${toggleButton}$2`);
                    outputLines.push(processedLine);
                    depth++;
                } else {
                    // Regular tag, no children
                    outputLines.push(line);
                }
            } 
            // Detect closing tag that matches a collapsible opening tag
            else if (line.match(/<\/\w+>/) && depth > 0) {
                const closingIndent = line.match(/^(\s+)</)?.[1].length || 0;
                
                // Check if this is closing a collapsible section
                let isClosingCollapsible = false;
                for (let j = outputLines.length - 1; j >= 0; j--) {
                    const prevLine = outputLines[j];
                    if (prevLine.includes('xml-collapsible') && 
                        prevLine.match(/^(\s+)</)?.[1].length === closingIndent) {
                        isClosingCollapsible = true;
                        break;
                    }
                }
                
                if (isClosingCollapsible) {
                    outputLines.push(line + '</span>');
                    depth--;
                } else {
                    outputLines.push(line);
                }
            } 
            else {
                outputLines.push(line);
            }
        }
        
        return outputLines.join('\n');
    }
}

/**
 * Helper function to escape HTML
 * @param {string} unsafe - The unsafe string
 * @returns {string} HTML-escaped string
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
} 