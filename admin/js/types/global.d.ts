// Global type declarations to fix TypeScript errors

declare module "../vendor/jsoneditor.min.js" {
  export class JSONEditor {
    constructor(container: HTMLElement, options: any);
    set(json: any): void;
    get(): any;
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
declare module "../utils/form-utils.js" {
  export function serializeForm(form: HTMLFormElement): any;
  export function validateForm(form: HTMLFormElement): boolean;
}

// Common class properties that aren't properly declared
interface ErrorHandler {
  options: any;
  listeners: Map<string, Function[]>;
  activeNotifications: any[];
  notificationContainer: HTMLElement;
  notificationCounter: number;
}

interface JSONEditorManager {
  options: any;
  editors: Map<string, any>;
  defaultOptions: any;
}

interface TabManager {
  options: any;
  tabsContainer: HTMLElement;
  contentContainer: HTMLElement;
  tabs: Map<string, any>;
  activeTabId: string | null;
  listeners: Map<string, Function[]>;
  tabCounter: number;
  initialized: boolean;
  error: Error | null;
}

interface UIController {
  options: any;
  apiClient: any;
  config: any;
  errorHandler: any;
  elements: {
    urlInput: HTMLInputElement;
    methodSelector: HTMLSelectElement;
    endpointSelector: HTMLSelectElement;
    historyList: HTMLElement;
    sendButton: HTMLButtonElement;
    loadingIndicator: HTMLElement;
  };
  requestBodyEditor: any;
  requestHeadersEditor: any;
  responseViewer: any;
  historyManager: any;
  currentEndpoint: any;
  authManager: any;
  isLoading: boolean;
}

interface SectionBuilder {
  container: HTMLElement;
  executeCallback: Function;
  sections: Record<string, any>;
  _buildURLField: Function;
  _buildParametersSection: Function;
  _buildHeadersSection: Function;
  _buildBodySection: Function;
} 