// Types improved by ts-improve-types
/**
 * Tab Manager Module
 * Manages tabbed interfaces
 */

interface TabManagerOptions {
  tabsContainer: HTMLElement | null;
  contentContainer: HTMLElement | null;
  tabClass: string;
  activeTabClass: string;
  contentClass: string;
  activeContentClass: string;
  tabIdPrefix: string;
  contentIdPrefix: string;
  animationDuration: number;
  changeAnimation: 'fade' | 'slide' | 'none';
  defaultTabId: string | null;
  generateTabContent: boolean;
  preserveState: boolean;
  storageKey: string;
  maxTabs: number;
  allowClosing: boolean;
  allowDragging: boolean;
  allowRenaming: boolean;
  [key: string]: any;
}

interface TabDefinition {
  id?: string;
  contentId?: string;
  title: string;
  icon?: string;
  closable?: boolean;
  content?: string | Node;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Tab {
  id: string;
  contentId: string;
  title: string;
  icon?: string;
  closable: boolean;
  tabElement: HTMLElement;
  contentElement: HTMLElement | null;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 *
 */
export class TabManager {
  private options: TabManagerOptions;
  private tabsContainer: HTMLElement;
  private contentContainer: HTMLElement;
  private tabs: Map<string, Tab>;
  private activeTabId: string | null;
  private listeners: Map<string, Array<(data?: any) => void>>;
  private tabCounter: number;
  private initialized: boolean;
  private error: Error | null;

  /**
   * Creates a new TabManager instance
   * @param options - Configuration options
   */
  constructor(options: Partial<TabManagerOptions> = {}) {
    this.options = {
      tabsContainer: null,
      contentContainer: null,
      tabClass: 'tab',
      activeTabClass: 'active',
      contentClass: 'tab-content',
      activeContentClass: 'active',
      tabIdPrefix: 'tab-',
      contentIdPrefix: 'tab-content-',
      animationDuration: 200,
      changeAnimation: 'fade', // "fade", "slide", "none"
      defaultTabId: null,
      generateTabContent: true, // Auto-generate content containers
      preserveState: true, // Preserve active tab on page refresh
      storageKey: 'api-tester-tabs',
      maxTabs: 10, // Maximum number of tabs
      allowClosing: true, // Allow closing tabs
      allowDragging: false, // Allow rearranging tabs by drag and drop
      allowRenaming: false, // Allow renaming tabs
      ...options,
    };

    this.tabsContainer = this.options.tabsContainer as HTMLElement;
    this.contentContainer = this.options.contentContainer as HTMLElement;
    this.tabs = new Map<string, Tab>();
    this.activeTabId = null;
    this.listeners = new Map<string, Array<(data?: any) => void>>();
    this.tabCounter = 0;
    this.initialized = false;
    this.error = null;
  }

  /**
   * Initializes the tab manager
   * @returns Whether initialization succeeded
   */
  initialize(): boolean {
    try {
      // Check if already initialized
      if (this.initialized) {
        return true;
      }

      // Validate options
      if (!this.tabsContainer) {
        throw new Error('Tab Manager: No tabs container specified');
      }

      if (!this.contentContainer && this.options.generateTabContent) {
        throw new Error('Tab Manager: No content container specified');
      }

      // Bind event handlers
      this._onClick = this._onClick.bind(this);
      this._onCloseClick = this._onCloseClick.bind(this);

      // Add event listeners
      this.tabsContainer.addEventListener('click', this._onClick);

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
      this.emit('tabs:initialized', {
        activeTabId: this.activeTabId,
        tabs: Array.from(this.tabs.keys()),
      });

      return true;
    } catch (error) {
      console.error('Error initializing Tab Manager:', error);
      this.error = error as Error;

      // Emit error event
      this.emit('tabs:error', {
        error,
        message: (error as Error).message,
      });

      return false;
    }
  }

  /**
   * Adds an event listener
   * @param event - The event name
   * @param callback - The callback function
   */
  addEventListener(event: string, callback: (data?: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.push(callback);
    }
  }

  /**
   * Removes an event listener
   * @param event - The event name
   * @param callback - The callback function to remove
   */
  removeEventListener(event: string, callback: (data?: any) => void): void {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  /**
   * Emits an event to all registered listeners
   * @param event - The event name
   * @param data - The event data
   * @returns The last return value from the event handlers
   */
  emit(event: string, data = null): any {
    let result = null;
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.forEach(callback => {
          const returnValue = callback(data);
          if (returnValue !== undefined) {
            result = returnValue;
          }
        });
      }
    }
    return result;
  }

  /**
   * Adds a new tab
   * @param tab - The tab to add
   * @returns The tab ID
   */
  addTab(tab: TabDefinition): string {
    try {
      // Validate tab
      if (!tab || !tab.title) {
        throw new Error('Invalid tab: missing title');
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
      const contentId =
        tab.contentId ||
        `${this.options.contentIdPrefix}${tabId.replace(this.options.tabIdPrefix, '')}`;

      // Create tab element
      const tabElement = this._createTabElement({
        id: tabId,
        title: tab.title,
        icon: tab.icon,
        closable: tab.closable ?? this.options.allowClosing,
      });

      // Create content element if needed
      let contentElement: HTMLElement | null = null;
      if (this.options.generateTabContent) {
        contentElement = document.createElement('div');
        contentElement.id = contentId;
        contentElement.className = this.options.contentClass;

        if (tab.content) {
          if (typeof tab.content === 'string') {
            contentElement.innerHTML = tab.content;
          } else if (tab.content instanceof Node) {
            contentElement.appendChild(tab.content);
          }
        }

        this.contentContainer.appendChild(contentElement);
      }

      // Store tab data
      this.tabs.set(tabId, {
        id: tabId,
        contentId,
        title: tab.title,
        icon: tab.icon,
        closable: tab.closable ?? this.options.allowClosing,
        tabElement,
        contentElement,
        data: tab.data || {},
      });

      // Emit tab added event
      this.emit('tab:added', {
        tabId,
        tab: this.tabs.get(tabId),
      });

      // If this is the first tab, activate it
      if (this.tabs.size === 1) {
        this.activateTab(tabId);
      }

      // Save state if enabled
      if (this.options.preserveState) {
        this._saveState();
      }

      return tabId;
    } catch (error) {
      console.error('Error adding tab:', error);

      // Emit error event
      this.emit('tabs:error', {
        error,
        message: (error as Error).message,
        tabData: tab,
      });

      throw error;
    }
  }

  /**
   * Creates a tab element
   * @param tab - The tab to create an element for
   * @returns The created tab element
   * @private
   */
  private _createTabElement(tab: {
    id: string;
    title: string;
    icon?: string;
    closable?: boolean;
  }): HTMLElement {
    const tabElement = document.createElement('div');
    tabElement.id = tab.id;
    tabElement.className = this.options.tabClass;
    (tabElement as HTMLElement).dataset.tabId = tab.id;

    let html = '';

    // Add icon if specified
    if (tab.icon) {
      html += `<span class="tab-icon">${tab.icon}</span>`;
    }

    // Add title
    html += `<span class="tab-title">${tab.title}</span>`;

    // Add close button if closable
    if (tab.closable) {
      html += '<button type="button" class="tab-close" aria-label="Close tab">&times;</button>';
    }

    tabElement.innerHTML = html;

    // Add close button event listener
    if (tab.closable) {
      const closeButton = tabElement.querySelector('.tab-close');
      if (closeButton) {
        closeButton.addEventListener('click', ((e: Event) => {
          this._onCloseClick(e as MouseEvent, tab.id);
        }) as EventListener);
      }
    }

    this.tabsContainer.appendChild(tabElement);

    return tabElement;
  }

  /**
   * Removes a tab
   * @param tabId - The ID of the tab to remove
   * @returns Whether the tab was successfully removed
   */
  removeTab(tabId: string): boolean {
    try {
      // Validate tab ID
      if (!this.tabs.has(tabId)) {
        console.warn(`Tab not found: ${tabId}`);
        return false;
      }

      const tab = this.tabs.get(tabId);
      if (!tab) {
        return false;
      }

      // Check if this is the active tab
      const wasActive = tabId === this.activeTabId;

      // Emit 'tab:beforeRemove' event to allow cancellation
      const cancelEvent = this.emit('tab:beforeRemove', {
        tabId,
        tab: { ...tab },
      });

      // If the event handler returned an object with cancel=true, abort
      if (cancelEvent && typeof cancelEvent === 'object' && cancelEvent.cancel === true) {
        return false;
      }

      // Remove tab element
      if (tab.tabElement?.parentNode) {
        tab.tabElement.parentNode?.removeChild(tab.tabElement);
      }

      // Remove content element
      if (tab.contentElement?.parentNode) {
        tab.contentElement.parentNode?.removeChild(tab.contentElement);
      }

      // Remove from tab map
      this.tabs.delete(tabId);

      // If this was the active tab, activate another one
      if (wasActive && this.tabs.size > 0) {
        this.activateTab(Array.from(this.tabs.keys())[0]);
      } else if (this.tabs.size === 0) {
        this.activeTabId = null;
      }

      // Save state if enabled
      if (this.options.preserveState) {
        this._saveState();
      }

      // Emit event
      this.emit('tab:removed', {
        tabId,
        tab: { ...tab },
      });

      return true;
    } catch (error) {
      console.error('Error removing tab:', error);

      // Emit error event
      this.emit('tabs:error', {
        error,
        message: (error as Error).message,
        tabId,
      });

      return false;
    }
  }

  /**
   * Activates a tab
   * @param tabId - The ID of the tab to activate
   */
  activateTab(tabId: string): void {
    try {
      // Validate tab ID
      if (!this.tabs.has(tabId)) {
        console.warn(`Tab not found: ${tabId}`);
        return;
      }

      // Get the previous and new tabs
      const previousTabId = this.activeTabId;
      const previousTab = previousTabId ? this.tabs.get(previousTabId) : null;

      // Don't do anything if this tab is already active
      if (tabId === previousTabId) {
        return;
      }

      // Get the new tab
      const newTab = this.tabs.get(tabId);
      if (!newTab) {
        return;
      }

      // Emit 'tab:beforeActivate' event to allow cancellation
      const cancelEvent = this.emit('tab:beforeActivate', {
        tabId,
        previousTabId,
        tab: { ...newTab },
      });

      // If the event handler returned an object with cancel=true, abort
      if (cancelEvent && typeof cancelEvent === 'object' && cancelEvent.cancel === true) {
        return;
      }

      // Update previous tab
      if (previousTab) {
        // Update tab element
        if (previousTab.tabElement) {
          previousTab.tabElement.classList.remove(this.options.activeTabClass);
        }

        // Update content element
        if (previousTab.contentElement) {
          previousTab.contentElement.classList.remove(this.options.activeContentClass);

          if (this.options.changeAnimation !== 'none') {
            this._animateHide(previousTab.contentElement);
          }
        }
      }

      // Update active tab ID
      this.activeTabId = tabId;

      // Update new tab
      if (newTab.tabElement) {
        newTab.tabElement.classList.add(this.options.activeTabClass);
      }

      // Update content element
      if (newTab.contentElement) {
        newTab.contentElement.classList.add(this.options.activeContentClass);

        if (this.options.changeAnimation !== 'none') {
          this._animateShow(newTab.contentElement);
        }
      }

      // Save state if enabled
      if (this.options.preserveState) {
        this._saveState();
      }

      // Emit event
      this.emit('tab:activated', {
        tabId,
        previousTabId,
        tab: { ...newTab },
      });
    } catch (error) {
      console.error('Error activating tab:', error);

      // Emit error event
      this.emit('tabs:error', {
        error,
        message: (error as Error).message,
        tabId,
      });
    }
  }

  /**
   * Animates showing an element
   * @param element - The element to show
   * @private
   */
  private _animateShow(element: HTMLElement): void {
    if (this.options.changeAnimation === 'fade') {
      // Fade in
      element.style.opacity = '0';
      element.style.display = 'block';

      // Trigger reflow
      void element.offsetHeight;

      // Apply transition
      element.style.transition = `opacity ${this.options.animationDuration}ms ease-in-out`;
      element.style.opacity = '1';

      // Clean up after animation
      setTimeout(() => {
        element.style.transition = '';
      }, this.options.animationDuration);
    } else if (this.options.changeAnimation === 'slide') {
      // Slide down
      element.style.opacity = '0';
      element.style.transform = 'translateY(-20px)';
      element.style.display = 'block';

      // Trigger reflow
      void element.offsetHeight;

      // Apply transition
      element.style.transition = `transform ${this.options.animationDuration}ms ease-out, opacity ${this.options.animationDuration}ms ease-in-out`;
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';

      // Clean up after animation
      setTimeout(() => {
        element.style.transition = '';
      }, this.options.animationDuration);
    } else {
      // No animation, just show
      element.style.display = 'block';
    }
  }

  /**
   * Animates hiding an element
   * @param element - The element to hide
   * @private
   */
  private _animateHide(element: HTMLElement): void {
    if (this.options.changeAnimation === 'fade') {
      element.style.transition = `opacity ${this.options.animationDuration}ms ease-in-out`;
      element.style.opacity = '0';

      // Hide after animation
      setTimeout(() => {
        element.style.display = 'none';
        element.style.transition = '';
      }, this.options.animationDuration);
    } else if (this.options.changeAnimation === 'slide') {
      element.style.transition = `transform ${this.options.animationDuration}ms ease-in, opacity ${this.options.animationDuration}ms ease-in-out`;
      element.style.opacity = '0';
      element.style.transform = 'translateY(-20px)';

      // Hide after animation
      setTimeout(() => {
        element.style.display = 'none';
        element.style.transition = '';
        element.style.transform = '';
      }, this.options.animationDuration);
    } else {
      // No animation, just hide
      element.style.display = 'none';
    }
  }

  /**
   * Updates a tab
   * @param tabId - The ID of the tab to update
   * @param updates - The updates to apply
   * @returns Whether the tab was updated
   */
  updateTab(tabId: string, updates: Partial<TabDefinition>): boolean {
    try {
      // Validate tab ID
      if (!this.tabs.has(tabId)) {
        console.warn(`Tab not found: ${tabId}`);
        return false;
      }

      const tab = this.tabs.get(tabId);
      if (!tab) {
        return false;
      }

      // Update title
      if (updates.title !== undefined) {
        tab.title = updates.title;

        // Update title element
        const titleElement = tab.tabElement.querySelector('.tab-title');
        if (titleElement) {
          titleElement.textContent = updates.title;
        }
      }

      // Update icon
      if (updates.icon !== undefined) {
        tab.icon = updates.icon;

        // Update icon element
        const iconElement = tab.tabElement.querySelector('.tab-icon');
        if (updates.icon) {
          if (iconElement) {
            // Update existing icon
            iconElement.innerHTML = updates.icon;
          } else {
            // Create new icon
            const newIconElement = document.createElement('span');
            newIconElement.className = 'tab-icon';
            newIconElement.innerHTML = updates.icon;

            // Insert at the beginning of the tab
            tab.tabElement.insertBefore(newIconElement, tab.tabElement.firstChild);
          }
        } else if (iconElement) {
          // Remove icon
          iconElement.parentNode?.removeChild(iconElement);
        }
      }

      // Update content
      if (updates.content !== undefined && tab.contentElement) {
        if (typeof updates.content === 'string') {
          tab.contentElement.innerHTML = updates.content;
        } else if (updates.content instanceof Node) {
          tab.contentElement.innerHTML = '';
          tab.contentElement.appendChild(updates.content);
        }
      }

      // Update data
      if (updates.data !== undefined) {
        tab.data = { ...tab.data, ...updates.data };
      }

      // Update closable state
      if (updates.closable !== undefined) {
        tab.closable = updates.closable;

        // Update close button
        const closeButton = tab.tabElement.querySelector('.tab-close');
        if (updates.closable) {
          if (!closeButton) {
            // Add close button
            const newCloseButton = document.createElement('button');
            newCloseButton.className = 'tab-close';
            newCloseButton.innerHTML = '&times;';
            newCloseButton.setAttribute('aria-label', 'Close tab');
            newCloseButton.addEventListener('click', e => this._onCloseClick(e, tabId));
            tab.tabElement.appendChild(newCloseButton);
          }
        } else if (closeButton) {
          // Remove close button
          closeButton.parentNode?.removeChild(closeButton);
        }
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
      this.emit('tab:updated', {
        tabId,
        tab: { ...tab },
        updates,
      });

      return true;
    } catch (error) {
      console.error('Error updating tab:', error);

      // Emit error event
      this.emit('tabs:error', {
        error,
        message: (error as Error).message,
        tabId,
        updates,
      });

      return false;
    }
  }

  /**
   * Gets a tab by its ID
   * @param tabId - The ID of the tab to get
   * @returns The tab or null if not found
   */
  getTab(tabId: string): Tab | null {
    return this.tabs.has(tabId) ? { ...this.tabs.get(tabId)! } : null;
  }

  /**
   * Gets all tabs
   * @returns Array of all tabs
   */
  getTabs(): Tab[] {
    return Array.from(this.tabs.values()).map(tab => ({ ...tab }));
  }

  /**
   * Gets the active tab
   * @returns The active tab or null if no tab is active
   */
  getActiveTab(): Tab | null {
    return this.activeTabId && this.tabs.has(this.activeTabId)
      ? { ...this.tabs.get(this.activeTabId)! }
      : null;
  }

  /**
   * Gets the active tab ID
   * @returns The active tab ID or null if no tab is active
   */
  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  /**
   * Handles tab click events
   * @param event - The click event
   * @private
   */
  private _onClick(event: Event): void {
    // Find clicked tab
    const tabElement = (event.target as HTMLElement).closest(`.${this.options.tabClass}`);
    if (!tabElement) {
      return;
    }

    // Get tab ID
    const tabId = (tabElement as HTMLElement).dataset.tabId;
    if (!tabId) {
      return;
    }

    // Check if tab exists
    if (!this.tabs.has(tabId)) {
      return;
    }

    // Check if click was on close button
    if ((event.target as HTMLElement).closest('.tab-close')) {
      return; // Handled by _onCloseClick
    }

    // Activate tab
    this.activateTab(tabId);
  }

  /**
   * Handles tab close button click events
   * @param event - The click event
   * @param tabId - The ID of the tab to close
   * @private
   */
  private _onCloseClick(event: MouseEvent, tabId: string): void {
    // Stop event propagation
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
          data: tab.data || {},
        })),
      };

      // Save to localStorage
      localStorage.setItem(this.options.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving tab state:', error);
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
        state.tabs.forEach(
          (tab: {
            id: string;
            title: string;
            icon?: string;
            closable?: boolean;
            data?: Record<string, unknown>;
          }) => {
            const match = tab.id.match(new RegExp(`^${this.options.tabIdPrefix}(\\d+)$`));
            if (match) {
              const counter = parseInt(match[1], 10);
              if (counter > this.tabCounter) {
                this.tabCounter = counter;
              }
            }
          },
        );

        // Add tabs
        state.tabs.forEach(
          (tab: {
            id: string;
            title: string;
            icon?: string;
            closable?: boolean;
            data?: Record<string, unknown>;
          }) => {
            this.addTab({
              id: tab.id,
              title: tab.title,
              icon: tab.icon,
              closable: tab.closable,
              data: tab.data || {},
            });
          },
        );

        // Restore active tab
        if (state.activeTabId && this.tabs.has(state.activeTabId)) {
          this.activateTab(state.activeTabId);
        }
      }
    } catch (error) {
      console.error('Error loading tab state:', error);
    }
  }

  /**
   * Destroys the tab manager and removes all tabs
   */
  destroy() {
    try {
      // Remove event listeners
      this.tabsContainer.removeEventListener('click', this._onClick);

      // Remove all tabs
      Array.from(this.tabs.keys()).forEach(tabId => {
        this.removeTab(tabId);
      });

      // Reset state
      this.tabs.clear();
      this.activeTabId = null;
      this.initialized = false;

      // Emit event
      this.emit('tabs:destroyed', {});
    } catch (error) {
      console.error('Error destroying Tab Manager:', error);

      // Emit error event
      this.emit('tabs:error', {
        error,
        message: error instanceof Error ? error.message : String(error),
        operation: 'destroy',
      });
    }
  }

  /**
   * Updates a map of tabs
   * @param tab - The tab data
   * @returns The created tab element
   * @private
   */
  private _updateTabsMap(tab: TabDefinition): HTMLElement {
    // This is a stub implementation since the real implementation was omitted
    if (!tab.tabElement || !(tab.tabElement instanceof HTMLElement)) {
      throw new Error('Tab element is missing or not an HTMLElement');
    }
    return tab.tabElement;
  }

  /**
   * Handles errors that occur during tab operations
   * @param error - The error that occurred
   * @param message - Error message
   * @param operation - The operation that failed
   * @private
   */
  private _handleError(error: unknown, message: string, operation: string): void {
    console.error(`TabManager error (${operation}):`, message, error);

    // Emit error event
    this.emit('tabs:error', {
      error,
      message: error instanceof Error ? error.message : String(error),
      operation,
    });
  }
}
