/**
 * UI Manager Component
 * Handles UI interactions, notifications, modals, and loading states
 */

import { UIManagerOptions, ToastOptions, ModalOptions } from '../types/ui';
import { logger } from '../utils/logger';
import { ResponseViewer } from './ResponseViewer';
import { addEventListeners, findElement, findElements, getById, setHTML, toggleElement } from '../utils/dom-utils';

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
  showToast(options: ToastOptions): void;
  showSuccess(title: string, message: string, duration?: number): void;
  showError(title: string, message: string, duration?: number): void;
  showWarning(title: string, message: string, duration?: number): void;
  showInfo(title: string, message: string, duration?: number): void;
  
  // Loading indicators
  showLoading(message?: string): void;
  hideLoading(): void;
  
  // Modal dialogs
  showModal(options: ModalOptions): HTMLElement;
  closeModal(modalEl: HTMLElement): void;
  closeAllModals(): void;
  
  // Confirmation dialogs
  confirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void): void;
  
  // Theme and styling
  setTheme(theme: string): void;
  getTheme(): string;
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
  private theme: string = 'light';
  private eventListeners: Map<string, Set<Function>> = new Map();
  private elements: Map<string, HTMLElement> = new Map();
  private isInitialized: boolean = false;
  private responseViewer: ResponseViewer | null;
  
  /**
   * Creates a new UIManager instance
   * @param options Configuration options
   */
  constructor(options: UIManagerOptions = {}) {
    this.options = {
      containerId: 'app-container',
      toastContainerId: 'toast-container',
      loadingOverlayId: 'loading-overlay',
      modalContainerId: 'modal-container',
      debug: false,
      ...options
    };
    
    this.container = null;
    this.toastContainer = null;
    this.loadingOverlay = null;
    this.modalContainer = null;
    this.responseViewer = this.options.responseViewer || null;
    
    this.initElements();
  }
  
  /**
   * Initialize UI elements
   */
  public initElements(): void {
    // Get container element
    this.container = document.getElementById(this.options.containerId || 'app-container');
    
    // Create toast container if not exists
    let toastContainer = document.getElementById(this.options.toastContainerId || 'toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = this.options.toastContainerId || 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    this.toastContainer = toastContainer;
    
    // Create loading overlay if not exists
    let loadingOverlay = document.getElementById(this.options.loadingOverlayId || 'loading-overlay');
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
    let modalContainer = document.getElementById(this.options.modalContainerId || 'modal-container');
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
    
    // Call the onUiReady callback if provided
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
  public showToast(options: ToastOptions): void {
    if (!this.toastContainer) return;
    
    const toastOptions = {
      id: options.id || `toast-${Date.now()}`,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message,
      duration: options.duration || 3000,
      position: options.position || 'top-right',
      closable: options.closable !== undefined ? options.closable : true,
      onClose: options.onClose || (() => {}),
      dismissable: options.dismissable !== undefined ? options.dismissable : true
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
        toast.parentNode.removeChild(toast);
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
  public showSuccess(title: string, message: string, duration: number = 3000): void {
    this.showToast({
      type: 'success',
      title,
      message,
      duration
    });
  }
  
  /**
   * Show an error toast
   */
  public showError(title: string, message: string, duration: number = 5000): void {
    this.showToast({
      type: 'error',
      title,
      message,
      duration
    });
  }
  
  /**
   * Show a warning toast
   */
  public showWarning(title: string, message: string, duration: number = 4000): void {
    this.showToast({
      type: 'warning',
      title,
      message,
      duration
    });
  }
  
  /**
   * Show an info toast
   */
  public showInfo(title: string, message: string, duration: number = 3000): void {
    this.showToast({
      type: 'info',
      title,
      message,
      duration
    });
  }
  
  /**
   * Show loading overlay
   */
  public showLoading(message: string = 'Loading...'): void {
    if (!this.loadingOverlay) return;
    
    // Set message
    const messageEl = this.loadingOverlay.querySelector('.loading-message');
    if (messageEl) {
      messageEl.textContent = message;
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
  public showModal(options: ModalOptions): HTMLElement {
    if (!this.modalContainer) {
      throw new Error('Modal container not found');
    }
    
    // Create modal element
    const modal = document.createElement('div');
    modal.className = `modal ${options.customClass || ''}`;
    
    // Add size class
    if (options.size) {
      modal.classList.add(`modal-${options.size}`);
    }
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create header if title is provided
    if (options.title) {
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      modalHeader.innerHTML = `
        <h3 class="modal-title">${options.title}</h3>
        ${options.showClose !== false ? '<button class="modal-close">&times;</button>' : ''}
      `;
      modalContent.appendChild(modalHeader);
    }
    
    // Create body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    if (typeof options.content === 'string') {
      modalBody.innerHTML = options.content;
    } else if (options.content) {
      modalBody.appendChild(options.content);
    }
    modalContent.appendChild(modalBody);
    
    // Create footer if buttons are provided
    if (options.buttons && options.buttons.length > 0) {
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';
      
      // Add buttons
      options.buttons.forEach(button => {
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
    if (options.showClose !== false) {
      const closeButton = modal.querySelector('.modal-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.closeModal(modal);
          if (options.onClose) {
            options.onClose();
          }
        });
      }
    }
    
    // Add backdrop click event
    if (options.closable !== false) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
          if (options.onClose) {
            options.onClose();
          }
        }
      });
    }
    
    // Animate in
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    // Call onOpen if provided
    if (options.onOpen) {
      setTimeout(() => {
        if (options.onOpen) {
          options.onOpen();
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
        modal.parentNode.removeChild(modal);
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
  public confirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void): void {
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
          }
        },
        {
          text: 'Confirm',
          type: 'primary',
          onClick: () => {
            onConfirm();
          }
        }
      ]
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
      'variables-container'
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
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.emit('form:submit', this.getFormData(form as HTMLFormElement));
      });
    }
    
    // Endpoint selection
    const endpointSelect = this.elements.get('endpoint-select');
    if (endpointSelect) {
      endpointSelect.addEventListener('change', () => {
        this.emit('endpoint:change', (endpointSelect as HTMLSelectElement).value);
      });
    }
    
    // Method selection
    const methodSelect = this.elements.get('method-select');
    if (methodSelect) {
      methodSelect.addEventListener('change', () => {
        this.emit('method:change', (methodSelect as HTMLSelectElement).value);
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
    addEventListeners('.copy-response-btn', 'click', (event) => {
      event.preventDefault();
      const target = (event.target as HTMLElement)?.dataset?.target;
      this.emit('response:copy', target);
    });
    
    // Tab switching
    addEventListeners('.tab-button', 'click', (event) => {
      const tabId = (event.target as HTMLElement).dataset.tab;
      if (tabId) {
        this.switchTab(tabId);
      }
    });
    
    // Collapsible sections
    addEventListeners('.collapsible-header', 'click', (event) => {
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
   * Gets form data as an object
   * @param form Form element
   * @returns Form data as an object
   */
  private getFormData(form: HTMLFormElement): Record<string, any> {
    const formData = new FormData(form);
    const data: Record<string, any> = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }
  
  /**
   * Switches between tabs
   * @param tabId ID of the tab to switch to
   */
  private switchTab(tabId: string): void {
    const tabs = findElements('.tab-content');
    const buttons = findElements('.tab-button');
    
    // Hide all tabs
    tabs.forEach(tab => {
      tab.style.display = 'none';
    });
    
    // Deactivate all buttons
    buttons.forEach(button => {
      button.classList.remove('active');
    });
    
    // Show the selected tab
    const selectedTab = getById(tabId);
    if (selectedTab) {
      selectedTab.style.display = 'block';
    }
    
    // Activate the selected button
    const selectedButton = findElement(`.tab-button[data-tab="${tabId}"]`);
    if (selectedButton) {
      selectedButton.classList.add('active');
    }
    
    // Emit tab change event
    this.emit('tab:change', tabId);
  }
  
  /**
   * Updates form fields based on the provided data
   * @param data Data to update form with
   */
  public updateForm(data: Record<string, any>): void {
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
   * @param enabled Whether to enable or disable
   */
  public setFormEnabled(enabled: boolean): void {
    const form = findElement('form');
    if (!form) return;
    
    const elements = form.querySelectorAll('input, select, textarea, button');
    elements.forEach(element => {
      (element as HTMLInputElement).disabled = !enabled;
    });
    
    // Emit form enabled/disabled event
    this.emit('form:enabled', enabled);
  }
  
  /**
   * Resets the form
   */
  public resetForm(): void {
    const form = findElement('form');
    if (form && form instanceof HTMLFormElement) {
      form.reset();
      
      // Emit form reset event
      this.emit('form:reset');
    }
  }
  
  /**
   * Adds an event listener
   * @param event Event name
   * @param callback Callback function
   */
  public addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }
  
  /**
   * Removes an event listener
   * @param event Event name
   * @param callback Callback function
   */
  public removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  /**
   * Emits an event
   * @param event Event name
   * @param data Event data
   */
  private emit(event: string, data: any = null): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`UIManager: Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Shows the loading indicator
   * @param show Whether to show or hide the indicator
   * @param message Optional message to display
   */
  private setLoadingIndicator(show: boolean, message?: string): void {
    // Use custom loading indicator if provided
    if (typeof this.options.showLoadingIndicator === 'function') {
      this.options.showLoadingIndicator(show, message);
      return;
    }
    
    // Use default loading indicator
    const loadingIndicator = this.elements.get('loading-indicator');
    if (loadingIndicator) {
      if (show) {
        loadingIndicator.style.display = 'flex';
        if (message) {
          const msgElement = loadingIndicator.querySelector('.loading-message');
          if (msgElement) {
            msgElement.textContent = message;
          }
        }
      } else {
        loadingIndicator.style.display = 'none';
      }
    }
  }
} 