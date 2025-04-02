// Types improved by ts-improve-types
/**
 * Response Viewer
 * Displays API response data in a formatted way
 */

import { ResponseViewerOptions } from '../types/ui';
import { VariableManager } from '../modules/variable-manager';

// Define a minimal JSONFormatter interface
interface JSONFormatterInterface {
  new (
    data: unknown[] | Record<string, unknown>,
    maxDepth?: number,
    options?: Record<string, unknown>,
  ): {
    render(): HTMLElement;
    openAtDepth(depth?: number): void;
    // Add other methods if needed based on usage
    expandAll?(): void;
    collapseAll?(): void;
  };
}

interface ResponseData {
  data: unknown[] | Record<string, unknown>;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  duration?: number;
  url?: string;
  method?: string;
  rawText?: string;
}

/**
 * ResponseViewer class
 * Formats and displays API responses
 */
export class ResponseViewer {
  private container: HTMLElement;
  private variableManager?: VariableManager;
  private options: ResponseViewerOptions;
  private formatter: JSONFormatterInterface | null = null;
  private currentResponse: ResponseData | null = null;
  private activeTab = 'formatted';
  private tabButtons: NodeListOf<Element> | null = null;
  private contentPanels: Record<string, HTMLElement> = {};

  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: ResponseViewerOptions) {
    this.options = {
      showCopyButton: true,
      showDownloadButton: true,
      showToggleFormat: true,
      enableVirtualization: true,
      maxHeight: '500px',
      ...options,
    };

    // @ts-ignore - Complex type issues
    this.container = options.container; // Property added
    // @ts-ignore - Complex type issues
    this.variableManager = options.variableManager; // Property added

    // Initialize the UI
    this.initializeUI();

    // Assign formatter with type check
    if (typeof window !== 'undefined' && typeof window.JSONFormatter === 'function') {
      this.formatter = window.JSONFormatter as JSONFormatterInterface;
    }
  }

  /**
   * Initialize the UI components
   */
  private initializeUI(): void {
    // Create the tabs and panels
    this.container.innerHTML = `
            <div class="response-viewer">
                <div class="response-tabs">
                    <button type="button" class="response-tab active" data-tab="formatted">Formatted</button>
                    <button type="button" class="response-tab" data-tab="raw">Raw</button>
                    <button type="button" class="response-tab" data-tab="headers">Headers</button>
                    <button type="button" class="response-tab" data-tab="preview">Preview</button>
                </div>
                
                <div class="response-content-container">
                    <div class="response-content active" id="formatted-content">
                        <div class="empty-content">No response data</div>
                    </div>
                    <div class="response-content" id="raw-content">
                        <div class="empty-content">No response data</div>
                    </div>
                    <div class="response-content" id="headers-content">
                        <div class="empty-content">No headers available</div>
                    </div>
                    <div class="response-content" id="preview-content">
                        <div class="empty-content">No preview available</div>
                    </div>
                </div>
                
                <div class="response-tools">
                    <div class="response-tools-left">
                        <button type="button" class="btn btn-sm" id="expand-all-btn">Expand All</button>
                        <button type="button" class="btn btn-sm" id="collapse-all-btn">Collapse All</button>
                    </div>
                    <div class="response-tools-right">
            ${this.options.showCopyButton ? '<button type="button" class="btn btn-sm" id="copy-response-btn">Copy Response</button>' : ''}
            ${this.options.showDownloadButton ? '<button type="button" class="btn btn-sm" id="download-response-btn">Download</button>' : ''}
                    </div>
                </div>
            </div>
        `;

    // Get key elements
    this.tabButtons = this.container.querySelectorAll('.response-tab'); // Property added
    this.contentPanels = {
      formatted: this.container.querySelector('#formatted-content') as HTMLElement,
      raw: this.container.querySelector('#raw-content') as HTMLElement,
      headers: this.container.querySelector('#headers-content') as HTMLElement,
      preview: this.container.querySelector('#preview-content') as HTMLElement,
    };

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Tab switching
    this.tabButtons?.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = (button as HTMLElement).dataset.tab;
        if (tabName) {
          this.setActiveTab(tabName);
        }
      });
    });

    // Expand/Collapse buttons
    const expandAllBtn = this.container.querySelector('#expand-all-btn');
    const collapseAllBtn = this.container.querySelector('#collapse-all-btn');

    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => this.expandAll());
    }

    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => this.collapseAll());
    }

    // Copy button
    const copyBtn = this.container.querySelector('#copy-response-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyResponseToClipboard());
    }

    // Download button
    const downloadBtn = this.container.querySelector('#download-response-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadResponse());
    }
  }

  /**
   * Set the active tab
   * @param tabName Tab name to activate
   */
  setActiveTab(tabName: string): void {
    if (!this.contentPanels[tabName]) return;

    // Update active state
    this.activeTab = tabName; // Property added

    // Update tab button states
    this.tabButtons?.forEach(button => {
      button.classList.toggle('active', (button as HTMLElement).dataset.tab === tabName);
    });

    // Update content panel visibility
    Object.entries(this.contentPanels).forEach(([name, panel]) => {
      panel.classList.toggle('active', name === tabName);
    });

    // Render preview tab content if needed
    if (tabName === 'preview' && this.currentResponse) {
      this.renderPreview();
    }
  }

  /**
   * Clear the response viewer
   */
  clear(): void {
    Object.values(this.contentPanels).forEach(panel => {
      panel.innerHTML = '<div class="empty-content">No response data</div>';
    });

    this.currentResponse = null; // Property added
  }

  /**
   * Set the response data and render it
   * @param response Response data to display
   */
  setResponse(response: ResponseData): void {
    this.currentResponse = response; // Property added

    if (!response) {
      this.clear();
      return;
    }

    // Render each panel's content
    this.renderFormattedContent();
    this.renderRawContent();
    this.renderHeadersContent();

    // Only pre-render preview if it's the active tab
    if (this.activeTab === 'preview') {
      this.renderPreview();
    }
  }

  /**
   * Display a response
   * @param response Response to display
   * @param options Display options
   */
  display(response: unknown, _options: { maxDepth?: number; expanded?: boolean } = {}): void {
    // Ensure data passed matches ResponseData expectation
    const dataForResponse: unknown[] | Record<string, unknown> =
      (typeof response === 'object' && response !== null) || Array.isArray(response)
        ? (response as unknown[] | Record<string, unknown>)
        : [response]; // Wrap primitives in an array if necessary, or handle differently

    this.setResponse({
      data: dataForResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      rawText: typeof response === 'string' ? response : JSON.stringify(response, null, 2),
    });

    // Set active tab to formatted by default
    this.setActiveTab('formatted');
  }

  /**
   * Render formatted content
   */
  private renderFormattedContent(): void {
    const panel = this.contentPanels.formatted;

    if (!this.currentResponse || !this.currentResponse.data) {
      panel.innerHTML = '<div class="empty-content">No response data</div>';
      return;
    }

    const data = this.currentResponse.data;

    try {
      // If JSONFormatter is available, use it for pretty formatting
      if (this.formatter) {
        const formatted = new this.formatter(data, 2, {
          hoverPreviewEnabled: true,
          hoverPreviewArrayCount: 100,
          hoverPreviewFieldCount: 5,
          theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
          animateOpen: true,
          animateClose: true,
        });

        panel.innerHTML = '';
        panel.appendChild(formatted.render());
      } else {
        // Fallback to basic formatting
        panel.innerHTML = `<pre class="response-json">${this.syntaxHighlightJson(JSON.stringify(data, null, 2))}</pre>`;
      }
    } catch (error: unknown) {
      console.error('Error rendering formatted content:', error);
      panel.innerHTML = `<div class="error-message">Error formatting response: ${error instanceof Error ? error.message : String(error)}</div>`;
    }
  }

  /**
   * Render raw content
   */
  private renderRawContent(): void {
    const panel = this.contentPanels.raw;

    if (!this.currentResponse) {
      panel.innerHTML = '<div class="empty-content">No response data</div>';
      return;
    }

    let rawText = this.currentResponse.rawText;
    if (!rawText && this.currentResponse.data) {
      rawText =
        typeof this.currentResponse.data === 'string'
          ? this.currentResponse.data
          : JSON.stringify(this.currentResponse.data, null, 2);
    }

    if (!rawText) {
      panel.innerHTML = '<div class="empty-content">No raw data available</div>';
      return;
    }

    // Escape HTML entities
    const escapedText = this.escapeHtml(rawText);
    panel.innerHTML = `<pre class="raw-content">${escapedText}</pre>`;
  }

  /**
   * Render headers content
   */
  private renderHeadersContent(): void {
    const panel = this.contentPanels.headers;

    if (
      !this.currentResponse ||
      !this.currentResponse.headers ||
      Object.keys(this.currentResponse.headers).length === 0
    ) {
      panel.innerHTML = '<div class="empty-content">No headers available</div>';
      return;
    }

    const headers = this.currentResponse.headers;
    let headersList = '<table class="headers-table">';

    // Add status code row if available
    if (this.currentResponse.status) {
      const statusText =
        this.currentResponse.statusText || this.getStatusText(this.currentResponse.status);
      headersList += `
                <tr class="status-row">
                    <th>Status</th>
                    <td><strong>${this.currentResponse.status} ${statusText}</strong></td>
                </tr>
            `;
    }

    // Add header rows
    Object.entries(headers).forEach(([key, value]) => {
      headersList += `
                <tr>
          <th>${this.escapeHtml(key)}</th>
          <td>${this.escapeHtml(String(value))}</td>
                </tr>
            `;
    });

    headersList += '</table>';
    panel.innerHTML = headersList;
  }

  /**
   * Render preview content
   */
  private renderPreview(): void {
    const panel = this.contentPanels.preview;

    if (!this.currentResponse || !this.currentResponse.data) {
      panel.innerHTML = '<div class="empty-content">No content to preview</div>';
      return;
    }

    const data = this.currentResponse.data;
    let contentType = '';

    // Try to determine content type
    if (this.currentResponse.headers) {
      const contentTypeHeader = Object.keys(this.currentResponse.headers).find(
        key => key.toLowerCase() === 'content-type',
      );

      if (contentTypeHeader) {
        contentType = String(this.currentResponse.headers[contentTypeHeader]);
      }
    }

    // Render based on content type
    if (
      typeof data === 'string' &&
      (contentType.includes('image/') ||
        (data as string).startsWith('data:image/') ||
        (data as string).match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|svg)$/i))
    ) {
      // Image preview
      const stringData = data;
      panel.innerHTML = `
                <div class="image-preview">
          <img src="${stringData}" alt="Image Preview" />
                </div>
            `;
    } else if (
      typeof data === 'string' &&
      (contentType.includes('text/html') ||
        (data as string).includes('<!DOCTYPE html') ||
        (data as string).includes('<html'))
    ) {
      // HTML preview
      const stringData = data;
      panel.innerHTML = `
            <div class="html-preview">
          <iframe sandbox="allow-same-origin"></iframe>
            </div>
        `;

      const iframe = panel.querySelector('iframe');
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(stringData);
          doc.close();
        }
      }
    } else {
      panel.innerHTML =
        '<div class="empty-content">No preview available for this content type</div>';
    }
  }

  /**
   * Expand all collapsible elements
   */
  expandAll(): void {
    const panel = this.contentPanels[this.activeTab];

    if (this.activeTab === 'formatted') {
      // JSON formatter
      const rootElement = panel.querySelector('.json-formatter-root');
      if (rootElement) {
        const closedElements = panel.querySelectorAll('.json-formatter-closed');
        closedElements.forEach(el => {
          el.classList.remove('json-formatter-closed');
          el.classList.add('json-formatter-open');
        });
      }
    }
  }

  /**
   * Collapse all collapsible elements
   */
  collapseAll(): void {
    const panel = this.contentPanels[this.activeTab];

    if (this.activeTab === 'formatted') {
      // JSON formatter
      const openElements = panel.querySelectorAll('.json-formatter-open');
      openElements.forEach(el => {
        // Skip the root element
        if (!el.classList.contains('json-formatter-root')) {
          el.classList.remove('json-formatter-open');
          el.classList.add('json-formatter-closed');
        }
      });
    }
  }

  /**
   * Copy the response to clipboard
   */
  copyResponseToClipboard(): void {
    if (!this.currentResponse) return;

    let content = '';

    // Get content based on active tab
    switch (this.activeTab) {
      case 'formatted':
      case 'raw':
        content =
          typeof this.currentResponse.data === 'object'
            ? JSON.stringify(this.currentResponse.data, null, 2)
            : String(this.currentResponse.data || '');
        break;

      case 'headers':
        content = Object.entries(this.currentResponse.headers || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        break;

      default:
        content =
          typeof this.currentResponse.data === 'object'
            ? JSON.stringify(this.currentResponse.data, null, 2)
            : String(this.currentResponse.data || '');
    }

    // Use the clipboard API if available
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(content)
        .then(() => this.showCopySuccess())
        .catch(err => console.error('Failed to copy to clipboard:', err));
    } else {
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          this.showCopySuccess();
        }
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }

      document.body.removeChild(textarea);
    }
  }

  /**
   * Show copy success message
   */
  private showCopySuccess(): void {
    const copyBtn = this.container.querySelector('#copy-response-btn');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';

      setTimeout(() => {
        if (copyBtn) {
          copyBtn.textContent = originalText;
        }
      }, 2000);
    }
  }

  /**
   * Download the response as a file
   */
  downloadResponse(): void {
    if (!this.currentResponse) return;

    let content = '';
    let fileName = 'response';
    let mimeType = 'text/plain';

    // Get content based on active tab
    switch (this.activeTab) {
      case 'formatted':
      case 'raw':
        content =
          typeof this.currentResponse.data === 'object'
            ? JSON.stringify(this.currentResponse.data, null, 2)
            : String(this.currentResponse.data || '');
        fileName = 'response.json';
        mimeType = 'application/json';
        break;

      case 'headers':
        content = Object.entries(this.currentResponse.headers || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        fileName = 'headers.txt';
        break;

      default:
        content =
          typeof this.currentResponse.data === 'object'
            ? JSON.stringify(this.currentResponse.data, null, 2)
            : String(this.currentResponse.data || '');
        fileName = 'response.json';
        mimeType = 'application/json';
    }

    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }

  /**
   * Get HTTP status text
   * @param status HTTP status code
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      100: 'Continue',
      101: 'Switching Protocols',
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
      300: 'Multiple Choices',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return statusTexts[status] || 'Unknown';
  }

  /**
   * Syntax highlight JSON string
   * @param json JSON string
   */
  private syntaxHighlightJson(json: string): string {
    if (!json) return '';

    // Escape HTML entities
    json = this.escapeHtml(json);

    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true: any|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      match => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      },
    );
  }

  /**
   * Escape HTML entities
   * @param str String to escape
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get the current response data
   * @returns Current response data or null
   */
  getResponseData(): unknown | null {
    return this.currentResponse?.data || null;
  }
}
