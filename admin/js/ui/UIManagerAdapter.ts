// Types improved by ts-improve-types
/**
 * UIManagerAdapter
 *
 * This adapter provides backwards compatibility with the legacy codebase
 * by implementing the expected UIManager interface while using the new components.
 */

import { UIManager as NewUIManager } from '../components/UIManager';

export class UIManager {
  private uiManager: NewUIManager;
  private elements: Record<string, HTMLElement> = {};

  // Properties needed for FlowController
  public toastContainer: HTMLElement | null = null;
  public loadingOverlay: HTMLElement | null = null;

  constructor(uiManager: NewUIManager) {
    this.uiManager = uiManager; // Property added

    // Cache common elements
    this.cacheElements();

    // Create toast container if it doesn't exist
    this.toastContainer = document.getElementById('toast-container'); // Property added
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div'); // Property added
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'fixed top-4 right-4 z-50 space-y-4';
      document.body.appendChild(this.toastContainer);
    }

    // Create loading overlay if it doesn't exist
    this.loadingOverlay = document.getElementById('loading-overlay'); // Property added
    if (!this.loadingOverlay) {
      this.loadingOverlay = document.createElement('div'); // Property added
      this.loadingOverlay.id = 'loading-overlay';
      this.loadingOverlay.className =
        'fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-50 hidden';
      this.loadingOverlay.innerHTML = `
        <div class="bg-bg-card p-6 rounded-lg shadow-xl text-center">
          <div class="spinner mb-4"></div>
          <p id="loading-message">Loading...</p>
        </div>
      `;
      document.body.appendChild(this.loadingOverlay);
    }
  }

  /**
   * Initialize UI components
   */
  initElements(): void {
    this.cacheElements();
  }

  /**
   * Initialize UI with the specified options
   */
  initializeUI(): void {
    // Method stub - initialization is done in constructor
  }

  /**
   * Cache common elements for quick access
   */
  private cacheElements(): void {
    // Cache common elements
    const elementIds = [
      'app',
      'flow-list',
      'flow-steps',
      'response-container',
      'variables-list',
      'loading-overlay',
      'toast-container',
    ];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      }
    });
  }

  /**
   * Show a toast message
   * @param title Toast title
   * @param message Toast message
   * @param type Toast type (success, error, warning, info)
   * @param duration Toast duration in ms
   * @returns The toast element
   */
  showToast(title: string, message: string, type = 'info', duration = 5000): HTMLElement {
    // Create a toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mb-4 
                      transform transition-transform duration-300 translate-x-0`;

    toast.innerHTML = `
      <div class="flex justify-between">
        <strong class="font-bold">${title}</strong>
        <button class="toast-close">×</button>
      </div>
      <div class="mt-1">${message}</div>
    `;

    // Add toast to container
    if (this.toastContainer) {
      this.toastContainer.appendChild(toast);
    }

    // Add close button handler
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.removeToast(toast));
    }

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => this.removeToast(toast), duration);
    }

    return toast;
  }

  /**
   * Remove a toast element
   * @param toast Toast element to remove
   */
  removeToast(toast: HTMLElement): void {
    if (toast && toast.parentElement) {
      // Start removal animation
      toast.classList.remove('translate-x-0');
      toast.classList.add('translate-x-full');

      // Remove after animation
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }
  }

  /**
   * Show an error message
   * @param title Error title
   * @param message Error message
   * @param duration Toast duration in ms
   * @returns The toast element
   */
  showError(title: string, message: string, duration = 8000): HTMLElement {
    return this.showToast(title, message, 'error', duration);
  }

  /**
   * Show a success message
   * @param title Success title
   * @param message Success message
   * @param duration Toast duration in ms
   * @returns The toast element
   */
  showSuccess(title: string, message: string, duration = 5000): HTMLElement {
    return this.showToast(title, message, 'success', duration);
  }

  /**
   * Show a loading message
   * @param message Loading message
   */
  showLoading(message = 'Loading...'): void {
    if (this.loadingOverlay) {
      const loadingMessage = this.loadingOverlay.querySelector('#loading-message');
      if (loadingMessage) {
        loadingMessage.textContent = message;
      }

      this.loadingOverlay.style.display = 'flex';
    }
  }

  /**
   * Hide the loading message
   */
  hideLoading(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }

  /**
   * Set loading state
   * @param isLoading Loading state
   * @param message Loading message
   */
  setLoading(isLoading: boolean, message = 'Loading...'): void {
    if (isLoading) {
      this.showLoading(message);
    } else {
      this.hideLoading();
    }
  }

  /**
   * Toggle dark mode
   * @param isDarkMode Whether to enable dark mode
   */
  toggleDarkMode(isDarkMode?: boolean): boolean {
    const newState = typeof isDarkMode === 'boolean' ? isDarkMode : !this.isDarkMode();
    document.documentElement.classList.toggle('dark', newState);
    localStorage.setItem('darkMode', newState ? 'true' : 'false');
    return newState;
  }

  /**
   * Check if dark mode is enabled
   * @returns Whether dark mode is enabled
   */
  isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  /**
   * Static method to get element by ID
   * @param id Element ID
   * @returns The element or null if not found
   */
  static getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  /**
   * Static method to get elements by selector
   * @param selector CSS selector
   * @returns NodeList of matching elements
   */
  static querySelector(selector: string): Element | null {
    return document.querySelector(selector);
  }

  /**
   * Static method to get elements by selector
   * @param selector CSS selector
   * @returns NodeList of matching elements
   */
  static querySelectorAll(selector: string): NodeListOf<Element> {
    return document.querySelectorAll(selector);
  }
}
