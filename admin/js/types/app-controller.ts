import { Component } from './component-base';
import { RequestInfo } from './app-types';

/**
 * App Controller Interface
 * 
 * Defines the contract for the main application controller
 */
export interface AppController extends Component {
  /**
   * Initialize the app
   */
  initialize(): void;
  
  /**
   * Get current request details
   * @returns The current request details
   */
  getCurrentRequestDetails(): RequestInfo | null;
  
  /**
   * Handle errors
   * @param error The error to handle
   */
  handleError(error: Error): void;
  
  /**
   * Handle successful responses
   * @param response The response to handle
   */
  handleResponse(response: any): void;
  
  /**
   * Process variables in a request
   * @param request Request to process
   * @returns Processed request with variables replaced
   */
  processRequestVariables(request: RequestInfo): RequestInfo;
  
  /**
   * Handle a request submission
   * @param request Request to submit
   * @returns Response data
   */
  handleRequestSubmit(request: RequestInfo): Promise<unknown>;
  
  /**
   * Set the current endpoint or request ID
   * @param id Endpoint or request ID
   */
  setCurrentRequest(id: string): void;
  
  /**
   * Get the current endpoint or request ID
   * @returns Current endpoint or request ID
   */
  getCurrentRequest(): string | null;
} 