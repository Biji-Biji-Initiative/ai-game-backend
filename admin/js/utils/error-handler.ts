// Types improved by ts-improve-types
// @ts-nocheck

/**
 * Error Handler Module
 * Handles error processing and display for API errors
 */

/**
 *
 */

// Define interfaces for options and internal state if needed
interface ErrorHandlerOptions {
  showNotifications?: boolean;
  logErrors?: boolean;
  notificationContainer?: string | HTMLElement | null;
  notificationDuration?: number;
  maxNotifications?: number;
}

interface ActiveNotification {
  id: string;
  element: HTMLElement;
  timestamp: Date;
}

export class ErrorHandler {
  private options: ErrorHandlerOptions;
  private listeners: Map<string, Function[]>; // Type the map values
  private activeNotifications: ActiveNotification[];
  private notificationCounter: number;
  private notificationContainer: HTMLElement | null;

  /**
   * Creates a new ErrorHandler instance
   * @param {Object} options - Configuration options
   */
  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      showNotifications: true,
      logErrors: true,
      notificationContainer: null, // DOM element to contain notifications
      notificationDuration: 5000, // Default 5 seconds
      maxNotifications: 3, // Maximum number of notifications to show at once
      ...options,
    };

    this.listeners = new Map(); // Property added
    this.activeNotifications = []; // Property added
    this.notificationCounter = 0; // Property added
    this.notificationContainer = null; // Initialize explicitly

    // Initialize notification container
    this.initNotificationContainer();
  }

  /**
   * Initializes the notification container
   */
  initNotificationContainer(): void {
    // If container is provided, use it
    if (
      this.options.notificationContainer &&
      typeof this.options.notificationContainer === 'string'
    ) {
      this.notificationContainer = document.getElementById(this.options.notificationContainer); // Property added
    }

    // If no container provided or not found, create one
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div'); // Property added
      this.notificationContainer.className = 'error-notification-container';
      this.notificationContainer.style.position = 'fixed';
      this.notificationContainer.style.top = '20px';
      this.notificationContainer.style.right = '20px';
      this.notificationContainer.style.zIndex = '9999';
      this.notificationContainer.style.maxWidth = '400px';

      // Add to body when it's available
      if (document.body) {
        document.body.appendChild(this.notificationContainer);
      } else {
        // If body is not available yet, wait for it
        window.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(this.notificationContainer);
        });
      }
    }
  }

  /**
   * Adds an event listener for error events
   * @param {string} event - The event name
   * @param {Function} callback - The callback function
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    // Optional chaining for safety
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Removes an event listener
   * @param {string} event - The event name
   * @param {Function} callback - The callback function to remove
   */
  removeEventListener(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      // Optional chaining and filter for safer removal
      if (listeners) {
        this.listeners.set(
          event,
          listeners.filter(cb => cb !== callback),
        );
      }
    }
  }

  /**
   * Emits an event to all registered listeners
   * @param {string} event - The event name
   * @param {Object} data - The event data
   */
  emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  /**
   * Processes an API error from the server
   * @param errorData - Error data from the API
   * @returns The processed error object
   */
  processApiError(errorData: unknown): Record<string, unknown> {
    if (this.options.logErrors) {
      console.error('API Error:', errorData);
    }
    const safeErrorData = typeof errorData === 'object' && errorData !== null ? errorData : {};
    const { statusCode, statusText, message, errorCode, endpoint, method } = safeErrorData as any;
    let userMessage = `Error ${statusCode}: ${message || statusText || 'Unknown error'}`;
    if (errorCode) {
      userMessage += ` (Code: ${errorCode})`;
    }
    const error = {
      type: 'api',
      raw: errorData,
      userMessage,
      timestamp: new Date(),
      statusCode,
      endpoint,
      method,
    };
    if (this.options.showNotifications) {
      this.showErrorNotification(error);
    }
    this.emit('error', error);
    this.emit('api:error', error);
    return error;
  }

  /**
   * Processes a network error (like connection refused)
   * @param errorData - Error data
   * @returns The processed error object
   */
  processNetworkError(errorData: unknown): Record<string, unknown> {
    if (this.options.logErrors) {
      console.error('Network Error:', errorData);
    }
    const safeErrorData = typeof errorData === 'object' && errorData !== null ? errorData : {};
    const { message, endpoint, method } = safeErrorData as any;
    const userMessage = `Network Error: ${message || 'Could not connect to the server'}`;
    const error = {
      type: 'network',
      raw: errorData,
      userMessage,
      timestamp: new Date(),
      endpoint,
      method,
    };
    if (this.options.showNotifications) {
      this.showErrorNotification(error);
    }
    this.emit('error', error);
    this.emit('network:error', error);
    return error;
  }

  /**
   * Processes a timeout error
   * @param errorData - Error data
   * @returns The processed error object
   */
  processTimeoutError(errorData: unknown): Record<string, unknown> {
    if (this.options.logErrors) {
      console.error('Timeout Error:', errorData);
    }
    const safeErrorData = typeof errorData === 'object' && errorData !== null ? errorData : {};
    const { message, endpoint, method, duration } = safeErrorData as any;
    const userMessage = `Timeout Error: ${message || `Request took too long (${duration || '?'}ms)`}`;
    const error = {
      type: 'timeout',
      raw: errorData,
      userMessage,
      timestamp: new Date(),
      endpoint,
      method,
      duration,
    };
    if (this.options.showNotifications) {
      this.showErrorNotification(error);
    }
    this.emit('error', error);
    this.emit('timeout:error', error);
    return error;
  }

  /**
   * Processes a validation error
   * @param errorData - Error data
   * @returns The processed error object
   */
  processValidationError(errorData: unknown): Record<string, unknown> {
    if (this.options.logErrors) {
      console.error('Validation Error:', errorData);
    }
    const safeErrorData = typeof errorData === 'object' && errorData !== null ? errorData : {};
    const { message, field, value } = safeErrorData as any;
    let userMessage = `Validation Error: ${message || 'Invalid input'}`;
    if (field) {
      userMessage += ` (Field: ${field})`;
    }
    const error = {
      type: 'validation',
      raw: errorData,
      userMessage,
      timestamp: new Date(),
      field,
      value,
    };
    if (this.options.showNotifications) {
      this.showErrorNotification(error);
    }
    this.emit('error', error);
    this.emit('validation:error', error);
    return error;
  }

  /**
   * Displays an error notification to the user
   * @param error - The error object
   * @returns The notification ID
   */
  showErrorNotification(error: any): string {
    if (!this.notificationContainer) {
      this.initNotificationContainer();
    }
    if (this.activeNotifications.length >= (this.options.maxNotifications ?? 3)) {
      this.removeNotification(this.activeNotifications[0].id);
    }
    const notificationId = `notification-${++this.notificationCounter}`;
    const notification = document.createElement('div');
    notification.id = notificationId;
    const errorType =
      typeof error === 'object' && error !== null && error.type ? String(error.type) : 'unknown';
    const userMessage =
      typeof error === 'object' && error !== null && error.userMessage
        ? String(error.userMessage)
        : 'An error occurred';
    notification.className = `error-notification error-notification-${errorType}`;
    notification.style.marginBottom = '10px';
    notification.style.padding = '12px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    notification.style.backgroundColor = '#fff';
    notification.style.border = '1px solid #f0f0f0';
    notification.style.borderLeft = '4px solid';

    // Set border color based on type
    switch (errorType) {
      case 'api':
        notification.style.borderLeftColor = '#e74c3c';
        break;
      case 'network':
        notification.style.borderLeftColor = '#e67e22';
        break;
      case 'timeout':
        notification.style.borderLeftColor = '#f39c12';
        break;
      case 'validation':
        notification.style.borderLeftColor = '#3498db';
        break;
      default:
        notification.style.borderLeftColor = '#95a5a6';
    }

    // Set notification content
    notification.innerHTML = `
            <div class="error-notification-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span class="error-type" style="font-weight: bold; color: #333;">${errorType.toUpperCase()}</span>
                <button class="close-button" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #999;">×</button>
            </div>
            <div class="error-notification-body">
                <p style="margin: 8px 0;">${this.escapeHtml(userMessage)}</p>
                <p class="error-details" style="margin: 4px 0; font-size: 0.8em; color: #777;">
                    ${error?.endpoint ? `Endpoint: ${error.method} ${this.escapeHtml(String(error.endpoint))}<br>` : ''}
                    ${error?.statusCode ? `Status: ${error.statusCode}<br>` : ''}
                    ${error?.timestamp ? `Time: ${error.timestamp.toLocaleTimeString()}<br>` : ''}
                </p>
            </div>
        `;

    // Track notification
    this.activeNotifications.push({
      id: notificationId,
      element: notification,
      timestamp: new Date(),
    });

    // Add event listener to close button
    const closeButton = notification.querySelector('.close-button') as HTMLButtonElement | null;
    closeButton?.addEventListener('click', () => {
      this.removeNotification(notificationId);
    });

    // Add to container
    this.notificationContainer?.appendChild(notification);

    // Auto-remove after duration
    if ((this.options.notificationDuration ?? 0) > 0) {
      setTimeout(() => {
        this.removeNotification(notificationId);
      }, this.options.notificationDuration);
    }

    return notificationId;
  }

  /**
   * Removes a notification by ID
   * @param notificationId - The notification ID
   */
  removeNotification(notificationId: string): void {
    const index = this.activeNotifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.activeNotifications[index];

      // Remove from DOM with animation
      notification.element.style.transition = 'all 0.3s ease-out';
      notification.element.style.opacity = '0';
      notification.element.style.transform = 'translateX(30px)';

      setTimeout(() => {
        if (this.notificationContainer?.contains(notification.element)) {
          this.notificationContainer.removeChild(notification.element);
        }
      }, 300);

      // Remove from tracking array
      this.activeNotifications.splice(index, 1);
    }
  }

  /**
   * Clears all active notifications
   */
  clearAllNotifications(): void {
    // Clone array to avoid modification during iteration
    const notifications = [...this.activeNotifications];
    notifications.forEach(notification => {
      this.removeNotification(notification.id);
    });
  }

  /**
   * Escapes HTML characters
   * @param html - The HTML string
   * @returns The escaped HTML
   */
  escapeHtml(html: string): string {
    if (typeof html !== 'string') return '';

    const text = document.createTextNode(html);
    const div = document.createElement('div');
    div.appendChild(text);
    return div.innerHTML;
  }
}
