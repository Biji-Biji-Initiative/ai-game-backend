// Types improved by ts-improve-types
/**
 * RequestBuilder Component
 * Handles building API requests with tabs for params, headers, body, and auth
 */

import { getById, createElement, setHTML } from '../utils/dom-utils';
import { logger } from '../utils/logger';
import { formatJSON } from '../utils/json-utils';
import { escapeHtml } from '../utils/string-utils';
import { IUIManager } from './UIManagerNew';

export interface RequestData {
  method: string;
  url: string;
  params: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  auth?: {
    type: string;
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyName?: string;
  };
  bodyType?: 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';
}

export interface RequestBuilderOptions {
  containerId?: string;
  uiManager?: IUIManager;
  onRequestDataChange?: (data: RequestData) => void;
}

const DEFAULT_OPTIONS: RequestBuilderOptions = {
  containerId: 'request-form',
};

/**
 * RequestBuilder class
 * Builds API requests with a tabbed interface
 */
export class RequestBuilder {
  private options: Required<RequestBuilderOptions>;
  private container: HTMLElement | null;
  private tabButtons: HTMLElement[] = [];
  private tabContents: HTMLElement[] = [];
  private requestData: RequestData = {
    method: 'GET',
    url: '',
    params: {},
    headers: {},
    bodyType: 'json',
  };
  private uiManager?: IUIManager;

  /**
   * Creates a new RequestBuilder instance
   */
  constructor(option: RequestBuilderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<RequestBuilderOptions>;
    // @ts-ignore - Complex type issues
    this.container = getById(this.options.containerId); // Property added
    this.uiManager = this.options.uiManager; // Property added

    if (!this.container) {
      // @ts-ignore - Complex type issues
      logger.warn(
        `RequestBuilder: Container element with ID "${this.options.containerId}" not found`,
      );
      return;
    }

    this.initTabs();
    this.setupEventListeners();
  }

  /**
   * Initialize tabs
   */
  private initTabs(): void {
    if (!this.container) return;

    // Create tabs structure
    const tabsHtml = `
      <div class="flex border-b border-border mb-4">
        <button class="tab-button active" data-tab="params">Params</button>
        <button class="tab-button" data-tab="headers">Headers</button>
        <button class="tab-button" data-tab="body">Body</button>
        <button class="tab-button" data-tab="auth">Auth</button>
      </div>
      <div id="params-tab" class="tab-content active"></div>
      <div id="headers-tab" class="tab-content hidden"></div>
      <div id="body-tab" class="tab-content hidden"></div>
      <div id="auth-tab" class="tab-content hidden"></div>
    `;

    setHTML(this.container, tabsHtml);

    // Store references to tab buttons and contents
    this.tabButtons = Array.from(this.container.querySelectorAll('.tab-button')); // Property added

    this.tabContents = [
      getById('params-tab'),
      getById('headers-tab'),
      getById('body-tab'),
      getById('auth-tab'),
    ].filter((el): el is HTMLElement => el !== null); // Property added

    // Render empty tab contents
    this.renderParamsTab();
    this.renderHeadersTab();
    this.renderBodyTab();
    this.renderAuthTab();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    // Add event listeners for tabs
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all tabs
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.tabContents.forEach(content => content.classList.add('hidden'));

        // Activate clicked tab
        button.classList.add('active');
        const tabName = button.getAttribute('data-tab');

        if (tabName) {
          const tabContent = getById(`${tabName}-tab`);
          if (tabContent) {
            tabContent.classList.remove('hidden');
          }
        }
      });
    });

    // Set up event delegation for form inputs
    this.container.addEventListener('change', e => {
      const target = e.target as HTMLElement;

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA'
      ) {
        this.handleInputChange(target);
      }
    });

    // Listen for keyup events in text inputs to update in real-time
    this.container.addEventListener('keyup', e => {
      const target = e.target as HTMLElement;

      if (target.tagName === 'INPUT' && target.getAttribute('type') === 'text') {
        this.handleInputChange(target);
      }
    });
  }

  /**
   * Handle input change events
   */
  private handleInputChange(targe: HTMLElement): void {
    const inputType = target.getAttribute('data-type');
    const inputKey = target.getAttribute('data-key');

    if (!inputType || !inputKey) return;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      const value = target.value;

      // Update the request data based on input type
      switch (inputType) {
        case 'param':
          this.requestData.params[inputKey] = value;
          break;

        case 'header':
          this.requestData.headers[inputKey] = value;
          break;

        case 'body':
          // Handle body differently depending on body type
          if (this.requestData.bodyType === 'json') {
            try {
              // Try to parse JSON body
              this.requestData.body = JSON.parse(value);
            } catch (e) {
              // Store as string if not valid JSON
              this.requestData.body = value;
            }
          } else {
            this.requestData.body = value;
          }
          break;

        case 'bodyType':
          this.requestData.bodyType = value as RequestData['bodyType'];
          this.renderBodyTab(); // Re-render body tab when type changes
          break;

        case 'auth':
          if (!this.requestData.auth) {
            this.requestData.auth = { type: 'none' };
          }

          if (inputKey === 'type') {
            this.requestData.auth.type = value;
            this.renderAuthTab(); // Re-render auth tab when type changes
          } else {
            (this.requestData.auth as any)[inputKey] = value;
          }
          break;

        case 'method':
          this.requestData.method = value;
          break;

        case 'url':
          this.requestData.url = value;
          break;
      }

      // Notify about data change
      if (this.options.onRequestDataChange) {
        this.options.onRequestDataChange(this.requestData);
      }
    }
  }

  /**
   * Render parameters tab content
   */
  private renderParamsTab(): void {
    const tab = getById('params-tab');
    if (!tab) return;

    let html = `
      <div class="mb-2 flex justify-between items-center">
        <h3 class="text-sm font-medium">Query Parameters</h3>
        <button id="add-param-btn" class="text-xs px-2 py-1 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
          Add Parameter
        </button>
      </div>
      <div class="space-y-2" id="params-list">
    `;

    // Add existing parameters
    const params = this.requestData.params;

    if (Object.keys(params).length === 0) {
      html += '<p class="text-sm text-text-muted italic">No parameters defined</p>';
    } else {
      Object.entries(params).forEach(([key, value]) => {
        html += this.createParamRow(key, value);
      });
    }

    html += '</div>';

    setHTML(tab, html);

    // Add event listener for the add parameter button
    const addParamBtn = getById('add-param-btn');
    if (addParamBtn) {
      addParamBtn.addEventListener('click', () => this.addParameter());
    }
  }

  /**
   * Create a parameter input row
   */
  private createParamRow(ke = '', value = ''): string {
    return `
      <div class="flex gap-2 items-center param-row">
        <input 
          type="text" 
          class="w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Parameter name" 
          value="${escapeHtml(key)}" 
          data-type="param-key"
        >
        <input 
          type="text" 
          class="flex-1 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Value" 
          value="${escapeHtml(value)}" 
          data-type="param" 
          data-key="${escapeHtml(key)}"
        >
        <button class="text-red-500 hover:text-red-700 delete-param-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Add a new parameter
   */
  private addParameter(): void {
    const paramsList = getById('params-list');
    if (!paramsList) return;

    const newParam = createElement('div', { class: 'flex gap-2 items-center param-row' });

    const keyInput = createElement('input', {
      type: 'text',
      class: 'w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm',
      placeholder: 'Parameter name',
      'data-type': 'param-key',
    });

    const valueInput = createElement('input', {
      type: 'text',
      class: 'flex-1 px-2 py-1 border border-border rounded bg-bg text-sm',
      placeholder: 'Value',
      'data-type': 'param',
      'data-key': '',
    });

    const deleteBtn = createElement('button', {
      class: 'text-red-500 hover:text-red-700 delete-param-btn',
    });

    deleteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;

    deleteBtn.addEventListener('click', () => {
      newParam.remove();
    });

    keyInput.addEventListener('input', () => {
      const newKey = keyInput.value;
      valueInput.setAttribute('data-key', newKey);

      // Update request data
      const oldValue = valueInput.value;
      delete this.requestData.params[valueInput.getAttribute('data-key') || ''];
      this.requestData.params[newKey] = oldValue;
    });

    newParam.appendChild(keyInput);
    newParam.appendChild(valueInput);
    newParam.appendChild(deleteBtn);

    if (paramsList.querySelector('.italic')) {
      // Remove "No parameters defined" message
      paramsList.innerHTML = '';
    }

    paramsList.appendChild(newParam);
  }

  /**
   * Render headers tab content
   */
  private renderHeadersTab(): void {
    const tab = getById('headers-tab');
    if (!tab) return;

    let html = `
      <div class="mb-2 flex justify-between items-center">
        <h3 class="text-sm font-medium">HTTP Headers</h3>
        <button id="add-header-btn" class="text-xs px-2 py-1 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
          Add Header
        </button>
      </div>
      <div class="space-y-2" id="headers-list">
    `;

    // Add common headers dropdown
    html += `
      <div class="mb-3">
        <label class="text-xs text-text-muted">Add Common Header:</label>
        <select id="common-headers" class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1">
          <option value="">Select a common header...</option>
          <option value="Content-Type">Content-Type</option>
          <option value="Authorization">Authorization</option>
          <option value="Accept">Accept</option>
          <option value="Accept-Language">Accept-Language</option>
          <option value="Cache-Control">Cache-Control</option>
          <option value="User-Agent">User-Agent</option>
        </select>
      </div>
    `;

    // Add existing headers
    const headers = this.requestData.headers;

    if (Object.keys(headers).length === 0) {
      html += '<p class="text-sm text-text-muted italic">No headers defined</p>';
    } else {
      Object.entries(headers).forEach(([key, value]) => {
        html += this.createHeaderRow(key, value);
      });
    }

    html += '</div>';

    setHTML(tab, html);

    // Add event listener for the add header button
    const addHeaderBtn = getById('add-header-btn');
    if (addHeaderBtn) {
      addHeaderBtn.addEventListener('click', () => this.addHeader());
    }

    // Add event listener for common headers dropdown
    const commonHeadersSelect = getById('common-headers') as HTMLSelectElement;
    if (commonHeadersSelect) {
      commonHeadersSelect.addEventListener('change', () => {
        const selectedHeader = commonHeadersSelect.value;
        if (selectedHeader) {
          this.addHeader(selectedHeader, this.getDefaultHeaderValue(selectedHeader));
          commonHeadersSelect.value = ''; // Reset dropdown
        }
      });
    }
  }

  /**
   * Get default value for common headers
   */
  private getDefaultHeaderValue(heade: string): string {
    const defaults: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'User-Agent': 'API-Admin-UI',
    };

    return defaults[header] || '';
  }

  /**
   * Create a header input row
   */
  private createHeaderRow(ke = '', value = ''): string {
    return `
      <div class="flex gap-2 items-center header-row">
        <input 
          type="text" 
          class="w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Header name" 
          value="${escapeHtml(key)}" 
          data-type="header-key"
        >
        <input 
          type="text" 
          class="flex-1 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Value" 
          value="${escapeHtml(value)}" 
          data-type="header" 
          data-key="${escapeHtml(key)}"
        >
        <button class="text-red-500 hover:text-red-700 delete-header-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Add a new header
   */
  private addHeader(ke = '', value = ''): void {
    const headersList = getById('headers-list');
    if (!headersList) return;

    const newHeader = createElement('div', { class: 'flex gap-2 items-center header-row' });

    const keyInput = createElement('input', {
      type: 'text',
      class: 'w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm',
      placeholder: 'Header name',
      'data-type': 'header-key',
      value: key,
    });

    const valueInput = createElement('input', {
      type: 'text',
      class: 'flex-1 px-2 py-1 border border-border rounded bg-bg text-sm',
      placeholder: 'Value',
      'data-type': 'header',
      'data-key': key,
      value: value,
    });

    const deleteBtn = createElement('button', {
      class: 'text-red-500 hover:text-red-700 delete-header-btn',
    });

    deleteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;

    deleteBtn.addEventListener('click', () => {
      newHeader.remove();
      delete this.requestData.headers[keyInput.value];

      // Notify about data change
      if (this.options.onRequestDataChange) {
        this.options.onRequestDataChange(this.requestData);
      }
    });

    keyInput.addEventListener('input', () => {
      const newKey = keyInput.value;
      valueInput.setAttribute('data-key', newKey);

      // Update request data
      const oldValue = valueInput.value;
      delete this.requestData.headers[valueInput.getAttribute('data-key') || ''];
      this.requestData.headers[newKey] = oldValue;

      // Notify about data change
      if (this.options.onRequestDataChange) {
        this.options.onRequestDataChange(this.requestData);
      }
    });

    valueInput.addEventListener('input', () => {
      this.requestData.headers[keyInput.value] = valueInput.value;

      // Notify about data change
      if (this.options.onRequestDataChange) {
        this.options.onRequestDataChange(this.requestData);
      }
    });

    newHeader.appendChild(keyInput);
    newHeader.appendChild(valueInput);
    newHeader.appendChild(deleteBtn);

    if (headersList.querySelector('.italic')) {
      // Remove "No headers defined" message
      headersList.innerHTML = '';
    }

    headersList.appendChild(newHeader);

    // Update request data
    if (key && value) {
      this.requestData.headers[key] = value;

      // Notify about data change
      if (this.options.onRequestDataChange) {
        this.options.onRequestDataChange(this.requestData);
      }
    }
  }

  /**
   * Render body tab content
   */
  private renderBodyTab(): void {
    const tab = getById('body-tab');
    if (!tab) return;

    const bodyType = this.requestData.bodyType || 'json';

    let html = `
      <div class="mb-2">
        <h3 class="text-sm font-medium mb-2">Request Body</h3>
        
        <div class="flex mb-3">
          <select id="body-type-select" data-type="bodyType" data-key="type" class="px-2 py-1 border border-border rounded bg-bg text-sm">
            <option value="json" ${bodyType === 'json' ? 'selected' : ''}>JSON</option>
            <option value="form-data" ${bodyType === 'form-data' ? 'selected' : ''}>form-data</option>
            <option value="x-www-form-urlencoded" ${bodyType === 'x-www-form-urlencoded' ? 'selected' : ''}>x-www-form-urlencoded</option>
            <option value="raw" ${bodyType === 'raw' ? 'selected' : ''}>Raw</option>
            <option value="binary" ${bodyType === 'binary' ? 'selected' : ''}>Binary</option>
          </select>
        </div>
      `;

    // Render different body inputs based on type
    switch (bodyType) {
      case 'json':
        const jsonValue =
          typeof this.requestData.body === 'object'
            ? JSON.stringify(this.requestData.body, null, 2)
            : this.requestData.body || '{\n  \n}';

        html += `
          <div id="json-body-container">
            <textarea 
              id="json-body" 
              class="w-full h-64 px-3 py-2 border border-border rounded bg-bg font-mono text-sm" 
              data-type="body" 
              data-key="json"
              placeholder="Enter JSON body"
            >${escapeHtml(jsonValue)}</textarea>
            <div class="flex justify-end mt-2">
              <button id="format-json-btn" class="text-xs px-2 py-1 text-primary-500 hover:text-primary-700">
                Format JSON
              </button>
            </div>
          </div>
        `;
        break;

      case 'form-data':
        html += `
          <div id="form-data-container" class="space-y-2">
            <div class="flex justify-end mb-2">
              <button id="add-form-field-btn" class="text-xs px-2 py-1 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
                Add Field
              </button>
            </div>
        `;

        // Add form fields
        const formData = this.requestData.body || {};

        if (typeof formData !== 'object' || Object.keys(formData).length === 0) {
          html += '<p class="text-sm text-text-muted italic">No form fields defined</p>';
        } else {
          Object.entries(formData).forEach(([key, value]) => {
            html += this.createFormDataRow(key, value as string);
          });
        }

        html += '</div>';
        break;

      case 'x-www-form-urlencoded':
        html += `
          <div id="urlencoded-container" class="space-y-2">
            <div class="flex justify-end mb-2">
              <button id="add-urlencoded-field-btn" class="text-xs px-2 py-1 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
                Add Field
              </button>
            </div>
        `;

        // Add urlencoded fields
        const urlencoded = this.requestData.body || {};

        if (typeof urlencoded !== 'object' || Object.keys(urlencoded).length === 0) {
          html += '<p class="text-sm text-text-muted italic">No form fields defined</p>';
        } else {
          Object.entries(urlencoded).forEach(([key, value]) => {
            html += this.createUrlencodedRow(key, value as string);
          });
        }

        html += '</div>';
        break;

      case 'raw':
        html += `
          <textarea 
            id="raw-body" 
            class="w-full h-64 px-3 py-2 border border-border rounded bg-bg font-mono text-sm" 
            data-type="body" 
            data-key="raw"
            placeholder="Enter raw body content"
          >${escapeHtml(this.requestData.body || '')}</textarea>
        `;
        break;

      case 'binary':
        html += `
          <div id="binary-container" class="border-2 border-dashed border-border rounded p-8 text-center">
            <p class="text-text-muted mb-4">Select a file to upload</p>
            <input type="file" id="binary-file" class="hidden">
            <button id="select-file-btn" class="px-4 py-2 border border-primary-500 text-primary-500 rounded hover:bg-primary-500 hover:text-white">
              Select File
            </button>
            <p id="selected-file-name" class="mt-4 text-sm"></p>
          </div>
        `;
        break;
    }

    html += '</div>';

    setHTML(tab, html);

    // Set up event listeners based on body type
    this.setupBodyEventListeners(bodyType);
  }

  /**
   * Set up event listeners for the body tab
   */
  private setupBodyEventListeners(bodyTyp: string): void {
    // Body type select
    const bodyTypeSelect = getById('body-type-select') as HTMLSelectElement;
    if (bodyTypeSelect) {
      bodyTypeSelect.addEventListener('change', () => {
        const newBodyType = bodyTypeSelect.value as RequestData['bodyType'];
        this.requestData.bodyType = newBodyType;

        // Reset body when changing type
        if (newBodyType === 'json') {
          this.requestData.body = {};
        } else if (newBodyType === 'form-data' || newBodyType === 'x-www-form-urlencoded') {
          this.requestData.body = {};
        } else {
          this.requestData.body = '';
        }

        // Re-render body tab
        this.renderBodyTab();

        // Notify about data change
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      });
    }

    // Body type specific listeners
    switch (bodyType) {
      case 'json':
        // JSON body textarea
        const jsonBody = getById('json-body') as HTMLTextAreaElement;
        if (jsonBody) {
          jsonBody.addEventListener('input', () => {
            try {
              this.requestData.body = JSON.parse(jsonBody.value);
            } catch (e) {
              // Store as string if not valid JSON
              this.requestData.body = jsonBody.value;
            }

            // Notify about data change
            if (this.options.onRequestDataChange) {
              this.options.onRequestDataChange(this.requestData);
            }
          });
        }

        // Format JSON button
        const formatJsonBtn = getById('format-json-btn');
        if (formatJsonBtn) {
          formatJsonBtn.addEventListener('click', () => {
            const jsonBody = getById('json-body') as HTMLTextAreaElement;
            if (jsonBody) {
              try {
                const formatted = JSON.stringify(JSON.parse(jsonBody.value), null, 2);
                jsonBody.value = formatted;
                this.requestData.body = JSON.parse(formatted);

                // Notify about data change
                if (this.options.onRequestDataChange) {
                  this.options.onRequestDataChange(this.requestData);
                }
              } catch (e) {
                if (this.uiManager) {
                  this.uiManager.showError('Invalid JSON', 'Please check your JSON syntax.');
                } else {
                  alert('Invalid JSON. Please check your syntax.');
                }
              }
            }
          });
        }
        break;

      case 'form-data':
        // Add form field button
        const addFormFieldBtn = getById('add-form-field-btn');
        if (addFormFieldBtn) {
          addFormFieldBtn.addEventListener('click', () => this.addFormDataField());
        }
        break;

      case 'x-www-form-urlencoded':
        // Add urlencoded field button
        const addUrlencodedFieldBtn = getById('add-urlencoded-field-btn');
        if (addUrlencodedFieldBtn) {
          addUrlencodedFieldBtn.addEventListener('click', () => this.addUrlencodedField());
        }
        break;

      case 'binary':
        // Select file button
        const selectFileBtn = getById('select-file-btn');
        if (selectFileBtn) {
          selectFileBtn.addEventListener('click', () => {
            const fileInput = getById('binary-file') as HTMLInputElement;
            if (fileInput) {
              fileInput.click();
            }
          });
        }

        // File input change
        const fileInput = getById('binary-file') as HTMLInputElement;
        if (fileInput) {
          fileInput.addEventListener('change', () => {
            const fileNameElement = getById('selected-file-name');
            if (fileNameElement && fileInput.files && fileInput.files[0]) {
              fileNameElement.textContent = fileInput.files[0].name;
              this.requestData.body = fileInput.files[0];

              // Notify about data change
              if (this.options.onRequestDataChange) {
                this.options.onRequestDataChange(this.requestData);
              }
            }
          });
        }
        break;
    }
  }

  /**
   * Create a form-data input row
   */
  private createFormDataRow(ke = '', value = ''): string {
    return `
      <div class="flex gap-2 items-center form-data-row">
        <input 
          type="text" 
          class="w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Field name" 
          value="${escapeHtml(key)}" 
          data-type="form-data-key"
        >
        <input 
          type="text" 
          class="flex-1 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Value" 
          value="${escapeHtml(value)}" 
          data-type="form-data" 
          data-key="${escapeHtml(key)}"
        >
        <button class="text-red-500 hover:text-red-700 delete-form-data-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Add a new form-data field
   */
  private addFormDataField(): void {
    const container = getById('form-data-container');
    if (!container) return;

    // Check if we need to remove the "No form fields defined" message
    const noFieldsMessage = container.querySelector('.italic');
    if (noFieldsMessage) {
      container.removeChild(noFieldsMessage);
    }

    // Create a new row for form data field
    const newRow = createElement('div', { class: 'flex gap-2 items-center form-data-row' });

    // Create key input
    const keyInput = createElement('input', {
      type: 'text',
      class: 'w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm',
      placeholder: 'Field name',
      'data-type': 'form-data-key',
    });

    // Create value input
    const valueInput = createElement('input', {
      type: 'text',
      class: 'flex-1 px-2 py-1 border border-border rounded bg-bg text-sm',
      placeholder: 'Value',
      'data-type': 'form-data',
      'data-key': '',
    });

    // Create delete button
    const deleteBtn = createElement('button', {
      class: 'text-red-500 hover:text-red-700 delete-form-data-btn',
    });

    deleteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;

    // Set up event listeners
    deleteBtn.addEventListener('click', () => {
      newRow.remove();

      // Update request body by removing this field
      if (keyInput.value) {
        if (typeof this.requestData.body === 'object') {
          delete this.requestData.body[keyInput.value];
        }
      }

      // Notify about data change
      if (this.options.onRequestDataChange) {
        this.options.onRequestDataChange(this.requestData);
      }
    });

    keyInput.addEventListener('input', () => {
      const newKey = keyInput.value;
      valueInput.setAttribute('data-key', newKey);

      // Update request body
      if (typeof this.requestData.body !== 'object') {
        this.requestData.body = {};
      }

      const oldKey = valueInput.getAttribute('data-key') || '';
      if (oldKey && oldKey !== newKey) {
        const value = this.requestData.body[oldKey];
        delete this.requestData.body[oldKey];
        if (newKey) {
          this.requestData.body[newKey] = value;
        }
      }
    });

    valueInput.addEventListener('input', () => {
      // Update request body
      if (typeof this.requestData.body !== 'object') {
        this.requestData.body = {};
      }

      const key = keyInput.value;
      if (key) {
        this.requestData.body[key] = valueInput.value;

        // Notify about data change
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      }
    });

    // Add elements to the row
    newRow.appendChild(keyInput);
    newRow.appendChild(valueInput);
    newRow.appendChild(deleteBtn);

    // Add row to the container
    container.appendChild(newRow);
  }

  /**
   * Create a x-www-form-urlencoded input row
   */
  private createUrlencodedRow(ke = '', value = ''): string {
    return `
      <div class="flex gap-2 items-center urlencoded-row">
        <input 
          type="text" 
          class="w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Field name" 
          value="${escapeHtml(key)}" 
          data-type="urlencoded-key"
        >
        <input 
          type="text" 
          class="flex-1 px-2 py-1 border border-border rounded bg-bg text-sm" 
          placeholder="Value" 
          value="${escapeHtml(value)}" 
          data-type="urlencoded" 
          data-key="${escapeHtml(key)}"
        >
        <button class="text-red-500 hover:text-red-700 delete-urlencoded-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Add a new x-www-form-urlencoded field
   */
  private addUrlencodedField(): void {
    const container = getById('urlencoded-container');
    if (!container) return;

    // Check if we need to remove the "No form fields defined" message
    const noFieldsMessage = container.querySelector('.italic');
    if (noFieldsMessage) {
      container.removeChild(noFieldsMessage);
    }

    // Create a new row for urlencoded field
    const newRow = createElement('div', { class: 'flex gap-2 items-center urlencoded-row' });

    // Create key input
    const keyInput = createElement('input', {
      type: 'text',
      class: 'w-1/3 px-2 py-1 border border-border rounded bg-bg text-sm',
      placeholder: 'Field name',
      'data-type': 'urlencoded-key',
    });

    // Create value input
    const valueInput = createElement('input', {
      type: 'text',
      class: 'flex-1 px-2 py-1 border border-border rounded bg-bg text-sm',
      placeholder: 'Value',
      'data-type': 'urlencoded',
      'data-key': '',
    });

    // Create delete button
    const deleteBtn = createElement('button', {
      class: 'text-red-500 hover:text-red-700 delete-urlencoded-btn',
    });

    deleteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;

    // Set up event listeners
    deleteBtn.addEventListener('click', () => {
      newRow.remove();

      // Update request body by removing this field
      if (keyInput.value) {
        if (typeof this.requestData.body === 'object') {
          delete this.requestData.body[keyInput.value];
        }
      }

      // Notify about data change
      if (this.options.onRequestDataChange) {
        this.options.onRequestDataChange(this.requestData);
      }
    });

    keyInput.addEventListener('input', () => {
      const newKey = keyInput.value;
      valueInput.setAttribute('data-key', newKey);

      // Update request body
      if (typeof this.requestData.body !== 'object') {
        this.requestData.body = {};
      }

      const oldKey = valueInput.getAttribute('data-key') || '';
      if (oldKey && oldKey !== newKey) {
        const value = this.requestData.body[oldKey];
        delete this.requestData.body[oldKey];
        if (newKey) {
          this.requestData.body[newKey] = value;
        }
      }
    });

    valueInput.addEventListener('input', () => {
      // Update request body
      if (typeof this.requestData.body !== 'object') {
        this.requestData.body = {};
      }

      const key = keyInput.value;
      if (key) {
        this.requestData.body[key] = valueInput.value;

        // Notify about data change
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      }
    });

    // Add elements to the row
    newRow.appendChild(keyInput);
    newRow.appendChild(valueInput);
    newRow.appendChild(deleteBtn);

    // Add row to the container
    container.appendChild(newRow);
  }

  /**
   * Render authentication tab content
   */
  private renderAuthTab(): void {
    const tab = getById('auth-tab');
    if (!tab) return;

    const auth = this.requestData.auth || { type: 'none' };

    let html = `
      <div class="mb-2">
        <h3 class="text-sm font-medium mb-2">Authentication</h3>
        
        <div class="mb-4">
          <select id="auth-type-select" data-type="auth" data-key="type" class="w-full px-2 py-1 border border-border rounded bg-bg text-sm">
            <option value="none" ${auth.type === 'none' ? 'selected' : ''}>No Auth</option>
            <option value="basic" ${auth.type === 'basic' ? 'selected' : ''}>Basic Auth</option>
            <option value="bearer" ${auth.type === 'bearer' ? 'selected' : ''}>Bearer Token</option>
            <option value="apiKey" ${auth.type === 'apiKey' ? 'selected' : ''}>API Key</option>
          </select>
        </div>
    `;

    // Render auth inputs based on type
    switch (auth.type) {
      case 'basic':
        html += `
          <div class="space-y-3">
            <div>
              <label class="text-xs text-text-muted">Username</label>
              <input 
                type="text" 
                class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
                placeholder="Username" 
                value="${escapeHtml(auth.username || '')}" 
                data-type="auth" 
                data-key="username"
              >
            </div>
            <div>
              <label class="text-xs text-text-muted">Password</label>
              <input 
                type="password" 
                class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
                placeholder="Password" 
                value="${escapeHtml(auth.password || '')}" 
                data-type="auth" 
                data-key="password"
              >
            </div>
          </div>
        `;
        break;

      case 'bearer':
        html += `
          <div>
            <label class="text-xs text-text-muted">Token</label>
            <input 
              type="text" 
              class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
              placeholder="Bearer token" 
              value="${escapeHtml(auth.token || '')}" 
              data-type="auth" 
              data-key="token"
            >
          </div>
        `;
        break;

      case 'apiKey':
        html += `
          <div class="space-y-3">
            <div>
              <label class="text-xs text-text-muted">Key Name</label>
              <input 
                type="text" 
                class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
                placeholder="API key name (e.g. X-API-Key)" 
                value="${escapeHtml(auth.apiKeyName || '')}" 
                data-type="auth" 
                data-key="apiKeyName"
              >
            </div>
            <div>
              <label class="text-xs text-text-muted">Key Value</label>
              <input 
                type="text" 
                class="w-full px-2 py-1 border border-border rounded bg-bg text-sm mt-1" 
                placeholder="API key value" 
                value="${escapeHtml(auth.apiKey || '')}" 
                data-type="auth" 
                data-key="apiKey"
              >
            </div>
          </div>
        `;
        break;
    }

    html += '</div>';

    setHTML(tab, html);

    // Set up event listeners
    const authTypeSelect = getById('auth-type-select') as HTMLSelectElement;
    if (authTypeSelect) {
      authTypeSelect.addEventListener('change', () => {
        const newAuthType = authTypeSelect.value;

        if (!this.requestData.auth) {
          this.requestData.auth = { type: newAuthType };
        } else {
          this.requestData.auth.type = newAuthType;
        }

        // Re-render auth tab
        this.renderAuthTab();

        // Notify about data change
        if (this.options.onRequestDataChange) {
          this.options.onRequestDataChange(this.requestData);
        }
      });
    }
  }

  /**
   * Load request data
   * @param data Request data to load
   */
  public loadRequest(dat: Partial<RequestData>): void {
    this.requestData = {
      ...this.requestData,
      ...data,
    };

    // Re-render tabs
    this.renderParamsTab();
    this.renderHeadersTab();
    this.renderBodyTab();
    this.renderAuthTab();
  }

  /**
   * Get current request data
   * @returns Current request data
   */
  public getRequestData(): RequestData {
    return { ...this.requestData };
  }
}
