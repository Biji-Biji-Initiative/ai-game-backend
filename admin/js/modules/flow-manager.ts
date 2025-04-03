// Types improved by ts-improve-types
/**
 * Flow Manager
 *
 * Manages API flows, including loading, saving, and executing flow steps.
 */

import { logger } from '../utils/logger';
import { VariableManager } from './variable-manager';
import { EndpointManager } from './endpoint-manager';
import { ConfigManager } from '../core/ConfigManager';

// Define a minimal NetworkRequest interface
interface NetworkRequest {
  method: string;
  url: string;
  parameters?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
}

export interface FlowStep {
  id: string;
  name: string;
  description?: string;
  method: string;
  endpoint: string;
  parameters?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
  responseHandler?: string;
  requiresAuth?: boolean;
  extracts?: Array<{
    name: string;
    path: string;
    description?: string;
    required?: boolean;
    defaultValue?: unknown;
  }>;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FlowManagerOptions {
  variableManager: VariableManager;
  endpointManager: EndpointManager;
  storageKey?: string;
  onFlowsChanged?: (flows: Flow[]) => void;
  onStepExecuted?: (step: FlowStep, response: unknown) => void;
  configManager?: ConfigManager;
}

export class FlowManager {
  private flows: Flow[] = [];
  private options: FlowManagerOptions;
  private storageKey: string;
  private configManager: ConfigManager | undefined;

  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: FlowManagerOptions) {
    this.options = options;
    this.storageKey = options.storageKey || 'api_flows';
    this.configManager = options.configManager;

    // Load flows from storage
    this.loadFlows();
  }

  /**
   * Initialize the manager
   */
  initialize(): void {
    logger.info('Flow Manager initialized');
  }

  /**
   * Load flows from local storage
   */
  loadFlows(): void {
    try {
      const storedFlows = localStorage.getItem(this.storageKey);
      if (storedFlows) {
        this.flows = JSON.parse(storedFlows);
        logger.info(`Loaded ${this.flows.length} flows from storage`);
      } else {
        logger.info('No stored flows found');
      }

      // Notify listeners
      if (this.options.onFlowsChanged) {
        this.options.onFlowsChanged(this.flows);
      }
    } catch (error) {
      logger.error('Error loading flows from storage:', error);
    }
  }

  /**
   * Save flows to local storage
   */
  saveFlows(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.flows));
      logger.info(`Saved ${this.flows.length} flows to storage`);

      // Notify listeners
      if (this.options.onFlowsChanged) {
        this.options.onFlowsChanged(this.flows);
      }
    } catch (error) {
      logger.error('Error saving flows to storage:', error);
    }
  }

  /**
   * Get all flows
   * @returns Array of flows
   */
  getFlows(): Flow[] {
    return this.flows;
  }

  /**
   * Get a flow by ID
   * @param id Flow ID
   * @returns Flow or undefined if not found
   */
  getFlow(id: string): Flow | undefined {
    return this.flows.find(flow => flow.id === id);
  }

  /**
   * Add a new flow
   * @param flow Flow to add
   */
  addFlow(flow: Flow): void {
    // Add timestamps if missing
    const now = new Date().toISOString();
    if (!flow.createdAt) flow.createdAt = now;
    if (!flow.updatedAt) flow.updatedAt = now;

    this.flows.push(flow);
    this.saveFlows();
    logger.info(`Added new flow: ${flow.name}`);
  }

  /**
   * Update an existing flow
   * @param id Flow ID
   * @param updates Flow updates
   * @returns Updated flow or null if not found
   */
  updateFlow(id: string, updates: Partial<Flow>): Flow | null {
    const index = this.flows.findIndex(flow => flow.id === id);
    if (index === -1) {
      logger.warn(`Flow not found for update: ${id}`);
      return null;
    }

    // Update the flow with new values
    this.flows[index] = {
      ...this.flows[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveFlows();
    logger.info(`Updated flow: ${this.flows[index].name}`);
    return this.flows[index];
  }

  /**
   * Delete a flow
   * @param id Flow ID
   * @returns True if deleted, false if not found
   */
  deleteFlow(id: string): boolean {
    const index = this.flows.findIndex(flow => flow.id === id);
    if (index === -1) {
      logger.warn(`Flow not found for deletion: ${id}`);
      return false;
    }

    this.flows.splice(index, 1);
    this.saveFlows();
    logger.info(`Deleted flow with ID: ${id}`);
    return true;
  }

  /**
   * Get a step from a flow
   * @param flowId Flow ID
   * @param stepId Step ID
   * @returns Step or undefined if not found
   */
  getStep(flowId: string, stepId: string): FlowStep | undefined {
    const flow = this.getFlow(flowId);
    if (!flow) return undefined;

    return flow.steps.find(step => step.id === stepId);
  }

  /**
   * Execute a flow step
   * @param flowId Flow ID
   * @param stepId Step ID
   * @param formData Form data for the step
   * @returns Promise resolving to the response
   */
  async executeStep(
    flowId: string,
    stepId: string,
    formData: Record<string, unknown> = {},
  ): Promise<unknown> {
    const step = this.getStep(flowId, stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    // @ts-ignore - Complex type issues
    const variableManager = this.options.variableManager;
    const endpointManager = this.options.endpointManager;

    // Get endpoints and find the matching one
    const endpoints = endpointManager.getEndpoints();
    // Find the matching endpoint by name or ID
    const endpoint = endpoints.find(e => e.id === step.endpoint || e.name === step.endpoint);

    // Use endpoint url or fallback to endpoint string if no match found
    const endpointUrl = endpoint
      ? typeof endpoint === 'string'
        ? endpoint
        : endpoint.toString()
      : step.endpoint;

    // Build request options
    const requestOptions: NetworkRequest = {
      method: step.method,
      url: endpointUrl,
      parameters: this.processParameters(step.parameters, formData, variableManager),
      headers: this.processHeaders(step.headers, formData, variableManager),
    };

    // Add body if method allows
    if (['POST', 'PUT', 'PATCH'].includes(step.method)) {
      requestOptions.body = this.processBody(step.body, formData, variableManager);
    }

    logger.info(`Executing step: ${step.name}`, requestOptions);

    try {
      // Execute the request - since endpointManager may not have an executeRequest method,
      // we'll implement a simple fetch here
      const response = await this.executeRequest(requestOptions);

      // Process extractions if defined
      if (step.extracts && Array.isArray(step.extracts)) {
        this.processExtractions(step.extracts, response, variableManager);
      }

      // Execute response handler if defined
      if (step.responseHandler) {
        this.executeResponseHandler(step.responseHandler, response);
      }

      // Notify listeners
      if (this.options.onStepExecuted) {
        this.options.onStepExecuted(step, response);
      }

      return response;
    } catch (error) {
      logger.error(`Error executing step: ${step.name}`, error);
      throw error;
    }
  }

  /**
   * Execute a network request
   * @param request Request options
   * @returns Promise with response
   */
  private async executeRequest(request: NetworkRequest): Promise<unknown> {
    const { method, url, parameters, headers, body } = request;
    let fetchUrl = url;
    const fetchOptions: RequestInit = {
      method,
      headers: headers
        ? Object.entries(headers).reduce(
            (acc, [key, value]) => {
              if (typeof value === 'string') acc[key] = value;
              return acc;
            },
            {} as Record<string, string>,
          )
        : {},
    };

    // Handle URL parameters for GET requests
    if (method === 'GET' && parameters && Object.keys(parameters).length > 0) {
      const urlObj = new URL(url);
      Object.entries(parameters).forEach(([key, value]) => {
        urlObj.searchParams.append(key, String(value));
      });
      fetchUrl = urlObj.toString();
    }

    // Handle body for non-GET requests
    if (method !== 'GET' && body !== undefined && body !== null) {
      if (typeof body === 'string') {
        fetchOptions.body = body;
        // Might need to set Content-Type if it wasn't set in headers
        if (
          !fetchOptions.headers ||
          !(fetchOptions.headers as Record<string, string>)['Content-Type']
        ) {
          if (!fetchOptions.headers) fetchOptions.headers = {};
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'text/plain';
        }
      } else if (
        body instanceof Blob ||
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        typeof (body as any).pipe === 'function'
      ) {
        // Directly assign if it's a known BodyInit type (Blob, FormData, etc.)
        fetchOptions.body = body as BodyInit;
        // Content-Type is typically set automatically by fetch for these types
      } else if (typeof body === 'object') {
        // Stringify other objects as JSON
        try {
          fetchOptions.body = JSON.stringify(body);
          if (!fetchOptions.headers) fetchOptions.headers = {};
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        } catch (e) {
          logger.error('Failed to stringify request body:', e);
          throw new Error('Invalid request body object');
        }
      } else {
        // Convert other primitives to string
        fetchOptions.body = String(body);
        if (
          !fetchOptions.headers ||
          !(fetchOptions.headers as Record<string, string>)['Content-Type']
        ) {
          if (!fetchOptions.headers) fetchOptions.headers = {};
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'text/plain';
        }
      }
    }

    // Execute the fetch request
    const response = await fetch(fetchUrl, fetchOptions);

    // Parse response
    let responseData: unknown;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { parseError: String(e) };
      }
    } else {
      try {
        responseData = await response.text();
      } catch (e) {
        responseData = { readError: String(e) };
      }
    }

    // Return structured response
    return responseData;
  }

  /**
   * Process parameters with variable substitution
   * @param parameters Step parameters
   * @param formData Form data
   * @param variableManager Variable manager
   * @returns Processed parameters
   */
  private processParameters(
    parameters: Record<string, unknown> = {},
    formData: Record<string, unknown> = {},
    variableManager: VariableManager,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Combine step parameters with form data
    const combined = { ...parameters, ...formData };

    // Process each parameter for variables
    for (const [key, value] of Object.entries(combined)) {
      if (typeof value === 'string') {
        result[key] = this.substituteVariables(value, variableManager);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Process headers with variable substitution
   * @param headers Step headers
   * @param formData Form data
   * @param variableManager Variable manager
   * @returns Processed headers
   */
  private processHeaders(
    headers: Record<string, unknown> = {},
    formData: Record<string, unknown> = {},
    variableManager: VariableManager,
  ): Record<string, unknown> {
    return this.processParameters(headers, formData, variableManager);
  }

  /**
   * Process body with variable substitution
   * @param body Step body
   * @param formData Form data
   * @param variableManager Variable manager
   * @returns Processed body
   */
  private processBody(
    body: unknown,
    formData: Record<string, unknown> = {},
    variableManager: VariableManager,
  ): unknown {
    if (!body && !formData.body) return {}; // Return empty object if both are null/undefined

    const bodyObj =
      typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const formDataBody =
      typeof formData.body === 'object' && formData.body !== null
        ? (formData.body as Record<string, unknown>)
        : {};

    if (typeof body === 'string') {
      // If body is a string, just substitute variables
      return this.substituteVariables(body, variableManager);
    } else if (typeof body === 'object' || typeof formData.body === 'object') {
      // If body or formData.body is an object, process parameters
      return this.processParameters(bodyObj, formDataBody, variableManager);
    }

    // Fallback for other types (or if body is not string/object)
    return body;
  }

  /**
   * Substitute variables in a string
   * @param text Text with variables
   * @param variableManager Variable manager
   * @returns Text with substituted variables
   */
  private substituteVariables(text: string, variableManager: VariableManager): string {
    // Simple variable replacement pattern: {{variableName}}
    return text.replace(/\{\{([\w.-]+)\}\}/g, (_, varName) => {
      const value = variableManager.getVariable(varName);
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * Process extractions from response
   * @param extracts Extraction definitions
   * @param response Response data
   * @param variableManager Variable manager
   */
  private processExtractions(
    extracts: Array<{ name: string; path: string; required?: boolean; defaultValue?: unknown }>,
    response: unknown,
    variableManager: VariableManager,
  ): void {
    extracts.forEach(extract => {
      let value: unknown; // Declare value outside try/catch
      try {
        const parts = extract.path.split('.');
        let current: unknown = response; // Start traversal

        for (const part of parts) {
          if (current === null || current === undefined) {
            current = undefined;
            break;
          }
          if (typeof current === 'object') {
            current = (current as Record<string, unknown>)[part] as unknown;
          } else {
            current = undefined;
            break;
          }
        }
        value = current; // Assign final value after loop

        // If value is undefined or null and required, use default or log error
        if ((value === undefined || value === null) && extract.required) {
          if ('defaultValue' in extract) {
            value = extract.defaultValue;
          } else {
            logger.warn(`Required extraction failed for ${extract.name}: ${extract.path}`);
            // Optionally continue to next extract if required value not found
            // continue;
          }
        }

        // Store the extracted value (even if it became undefined/null)
        variableManager.setVariable(extract.name, value);
        // Log the value directly, letting the console handle formatting
        if (value !== undefined) {
          // Remove 'as any' assertion - logger should handle unknown
          logger.debug(`Extracted variable: ${extract.name} =`, value);
        }
      } catch (error) {
        logger.error(`Error extracting ${extract.name}:`, error);
      }
    });
  }

  /**
   * Execute a response handler
   * @param handlerCode Code to execute
   * @param response Response data
   */
  private executeResponseHandler(handlerCod: string, response: unknown): void {
    try {
      // Create a function from the handler code
      const handler = new Function('response', handlerCod);
      handler(response);
    } catch (error) {
      logger.error('Error executing response handler:', error);
    }
  }
}
