/**
 * UI Manager
 * 
 * Manages UI components, notifications, and modal dialogs
 */

import { Service } from '../core/ServiceManager';
import { EventBus } from '../core/EventBus';
import { logger } from '../utils/logger';

/**
 * Toast notification type
 */
export enum ToastType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * Toast notification position
 */
export enum ToastPosition {
  TOP_LEFT = 'top-left',
  TOP_CENTER = 'top-center',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_CENTER = 'bottom-center',
  BOTTOM_RIGHT = 'bottom-right',
}

/**
 * Toast notification options
 */
export interface ToastOptions {
  /**
   * Toast message
   */
  message: string;
  
  /**
   * Toast type
   */
  type?: ToastType;
  
  /**
   * Toast duration in milliseconds (0 for never auto-close)
   */
  duration?: number;
  
  /**
   * Toast ID (auto-generated if not provided)
   */
  id?: string;
  
  /**
   * Toast position
   */
  position?: ToastPosition;
  
  /**
   * Whether the toast can be dismissed by clicking on it
   */
  dismissable?: boolean;
  
  /**
   * Callback when toast is closed
   */
  onClose?: () => void;
}

/**
 * Modal dialog options
 */
export interface ModalOptions {
  /**
   * Modal title
   */
  title?: string;
  
  /**
   * Modal content (HTML string or element)
   */
  content?: string | HTMLElement;
  
  /**
   * Whether to show close button
   */
  showClose?: boolean;
  
  /**
   * Whether to close when clicking outside the modal
   */
  closeOnClick?: boolean;
  
  /**
   * Custom CSS class to add to the modal
   */
  customClass?: string;
  
  /**
   * Callback when modal is closed
   */
  callback?: (result: unknown) => void;
  
  /**
   * Modal ID (auto-generated if not provided)
   */
  id?: string;
  
  /**
   * Called when modal is opened
   */
  onOpen?: () => void;
  
  /**
   * Click handler for buttons in the modal
   */
  onClick?: (e: MouseEvent) => void;
}

/**
 * UI Manager service for managing UI components
 */
export class UIManager implements Service {
  private static instance: UIManager;
  private eventBus: EventBus;
  private toastContainer: HTMLElement | null = null;
  private modalContainer: HTMLElement | null = null;
  private activeModals: Set<string> = new Set();
  private toasts: Map<string, { element: HTMLElement; timeoutId?: number }> = new Map();
  
  /**
   * Constructor
   */
  private constructor() {
    this.eventBus = EventBus.getInstance();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }
  
  /**
   * Initialize the UI manager
   */
  public async init(): Promise<void> {
    // Create toast container if it doesn't exist
    if (!this.toastContainer) {
      this.toastContainer = document.getElementById('toast-container');
      
      if (!this.toastContainer) {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'fixed top-4 right-4 z-50 space-y-4';
        document.body.appendChild(this.toastContainer);
      }
    }
    
    // Create modal container if it doesn't exist
    if (!this.modalContainer) {
      this.modalContainer = document.getElementById('modal-container');
      
      if (!this.modalContainer) {
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'modal-container';
        document.body.appendChild(this.modalContainer);
      }
    }
    
    // Add CSS animations and styles
    this.addAnimations();
    
    // Add event listeners
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    
    logger.debug('UIManager initialized');
  }
  
  /**
   * Handle escape key for closing modals
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.activeModals.size > 0) {
      // Close the last opened modal
      const modalId = Array.from(this.activeModals).pop();
      if (modalId) {
        this.closeModal(modalId);
      }
    }
  }
  
  /**
   * Get toast container position based on position type
   */
  private getToastContainerPosition(position: ToastPosition): Record<string, string> {
    switch (position) {
      case ToastPosition.TOP_LEFT:
        return { top: '1rem', left: '1rem' };
      case ToastPosition.TOP_CENTER:
        return { top: '1rem', left: '50%', right: 'auto', transform: 'translateX(-50%)' };
      case ToastPosition.BOTTOM_LEFT:
        return { bottom: '1rem', left: '1rem', top: 'auto' };
      case ToastPosition.BOTTOM_CENTER:
        return { bottom: '1rem', left: '50%', right: 'auto', top: 'auto', transform: 'translateX(-50%)' };
      case ToastPosition.BOTTOM_RIGHT:
        return { bottom: '1rem', right: '1rem', top: 'auto' };
      case ToastPosition.TOP_RIGHT:
      default:
        return { top: '1rem', right: '1rem' };
    }
  }
  
  /**
   * Show a toast notification
   * @param options Toast options
   * @returns Toast ID
   */
  public toast(options: ToastOptions): string {
    const { 
      message, 
      type = ToastType.INFO, 
      duration = 3000, 
      id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      position = ToastPosition.TOP_RIGHT,
      dismissable = true,
      onClose,
    } = options;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-${type} toast-${position}`;
    toast.setAttribute('role', 'alert');
    
    // Set toast style based on type
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '4px';
    toast.style.marginBottom = '8px';
    toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.justifyContent = 'space-between';
    toast.style.maxWidth = '350px';
    toast.style.minWidth = '250px';
    toast.style.animation = 'fadeIn 0.3s ease';
    
    // Style based on type
    switch (type) {
      case ToastType.SUCCESS:
        toast.style.backgroundColor = '#4caf50';
        toast.style.color = 'white';
        break;
      case ToastType.WARNING:
        toast.style.backgroundColor = '#ff9800';
        toast.style.color = 'white';
        break;
      case ToastType.ERROR:
        toast.style.backgroundColor = '#f44336';
        toast.style.color = 'white';
        break;
      case ToastType.INFO:
      default:
        toast.style.backgroundColor = '#2196f3';
        toast.style.color = 'white';
        break;
    }
    
    // Set content
    const content = document.createElement('div');
    content.className = 'toast-content';
    content.textContent = message;
    toast.appendChild(content);
    
    // Add close button
    if (dismissable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.color = 'white';
      closeBtn.style.fontSize = '18px';
      closeBtn.style.marginLeft = '8px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = () => this.closeToast(id);
      toast.appendChild(closeBtn);
      
      // Make toast dismissable by clicking on it
      toast.style.cursor = 'pointer';
      toast.onclick = (e) => {
        if (e.target !== closeBtn) {
          this.closeToast(id);
        }
      };
    }
    
    // Add to DOM
    if (this.toastContainer) {
      const positionStyles = this.getToastContainerPosition(position);
      
      // Apply position styles to the container
      Object.entries(positionStyles).forEach(([property, value]) => {
        if (this.toastContainer) {
          try {
            // Use type-safe assignment to avoid read-only property errors
            (this.toastContainer as HTMLElement).style.setProperty(property, value);
          } catch (error) {
            logger.error(`Error setting style property ${property}:`, error);
          }
        }
      });
      
      this.toastContainer.appendChild(toast);
    }
    
    // Setup auto close
    let timeoutId: number | undefined;
    if (duration > 0) {
      timeoutId = window.setTimeout(() => {
        this.closeToast(id);
      }, duration);
    }
    
    // Store toast reference
    this.toasts.set(id, { element: toast, timeoutId });
    
    // Emit event
    this.eventBus.emit('ui:toast', { id, type, message });
    
    return id;
  }
  
  /**
   * Close a toast notification
   * @param id Toast ID
   */
  public closeToast(id: string): void {
    const toast = this.toasts.get(id);
    
    if (toast) {
      // Clear timeout if exists
      if (toast.timeoutId) {
        window.clearTimeout(toast.timeoutId);
      }
      
      // Add fade out animation
      toast.element.style.animation = 'fadeOut 0.3s ease forwards';
      
      // Remove after animation completes
      setTimeout(() => {
        toast.element.remove();
        this.toasts.delete(id);
        
        // Call onClose callback if provided
        const options = toast.element.getAttribute('data-options');
        if (options) {
          try {
            const parsedOptions = JSON.parse(options);
            if (parsedOptions.onClose) {
              parsedOptions.onClose();
            }
          } catch (error) {
            logger.error('Error parsing toast options:', error);
          }
        }
        
        // Emit event
        this.eventBus.emit('ui:toastClosed', { id });
      }, 300);
    }
  }
  
  /**
   * Show a success toast
   * @param message Toast message
   * @param options Toast options
   * @returns Toast ID
   */
  public success(message: string, options: Omit<ToastOptions, 'message' | 'type'> = {}): string {
    return this.toast({ message, type: ToastType.SUCCESS, ...options });
  }
  
  /**
   * Show an info toast
   * @param message Toast message
   * @param options Toast options
   * @returns Toast ID
   */
  public info(message: string, options: Omit<ToastOptions, 'message' | 'type'> = {}): string {
    return this.toast({ message, type: ToastType.INFO, ...options });
  }
  
  /**
   * Show a warning toast
   * @param message Toast message
   * @param options Toast options
   * @returns Toast ID
   */
  public warning(message: string, options: Omit<ToastOptions, 'message' | 'type'> = {}): string {
    return this.toast({ message, type: ToastType.WARNING, ...options });
  }
  
  /**
   * Show an error toast
   * @param message Toast message
   * @param options Toast options
   * @returns Toast ID
   */
  public error(message: string, options: Omit<ToastOptions, 'message' | 'type'> = {}): string {
    return this.toast({ message, type: ToastType.ERROR, ...options });
  }
  
  /**
   * Show a modal dialog
   * @param options Modal options
   * @returns Modal ID
   */
  public showModal(options: ModalOptions): string {
    const {
      title,
      content,
      showClose = true,
      closeOnClick = true,
      customClass = '',
      callback,
      id = `modal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      onOpen,
      onClick,
    } = options;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = `${id}-overlay`;
    overlay.className = `modal-overlay ${customClass}`;
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1000';
    overlay.style.animation = 'fadeIn 0.3s ease';
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = `modal ${customClass}`;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.style.backgroundColor = 'white';
    modal.style.borderRadius = '4px';
    modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    modal.style.maxWidth = '90%';
    modal.style.width = '500px';
    modal.style.maxHeight = '90vh';
    modal.style.overflow = 'auto';
    modal.style.animation = 'zoomIn 0.3s ease';
    
    // Create modal header
    if (title || showClose) {
      const header = document.createElement('div');
      header.className = 'modal-header';
      header.style.padding = '16px';
      header.style.borderBottom = '1px solid #eee';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      
      if (title) {
        const titleElement = document.createElement('h3');
        titleElement.className = 'modal-title';
        titleElement.style.margin = '0';
        titleElement.style.fontSize = '18px';
        titleElement.style.fontWeight = 'bold';
        titleElement.textContent = title;
        header.appendChild(titleElement);
      }
      
      if (showClose) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.padding = '0 8px';
        closeBtn.onclick = () => this.closeModal(id);
        header.appendChild(closeBtn);
      }
      
      modal.appendChild(header);
    }
    
    // Create modal body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.padding = '16px';
    
    if (content) {
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else {
        body.appendChild(content);
      }
    }
    
    modal.appendChild(body);
    
    // Add click handler
    if (onClick) {
      modal.addEventListener('click', onClick);
    }
    
    // Add modal to overlay
    overlay.appendChild(modal);
    
    // Add click outside to close
    if (closeOnClick) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(id);
        }
      });
    }
    
    // Add to DOM
    if (this.modalContainer) {
      this.modalContainer.appendChild(overlay);
    } else {
      document.body.appendChild(overlay);
    }
    
    // Track active modal
    this.activeModals.add(id);
    
    // Call onOpen callback
    if (onOpen) {
      onOpen();
    }
    
    // Emit event
    this.eventBus.emit('ui:modalOpen', { id, title });
    
    return id;
  }
  
  /**
   * Close a modal dialog
   * @param id Modal ID
   * @param result Result to pass to callback
   */
  public closeModal(id: string, result?: unknown): void {
    const overlay = document.getElementById(`${id}-overlay`);
    const modal = document.getElementById(id);
    
    if (overlay && modal) {
      // Get callback
      const callbackData = modal.getAttribute('data-callback');
      let callback: ((result: unknown) => void) | undefined;
      
      if (callbackData) {
        try {
          callback = JSON.parse(callbackData).callback;
        } catch (error) {
          logger.error('Error parsing modal callback:', error);
        }
      }
      
      // Add fade out animation
      overlay.style.animation = 'fadeOut 0.3s ease forwards';
      modal.style.animation = 'zoomOut 0.3s ease forwards';
      
      // Remove after animation completes
      setTimeout(() => {
        overlay.remove();
        
        // Remove from active modals
        this.activeModals.delete(id);
        
        // Call callback
        if (callback) {
          callback(result);
        }
        
        // Emit event
        this.eventBus.emit('ui:modalClose', { id, result });
      }, 300);
    }
  }
  
  /**
   * Show a confirm dialog
   * @param message Confirmation message
   * @param options Modal options
   * @returns Promise resolving to boolean (true if confirmed, false if cancelled)
   */
  public confirm(message: string, options: Omit<ModalOptions, 'content'> = {}): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const content = `
        <div class="confirm-dialog">
          <p style="margin-bottom: 20px;">${message}</p>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button class="cancel-btn" style="padding: 8px 16px; border: 1px solid #ddd; background: none; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button class="confirm-btn" style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirm</button>
          </div>
        </div>
      `;
      
      const modalId = this.showModal({
        title: options.title || 'Confirm',
        content,
        ...options,
        onClick: (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          
          if (target.classList.contains('confirm-btn')) {
            this.closeModal(modalId, true);
            resolve(true);
          } else if (target.classList.contains('cancel-btn')) {
            this.closeModal(modalId, false);
            resolve(false);
          }
          
          if (options.onClick) {
            options.onClick(e);
          }
        },
      });
    });
  }
  
  /**
   * Show a prompt dialog
   * @param message Prompt message
   * @param defaultValue Default input value
   * @param options Modal options
   * @returns Promise resolving to input value or null if cancelled
   */
  public prompt(message: string, defaultValue = '', options: Omit<ModalOptions, 'content'> = {}): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      const content = `
        <div class="prompt-dialog">
          <p style="margin-bottom: 12px;">${message}</p>
          <input type="text" class="prompt-input" value="${defaultValue}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button class="cancel-btn" style="padding: 8px 16px; border: 1px solid #ddd; background: none; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button class="confirm-btn" style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
          </div>
        </div>
      `;
      
      const modalId = this.showModal({
        title: options.title || 'Prompt',
        content,
        ...options,
        onOpen: () => {
          // Focus input
          const input = document.querySelector(`#${modalId} .prompt-input`) as HTMLInputElement;
          if (input) {
            setTimeout(() => input.focus(), 100);
          }
          
          if (options.onOpen) {
            options.onOpen();
          }
        },
        onClick: (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const input = document.querySelector(`#${modalId} .prompt-input`) as HTMLInputElement;
          
          if (target.classList.contains('confirm-btn')) {
            this.closeModal(modalId, input?.value || null);
            resolve(input?.value || null);
          } else if (target.classList.contains('cancel-btn')) {
            this.closeModal(modalId, null);
            resolve(null);
          }
          
          if (options.onClick) {
            options.onClick(e);
          }
        },
      });
      
      // Add enter key support
      const inputElement = document.querySelector(`#${modalId} .prompt-input`) as HTMLInputElement;
      if (inputElement) {
        inputElement.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            this.closeModal(modalId, inputElement.value);
            resolve(inputElement.value);
          }
        });
      }
    });
  }
  
  /**
   * Show an alert dialog
   * @param message Alert message
   * @param options Modal options
   * @returns Promise that resolves when the alert is closed
   */
  public alert(message: string, options: Omit<ModalOptions, 'content'> = {}): Promise<void> {
    return new Promise<void>((resolve) => {
      const content = `
        <div class="alert-dialog">
          <p style="margin-bottom: 20px;">${message}</p>
          <div style="display: flex; justify-content: flex-end;">
            <button class="ok-btn" style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
          </div>
        </div>
      `;
      
      const modalId = this.showModal({
        title: options.title || 'Alert',
        content,
        ...options,
        onClick: (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          
          if (target.classList.contains('ok-btn')) {
            this.closeModal(modalId);
            resolve();
          }
          
          if (options.onClick) {
            options.onClick(e);
          }
        },
      });
    });
  }
  
  /**
   * Dispose of the UI manager
   */
  public async dispose(): Promise<void> {
    // Close all toasts
    for (const id of this.toasts.keys()) {
      this.closeToast(id);
    }
    
    // Close all modals
    for (const id of this.activeModals) {
      this.closeModal(id);
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
    
    logger.debug('UIManager disposed');
  }
  
  /**
   * Add CSS animations to the document
   */
  private addAnimations(): void {
    if (!document.getElementById('ui-manager-styles')) {
      const style = document.createElement('style');
      style.id = 'ui-manager-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes zoomIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes zoomOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.9); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
}
