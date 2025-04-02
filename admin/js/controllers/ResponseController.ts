import { logger } from '../utils/logger';
import { DomService } from '../services/DomService';
import { StorageService } from '../services/StorageService';
import { NetworkService } from '../services/NetworkService';
import { LoggingService } from '../services/LoggingService';
import { ComponentBase } from '../types/component-base';

interface ResponseControllerOptions {
  domService: DomService;
  storageService: StorageService;
  networkService: NetworkService;
  loggingService: LoggingService;
  responseViewerId?: string;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time?: number;
  formattedTime?: string;
  size?: number;
}

interface ErrorData {
  message: string;
  code?: number;
  details?: any;
  stack?: string;
}

/**
 * ResponseController handles API response display and processing
 * Uses service abstractions for DOM manipulation, storage, and logging
 */
export class ResponseController {
  private domService: DomService;
  private storageService: StorageService;
  private networkService: NetworkService;
  private loggingService: LoggingService;
  private responseViewerId: string;
  private responseViewer: any; // Will be initialized when needed

  /**
   * Create a new ResponseController
   * @param options Configuration options
   */
  constructor(options: ResponseControllerOptions) {
    this.domService = options.domService;
    this.storageService = options.storageService;
    this.networkService = options.networkService;
    this.loggingService = options.loggingService;
    this.responseViewerId = options.responseViewerId || 'response-viewer';

    this.loggingService.info('ResponseController initialized');
    this.initResponseViewer();
  }

  /**
   * Initialize the response viewer component
   */
  private initResponseViewer(): void {
    // Check if responseViewer is available in DOM
    const responseViewerElement = this.domService.getElementById(this.responseViewerId);
    
    if (!responseViewerElement) {
      this.loggingService.warn(`Response viewer element with ID "${this.responseViewerId}" not found`);
      return;
    }

    // Check if responseViewer is registered in component registry
    // This would normally come from a component registry or be passed via the container
    this.loggingService.info('ResponseViewer initialized');
  }

  /**
   * Set the response viewer component instance
   * @param responseViewer The response viewer component instance
   */
  public setResponseViewer(responseViewer: any): void {
    this.responseViewer = responseViewer;
    this.loggingService.debug('Response viewer component set');
  }

  /**
   * Handle a successful API response
   * @param response The API response data
   */
  public handleApiResponse(response: any): void {
    this.loggingService.info('API Response received');
    
    if (!this.responseViewer || !response) {
      this.loggingService.warn('Response viewer not available or response data is missing');
      return;
    }

    try {
      // Format response for the viewer
      const formattedResponse: ResponseData = {
        status: response.status || 200,
        statusText: response.statusText || 'OK',
        headers: this.extractHeaders(response.headers),
        body: response.data || response.responseData || {},
        time: response.time || 0,
        size: this.estimateResponseSize(response.data || response.responseData || {})
      };

      // Format time if available
      if (formattedResponse.time) {
        formattedResponse.formattedTime = this.formatDuration(formattedResponse.time);
      }

      // Save response in storage if configured to do so
      this.saveResponseHistory(formattedResponse);

      // Display the response in the viewer
      if (typeof this.responseViewer.showResponse === 'function') {
        this.responseViewer.showResponse(formattedResponse);
      } else if (typeof this.responseViewer.display === 'function') {
        this.responseViewer.display(formattedResponse);
      } else {
        this.loggingResponse(formattedResponse);
      }
    } catch (error) {
      this.loggingService.error('Error handling API response', error);
    }
  }

  /**
   * Handle an API error
   * @param error The error data
   */
  public handleApiError(error: any): void {
    this.loggingService.error('API Error encountered', error);

    if (!this.responseViewer) {
      this.loggingService.warn('Response viewer not available');
      return;
    }

    try {
      // Format error for viewer
      const errorData: ErrorData = {
        message: error.message || 'Unknown Error',
        code: error.statusCode || error.status || 0,
        details: error.responseData || error.data || undefined,
        stack: error.stack
      };

      // Format response for viewer
      const formattedResponse: ResponseData = {
        status: errorData.code || 0,
        statusText: errorData.message || 'Error',
        headers: this.extractHeaders(error.headers || {}),
        body: errorData.details || {},
        time: error.time || 0,
        size: this.estimateResponseSize(errorData.details || {})
      };

      // Display the error in the viewer
      if (typeof this.responseViewer.showError === 'function') {
        this.responseViewer.showError(errorData);
      } else if (typeof this.responseViewer.display === 'function') {
        this.responseViewer.display(formattedResponse);
      } else {
        this.loggingResponse(formattedResponse);
      }
    } catch (error) {
      this.loggingService.error('Error handling API error', error);
    }
  }

  /**
   * Handle network error
   * @param error The network error data
   */
  public handleNetworkError(error: any): void {
    this.loggingService.error('Network Error', error);

    if (!this.responseViewer) {
      this.loggingService.warn('Response viewer not available');
      return;
    }

    try {
      // Format error data
      const errorData: ErrorData = {
        message: error.message || 'Network Error',
        details: {
          url: error.requestInfo?.url || '',
          method: error.requestInfo?.method || '',
          error: error.message || 'Connection failed'
        }
      };

      // Display error in viewer
      if (typeof this.responseViewer.showError === 'function') {
        this.responseViewer.showError(errorData);
      } else {
        this.loggingService.error('Network error details:', errorData);
      }
    } catch (error) {
      this.loggingService.error('Error handling network error', error);
    }
  }

  /**
   * Clear the current response from the viewer
   */
  public clearResponse(): void {
    if (this.responseViewer && typeof this.responseViewer.clear === 'function') {
      this.responseViewer.clear();
      this.loggingService.debug('Response viewer cleared');
    }
  }

  /**
   * Extract headers from response headers object
   * @param headers The response headers
   * @returns Formatted headers as an object
   */
  private extractHeaders(headers: any): Record<string, string> {
    if (!headers) return {};

    // Handle Headers instance
    if (headers instanceof Headers) {
      const headerObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        headerObj[key] = value;
      });
      return headerObj;
    }

    // Handle header object
    if (typeof headers === 'object') {
      return { ...headers };
    }

    return {};
  }

  /**
   * Estimate size of response data
   * @param data The response data
   * @returns Estimated size in bytes
   */
  private estimateResponseSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return jsonString.length;
    } catch (error) {
      this.loggingService.warn('Unable to estimate response size', error);
      return 0;
    }
  }

  /**
   * Format duration in milliseconds to human-readable string
   * @param time Time in milliseconds
   * @returns Formatted time string
   */
  private formatDuration(time: number): string {
    if (time < 1000) {
      return `${time}ms`;
    }
    return `${(time / 1000).toFixed(2)}s`;
  }

  /**
   * Log response data to console
   * @param response The formatted response data
   */
  private loggingResponse(response: ResponseData): void {
    this.loggingService.info('API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      size: response.size || 0,
      time: response.time || 0
    });
    
    this.loggingService.debug('Response Body:', response.body);
  }

  /**
   * Save response to history in storage
   * @param response The formatted response data
   */
  private saveResponseHistory(response: ResponseData): void {
    try {
      // Get existing history
      const historyString = this.storageService.get<string>('response_history');
      const history = historyString ? JSON.parse(historyString) : [];
      
      // Add new response with timestamp
      const historyItem = {
        timestamp: new Date().toISOString(),
        response: {
          status: response.status,
          statusText: response.statusText,
          time: response.time,
          size: response.size
        }
      };
      
      // Limit history size
      history.unshift(historyItem);
      if (history.length > 50) {
        history.pop();
      }
      
      // Save updated history
      this.storageService.set('response_history', JSON.stringify(history));
    } catch (error) {
      this.loggingService.warn('Failed to save response history', error);
    }
  }
} 