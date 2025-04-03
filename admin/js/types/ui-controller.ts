/**
 * UI Controller interface
 */

import { Component } from './component-base';

/**
 * UI Controller Interface
 *
 * Defines the functionality for controllers that manage UI components
 */
export interface UIController extends Component {
  /**
   * Show a loading indicator
   */
  showLoading(): void;

  /**
   * Hide the loading indicator
   */
  hideLoading(): void;

  /**
   * Show an error message
   * @param title Error title
   * @param message Error message
   */
  showError(title: string, message: string): void;

  /**
   * Show a success message
   * @param title Success title
   * @param message Success message
   */
  showSuccess(title: string, message: string): void;

  /**
   * Update variables list in the UI
   * @param variables Variables to display
   */
  updateVariablesList(variables: Record<string, unknown>): void;

  /**
   * Update authentication state in the UI
   * @param authState Current authentication state
   */
  updateAuthState(authState: unknown): void;

  /**
   * Show an element
   * @param id Element ID
   */
  showElement(id: string): void;

  /**
   * Hide an element
   * @param id Element ID
   */
  hideElement(id: string): void;

  /**
   * Toggle an element's visibility
   * @param id Element ID
   */
  toggleElement(id: string): void;

  /**
   * Set text content
   * @param id Element ID
   * @param text Text to set
   */
  setTextContent(id: string, text: string): void;

  /**
   * Set HTML content
   * @param id Element ID
   * @param html HTML to set
   */
  setInnerHTML(id: string, html: string): void;

  /**
   * Shows a warning message
   * @param title Message title
   * @param message Message content
   * @param duration Duration in milliseconds
   */
  showWarning(title: string, message: string, duration?: number): void;

  /**
   * Shows an info message
   * @param title Message title
   * @param message Message content
   * @param duration Duration in milliseconds
   */
  showInfo(title: string, message: string, duration?: number): void;

  /**
   * Shows a confirmation dialog
   * @param title Dialog title
   * @param message Dialog content
   * @param confirmLabel Confirm button label
   * @param cancelLabel Cancel button label
   * @returns Promise that resolves to true if confirmed, false otherwise
   */
  showConfirm(
    title: string,
    message: string,
    confirmLabel?: string,
    cancelLabel?: string,
  ): Promise<boolean>;

  /**
   * Shows a prompt dialog
   * @param title Dialog title
   * @param message Dialog content
   * @param defaultValue Default input value
   * @param confirmLabel Confirm button label
   * @param cancelLabel Cancel button label
   * @returns Promise that resolves to input value if confirmed, null otherwise
   */
  showPrompt(
    title: string,
    message: string,
    defaultValue?: string,
    confirmLabel?: string,
    cancelLabel?: string,
  ): Promise<string | null>;

  /**
   * Shows a modal dialog
   * @param title Dialog title
   * @param content Dialog content
   * @param options Modal options
   * @returns Modal instance
   */
  showModal(title: string, content: string | HTMLElement, options?: unknown): unknown;

  /**
   * Closes all open dialogs
   */
  closeAllDialogs(): void;
}
