import { Component } from './component-base';
import { RequestInfo } from './app-types';

/**
 * App Controller Interface
 *
 * Defines the functionality for the main application controller
 * that coordinates different modules and services
 */
export interface AppController extends Component {
  /**
   * Initialize the controller
   */
  initialize(): Promise<void>;

  /**
   * Handle form submission to make an API request
   * @param requestData Data from the form
   * @returns A Promise that resolves with the response or rejects with the error
   */
  handleRequestSubmit(requestData: RequestInfo): Promise<any>;

  /**
   * Process request data, replacing any variable placeholders
   * @param requestData Raw request data
   * @returns Request data with variables substituted
   */
  processRequestVariables(requestData: RequestInfo): RequestInfo;

  /**
   * Handle request data changes
   * @param data Updated request data
   */
  handleRequestDataChange(data: Partial<RequestInfo>): void;

  /**
   * Get current request details
   * @returns Current request information
   */
  getCurrentRequestDetails(): RequestInfo | null;

  /**
   * Handle API response
   * @param response API response data
   */
  handleApiResponse(response: any): void;

  /**
   * Handle API error
   * @param error API error data
   */
  handleApiError(error: any): void;
}
