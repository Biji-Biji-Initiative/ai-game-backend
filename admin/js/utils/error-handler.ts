// @ts-nocheck

/**
 * Error Handler Module
 * Handles error processing and display for API errors
 */

/**
 *
 */
export class ErrorHandler {
  /**
   * Creates a new ErrorHandler instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      showNotifications: true,
      logErrors: true,
      notificationContainer: null, // DOM element to contain notifications
      notificationDuration: 5000, // Default 5 seconds
      maxNotifications: 3, // Maximum number of notifications to show at once
      ...options,
    };

    this.listeners = new Map();
    this.activeNotifications = [];
    this.notificationCounter = 0;

    // Initialize notification container
    this.initNotificationContainer();
  }

  /**
   * Initializes the notification container
   */
  initNotificationContainer() {
    // If container is provided, use it
    if (
      this.options.notificationContainer &&
      typeof this.options.notificationContainer === 'string'
    ) {
      this.notificationContainer = document.getElementById(this.options.notificationContainer);
    }

    // If no container provided or not found, create one
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
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
   * Processes an API error from the server
   * @param {Object} errorData - Error data from the API
   * @returns {Object} The processed error object
   */
  processApiError(errorData) {
    // Log the error if enabled
    if (this.options.logErrors) {
      console.error('API Error:', errorData);
    }

    // Extract error details
    const { statusCode, statusText, message, errorCode, endpoint, method } = errorData;

    // Format a user-friendly error message
    let userMessage = `Error ${statusCode}: ${message || statusText || 'Unknown error'}`;
    if (errorCode) {
      userMessage += ` (Code: ${errorCode})`;
    }

    // Create an error object
    const error = {
      type: 'api',
      raw: errorData,
      userMessage,
      timestamp: new Date(),
      statusCode,
      endpoint,
      method,
    };

    // Show notification if enabled
    if (this.options.showNotifications) {
      this.showErrorNotification(error);
    }

    // Emit the error event for subscribers
    this.emit('error', error);
    this.emit('api:error', error);

    return error;
  }

  /**
   * Processes a network error (like connection refused)
   * @param {Object} errorData - Error data
   * @returns {Object} The processed error object
   */
  processNetworkError(errorData) {
    // Log the error if enabled
    if (this.options.logErrors) {
      console.error('Network Error:', errorData);
    }

    // Extract error details
    const { message, endpoint, method } = errorData;

    // Format a user-friendly error message
    const userMessage = `Network Error: ${message || 'Could not connect to the server'}`;

    // Create an error object
    const error = {
      type: 'network',
      raw: errorData,
      userMessage,
      timestamp: new Date(),
      endpoint,
      method,
    };

    // Show notification if enabled
    if (this.options.showNotifications) {
      this.showErrorNotification(error);
    }

    // Emit the error event for subscribers
    this.emit('error', error);
    this.emit('network:error', error);

    return error;
  }

  /**
   * Processes a timeout error
   * @param {Object} errorData - Error data
   * @returns {Object} The processed error object
   */
  processTimeoutError(errorData) {
    // Log the error if enabled
    if (this.options.logErrors) {
      console.error('Timeout Error:', errorData);
    }

    // Extract error details
    const { message, endpoint, method, duration } = errorData;

    // Format a user-friendly error message
    const userMessage = `Timeout Error: ${message || `Request took too long (${duration || '?'}ms)`}`;

    // Create an error object
    const error = {
      type: 'timeout',
      raw: errorData,
      userMessage,
      timestamp: new Date(),
      endpoint,
      method,
      duration,
    };

    // Show notification if enabled
    if (this.options.showNotifications) {
      this.showErrorNotification(error);
    }

    // Emit the error event for subscribers
    this.emit('error', error);
    this.emit('timeout:error', error);

    return error;
  }

  /**
   * Processes a validation error
   * @param {Object} errorData - Error data
   * @returns {Object} The processed error object
   */
  processValidationError(errorData) {
    // Log the error if enabled
    if (this.options.logErrors) {
      console.error('Validation Error:', errorData);
    }

    // Extract error details
    const { message, field, value } = errorData;

    // Format a user-friendly error message
    let userMessage = `Validation Error: ${message || 'Invalid input'}`;
    if (field) {
      userMessage += ` (Field: ${field})`;
    }

    // Create an error object
    const error = {
      type: 'validation',
      raw: errorData,
      userMessage,
      timestamp: new Date(),
      field,
      value,
    };

    // Show notification if enabled
    if (this.options.showNotifications) {
      this.showErrorNotification(error);
    }

    // Emit the error event for subscribers
    this.emit('error', error);
    this.emit('validation:error', error);

    return error;
  }

  /**
   * Displays an error notification to the user
   * @param {Object} error - The error object
   * @returns {string} The notification ID
   */
  showErrorNotification(error) {
    // Make sure container exists
    if (!this.notificationContainer) {
      this.initNotificationContainer();
    }

    // Manage notification limit - remove oldest if at max
    if (this.activeNotifications.length >= this.options.maxNotifications) {
      this.removeNotification(this.activeNotifications[0].id);
    }

    // Create notification ID
    const notificationId = `notification-${++this.notificationCounter}`;

    // Create notification element
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `error-notification error-notification-${error.type}`;
    notification.style.marginBottom = '10px';
    notification.style.padding = '12px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    notification.style.backgroundColor = '#fff';
    notification.style.border = '1px solid #f0f0f0';
    notification.style.borderLeft = '4px solid';

    // Set border color based on type
    switch (error.type) {
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
                <span class="error-type" style="font-weight: bold; color: #333;">${error.type.toUpperCase()}</span>
                <button class="close-button" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #999;">×</button>
            </div>
            <div class="error-notification-body">
                <p style="margin: 8px 0;">${this.escapeHtml(error.userMessage)}</p>
                <p class="error-details" style="margin: 4px 0; font-size: 0.8em; color: #777;">
                    ${error.endpoint ? `Endpoint: ${error.method} ${this.escapeHtml(error.endpoint)}<br>` : ''}
                    ${error.statusCode ? `Status: ${error.statusCode}<br>` : ''}
                    ${error.timestamp ? `Time: ${error.timestamp.toLocaleTimeString()}<br>` : ''}
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
    const closeButton = notification.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
      this.removeNotification(notificationId);
    });

    // Add to container
    this.notificationContainer.appendChild(notification);

    // Auto-remove after duration
    if (this.options.notificationDuration > 0) {
      setTimeout(() => {
        this.removeNotification(notificationId);
      }, this.options.notificationDuration);
    }

    return notificationId;
  }

  /**
   * Removes a notification by ID
   * @param {string} notificationId - The notification ID
   */
  removeNotification(notificationId) {
    const index = this.activeNotifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.activeNotifications[index];

      // Remove from DOM with animation
      notification.element.style.transition = 'all 0.3s ease-out';
      notification.element.style.opacity = '0';
      notification.element.style.transform = 'translateX(30px)';

      setTimeout(() => {
        if (this.notificationContainer.contains(notification.element)) {
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
  clearAllNotifications() {
    // Clone array to avoid modification during iteration
    const notifications = [...this.activeNotifications];
    notifications.forEach(notification => {
      this.removeNotification(notification.id);
    });
  }

  /**
   * Escapes HTML characters
   * @param {string} html - The HTML string
   * @returns {string} The escaped HTML
   */
  escapeHtml(html) {
    if (typeof html !== 'string') return '';

    const text = document.createTextNode(html);
    const div = document.createElement('div');
    div.appendChild(text);
    return div.innerHTML;
  }
}
