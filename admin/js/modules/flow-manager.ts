/**
 * Flow Manager
 * 
 * Manages API flows, including loading, saving, and executing flow steps.
 */

import { logger } from '../utils/logger';
import { VariableManager } from './variable-manager';
import { EndpointManager } from './endpoint-manager';

// Define a minimal NetworkRequest interface 
interface NetworkRequest {
  method: string;
  url: string;
  parameters?: Record<string, any>;
  headers?: Record<string, any>;
  body?: any;
}

export interface FlowStep {
  id: string;
  name: string;
  description?: string;
  method: string;
  endpoint: string;
  parameters?: Record<string, any>;
  headers?: Record<string, any>;
  body?: any;
  responseHandler?: string;
  requiresAuth?: boolean;
  extracts?: Array<{
    name: string;
    path: string;
    description?: string;
    required?: boolean;
    defaultValue?: any;
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
  onStepExecuted?: (step: FlowStep, response: any) => void;
}

export class FlowManager {
  private flows: Flow[] = [];
  private options: FlowManagerOptions;
  private storageKey: string;
  
  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: FlowManagerOptions) {
    this.options = options;
    this.storageKey = options.storageKey || 'api_flows';
    
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
  async executeStep(flowId: string, stepId: string, formData: Record<string, any> = {}): Promise<any> {
    const step = this.getStep(flowId, stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }
    
    const variableManager = this.options.variableManager;
    const endpointManager = this.options.endpointManager;
    
    // Get endpoints and find the matching one
    const endpoints = endpointManager.getEndpoints();
    // Find the matching endpoint by name or ID
    const endpoint = endpoints.find(e => e.id === step.endpoint || e.name === step.endpoint);
    
    // Use endpoint url or fallback to endpoint string if no match found
    const endpointUrl = endpoint ? 
      (typeof endpoint === 'string' ? endpoint : endpoint.toString()) : 
      step.endpoint;
    
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
  private async executeRequest(request: NetworkRequest): Promise<any> {
    const { method, url, parameters, headers, body } = request;
    let fetchUrl = url;
    let fetchOptions: RequestInit = {
      method,
      headers: headers || {},
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
    if (method !== 'GET' && body) {
      if (typeof body === 'object') {
        fetchOptions.body = JSON.stringify(body);
        if (!fetchOptions.headers) fetchOptions.headers = {};
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
      } else {
        fetchOptions.body = body;
      }
    }
    
    // Execute the fetch request
    const response = await fetch(fetchUrl, fetchOptions);
    
    // Parse response
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    // Return structured response
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url,
    };
  }
  
  /**
   * Process parameters with variable substitution
   * @param parameters Step parameters
   * @param formData Form data
   * @param variableManager Variable manager
   * @returns Processed parameters
   */
  private processParameters(
    parameters: Record<string, any> = {}, 
    formData: Record<string, any> = {}, 
    variableManager: VariableManager
  ): Record<string, any> {
    const result: Record<string, any> = {};
    
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
    headers: Record<string, any> = {}, 
    formData: Record<string, any> = {}, 
    variableManager: VariableManager
  ): Record<string, any> {
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
    body: any, 
    formData: Record<string, any> = {}, 
    variableManager: VariableManager
  ): any {
    if (!body) return formData.body || {};
    
    if (typeof body === 'string') {
      return this.substituteVariables(body, variableManager);
    }
    
    if (typeof body === 'object') {
      return this.processParameters(body, formData.body || {}, variableManager);
    }
    
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
    extracts: Array<{name: string, path: string, required?: boolean, defaultValue?: any}>, 
    response: any, 
    variableManager: VariableManager
  ): void {
    extracts.forEach(extract => {
      try {
        // Extract value from response using path
        const parts = extract.path.split('.');
        let value = response;
        
        for (const part of parts) {
          if (value === undefined || value === null) break;
          value = value[part];
        }
        
        // If value is undefined or null and required, use default or log error
        if ((value === undefined || value === null) && extract.required) {
          if ('defaultValue' in extract) {
            value = extract.defaultValue;
          } else {
            logger.warn(`Required extraction failed for ${extract.name}: ${extract.path}`);
          }
        }
        
        // Store the extracted value
        if (value !== undefined) {
          variableManager.setVariable(extract.name, value);
          logger.debug(`Extracted variable: ${extract.name} = ${JSON.stringify(value)}`);
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
  private executeResponseHandler(handlerCode: string, response: any): void {
    try {
      // Create a function from the handler code
      const handler = new Function('response', handlerCode);
      handler(response);
    } catch (error) {
      logger.error('Error executing response handler:', error);
    }
  }
} 