/**
 * ResponseViewer Component
 * Displays API response data with formatting and syntax highlighting
 */

import { formatJSON } from '../utils/json-utils';
import { escapeHtml } from '../utils/string-utils';
import { setHTML, createElement, ExtendedElementCreationOptions, getById } from '../utils/dom-utils';
import { logger } from '../utils/logger';

// Define a minimal JSONFormatter interface to avoid TypeScript errors
interface JSONFormatterInterface {
  new(data: any): {
    render(): HTMLElement;
  };
}

/**
 * Response viewer options interface
 */
export interface ResponseViewerOptions {
  containerId?: string;        // ID of the container element
  responseHeadersId?: string;  // ID of the response headers element
  responseBodyId?: string;     // ID of the response body element
  responseStatusId?: string;   // ID of the response status element
  formatter?: JSONFormatterInterface;  // JSON formatter instance or class
}

/**
 * Response data interface
 */
export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time?: number;
  size?: number;
  url?: string;
  method?: string;
  formattedTime?: string;
}

/**
 * Error data interface
 */
export interface ErrorData {
  message: string;
  details?: string;
  code?: number;
  stack?: string;
}

/**
 * Default response viewer options
 */
const DEFAULT_OPTIONS: ResponseViewerOptions = {
  containerId: 'response-container',
  responseHeadersId: 'response-headers',
  responseBodyId: 'response-body',
  responseStatusId: 'response-status',
};

/**
 * ResponseViewer class
 */
export class ResponseViewer {
  private options: Required<ResponseViewerOptions>;
  private container: HTMLElement | null;
  private responseHeaders: HTMLElement | null;
  private responseBody: HTMLElement | null;
  private responseStatus: HTMLElement | null;
  private currentResponse: ResponseData | null;
  private currentHeaders: Record<string, string>;
  private currentStatus: number;
  private formatter: JSONFormatterInterface | null;
  
  /**
   * Creates a new ResponseViewer instance
   * @param options Component options
   */
  constructor(options: Partial<ResponseViewerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<ResponseViewerOptions>;
    
    this.container = getById(this.options.containerId);
    this.responseHeaders = getById(this.options.responseHeadersId);
    this.responseBody = getById(this.options.responseBodyId);
    this.responseStatus = getById(this.options.responseStatusId);
    
    this.currentResponse = null;
    this.currentHeaders = {};
    this.currentStatus = 0;
    this.formatter = this.options.formatter || (typeof window !== 'undefined' && (window as any).JSONFormatter ? (window as any).JSONFormatter : null);
    
    if (!this.container) {
      logger.warn(`ResponseViewer: Container element with ID "${this.options.containerId}" not found`);
    }
  }
  
  /**
   * Displays API response data
   * @param response Response data
   * @param headers Response headers
   * @param status HTTP status code
   */
  display(response: any, headers: Record<string, string> = {}, status: number = 200): void {
    this.currentResponse = response;
    this.currentHeaders = headers;
    this.currentStatus = status;
    
    // Update UI
    this.displayResponseHeaders();
    this.displayResponseBody();
    
    // Show the container
    this.showResponseContainer();
  }
  
  /**
   * Shows the response container
   */
  showResponseContainer(): void {
    if (this.container) {
      this.container.style.display = '';
    }
  }
  
  /**
   * Clears the response viewer
   */
  clear(): void {
    this.currentResponse = null;
    this.currentHeaders = {};
    this.currentStatus = 0;
    
    if (this.responseHeaders) {
      this.responseHeaders.innerHTML = '';
    }
    
    if (this.responseBody) {
      this.responseBody.innerHTML = '';
    }
    
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
  
  /**
   * Gets the current response data
   * @returns Current response data
   */
  getResponse(): any {
    return this.currentResponse;
  }
  
  /**
   * Gets the current response headers
   * @returns Current response headers
   */
  getHeaders(): Record<string, string> {
    return { ...this.currentHeaders };
  }
  
  /**
   * Gets the current HTTP status code
   * @returns Current HTTP status code
   */
  getStatus(): number {
    return this.currentStatus;
  }
  
  /**
   * Displays response headers
   */
  private displayResponseHeaders(): void {
    if (!this.responseHeaders) return;
    
    // Create headers HTML
    const statusClass = this.getStatusClass(this.currentStatus);
    const statusText = this.getStatusText(this.currentStatus);
    
    let html = `
      <div class="mb-2">
        <span class="font-semibold">Status:</span> 
        <span class="${statusClass}">${this.currentStatus} ${statusText}</span>
      </div>
    `;
    
    if (Object.keys(this.currentHeaders).length > 0) {
      html += '<div class="mb-2"><span class="font-semibold">Headers:</span></div>';
      html += '<ul class="text-sm ml-2 border-l-2 border-gray-300 pl-3 mb-4">';
      
      Object.entries(this.currentHeaders).forEach(([name, value]) => {
        html += `<li><span class="font-medium">${escapeHtml(name)}</span>: ${escapeHtml(String(value))}</li>`;
      });
      
      html += '</ul>';
    }
    
    setHTML(this.responseHeaders, html);
  }
  
  /**
   * Displays response body
   */
  private displayResponseBody(): void {
    if (!this.responseBody || this.currentResponse === null) return;
    
    try {
      // Check if response is JSON
      if (typeof this.currentResponse === 'object') {
        this.displayJsonResponse(this.currentResponse);
      } else if (typeof this.currentResponse === 'string') {
        // Try to parse as JSON
        try {
          const jsonObject = JSON.parse(this.currentResponse);
          this.displayJsonResponse(jsonObject);
        } catch (e) {
          // Not JSON, display as text
          this.displayTextResponse(this.currentResponse);
        }
      } else {
        // Convert to string and display as text
        this.displayTextResponse(String(this.currentResponse));
      }
    } catch (error) {
      // Handle any display errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error displaying response:', errorMessage);
      
      setHTML(
        this.responseBody,
        `<div class="text-red-500 p-2">Error displaying response: ${escapeHtml(errorMessage)}</div>`
      );
    }
  }
  
  /**
   * Displays JSON response with formatter
   * @param json JSON object to display
   */
  private displayJsonResponse(json: any): void {
    if (!this.responseBody) return;
    
    // First clear any existing content
    this.responseBody.innerHTML = '';
    
    // Display using JSONFormatter if available
    if (this.formatter) {
      try {
        const formatter = new this.formatter(json);
        this.responseBody.appendChild(formatter.render());
        return;
      } catch (error) {
        logger.warn('Error using JSONFormatter, falling back to basic formatting:', error);
        // Fall back to basic formatting if JSONFormatter fails
      }
    }
    
    // Use basic JSON formatting as fallback
    const formattedJson = formatJSON(JSON.stringify(json));
    const wrapper = createElement<HTMLDivElement>('div', {
      class: 'json-viewer overflow-auto'
    } as ExtendedElementCreationOptions);
    wrapper.innerHTML = formattedJson;
    this.responseBody.appendChild(wrapper);
  }
  
  /**
   * Displays text response
   * @param text Text to display
   */
  private displayTextResponse(text: string): void {
    if (!this.responseBody) return;
    
    const isHtml = text.trim().startsWith('<') && text.trim().endsWith('>');
    
    if (isHtml) {
      // Display HTML content in an iframe for safety
      const iframe = createElement<HTMLIFrameElement>('iframe', {
        class: 'w-full h-96 border border-gray-300 rounded',
        sandbox: 'allow-same-origin'
      } as ExtendedElementCreationOptions);
      
      this.responseBody.innerHTML = '';
      this.responseBody.appendChild(iframe);
      
      // Now we can access contentDocument and contentWindow properties
      if (iframe.contentDocument) {
        iframe.contentDocument.open();
        iframe.contentDocument.write(text);
        iframe.contentDocument.close();
      } else if (iframe.contentWindow && iframe.contentWindow.document) {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(text);
        iframe.contentWindow.document.close();
      }
    } else {
      // Display as preformatted text
      const pre = createElement<HTMLPreElement>('pre', {
        class: 'bg-gray-100 p-4 rounded overflow-auto text-sm'
      } as ExtendedElementCreationOptions);
      
      pre.textContent = text;
      this.responseBody.innerHTML = '';
      this.responseBody.appendChild(pre);
    }
  }
  
  /**
   * Gets the appropriate CSS class for a status code
   * @param status HTTP status code
   * @returns CSS class name
   */
  private getStatusClass(status: number): string {
    if (status >= 200 && status < 300) {
      return 'text-green-600 font-medium';
    } else if (status >= 300 && status < 400) {
      return 'text-blue-600 font-medium';
    } else if (status >= 400 && status < 500) {
      return 'text-amber-600 font-medium';
    } else if (status >= 500) {
      return 'text-red-600 font-medium';
    } else {
      return 'text-gray-600 font-medium';
    }
  }
  
  /**
   * Gets status text for a status code
   * @param status HTTP status code
   * @returns Status text
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    
    return statusTexts[status] || '';
  }

  /**
   * Show an API response in the viewer
   * @param response The API response object to display
   */
  showResponse(response: any): void {
    if (!response) {
      this.clear();
      return;
    }
    
    // Store the response data
    this.currentResponse = response;
    
    // Extract headers and status if available
    if (response.headers) {
      this.currentHeaders = response.headers;
    }
    
    if (response.status) {
      this.currentStatus = response.status;
    }
    
    // Update UI
    this.displayResponseHeaders();
    this.displayResponseBody();
    
    // Show the response container
    this.showResponseContainer();
  }

  /**
   * Show an error in the viewer
   * @param error The error to display
   */
  showError(error: ErrorData): void {
    if (!error) {
      this.clear();
      return;
    }
    
    // Create response from error
    const response: ResponseData = {
      status: error.code || 0,
      statusText: 'Error',
      headers: {},
      body: {
        error: error.message,
        details: error.details || '',
        stack: error.stack || ''
      }
    };
    
    // Store the response data
    this.currentResponse = response;
    
    // Update UI
    this.displayResponseStatus('error');
    this.displayResponseBody();
    
    // Show the response container
    this.showResponseContainer();
  }

  /**
   * Displays response status
   */
  private displayResponseStatus(type: 'success' | 'error' | 'warning' = 'success'): void {
    if (!this.responseStatus || !this.currentResponse) return;
    
    const statusCode = this.currentResponse.status;
    const statusText = this.currentResponse.statusText;
    
    let statusClass = 'status-unknown';
    
    if (type === 'error' || statusCode >= 400) {
      statusClass = 'status-error';
    } else if (statusCode >= 200 && statusCode < 300) {
      statusClass = 'status-success';
    } else if (statusCode >= 300 && statusCode < 400) {
      statusClass = 'status-redirect';
    } else if (statusCode === 0) {
      statusClass = 'status-error';
    }
    
    // Format response time if available
    let timeInfo = '';
    if (this.currentResponse.time) {
      const formattedTime = this.currentResponse.formattedTime || `${this.currentResponse.time}ms`;
      timeInfo = `<span class="response-time">${formattedTime}</span>`;
    }
    
    // Format response size if available
    let sizeInfo = '';
    if (this.currentResponse.size) {
      sizeInfo = `<span class="response-size">${this.formatBytes(this.currentResponse.size)}</span>`;
    }
    
    this.responseStatus.innerHTML = `
      <div class="status-code ${statusClass}">${statusCode}</div>
      <div class="status-text">${statusText}</div>
      ${timeInfo}
      ${sizeInfo}
    `;
  }

  /**
   * Formats bytes to human-readable size
   */
  private formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }
} 