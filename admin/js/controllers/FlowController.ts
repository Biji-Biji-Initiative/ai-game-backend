/**
 * Flow Controller
 * Manages API flows and request sequences
 */

import { EndpointManager } from '../modules/endpoint-manager';
import { VariableManager } from '../modules/variable-manager';
import { HistoryManager } from '../modules/history-manager';
import { UIManager } from '../components/UIManagerNew';
import { Logger, ComponentLogger } from '../core/Logger';
import { evaluateCondition, ConditionEvaluationOptions } from '../utils/condition-evaluator';
import { APIClient } from '../api/api-client';
import { AppController } from './AppController';
import { StorageService } from '../services/StorageService';
import { DomService } from '../services/DomService';
import { DependencyContainer } from '../core/DependencyContainer';
import {
  Flow,
  FlowStep,
  StepType,
  RequestStep,
  DelayStep,
  ConditionStep,
  LogStep,
} from '../types/flow-types';
import { FlowControllerOptions, RequestInfo } from '../types/app-types';
import { ConfigManager } from '../core/ConfigManager';
import { EventEmitter } from '../utils/event-emitter';
import { FlowUIService, StepStatus } from '../services/FlowUIService';

/**
 * Flow Controller class
 * Manages flows and executing their steps
 */
export class FlowController extends EventEmitter {
  private flows: Map<string, Flow> = new Map();
  private activeFlow: Flow | null = null;
  private stepStatuses: Map<string, StepStatus> = new Map();
  private isExecuting = false;
  private logger: ComponentLogger;
  private apiClient: APIClient;
  private endpointManager: EndpointManager;
  private variableManager: VariableManager;
  private historyManager: HistoryManager;
  private uiManager: UIManager;
  private appController: AppController;
  private storageService: StorageService;
  private domService: DomService;
  private configManager: ConfigManager;
  private flowUIService: FlowUIService;
  private flowStorageKey: string = 'api_flows';

  /**
   * Creates a Flow Controller
   * @param options Flow controller options
   */
  constructor(options: FlowControllerOptions) {
    super();
    
    // Initialize properties
    this.apiClient = options.apiClient;
    this.endpointManager = options.endpointManager;
    this.variableManager = options.variableManager;
    this.historyManager = options.historyManager;
    this.uiManager = options.uiManager;
    this.appController = options.appController;
    
    // Get dependency container
    const container = DependencyContainer.getInstance();
    
    // Get additional services from container
    this.storageService = container.get('storageService');
    this.domService = container.get('domService');
    this.configManager = container.get('configManager');
    
    // Initialize logger
    this.logger = Logger.getLogger('FlowController');
    
    // Initialize UI service
    this.flowUIService = new FlowUIService({
      domService: this.domService,
      flowDetailsContainerId: 'flow-details',
      flowMenuContainerId: 'flow-menu'
    });
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load flows
    this.loadFlows();
    
    // Render flows
    this.renderFlows();
  }
  
  /**
   * Set up event listeners for UI interactions
   */
  private setupEventListeners(): void {
    // Listen for flow events from FlowUIService
    this.flowUIService.on('flow:select', (data: { flowId: string }) => {
      this.setActiveFlow(data.flowId);
    });
    
    this.flowUIService.on('flow:create', () => {
      this.createFlow();
    });
    
    this.flowUIService.on('flow:delete', (data: { flowId: string }) => {
      this.deleteFlow(data.flowId);
    });
    
    this.flowUIService.on('flow:run', (data: { flowId: string }) => {
      this.executeFlow(data.flowId);
    });
    
    this.flowUIService.on('flow:edit', (data: { flowId: string }) => {
      const flow = this.flows.get(data.flowId);
      if (flow) {
        this.showFlowEditor(flow);
      }
    });
    
    this.flowUIService.on('step:add', (data: { flowId: string }) => {
      const flow = this.flows.get(data.flowId);
      if (flow) {
        this.showStepEditor();
      }
    });
    
    this.flowUIService.on('step:edit', (data: { stepId: string }) => {
      if (this.activeFlow) {
        const step = this.activeFlow.steps.find(s => s.id === data.stepId);
        if (step) {
          this.showStepEditor(step);
        }
      }
    });
    
    this.flowUIService.on('step:delete', (data: { stepId: string }) => {
      if (this.activeFlow) {
        this.deleteStep(data.stepId);
      }
    });
  }
  
  /**
   * Load flows from storage
   */
  private loadFlows(): void {
    try {
      const savedFlows = this.storageService.get<Flow[]>(this.flowStorageKey, []);
      if (Array.isArray(savedFlows)) {
        this.flows = new Map(savedFlows.map(flow => [flow.id, flow]));
        this.logger.debug(`Loaded ${this.flows.size} flows from storage`);
      } else {
        this.logger.warn('Invalid flows data in storage, initializing empty flows');
        this.flows = new Map();
      }
    } catch (error) {
      this.logger.error('Failed to load flows from storage', error);
      this.flows = new Map();
    }
  }
  
  /**
   * Save flows to storage
   */
  private saveFlows(): void {
    try {
      const flowsArray = Array.from(this.flows.values());
      this.storageService.set(this.flowStorageKey, flowsArray);
    } catch (error) {
      this.logger.error('Failed to save flows to storage', error);
    }
  }
  
  /**
   * Render the flows in the UI
   */
  private renderFlows(): void {
    this.flowUIService.renderFlows(this.flows, this.activeFlow?.id);
    
    if (this.activeFlow) {
      this.renderActiveFlow();
    }
  }
  
  /**
   * Render the active flow
   */
  private renderActiveFlow(): void {
    if (this.activeFlow) {
      this.flowUIService.renderActiveFlow(this.activeFlow, this.stepStatuses, this.isExecuting);
    }
  }
  
  /**
   * Set the active flow
   * @param flowId The flow ID to set as active
   */
  public setActiveFlow(flowId: string): void {
    const flow = this.flows.get(flowId);
    if (flow) {
      this.activeFlow = flow;
      this.clearAllStepStatuses();
      this.renderFlows();
      this.emit('flow:active', { flowId });
    } else {
      this.logger.warn(`Flow with ID ${flowId} not found`);
    }
  }
  
  /**
   * Clear all step statuses
   */
  private clearAllStepStatuses(): void {
    this.stepStatuses.clear();
  }
  
  /**
   * Update a step's status
   * @param stepId Step ID
   * @param status Status to set
   */
  private updateStepStatus(stepId: string, status: StepStatus): void {
    this.stepStatuses.set(stepId, status);
    this.renderActiveFlow();
  }
  
  /**
   * Get a step's status
   * @param stepId Step ID
   * @returns The step status or undefined
   */
  private getStepStatus(stepId: string): StepStatus | undefined {
    return this.stepStatuses.get(stepId);
  }
  
  /**
   * Show the flow editor
   * @param flow Flow to edit or undefined for a new flow
   */
  private showFlowEditor(flow?: Flow): void {
    // Using our UI abstraction
    this.flowUIService.showFlowEditor(flow, (updatedFlow: Flow) => {
      if (flow) {
        // Updating existing flow
        this.flows.set(updatedFlow.id, updatedFlow);
        
        if (this.activeFlow && this.activeFlow.id === updatedFlow.id) {
          this.activeFlow = updatedFlow;
        }
      } else {
        // Adding new flow
        this.flows.set(updatedFlow.id, updatedFlow);
        this.activeFlow = updatedFlow;
      }
      
      this.saveFlows();
      this.renderFlows();
    });
  }
  
  /**
   * Show the step editor
   * @param step Step to edit or undefined for a new step
   */
  private showStepEditor(step?: FlowStep): void {
    // Using our UI abstraction
    this.flowUIService.showStepEditor(step, (updatedStep: FlowStep) => {
      if (!this.activeFlow) {
        this.logger.warn('Cannot update step, no active flow');
        return;
      }
      
      if (step) {
        // Update existing step
        const stepIndex = this.activeFlow.steps.findIndex(s => s.id === step.id);
        if (stepIndex >= 0) {
          this.activeFlow.steps[stepIndex] = updatedStep;
        }
      } else {
        // Add new step
        this.activeFlow.steps.push(updatedStep);
      }
      
      this.activeFlow.updatedAt = Date.now();
      this.saveFlows();
      this.renderActiveFlow();
    });
  }
  
  /**
   * Delete a step from the active flow
   * @param stepId Step ID to delete
   */
  private deleteStep(stepId: string): void {
    if (!this.activeFlow) {
      this.logger.warn('Cannot delete step, no active flow');
      return;
    }
    
    const stepIndex = this.activeFlow.steps.findIndex(step => step.id === stepId);
    if (stepIndex >= 0) {
      this.activeFlow.steps.splice(stepIndex, 1);
      this.activeFlow.updatedAt = Date.now();
      this.saveFlows();
      this.renderActiveFlow();
    }
  }
  
  /**
   * Create a new flow
   */
  private createFlow(): void {
    this.showFlowEditor();
  }
  
  /**
   * Delete a flow
   * @param flowId Flow ID to delete
   */
  private deleteFlow(flowId: string): void {
    if (this.flows.has(flowId)) {
      this.flows.delete(flowId);
      
      if (this.activeFlow && this.activeFlow.id === flowId) {
        this.activeFlow = null;
      }
      
      this.saveFlows();
      this.renderFlows();
    }
  }
  
  /**
   * Generate a unique ID
   * @returns Unique ID string
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Get the status color for a status
   * @param status Step status
   * @returns Color class name
   */
  private getStatusColor(status: StepStatus): string {
    switch (status) {
      case 'running': return 'info';
      case 'success': return 'success';
      case 'error': return 'error';
      case 'skipped': return 'warning';
      case 'pending':
      default: return 'ghost';
    }
  }
  
  /**
   * Execute a flow
   * @param flowId Flow ID to execute
   */
  public async executeFlow(flowId: string): Promise<void> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      this.logger.error(`Flow with ID ${flowId} not found`);
      return;
    }
    
    if (this.isExecuting) {
      this.logger.warn('Already executing a flow, cannot start another');
      return;
    }
    
    this.activeFlow = flow;
    this.isExecuting = true;
    this.clearAllStepStatuses();
    this.renderFlows();
    
    try {
      this.emit('flow:started', { flowId });
      
      for (const step of flow.steps) {
        // Check if the step should be skipped
        if (step.skipCondition && this.evaluateStepCondition(step.skipCondition)) {
          this.updateStepStatus(step.id, 'skipped');
          continue;
        }
        
        this.updateStepStatus(step.id, 'running');
        
        try {
          await this.executeStep(step);
          this.updateStepStatus(step.id, 'success');
        } catch (error) {
          this.updateStepStatus(step.id, 'error');
          this.logger.error(`Failed to execute step ${step.id}:`, error);
          break; // Stop execution on error
        }
      }
      
      this.emit('flow:completed', {
        flowId,
        success: true,
      });
    } catch (error) {
      this.emit('flow:completed', {
        flowId,
        success: false,
        error,
      });
      this.logger.error(`Failed to execute flow ${flowId}:`, error);
    } finally {
      this.isExecuting = false;
      this.renderFlows();
    }
  }
  
  /**
   * Execute a single step
   * @param step Step to execute
   * @returns Result of the step execution
   */
  private async executeStep(step: FlowStep): Promise<unknown> {
    let result: unknown;
    
    try {
      switch (step.type) {
        case StepType.REQUEST:
          result = await this.executeRequestStep(step);
          break;
        case StepType.DELAY:
          result = await this.executeDelayStep(step);
          break;
        case StepType.CONDITION:
          result = await this.executeConditionStep(step);
          break;
        case StepType.LOG:
          result = await this.executeLogStep(step);
          break;
      }
      
      return result;
    } catch (error) {
      this.updateStepStatus(step.id, 'error');
      throw error;
    }
  }
  
  /**
   * Execute a request step
   * @param step Request step to execute
   * @returns Response data
   */
  private async executeRequestStep(step: RequestStep): Promise<unknown> {
    try {
      // Prepare the request
      let request: RequestInfo;
      
      if (step.endpointId) {
        // Get endpoint by ID
        const endpoint = this.endpointManager.getEndpointById(step.endpointId);
        if (!endpoint) {
          throw new Error(`Endpoint with ID ${step.endpointId} not found`);
        }
        
        // Create request from endpoint
        request = {
          method: step.method || endpoint.method,
          url: endpoint.path || endpoint.url || '', // Endpoint might use path instead of url
          headers: { ...(endpoint.headers || {}), ...(step.headers || {}) },
          requestBody: step.body, // Just use step body, don't reference endpoint.body
        };
      } else {
        // Create request from direct properties
        request = {
          method: step.method || 'GET',
          url: step.url || '',
          headers: step.headers || {},
          requestBody: step.body,
        };
      }
      
      // Process variables in the request
      request = this.variableManager.processRequest(request) as RequestInfo;
      
      // Execute the request
      const response = await this.apiClient.makeRequest(
        request.method,
        request.url,
        request.requestBody,
        {
          headers: request.headers,
        }
      );
      
      // Extract variables if specified
      if (step.extractVariables && step.extractVariables.length > 0) {
        this.variableManager.extractVariablesFromResponse(response, step.extractVariables);
      }
      
      return response;
    } catch (error) {
      this.logger.error(`Error executing request step ${step.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a delay step
   * @param step Delay step to execute
   * @returns A promise that resolves after the delay
   */
  private executeDelayStep(step: DelayStep): Promise<void> {
    const delay = step.delay || 1000; // Default 1 second
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Execute a condition step
   * @param step Condition step to execute
   * @returns The result of the condition
   */
  private executeConditionStep(step: ConditionStep): boolean {
    if (!step.condition) {
      return true; // No condition means success
    }
    
    return this.evaluateStepCondition(step.condition);
  }
  
  /**
   * Execute a log step
   * @param step Log step to execute
   * @returns The log message
   */
  private executeLogStep(step: LogStep): string {
    const message = this.variableManager.processVariables(step.message || '') as string;
    const level = step.level || 'info';
    
    switch (level) {
      case 'debug':
        this.logger.debug(message);
        break;
      case 'info':
        this.logger.info(message);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
      case 'error':
        this.logger.error(message);
        break;
    }
    
    return message;
  }
  
  /**
   * Evaluates a condition string within the context of current variables.
   * @param condition The condition expression (e.g., "$status === 200", "$user.id != null")
   * @returns Boolean result of the evaluation.
   */
  private evaluateStepCondition(condition: string): boolean {
    if (!condition) {
      return true; // No condition means proceed
    }
    
    // Process variables within the condition string itself first!
    const processedCondition = this.variableManager.processVariables(condition);
    
    try {
      // Get current variable context
      const context = this.variableManager.getVariables();
      
      // Make sure the condition is a string and context is a record
      const safeCondition = String(processedCondition);
      const safeContext = context as Record<string, unknown>;
      
      // Create options for the evaluator
      const options: ConditionEvaluationOptions = {
        variables: safeContext,
        debug: false
      };
      
      // Evaluate the condition using the helper
      return evaluateCondition(safeCondition, options);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error evaluating condition: "${processedCondition}"`, errorMsg);
      return false; // Default to false on error
    }
  }
}
