/**
 * UI Manager
 * Handles UI interactions and DOM manipulations
 */

/**
 * UIManager class
 * Central class for handling UI interactions and DOM manipulations
 */
export class UIManager {
  private elements: Record<string, HTMLElement | null> = {};
  private toastContainer: HTMLElement | null = null;
  private loadingOverlay: HTMLElement | null = null;
  
  /**
   * Constructor
   */
  constructor() {
    this.initElements();
    this.initializeUI();
  }
  
  /**
   * Initialize elements
   */
  private initElements(): void {
    // Cache common elements
    const commonElements = [
      'results',
      'flow-menu',
      'method-select',
      'url-input',
      'send-button',
      'params-editor',
      'headers-editor',
      'body-editor',
      'auth-editor',
      'variable-suggestions',
      'status-panel',
      'status-dot',
      'status-text'
    ];
    
    commonElements.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }
  
  /**
   * Initialize UI elements
   */
  private initializeUI(): void {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(this.toastContainer);
    } else {
      this.toastContainer = document.getElementById('toast-container');
    }
    
    // Create loading overlay if it doesn't exist
    if (!document.getElementById('loading-overlay')) {
      this.loadingOverlay = document.createElement('div');
      this.loadingOverlay.id = 'loading-overlay';
      this.loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
      
      const spinner = document.createElement('div');
      spinner.className = 'animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600';
      
      this.loadingOverlay.appendChild(spinner);
      document.body.appendChild(this.loadingOverlay);
    } else {
      this.loadingOverlay = document.getElementById('loading-overlay');
    }
    
    // Initialize theme
    this.initializeTheme();
  }
  
  /**
   * Show a toast message
   * @param message Message to display
   * @param type Type of toast (success, error, info, warning)
   * @param duration Duration in milliseconds
   */
  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000): void {
    if (!this.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} p-3 rounded shadow-lg flex items-center gap-2 transition-all duration-300 transform translate-x-full`;
    
    // Set background color based on type
    switch (type) {
      case 'success':
        toast.classList.add('bg-green-600', 'text-white');
        break;
      case 'error':
        toast.classList.add('bg-red-600', 'text-white');
        break;
      case 'warning':
        toast.classList.add('bg-yellow-500', 'text-white');
        break;
      case 'info':
      default:
        toast.classList.add('bg-primary-600', 'text-white');
        break;
    }
    
    // Create icon based on type
    const icon = document.createElement('div');
    switch (type) {
      case 'success':
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>';
        break;
      case 'error':
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>';
        break;
      case 'warning':
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>';
        break;
      case 'info':
      default:
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>';
        break;
    }
    
    const content = document.createElement('div');
    content.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'ml-auto text-white';
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>';
    closeButton.addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(closeButton);
    
    this.toastContainer.appendChild(toast);
    
    // Slide in animation
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
      toast.classList.add('translate-x-0');
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);
  }
  
  /**
   * Remove a toast element
   * @param toast Toast element to remove
   */
  private removeToast(toast: HTMLElement): void {
    toast.classList.remove('translate-x-0');
    toast.classList.add('translate-x-full');
    
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
  
  /**
   * Show error message
   * @param message Error message
   */
  showError(message: string): void {
    this.showToast(message, 'error');
  }
  
  /**
   * Show success message
   * @param message Success message
   */
  showSuccess(message: string): void {
    this.showToast(message, 'success');
  }
  
  /**
   * Show loading overlay
   */
  showLoading(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('hidden');
    }
  }
  
  /**
   * Hide loading overlay
   */
  hideLoading(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('hidden');
    }
  }
  
  /**
   * Initialize theme based on saved preference
   */
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }
  }
  
  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }
  
  /**
   * Get an element by ID
   * @param id Element ID
   * @returns HTMLElement or null if not found
   */
  getElement(id: string): HTMLElement | null {
    return this.elements[id] || document.getElementById(id);
  }
  
  /**
   * Get elements by selector
   * @param selector CSS selector
   * @returns NodeList of elements
   */
  getElements(selector: string): NodeListOf<Element> {
    return document.querySelectorAll(selector);
  }
  
  /**
   * Static method to get an element by ID
   * @param id Element ID
   * @returns HTMLElement or null if not found
   */
  static getElement(id: string): HTMLElement | null {
    return document.getElementById(id);
  }
  
  /**
   * Static method to get elements by selector
   * @param selector CSS selector
   * @returns NodeList of elements
   */
  static getElements(selector: string): NodeListOf<Element> {
    return document.querySelectorAll(selector);
  }
}

// Export a singleton instance
export default new UIManager(); 