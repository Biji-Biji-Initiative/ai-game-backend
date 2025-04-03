// Types improved by ts-improve-types
/**
 * UI Manager Component
 * Handles UI interactions, notifications, modals, and loading states
 */

import { UIManagerOptions, ToastOptions, ModalOptions } from '../types/ui';
import { logger } from '../utils/logger';
import { ResponseViewer } from '../ui/response-viewer';
import {
  addEventListeners,
  findElement,
  findElements,
  getById,
  setHTML,
  toggleElement,
} from '../utils/dom-utils';
import { RequestInfo } from '../types/app-types';
import { AuthState } from '../modules/auth-manager';
import { escapeHtml } from '../utils/string-utils';
import { DomainStateViewer } from '../ui/domain-state-viewer';
import { EventBus } from '../core/EventBus';

interface DomainStateViewerInterface {
  render(): void;
  clear(): void;
  refresh(): void;
  setEntityTypes(types: string[]): void;
  getEntityTypes(): string[];
  setFilter(filter: string): void;
  clearFilter(): void;
  selectEntity(id: string): void;
  deselectEntity(): void;
  getSelectedEntity(): string | null;
  getSelectedEntityData(): unknown | null;
  selectedEntityTypes: string[];
  addEventListener(event: string, handler: (data: unknown[] | Record<string, unknown>) => void): void;
  removeEventListener(event: string, handler: (data: unknown[] | Record<string, unknown>) => void): void;
}

/**
 * UI Manager Interface
 */
export interface IUIManager {
  // Elements
  container: HTMLElement | null;
  toastContainer: HTMLElement | null;
  loadingOverlay: HTMLElement | null;
  modalContainer: HTMLElement | null;

  // Initialization methods
  initElements(): void;
  initializeUI(): void;

  // Toast notifications
  showToast(option: ToastOptions): void;
  showSuccess(titl: string, message: string, duration?: number): void;
  showError(titl: string, message: string, duration?: number): void;
  showWarning(titl: string, message: string, duration?: number): void;
  showInfo(titl: string, message: string, duration?: number): void;

  // Loading indicators
  showLoading(message?: string): void;
  hideLoading(): void;

  // Modal dialogs
  showModal(option: ModalOptions): HTMLElement;
  closeModal(modalE: HTMLElement): void;
  closeAllModals(): void;

  // Confirmation dialogs
  confirm(titl: string, message: string, onConfirm: () => void, onCancel?: () => void): void;

  // Theme and styling
  setTheme(them: string): void;
  getTheme(): string;

  // Authentication state
  updateAuthState(authStat: AuthState): void;

  // Domain state
  updateDomainStateView(domainStat: Record<string, unknown>, diffs?: any): void;
}

/**
 * UIManager class
 * Manages UI interactions, notifications, modals, and loading states
 */
export class UIManager implements IUIManager {
  // Elements
  public container: HTMLElement | null;
  public toastContainer: HTMLElement | null;
  public loadingOverlay: HTMLElement | null;
  public modalContainer: HTMLElement | null;

  private options: UIManagerOptions;
  private activeToasts: HTMLElement[] = [];
  private activeModals: HTMLElement[] = [];
  private theme = 'light';
  private eventListeners: Map<string, Set<((...args: unknown[]) => void)>> = new Map();
  private elements: Map<string, HTMLElement> = new Map();
  private isInitialized = false;
  private responseViewer: ResponseViewer | null = null;
  private domainStateViewer: DomainStateViewerInterface | null = null;
  private eventBus: EventBus;

  /**
   * Creates a new UIManager instance
   * @param options Configuration options
   */
  constructor(option: UIManagerOptions = {}) {
    // Merge default options with provided options
    this.options = {
      containerId: 'app-container',
      toastContainerId: 'toast-container',
      loadingOverlayId: 'loading-overlay',
      modalContainerId: 'modal-container',
      debug: false,
      responseViewer: null,
      domainStateViewer: null,
      onUiReady: () => {},
      ...option,
    };

    this.container = null;
    this.toastContainer = null;
    this.loadingOverlay = null;
    this.modalContainer = null;
    
    // Use provided EventBus or get the singleton instance
    this.eventBus = this.options.eventBus || EventBus.getInstance();
    
    // Initialize viewers with null-coalescing operator
    this.responseViewer = this.options.responseViewer ?? null;
    this.domainStateViewer = this.options.domainStateViewer ?? null;

    this.initElements();
  }

  /**
   * Initialize UI elements
   */
  public initElements(): void {
    // Get container element
    // @ts-ignore - Complex type issues
    this.container = document.getElementById(this.options.containerId || 'app-container');

    // Create toast container if not exists
    let toastContainer = document.getElementById(
      this.options.toastContainerId || 'toast-container',
    );
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = this.options.toastContainerId || 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    this.toastContainer = toastContainer;

    // Create loading overlay if not exists
    let loadingOverlay = document.getElementById(
      this.options.loadingOverlayId || 'loading-overlay',
    );
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.id = this.options.loadingOverlayId || 'loading-overlay';
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">Loading...</div>
      `;
      loadingOverlay.style.display = 'none';
      document.body.appendChild(loadingOverlay);
    }
    this.loadingOverlay = loadingOverlay;

    // Create modal container if not exists
    let modalContainer = document.getElementById(
      this.options.modalContainerId || 'modal-container',
    );
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = this.options.modalContainerId || 'modal-container';
      modalContainer.className = 'modal-container';
      document.body.appendChild(modalContainer);
    }
    this.modalContainer = modalContainer;

    if (this.options.debug) {
      logger.debug('UIManager: Elements initialized');
    }
  }

  /**
   * Initialize UI
   */
  public initializeUI(): void {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.setTheme(savedTheme);
    }

    // Cache common elements
    this.cacheElements();

    // Set up event listeners
    this.setupEventListeners();

    // Mark as initialized
    this.isInitialized = true;

    // Call the onUiReady callback if provided using this.options
    if (this.options.onUiReady) {
      this.options.onUiReady();
    }

    if (this.options.debug) {
      logger.debug('UIManager: UI initialized');
    }
  }

  /**
   * Show a toast notification
   */
  public showToast(option: ToastOptions): void {
    if (!this.toastContainer) return;

    const toastOptions = {
      id: option.id || `toast-${Date.now()}`,
      type: option.type || 'info',
      title: option.title || '',
      message: option.message,
      duration: option.duration || 3000,
      position: option.position || 'top-right',
      closable: option.closable !== undefined ? option.closable : true,
      onClose: option.onClose || (() => {}),
      dismissable: option.dismissable !== undefined ? option.dismissable : true,
    };

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${toastOptions.type} toast-${toastOptions.position}`;

    // Add toast content
    toast.innerHTML = `
      ${toastOptions.title ? `<div class="toast-title">${toastOptions.title}</div>` : ''}
      <div class="toast-message">${toastOptions.message}</div>
      ${toastOptions.closable ? '<button class="toast-close">&times;</button>' : ''}
    `;

    // Add to container
    this.toastContainer.appendChild(toast);

    // Track active toast
    this.activeToasts.push(toast);

    // Add close button event
    if (toastOptions.closable) {
      const closeButton = toast.querySelector('.toast-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.closeToast(toast);
          toastOptions.onClose();
        });
      }
    }

    // Auto-close after duration
    if (toastOptions.duration > 0) {
      setTimeout(() => {
        this.closeToast(toast);
        toastOptions.onClose();
      }, toastOptions.duration);
    }

    // Animate in
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
  }

  /**
   * Close a toast notification
   */
  private closeToast(toast: HTMLElement): void {
    toast.classList.remove('show');

    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode?.removeChild(toast);
      }

      // Remove from active toasts
      const index = this.activeToasts.indexOf(toast);
      if (index > -1) {
        this.activeToasts.splice(index, 1);
      }
    }, 300);
  }

  /**
   * Show a success toast
   */
  public showSuccess(title: string, message: string, duration = 3000): void {
    this.showToast({
      type: 'success',
      title,
      message,
      duration,
    });
  }

  /**
   * Show an error toast
   */
  public showError(title: string, message: string, duration = 5000): void {
    this.showToast({
      type: 'error',
      title,
      message,
      duration,
    });
  }

  /**
   * Show a warning toast
   */
  public showWarning(title: string, message: string, duration = 4000): void {
    this.showToast({
      type: 'warning',
      title,
      message,
      duration,
    });
  }

  /**
   * Show an info toast
   */
  public showInfo(title: string, message: string, duration = 3000): void {
    this.showToast({
      type: 'info',
      title,
      message,
      duration,
    });
  }

  /**
   * Show loading overlay
   */
  public showLoading(message?: string): void {
    if (!this.loadingOverlay) return;

    // Set message
    const messageEl = this.loadingOverlay.querySelector('.loading-message');
    if (messageEl) {
      messageEl.textContent = message || 'Loading...';
    }

    // Show overlay
    this.loadingOverlay.style.display = 'flex';
  }

  /**
   * Hide loading overlay
   */
  public hideLoading(): void {
    if (!this.loadingOverlay) return;

    this.loadingOverlay.style.display = 'none';
  }

  /**
   * Show a modal dialog
   */
  public showModal(option: ModalOptions): HTMLElement {
    if (!this.modalContainer) {
      throw new Error('Modal container not found');
    }

    // Create modal element
    const modal = document.createElement('div');
    modal.className = `modal ${option.customClass || ''}`;

    // Add size class
    if (option.size) {
      modal.classList.add(`modal-${option.size}`);
    }

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Create header if title is provided
    if (option.title) {
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      modalHeader.innerHTML = `
        <h3 class="modal-title">${option.title}</h3>
        ${option.showClose !== false ? '<button class="modal-close">&times;</button>' : ''}
      `;
      modalContent.appendChild(modalHeader);
    }

    // Create body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    if (typeof option.content === 'string') {
      modalBody.innerHTML = option.content;
    } else if (option.content) {
      modalBody.appendChild(option.content);
    }
    modalContent.appendChild(modalBody);

    // Create footer if buttons are provided
    if (option.buttons && option.buttons.length > 0) {
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';

      // Add buttons
      option.buttons.forEach(button => {
        const buttonEl = document.createElement('button');
        buttonEl.className = `btn ${button.type ? `btn-${button.type}` : 'btn-secondary'}`;
        buttonEl.textContent = button.text;

        // Add click event
        buttonEl.addEventListener('click', () => {
          if (button.onClick) {
            button.onClick(modal);
          }

          // Close if needed
          if (button.closeOnClick !== false) {
            this.closeModal(modal);
          }
        });

        modalFooter.appendChild(buttonEl);
      });

      modalContent.appendChild(modalFooter);
    }

    // Add modal content to modal
    modal.appendChild(modalContent);

    // Add to container
    this.modalContainer.appendChild(modal);

    // Track active modal
    this.activeModals.push(modal);

    // Add close button event
    if (option.showClose !== false) {
      const closeButton = modal.querySelector('.modal-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.closeModal(modal);
          if (option.onClose) {
            option.onClose();
          }
        });
      }
    }

    // Add backdrop click event
    if (option.closable !== false) {
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          this.closeModal(modal);
          if (option.onClose) {
            option.onClose();
          }
        }
      });
    }

    // Animate in
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Call onOpen if provided
    if (option.onOpen) {
      setTimeout(() => {
        if (option.onOpen) {
          option.onOpen();
        }
      }, 300);
    }

    return modal;
  }

  /**
   * Close a modal dialog
   */
  public closeModal(modal: HTMLElement): void {
    modal.classList.remove('show');

    // Remove after animation
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode?.removeChild(modal);
      }

      // Remove from active modals
      const index = this.activeModals.indexOf(modal);
      if (index > -1) {
        this.activeModals.splice(index, 1);
      }
    }, 300);
  }

  /**
   * Close all modal dialogs
   */
  public closeAllModals(): void {
    [...this.activeModals].forEach(modal => {
      this.closeModal(modal);
    });
  }

  /**
   * Show a confirmation dialog
   */
  public confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
  ): void {
    this.showModal({
      title,
      content: `<p>${message}</p>`,
      size: 'small',
      buttons: [
        {
          text: 'Cancel',
          type: 'secondary',
          onClick: () => {
            if (onCancel) {
              onCancel();
            }
          },
        },
        {
          text: 'Confirm',
          type: 'primary',
          onClick: () => {
            onConfirm();
          },
        },
      ],
    });
  }

  /**
   * Set the UI theme
   */
  public setTheme(theme: string): void {
    this.theme = theme;

    // Update body class
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }

  /**
   * Get the current theme
   */
  public getTheme(): string {
    return this.theme;
  }

  /**
   * Caches commonly used elements
   */
  private cacheElements(): void {
    // Cache elements that are frequently accessed
    const elementIds = [
      'endpoint-select',
      'parameter-form',
      'response-container',
      'loading-indicator',
      'error-container',
      'submit-button',
      'method-select',
      'reset-button',
      'variables-container',
    ];

    for (const id of elementIds) {
      const element = getById(id);
      if (element) {
        this.elements.set(id, element);
      }
    }
  }

  /**
   * Sets up event listeners for UI elements
   */
  private setupEventListeners(): void {
    // Form submission
    const form = findElement('form');
    if (form) {
      form.addEventListener('submit', event => {
        event.preventDefault();
        this.emit('form:submit', this.getFormData(form as HTMLFormElement));
      });
    }

    // Endpoint selection
    const endpointSelect = this.elements.get('endpoint-select');
    if (endpointSelect) {
      endpointSelect.addEventListener('change', () => {
        this.emit('endpoint:change', { value: (endpointSelect as HTMLSelectElement).value });
      });
    }

    // Method selection
    const methodSelect = this.elements.get('method-select');
    if (methodSelect) {
      methodSelect.addEventListener('change', () => {
        this.emit('method:change', { value: (methodSelect as HTMLSelectElement).value });
      });
    }

    // Reset button
    const resetButton = this.elements.get('reset-button');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.emit('form:reset');
      });
    }

    // Copy response buttons
    addEventListeners('.copy-response-btn', 'click', event => {
      event.preventDefault();
      const target = (event.target as HTMLElement)?.dataset?.target;
      this.emit('response:copy', { target: target });
    });

    // Tab switching
    addEventListeners('.tab-button', 'click', event => {
      const tabId = (event.target as HTMLElement).dataset.tab;
      if (tabId) {
        this.switchTab(tabId);
      }
    });

    // Collapsible sections
    addEventListeners('.collapsible-header', 'click', event => {
      const header = event.target as HTMLElement;
      const content = header.nextElementSibling as HTMLElement | null;

      if (content && content.classList.contains('collapsible-content')) {
        toggleElement(content, content.style.display === 'none');

        // Toggle the expand/collapse icon
        const icon = header.querySelector('.collapse-icon');
        if (icon) {
          icon.textContent = content.style.display === 'none' ? '+' : '-';
        }
      }
    });
  }

  /**
   * Retrieves form data from a specified form element.
   * @param formElement The HTMLFormElement to extract data from.
   * @returns A record containing the form data.
   */
  private getFormData(formElement: HTMLFormElement): Record<string, unknown> {
    const formData = new FormData(formElement);
    const data: Record<string, unknown> = {};

    formData.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const currentValue = data[key];
        if (Array.isArray(currentValue)) {
          currentValue.push(value);
        } else {
          data[key] = [currentValue, value];
        }
      } else {
        data[key] = value;
      }
    });

    return data;
  }

  /**
   * Switches between tabs
   * @param tabId ID of the tab to switch to
   */
  public switchTab(tabId: string): void {
    const tabsContainer = this.container || document;

    const tabs = findElements('.tab-content', tabsContainer);
    const buttons = findElements('.tab-button', tabsContainer);

    logger.debug(`Switching tab to: ${tabId}`);

    // Hide all tabs
    tabs.forEach(tab => {
      if ((tab as HTMLElement).dataset.tabContent) {
        tab.classList.add('hidden');
      }
    });

    // Deactivate all buttons
    buttons.forEach(button => {
      button.classList.remove('active', 'bg-primary-600');
    });

    // Show the selected tab
    const selectedTab = findElement(`[data-tab-content="${tabId}"]`, tabsContainer);
    if (selectedTab) {
      selectedTab.classList.remove('hidden');
      logger.debug(`Showing tab content: ${tabId}`);
    } else {
      logger.warn(`Tab content not found for ID: ${tabId}`);
    }

    // Activate the selected button
    const selectedButton = findElement(`.tab-button[data-tab="${tabId}"]`, tabsContainer);
    if (selectedButton) {
      selectedButton.classList.add('active', 'bg-primary-600');
      logger.debug(`Activating tab button: ${tabId}`);
    } else {
      logger.warn(`Tab button not found for ID: ${tabId}`);
    }

    // Emit tab change event with data object
    this.emit('tab:change', { tabId: tabId });
  }

  /**
   * Updates the variables list in the UI
   * @param variables Key-value object of variables
   */
  public updateVariablesList(variables: Record<string, unknown>): void {
    const variablesList = this.elements.get('variables-list') || getById('variables-list');
    if (!variablesList) {
      logger.warn('Variables list element not found (expected ID: variables-list)');
      return;
    }

    if (!variables || Object.keys(variables).length === 0) {
      variablesList.innerHTML = '<div class="text-text-muted italic">No variables defined</div>';
      return;
    }

    logger.debug('Updating variables list UI');
    let html = '<div class="space-y-1">';
    Object.entries(variables).forEach(([name, value]) => {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // Use imported escapeHtml directly
      const escape = escapeHtml;
      html += `
      <div class="flex justify-between items-center p-1 hover:bg-bg-sidebar rounded text-xs">
        <div>
          <span class="font-medium text-primary-500">${escape(name)}</span>
          <span class="text-text-muted ml-2">(${typeof value})</span>
        </div>
        <div class="text-text-muted truncate max-w-[150px]" title="${escape(valueStr)}">${escape(valueStr)}</div>
      </div>
    `;
    });
    html += '</div>';
    variablesList.innerHTML = html;
  }

  /**
   * Updates form fields based on the provided data
   * @param data Data to update form with
   */
  public updateForm(data: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(data)) {
      const element = findElement(`[name="${key}"]`);
      if (element) {
        if (element instanceof HTMLInputElement) {
          if (element.type === 'checkbox') {
            element.checked = Boolean(value);
          } else {
            element.value = String(value);
          }
        } else if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
          element.value = String(value);
        }
      }
    }

    // Emit form update event
    this.emit('form:update', data);
  }

  /**
   * Enables or disables form elements
   * @param enable Whether to enable or disable
   */
  public setFormEnabled(enable: boolean): void {
    const form = this.elements.get('parameter-form') as HTMLFormElement | null;
    if (form) {
      const elements = form.querySelectorAll('input, select, textarea, button');
      elements.forEach(element => {
        (element as HTMLInputElement).disabled = !enable;
      });

      // Emit form enabled/disabled event with object
      this.emit('form:enabled', { enabled: enable });
    }
  }

  /**
   * Resets the form
   */
  public resetForm(): void {
    const form = this.elements.get('parameter-form') as HTMLFormElement | null;
    if (form) {
      form.reset();

      // Emit form reset event
      this.emit('form:reset');
    }
  }

  /**
   * Add an event listener
   * @param event Event name
   * @param callback Event handler function
   */
  public addEventListener(event: string, callback: (...args: unknown[]) => void): void {
    // For backward compatibility, keep the old system
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
    
    // Also register with the EventBus
    this.eventBus.on(event, callback);
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param callback Event handler function to remove
   */
  public removeEventListener(event: string, callback: (...args: unknown[]) => void): void {
    // Remove from the old system
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
    
    // Also remove from the EventBus
    this.eventBus.off(event, callback);
  }

  /**
   * Emits an event to all registered listeners
   * @param event The event name
   * @param data The data associated with the event
   * @deprecated Use eventBus.emit() instead
   */
  private emit(event: string, data: Record<string, unknown> | unknown[] | null = null): void {
    // Emit on the old system
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
    
    // Also emit on the EventBus
    this.eventBus.emit(event, data);
  }

  /**
   * Shows the loading indicator
   * @param show Whether to show or hide the indicator
   * @param message Optional message to display
   */
  private setLoadingIndicator(show: boolean, message?: string): void {
    const indicator = this.elements.get('loading-indicator');
    const msgElement = this.elements.get('loading-message');

    if (indicator) {
      toggleElement(indicator, show);
      if (msgElement && show) {
        msgElement.textContent = message || 'Loading...';
      }
    }
  }

  /**
   * Updates the UI based on the authentication state
   * @param authState The current authentication state
   */
  public updateAuthState(authState: AuthState): void {
    logger.debug('Updating UI based on Auth State:', authState);
    const authSection = getById('auth-section');
    // ... rest of method ...
  }

  // --- Placeholders for AppController Integration ---

  /**
   * Updates the main request form fields.
   * Assumes a RequestBuilder component or specific element IDs exist.
   * @param requestData Object containing request details (method, url, headers, body)
   */
  public updateRequestForm(requestData: Partial<RequestInfo>): void {
    logger.debug('UIManager: updateRequestForm called', requestData);

    // Example using direct element manipulation (adapt if using a component like RequestBuilder)
    const urlInput = this.elements.get('url-input') as HTMLInputElement | null;
    const methodSelect = this.elements.get('method-select') as HTMLSelectElement | null;
    const headersContainer = this.elements.get('header-inputs'); // Assuming container for headers
    const bodyTextarea = this.elements.get('request-body-editor') as HTMLTextAreaElement | null; // Assuming raw body textarea

    if (urlInput && requestData.url !== undefined) {
      urlInput.value = requestData.url;
    }
    if (methodSelect && requestData.method !== undefined) {
      methodSelect.value = requestData.method;
    }

    // TODO: Implement header rendering logic (clearing and adding rows based on requestData.headers)
    if (headersContainer && requestData.headers) {
      logger.debug('Need to implement header rendering in updateRequestForm');
      // Example: Clear headersContainer.innerHTML and rebuild rows
    }

    // TODO: Implement body rendering logic (handling different body types: JSON, form-data, etc.)
    if (bodyTextarea && requestData.requestBody !== undefined) {
      logger.debug('Need to implement body rendering in updateRequestForm');
      // Example: Set bodyTextarea.value for raw text/JSON
      if (typeof requestData.requestBody === 'string') {
        bodyTextarea.value = requestData.requestBody;
      } else if (typeof requestData.requestBody === 'object') {
        try {
          bodyTextarea.value = JSON.stringify(requestData.requestBody, null, 2);
        } catch (e) {
          bodyTextarea.value = '[Could not stringify body]';
        }
      }
    }
  }

  /**
   * Updates the domain state view.
   * @param domainState The current domain state object.
   * @param diffs Optional diff object highlighting changes.
   */
  public updateDomainStateView(
    domainState: Record<string, unknown>,
    diffs?: Array<{path: string; oldValue: unknown; newValue: unknown}>,
  ): void {
    if (this.domainStateViewer) {
      this.domainStateViewer.refresh();
      this.emit('domainStateUpdated', { domainState, diffs });
    }
  }
}
