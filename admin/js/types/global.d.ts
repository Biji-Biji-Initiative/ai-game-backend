// Types improved by ts-improve-types
/**
 * Global type declarations for the application
 */

/**
 * Extends Window interface to add global libraries
 */
interface Window {
  /**
   * JSONFormatter library for pretty-printing JSON
   */
  JSONFormatter?: {
    new (jso: object): {
      render(): HTMLElement;
      openAtDepth(dept: number): void;
      expandAll(): void;
      collapseAll(): void;
    };
  };
}

/**
 * Declares global error extensions
 */
interface Error {
  /**
   * HTTP status code (used for API errors)
   */
  statusCode?: number;

  /**
   * Error code from API
   */
  code?: string | number;

  /**
   * HTTP status (alternative to statusCode for consistency)
   */
  status?: number;

  /**
   * Response data from API error
   */
  responseData?: unknown;
}

/**
 * CustomEvent for application-specific events
 */
interface CustomEventInit {
  /**
   * Event data for custom events
   */
  detail?: unknown;

  /**
   * Whether the event bubbles
   */
  bubbles?: boolean;

  /**
   * Whether the event is cancelable
   */
  cancelable?: boolean;

  /**
   * Whether the event can cross shadow DOM boundaries
   */
  composed?: boolean;
}

declare module '../vendor/jsoneditor.min.js' {
  export class JSONEditor {
    constructor(containe: HTMLElement, options: Record<string, unknown>);
    set(jso: unknown): void;
    get(): unknown;
    destroy(): void;
  }
}

// Add more types to avoid need for explicit property declarations
interface Element {
  dataset: DOMStringMap;
  style: CSSStyleDeclaration;
}

interface HTMLElement {
  value: string;
  type: string;
  name: string;
  disabled: boolean;
  reset(): void;
}

// Utility types
declare module '../utils/form-utils.js' {
  export function serializeForm(m: HTMLFormElement): Record<string, unknown>;
  export function validateHtml5Form(m: HTMLFormElement): boolean;
}

// Common class properties that aren't properly declared
interface ErrorHandler {
  options: Record<string, unknown>;
  listeners: Map<string, Array<(data?: unknown) => void>>;
  activeNotifications: unknown[];
  notificationContainer: HTMLElement;
  notificationCounter: number;
}

interface JSONEditorManager {
  options: Record<string, unknown>;
  editors: Map<string, unknown>;
  defaultOptions: Record<string, unknown>;
}

interface TabManager {
  options: Record<string, unknown>;
  tabsContainer: HTMLElement;
  contentContainer: HTMLElement;
  tabs: Map<string, unknown>;
  activeTabId: string | null;
  listeners: Map<string, Array<(data?: unknown) => void>>;
  tabCounter: number;
  initialized: boolean;
  error: Error | null;
}

interface UIController {
  options: Record<string, unknown>;
  apiClient: unknown;
  config: Record<string, unknown>;
  errorHandler: unknown;
  elements: {
    urlInput: HTMLInputElement;
    methodSelector: HTMLSelectElement;
    endpointSelector: HTMLSelectElement;
    historyList: HTMLElement;
    sendButton: HTMLButtonElement;
    loadingIndicator: HTMLElement;
  };
  requestBodyEditor: unknown;
  requestHeadersEditor: unknown;
  responseViewer: unknown;
  historyManager: unknown;
  currentEndpoint: unknown;
  authManager: unknown;
  isLoading: boolean;
}

interface SectionBuilder {
  container: HTMLElement;
  executeCallback: (...args: unknown[]) => unknown;
  sections: Record<string, unknown>;
  _buildURLField: (...args: unknown[]) => unknown;
  _buildParametersSection: (...args: unknown[]) => unknown;
  _buildHeadersSection: (...args: unknown[]) => unknown;
  _buildBodySection: (...args: unknown[]) => unknown;
}
