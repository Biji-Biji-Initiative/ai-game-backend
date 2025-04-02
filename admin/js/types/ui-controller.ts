/**
 * UI Controller interface
 */

import { Component } from './component-base';

/**
 * Interface for UI controllers
 */
export interface UIController extends Component {
  /**
   * Shows a success message
   * @param title Message title
   * @param message Message content
   * @param duration Duration in milliseconds
   */
  showSuccess(title: string, message: string, duration?: number): void;

  /**
   * Shows an error message
   * @param title Message title
   * @param message Message content
   * @param duration Duration in milliseconds
   */
  showError(title: string, message: string, duration?: number): void;

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
  showConfirm(title: string, message: string, confirmLabel?: string, cancelLabel?: string): Promise<boolean>;

  /**
   * Shows a prompt dialog
   * @param title Dialog title
   * @param message Dialog content
   * @param defaultValue Default input value
   * @param confirmLabel Confirm button label
   * @param cancelLabel Cancel button label
   * @returns Promise that resolves to input value if confirmed, null otherwise
   */
  showPrompt(title: string, message: string, defaultValue?: string, confirmLabel?: string, cancelLabel?: string): Promise<string | null>;

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