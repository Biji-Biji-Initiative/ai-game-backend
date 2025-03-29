/**
 * Tab Manager Module
 * Manages tabbed interfaces
 */

/**
 *
 */
export class TabManager {
    /**
     * Creates a new TabManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            tabsContainer: null,
            contentContainer: null,
            tabClass: "tab",
            activeTabClass: "active",
            contentClass: "tab-content",
            activeContentClass: "active",
            tabIdPrefix: "tab-",
            contentIdPrefix: "tab-content-",
            animationDuration: 200,
            changeAnimation: "fade", // "fade", "slide", "none"
            defaultTabId: null,
            generateTabContent: true, // Auto-generate content containers
            preserveState: true, // Preserve active tab on page refresh
            storageKey: "api-tester-tabs",
            maxTabs: 10, // Maximum number of tabs
            allowClosing: true, // Allow closing tabs
            allowDragging: false, // Allow rearranging tabs by drag and drop
            allowRenaming: false, // Allow renaming tabs
            ...options
        };
        
        this.tabsContainer = this.options.tabsContainer;
        this.contentContainer = this.options.contentContainer;
        this.tabs = new Map();
        this.activeTabId = null;
        this.listeners = new Map();
        this.tabCounter = 0;
        this.initialized = false;
        this.error = null;
    }
    
    /**
     * Initializes the tab manager
     * @returns {boolean} Whether initialization succeeded
     */
    initialize() {
        try {
            // Check if already initialized
            if (this.initialized) {
                return true;
            }
            
            // Validate options
            if (!this.tabsContainer) {
                throw new Error("Tab Manager: No tabs container specified");
            }
            
            if (!this.contentContainer && this.options.generateTabContent) {
                throw new Error("Tab Manager: No content container specified");
            }
            
            // Bind event handlers
            this._onClick = this._onClick.bind(this);
            this._onCloseClick = this._onCloseClick.bind(this);
            
            // Add event listeners
            this.tabsContainer.addEventListener("click", this._onClick);
            
            // Load saved state if enabled
            if (this.options.preserveState) {
                this._loadState();
            }
            
            // Set default tab if specified or restore from saved state
            if (!this.activeTabId && this.options.defaultTabId) {
                this.activateTab(this.options.defaultTabId);
            }
            
            // Mark as initialized
            this.initialized = true;
            
            // Emit initialized event
            this.emit("tabs:initialized", {
                activeTabId: this.activeTabId,
                tabs: Array.from(this.tabs.keys())
            });
            
            return true;
        } catch (error) {
            console.error("Error initializing Tab Manager:", error);
            this.error = error;
            
            // Emit error event
            this.emit("tabs:error", {
                error,
                message: error.message
            });
            
            return false;
        }
    }
    
    /**
     * Adds an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Removes an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function to remove
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emits an event to all registered listeners
     * @param {string} event - The event name
     * @param {Object} data - The event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }
    
    /**
     * Adds a new tab
     * @param {Object} tab - The tab to add
     * @returns {string} The tab ID
     */
    addTab(tab) {
        try {
            // Validate tab
            if (!tab || !tab.title) {
                throw new Error("Invalid tab: missing title");
            }
            
            // Enforce tab limit
            if (this.options.maxTabs > 0 && this.tabs.size >= this.options.maxTabs) {
                throw new Error(`Cannot add more than ${this.options.maxTabs} tabs`);
            }
            
            // Create tab ID if not provided
            let tabId = tab.id || `${this.options.tabIdPrefix}${++this.tabCounter}`;
            
            // Check for duplicate ID
            if (this.tabs.has(tabId)) {
                // Increment counter until we find a unique ID
                while (this.tabs.has(`${this.options.tabIdPrefix}${this.tabCounter}`)) {
                    this.tabCounter++;
                }
                tabId = `${this.options.tabIdPrefix}${this.tabCounter}`;
            }
            
            // Create content ID
            const contentId = tab.contentId || `${this.options.contentIdPrefix}${tabId.replace(this.options.tabIdPrefix, "")}`;
            
            // Create tab element
            const tabElement = this._createTabElement({
                id: tabId,
                title: tab.title,
                icon: tab.icon,
                closable: tab.closable ?? this.options.allowClosing
            });
            
            // Create content element if needed
            let contentElement = null;
            if (this.options.generateTabContent) {
                contentElement = document.createElement("div");
                contentElement.id = contentId;
                contentElement.className = this.options.contentClass;
                
                if (tab.content) {
                    if (typeof tab.content === "string") {
                        contentElement.innerHTML = tab.content;
                    } else if (tab.content instanceof Node) {
                        contentElement.appendChild(tab.content);
                    }
                }
                
                this.contentContainer.appendChild(contentElement);
            } else if (tab.contentElement) {
                // Use provided content element
                contentElement = tab.contentElement;
            }
            
            // Store tab
            this.tabs.set(tabId, {
                id: tabId,
                title: tab.title,
                icon: tab.icon,
                closable: tab.closable ?? this.options.allowClosing,
                contentId,
                contentElement,
                tabElement,
                data: tab.data || {},
                visible: true
            });
            
            // Add tab element to DOM
            this.tabsContainer.appendChild(tabElement);
            
            // Save state if enabled
            if (this.options.preserveState) {
                this._saveState();
            }
            
            // Emit event
            this.emit("tabs:added", {
                tabId,
                tab: this.tabs.get(tabId)
            });
            
            // Activate tab if it's the first one or if requested
            if (this.tabs.size === 1 || tab.active) {
                this.activateTab(tabId);
            }
            
            return tabId;
        } catch (error) {
            console.error("Error adding tab:", error);
            
            // Emit error event
            this.emit("tabs:error", {
                error,
                message: error.message,
                operation: "addTab"
            });
            
            return null;
        }
    }
    
    /**
     * Creates a tab element
     * @param {Object} tab - The tab data
     * @returns {HTMLElement} The created tab element
     * @private
     */
    _createTabElement(tab) {
        // Create tab element
        const tabElement = document.createElement("div");
        tabElement.id = tab.id;
        tabElement.className = this.options.tabClass;
        tabElement.dataset.tabId = tab.id;
        
        // Add icon if specified
        if (tab.icon) {
            const iconElement = document.createElement("span");
            iconElement.className = "tab-icon";
            
            if (tab.icon.startsWith("<")) {
                // Assume it's HTML (e.g. SVG)
                iconElement.innerHTML = tab.icon;
            } else {
                // Assume it's a CSS class
                iconElement.classList.add(tab.icon);
            }
            
            tabElement.appendChild(iconElement);
        }
        
        // Add title
        const titleElement = document.createElement("span");
        titleElement.className = "tab-title";
        titleElement.textContent = tab.title;
        tabElement.appendChild(titleElement);
        
        // Add close button if closable
        if (tab.closable) {
            const closeElement = document.createElement("span");
            closeElement.className = "tab-close";
            closeElement.innerHTML = "&times;";
            closeElement.addEventListener("click", e => this._onCloseClick(e, tab.id));
            tabElement.appendChild(closeElement);
        }
        
        return tabElement;
    }
    
    /**
     * Removes a tab
     * @param {string} tabId - The ID of the tab to remove
     * @returns {boolean} Whether the tab was removed
     */
    removeTab(tabId) {
        try {
            // Check if tab exists
            if (!this.tabs.has(tabId)) {
                return false;
            }
            
            const tab = this.tabs.get(tabId);
            const wasActive = this.activeTabId === tabId;
            
            // Emit before-remove event
            const cancelEvent = this.emit("tabs:before-remove", {
                tabId,
                tab,
                wasActive,
                cancel: false
            });
            
            // Check if removal was cancelled
            if (cancelEvent && cancelEvent.cancel) {
                return false;
            }
            
            // Remove tab element from DOM
            if (tab.tabElement && tab.tabElement.parentNode) {
                tab.tabElement.parentNode.removeChild(tab.tabElement);
            }
            
            // Remove content element from DOM if it was generated
            if (this.options.generateTabContent && tab.contentElement && tab.contentElement.parentNode) {
                tab.contentElement.parentNode.removeChild(tab.contentElement);
            }
            
            // Remove tab from map
            this.tabs.delete(tabId);
            
            // If it was the active tab, activate another tab
            if (wasActive && this.tabs.size > 0) {
                this.activateTab(this.tabs.keys().next().value);
            } else if (this.tabs.size === 0) {
                this.activeTabId = null;
            }
            
            // Save state if enabled
            if (this.options.preserveState) {
                this._saveState();
            }
            
            // Emit event
            this.emit("tabs:removed", {
                tabId,
                tab,
                wasActive
            });
            
            return true;
        } catch (error) {
            console.error("Error removing tab:", error);
            
            // Emit error event
            this.emit("tabs:error", {
                error,
                message: error.message,
                operation: "removeTab",
                tabId
            });
            
            return false;
        }
    }
    
    /**
     * Activates a tab
     * @param {string} tabId - The ID of the tab to activate
     * @returns {boolean} Whether the tab was activated
     */
    activateTab(tabId) {
        try {
            // Check if tab exists
            if (!this.tabs.has(tabId)) {
                return false;
            }
            
            // Get previous active tab
            const previousTabId = this.activeTabId;
            const previousTab = previousTabId ? this.tabs.get(previousTabId) : null;
            
            // Skip if already active
            if (previousTabId === tabId) {
                return true;
            }
            
            // Get new tab
            const newTab = this.tabs.get(tabId);
            
            // Emit before-activate event
            const cancelEvent = this.emit("tabs:before-activate", {
                previousTabId,
                previousTab,
                tabId,
                tab: newTab,
                cancel: false
            });
            
            // Check if activation was cancelled
            if (cancelEvent && cancelEvent.cancel) {
                return false;
            }
            
            // Deactivate previous tab
            if (previousTab) {
                // Remove active class from tab
                if (previousTab.tabElement) {
                    previousTab.tabElement.classList.remove(this.options.activeTabClass);
                }
                
                // Remove active class from content
                if (previousTab.contentElement) {
                    previousTab.contentElement.classList.remove(this.options.activeContentClass);
                    
                    if (this.options.changeAnimation !== "none") {
                        this._animateHide(previousTab.contentElement);
                    }
                }
            }
            
            // Set new active tab
            this.activeTabId = tabId;
            
            // Add active class to tab
            if (newTab.tabElement) {
                newTab.tabElement.classList.add(this.options.activeTabClass);
            }
            
            // Add active class to content
            if (newTab.contentElement) {
                newTab.contentElement.classList.add(this.options.activeContentClass);
                
                if (this.options.changeAnimation !== "none") {
                    this._animateShow(newTab.contentElement);
                }
            }
            
            // Save state if enabled
            if (this.options.preserveState) {
                this._saveState();
            }
            
            // Emit event
            this.emit("tabs:activated", {
                previousTabId,
                previousTab,
                tabId,
                tab: newTab
            });
            
            return true;
        } catch (error) {
            console.error("Error activating tab:", error);
            
            // Emit error event
            this.emit("tabs:error", {
                error,
                message: error.message,
                operation: "activateTab",
                tabId
            });
            
            return false;
        }
    }
    
    /**
     * Animates showing a content element
     * @param {HTMLElement} element - The element to show
     * @private
     */
    _animateShow(element) {
        if (this.options.changeAnimation === "fade") {
            element.style.opacity = "0";
            element.style.display = "block";
            
            setTimeout(() => {
                element.style.transition = `opacity ${this.options.animationDuration}ms ease-in-out`;
                element.style.opacity = "1";
                
                setTimeout(() => {
                    element.style.transition = "";
                }, this.options.animationDuration);
            }, 10);
        } else if (this.options.changeAnimation === "slide") {
            element.style.transform = "translateX(20px)";
            element.style.opacity = "0";
            element.style.display = "block";
            
            setTimeout(() => {
                element.style.transition = `transform ${this.options.animationDuration}ms ease-out, opacity ${this.options.animationDuration}ms ease-in-out`;
                element.style.transform = "translateX(0)";
                element.style.opacity = "1";
                
                setTimeout(() => {
                    element.style.transition = "";
                }, this.options.animationDuration);
            }, 10);
        }
    }
    
    /**
     * Animates hiding a content element
     * @param {HTMLElement} element - The element to hide
     * @private
     */
    _animateHide(element) {
        if (this.options.changeAnimation === "fade") {
            element.style.transition = `opacity ${this.options.animationDuration}ms ease-in-out`;
            element.style.opacity = "0";
            
            setTimeout(() => {
                element.style.display = "none";
                element.style.transition = "";
            }, this.options.animationDuration);
        } else if (this.options.changeAnimation === "slide") {
            element.style.transition = `transform ${this.options.animationDuration}ms ease-in, opacity ${this.options.animationDuration}ms ease-in-out`;
            element.style.transform = "translateX(-20px)";
            element.style.opacity = "0";
            
            setTimeout(() => {
                element.style.display = "none";
                element.style.transition = "";
                element.style.transform = "";
            }, this.options.animationDuration);
        }
    }
    
    /**
     * Updates a tab
     * @param {string} tabId - The ID of the tab to update
     * @param {Object} updates - The updates to apply
     * @returns {boolean} Whether the tab was updated
     */
    updateTab(tabId, updates) {
        try {
            // Check if tab exists
            if (!this.tabs.has(tabId)) {
                return false;
            }
            
            const tab = this.tabs.get(tabId);
            
            // Update title
            if (updates.title !== undefined) {
                tab.title = updates.title;
                
                const titleElement = tab.tabElement.querySelector(".tab-title");
                if (titleElement) {
                    titleElement.textContent = updates.title;
                }
            }
            
            // Update icon
            if (updates.icon !== undefined) {
                tab.icon = updates.icon;
                
                let iconElement = tab.tabElement.querySelector(".tab-icon");
                
                // Remove existing icon if it exists
                if (iconElement) {
                    iconElement.parentNode.removeChild(iconElement);
                }
                
                // Add new icon if specified
                if (updates.icon) {
                    iconElement = document.createElement("span");
                    iconElement.className = "tab-icon";
                    
                    if (updates.icon.startsWith("<")) {
                        // Assume it's HTML (e.g. SVG)
                        iconElement.innerHTML = updates.icon;
                    } else {
                        // Assume it's a CSS class
                        iconElement.classList.add(updates.icon);
                    }
                    
                    // Insert at the beginning
                    tab.tabElement.insertBefore(iconElement, tab.tabElement.firstChild);
                }
            }
            
            // Update closable status
            if (updates.closable !== undefined) {
                tab.closable = updates.closable;
                
                const closeElement = tab.tabElement.querySelector(".tab-close");
                
                // Remove existing close button
                if (closeElement) {
                    closeElement.parentNode.removeChild(closeElement);
                }
                
                // Add close button if closable
                if (updates.closable) {
                    const closeElement = document.createElement("span");
                    closeElement.className = "tab-close";
                    closeElement.innerHTML = "&times;";
                    closeElement.addEventListener("click", e => this._onCloseClick(e, tabId));
                    tab.tabElement.appendChild(closeElement);
                }
            }
            
            // Update content
            if (updates.content !== undefined && tab.contentElement) {
                if (typeof updates.content === "string") {
                    tab.contentElement.innerHTML = updates.content;
                } else if (updates.content instanceof Node) {
                    // Clear existing content
                    tab.contentElement.innerHTML = "";
                    
                    // Add new content
                    tab.contentElement.appendChild(updates.content);
                }
            }
            
            // Update data
            if (updates.data !== undefined) {
                tab.data = { ...tab.data, ...updates.data };
            }
            
            // Activate tab if requested
            if (updates.active && tabId !== this.activeTabId) {
                this.activateTab(tabId);
            }
            
            // Save state if enabled
            if (this.options.preserveState) {
                this._saveState();
            }
            
            // Emit event
            this.emit("tabs:updated", {
                tabId,
                tab,
                updates
            });
            
            return true;
        } catch (error) {
            console.error("Error updating tab:", error);
            
            // Emit error event
            this.emit("tabs:error", {
                error,
                message: error.message,
                operation: "updateTab",
                tabId,
                updates
            });
            
            return false;
        }
    }
    
    /**
     * Gets a tab by ID
     * @param {string} tabId - The ID of the tab to get
     * @returns {Object} The tab or null if not found
     */
    getTab(tabId) {
        return this.tabs.has(tabId) ? { ...this.tabs.get(tabId) } : null;
    }
    
    /**
     * Gets all tabs
     * @returns {Array} The tabs
     */
    getTabs() {
        return Array.from(this.tabs.values()).map(tab => ({ ...tab }));
    }
    
    /**
     * Gets the active tab
     * @returns {Object} The active tab or null if none
     */
    getActiveTab() {
        return this.activeTabId ? { ...this.tabs.get(this.activeTabId) } : null;
    }
    
    /**
     * Gets the active tab ID
     * @returns {string} The active tab ID or null if none
     */
    getActiveTabId() {
        return this.activeTabId;
    }
    
    /**
     * Handles tab click events
     * @param {Event} event - The click event
     * @private
     */
    _onClick(event) {
        // Find closest tab element
        const tabElement = event.target.closest(`.${this.options.tabClass}`);
        
        if (!tabElement) {
            return;
        }
        
        // Get tab ID
        const tabId = tabElement.dataset.tabId || tabElement.id;
        
        // Ignore if tab doesn't exist
        if (!this.tabs.has(tabId)) {
            return;
        }
        
        // Check if close button was clicked
        if (event.target.closest(".tab-close")) {
            // Handled by _onCloseClick
            return;
        }
        
        // Activate tab
        this.activateTab(tabId);
    }
    
    /**
     * Handles tab close button click events
     * @param {Event} event - The click event
     * @param {string} tabId - The tab ID
     * @private
     */
    _onCloseClick(event, tabId) {
        // Stop event propagation to prevent tab activation
        event.stopPropagation();
        
        // Remove tab
        this.removeTab(tabId);
    }
    
    /**
     * Saves the current tab state to localStorage
     * @private
     */
    _saveState() {
        if (!this.options.preserveState) {
            return;
        }
        
        try {
            // Create state object
            const state = {
                activeTabId: this.activeTabId,
                tabs: Array.from(this.tabs.entries()).map(([id, tab]) => ({
                    id,
                    title: tab.title,
                    icon: tab.icon,
                    closable: tab.closable,
                    data: tab.data || {}
                }))
            };
            
            // Save to localStorage
            localStorage.setItem(this.options.storageKey, JSON.stringify(state));
        } catch (error) {
            console.error("Error saving tab state:", error);
        }
    }
    
    /**
     * Loads the tab state from localStorage
     * @private
     */
    _loadState() {
        if (!this.options.preserveState) {
            return;
        }
        
        try {
            // Get from localStorage
            const stateJson = localStorage.getItem(this.options.storageKey);
            
            if (!stateJson) {
                return;
            }
            
            // Parse state
            const state = JSON.parse(stateJson);
            
            // Restore tabs
            if (state.tabs && Array.isArray(state.tabs)) {
                // Find highest tab counter
                state.tabs.forEach(tab => {
                    const match = tab.id.match(new RegExp(`^${this.options.tabIdPrefix}(\\d+)$`));
                    if (match) {
                        const counter = parseInt(match[1], 10);
                        if (counter > this.tabCounter) {
                            this.tabCounter = counter;
                        }
                    }
                });
                
                // Add tabs
                state.tabs.forEach(tab => {
                    this.addTab({
                        id: tab.id,
                        title: tab.title,
                        icon: tab.icon,
                        closable: tab.closable,
                        data: tab.data || {}
                    });
                });
                
                // Restore active tab
                if (state.activeTabId && this.tabs.has(state.activeTabId)) {
                    this.activateTab(state.activeTabId);
                }
            }
        } catch (error) {
            console.error("Error loading tab state:", error);
        }
    }
    
    /**
     * Destroys the tab manager and removes all tabs
     */
    destroy() {
        try {
            // Remove event listeners
            this.tabsContainer.removeEventListener("click", this._onClick);
            
            // Remove all tabs
            for (const tabId of this.tabs.keys()) {
                this.removeTab(tabId);
            }
            
            // Reset state
            this.tabs.clear();
            this.activeTabId = null;
            this.initialized = false;
            
            // Emit event
            this.emit("tabs:destroyed", {});
        } catch (error) {
            console.error("Error destroying Tab Manager:", error);
            
            // Emit error event
            this.emit("tabs:error", {
                error,
                message: error.message,
                operation: "destroy"
            });
        }
    }
} 