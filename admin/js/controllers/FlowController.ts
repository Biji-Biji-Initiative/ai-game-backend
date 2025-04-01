/**
 * Flow Controller
 * Manages API flows and request sequences
 */

import { EndpointManager } from '../modules/endpoint-manager';
import { VariableManager } from '../modules/variable-manager';
import { HistoryManager } from '../modules/history-manager';
import { IUIManager } from '../components/UIManagerNew';
import { logger } from '../utils/logger';
import { evaluateCondition } from '../utils/condition-evaluator';

export interface FlowStep {
  id: string;
  name: string;
  description?: string;
  endpoint?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
  skipIf?: string;
  delay?: number;
  extractVariables?: Array<{
    name: string;
    path: string;
    description?: string;
  }>;
  skipCondition?: string;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface FlowControllerOptions {
  endpointManager: EndpointManager;
  uiManager: IUIManager;
  variableManager: VariableManager;
  historyManager: HistoryManager;
}

/**
 * FlowController class
 * Manages API flows and operations
 */
export class FlowController {
  private flows: Flow[] = [];
  private activeFlow: Flow | null = null;
  private activeStepIndex: number = -1;
  private isRunning: boolean = false;
  private endpointManager: EndpointManager;
  private uiManager: IUIManager;
  private variableManager: VariableManager;
  private historyManager: HistoryManager;
  
  /**
   * Constructor
   * @param options FlowController options
   */
  constructor(options: FlowControllerOptions) {
    this.endpointManager = options.endpointManager;
    this.uiManager = options.uiManager;
    this.variableManager = options.variableManager;
    this.historyManager = options.historyManager;
    
    this.loadFlows();
  }
  
  /**
   * Initialize the flow controller
   */
  initialize(): void {
    this.setupEventListeners();
    
    // Display flows in UI
    this.renderFlows();
  }
  
  /**
   * Load flows from storage
   */
  private loadFlows(): void {
    try {
      const savedFlows = localStorage.getItem('api_admin_flows');
      if (savedFlows) {
        this.flows = JSON.parse(savedFlows);
      } else {
        // Create default flow if none exist
        this.createDefaultFlow();
      }
    } catch (error) {
      console.error('Failed to load flows:', error);
      this.flows = [];
      this.createDefaultFlow();
    }
  }
  
  /**
   * Create a default flow
   */
  private createDefaultFlow(): void {
    const defaultFlow: Flow = {
      id: this.generateId(),
      name: 'Default Flow',
      description: 'A default flow with basic API operations',
      steps: [
        {
          id: this.generateId(),
          name: 'Get API Status',
          description: 'Check if the API is up and running',
          method: 'GET',
          url: '/api/v1/health'
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.flows.push(defaultFlow);
    this.saveFlows();
  }
  
  /**
   * Save flows to storage
   */
  private saveFlows(): void {
    try {
      localStorage.setItem('api_admin_flows', JSON.stringify(this.flows));
    } catch (error) {
      console.error('Failed to save flows:', error);
      this.uiManager.showError('Error', 'Failed to save flows. Local storage may be full.');
    }
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Add any necessary event listeners here
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Handle flow selection
      if (target.closest('.flow-item')) {
        const flowItem = target.closest('.flow-item') as HTMLElement;
        const flowId = flowItem.dataset.flowId;
        
        if (flowId) {
          this.selectFlow(flowId);
        }
      }
    });
  }
  
  /**
   * Select a flow
   * @param flowId Flow ID
   */
  selectFlow(flowId: string): void {
    const flow = this.flows.find(f => f.id === flowId);
    
    if (flow) {
      this.activeFlow = flow;
      this.activeStepIndex = -1;
      
      // Update UI
      this.renderActiveFlow();
    }
  }
  
  /**
   * Render flows in the UI
   */
  private renderFlows(): void {
    const flowMenu = document.getElementById('flow-menu');
    if (!flowMenu) return;
    
    flowMenu.innerHTML = '';
    
    this.flows.forEach(flow => {
      const flowItem = document.createElement('div');
      flowItem.className = `flow-item p-2 my-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${this.activeFlow?.id === flow.id ? 'bg-primary-100 dark:bg-primary-900' : ''}`;
      flowItem.dataset.flowId = flow.id;
      
      const flowName = document.createElement('div');
      flowName.className = 'font-medium';
      flowName.textContent = flow.name;
      
      const flowDesc = document.createElement('div');
      flowDesc.className = 'text-xs text-gray-500 dark:text-gray-400';
      flowDesc.textContent = flow.description || '';
      
      flowItem.appendChild(flowName);
      flowItem.appendChild(flowDesc);
      
      flowMenu.appendChild(flowItem);
    });
    
    // Add "New Flow" button
    const newFlowButton = document.createElement('button');
    newFlowButton.className = 'btn btn-sm btn-secondary w-full mt-2';
    newFlowButton.textContent = '+ New Flow';
    newFlowButton.addEventListener('click', () => this.createFlow());
    
    flowMenu.appendChild(newFlowButton);
  }
  
  /**
   * Render the active flow
   */
  private renderActiveFlow(): void {
    if (!this.activeFlow) return;
    
    const flowContainer = document.getElementById('flow-details');
    if (!flowContainer) return;
    
    // Clear flow container
    flowContainer.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold';
    title.textContent = this.activeFlow.name;
    
    const actions = document.createElement('div');
    actions.className = 'flex gap-2';
    
    const runButton = document.createElement('button');
    runButton.className = 'btn btn-sm btn-primary';
    runButton.textContent = 'Run Flow';
    runButton.addEventListener('click', () => this.runActiveFlow());
    
    const editButton = document.createElement('button');
    editButton.className = 'btn btn-sm btn-secondary';
    editButton.textContent = 'Edit Flow';
    editButton.addEventListener('click', () => this.editActiveFlow());
    
    actions.appendChild(runButton);
    actions.appendChild(editButton);
    
    header.appendChild(title);
    header.appendChild(actions);
    
    // Create description
    const description = document.createElement('p');
    description.className = 'text-gray-600 dark:text-gray-400 mb-4';
    description.textContent = this.activeFlow.description || 'No description provided';
    
    // Create steps container
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'mt-6';
    
    const stepsTitle = document.createElement('h3');
    stepsTitle.className = 'text-lg font-semibold mb-2';
    stepsTitle.textContent = 'Steps';
    
    stepsContainer.appendChild(stepsTitle);
    
    // Create steps list
    const stepsList = document.createElement('div');
    stepsList.className = 'space-y-3';
    
    if (this.activeFlow.steps.length === 0) {
      const emptySteps = document.createElement('div');
      emptySteps.className = 'text-gray-500 dark:text-gray-400 text-center p-4 border border-dashed rounded';
      emptySteps.textContent = 'No steps defined. Add a step to get started.';
      stepsList.appendChild(emptySteps);
    } else {
      // Render each step
      this.activeFlow.steps.forEach((step, index) => {
        const stepItem = document.createElement('div');
        stepItem.className = 'card';
        stepItem.dataset.stepId = step.id;
        
        const stepHeader = document.createElement('div');
        stepHeader.className = 'flex justify-between items-center';
        
        const stepTitle = document.createElement('div');
        stepTitle.className = 'font-medium';
        stepTitle.textContent = `${index + 1}. ${step.name}`;
        
        const stepActions = document.createElement('div');
        stepActions.className = 'flex gap-1';
        
        const editStepBtn = document.createElement('button');
        editStepBtn.className = 'text-xs px-2 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300';
        editStepBtn.textContent = 'Edit';
        editStepBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.editStep(step.id);
        });
        
        const deleteStepBtn = document.createElement('button');
        deleteStepBtn.className = 'text-xs px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300';
        deleteStepBtn.textContent = 'Delete';
        deleteStepBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteStep(step.id);
        });
        
        stepActions.appendChild(editStepBtn);
        stepActions.appendChild(deleteStepBtn);
        
        stepHeader.appendChild(stepTitle);
        stepHeader.appendChild(stepActions);
        
        // Step details
        const stepDetails = document.createElement('div');
        stepDetails.className = 'mt-2 text-sm';
        
        if (step.description) {
          const stepDesc = document.createElement('div');
          stepDesc.className = 'text-gray-600 dark:text-gray-400 mb-2';
          stepDesc.textContent = step.description;
          stepDetails.appendChild(stepDesc);
        }
        
        // Display method and URL
        const methodUrl = document.createElement('div');
        methodUrl.className = 'font-mono text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded';
        
        if (step.method && (step.url || step.endpoint)) {
          methodUrl.textContent = `${step.method} ${step.url || `[Endpoint: ${step.endpoint}]`}`;
        } else {
          methodUrl.textContent = 'No method or URL defined';
        }
        
        stepDetails.appendChild(methodUrl);
        
        // Add to step item
        stepItem.appendChild(stepHeader);
        stepItem.appendChild(stepDetails);
        stepsList.appendChild(stepItem);
      });
    }
    
    stepsContainer.appendChild(stepsList);
    
    // Add new step button
    const addStepBtn = document.createElement('button');
    addStepBtn.className = 'btn btn-sm btn-outline mt-4 w-full';
    addStepBtn.textContent = '+ Add Step';
    addStepBtn.addEventListener('click', () => this.showAddStepModal());
    
    stepsContainer.appendChild(addStepBtn);
    
    // Append all elements to container
    flowContainer.appendChild(header);
    flowContainer.appendChild(description);
    flowContainer.appendChild(stepsContainer);
  }
  
  /**
   * Show modal to add a new step
   */
  private showAddStepModal(): void {
    // Implementation will depend on UI system
    // For now, just create a basic step
    this.addStep({
      name: 'New Step',
      method: 'GET',
      url: '/api/v1/example'
    });
  }
  
  /**
   * Edit the active flow
   */
  private editActiveFlow(): void {
    if (!this.activeFlow) return;
    
    // Implementation depends on UI system
    console.debug('Edit flow:', this.activeFlow);
    
    // Basic prompt-based editing for now
    const newName = prompt('Flow name:', this.activeFlow.name);
    if (newName) {
      this.activeFlow.name = newName;
      
      const newDescription = prompt('Flow description:', this.activeFlow.description || '');
      this.activeFlow.description = newDescription || '';
      
      this.activeFlow.updatedAt = Date.now();
      this.saveFlows();
      this.renderFlows();
      this.renderActiveFlow();
    }
  }
  
  /**
   * Edit a step
   * @param stepId Step ID
   */
  private editStep(stepId: string): void {
    if (!this.activeFlow) return;
    
    const step = this.activeFlow.steps.find(s => s.id === stepId);
    if (!step) return;
    
    // Basic prompt-based editing for now
    const newName = prompt('Step name:', step.name);
    if (newName) {
      step.name = newName;
      
      const newDescription = prompt('Step description:', step.description || '');
      step.description = newDescription || '';
      
      const newMethod = prompt('HTTP Method (GET, POST, PUT, DELETE):', step.method || 'GET');
      step.method = newMethod || 'GET';
      
      const newUrl = prompt('URL or path:', step.url || '');
      step.url = newUrl || '';
      
      this.activeFlow.updatedAt = Date.now();
      this.saveFlows();
      this.renderActiveFlow();
    }
  }
  
  /**
   * Create a new flow
   */
  createFlow(): void {
    const newFlow: Flow = {
      id: this.generateId(),
      name: 'New Flow',
      description: 'A new API flow',
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.flows.push(newFlow);
    this.saveFlows();
    this.renderFlows();
  }
  
  /**
   * Delete a flow
   * @param flowId Flow ID
   */
  deleteFlow(flowId: string): void {
    const index = this.flows.findIndex(f => f.id === flowId);
    
    if (index !== -1) {
      this.flows.splice(index, 1);
      this.saveFlows();
      
      if (this.activeFlow?.id === flowId) {
        this.activeFlow = this.flows.length > 0 ? this.flows[0] : null;
        this.activeStepIndex = -1;
      }
      
      this.renderFlows();
    }
  }
  
  /**
   * Add a step to the active flow
   * @param step Flow step
   */
  addStep(step: Partial<FlowStep>): void {
    if (!this.activeFlow) return;
    
    const newStep: FlowStep = {
      id: this.generateId(),
      name: step.name || 'New Step',
      ...step
    };
    
    this.activeFlow.steps.push(newStep);
    this.activeFlow.updatedAt = Date.now();
    
    this.saveFlows();
    this.renderActiveFlow();
  }
  
  /**
   * Update a step in the active flow
   * @param stepId Step ID
   * @param updates Step updates
   */
  updateStep(stepId: string, updates: Partial<FlowStep>): void {
    if (!this.activeFlow) return;
    
    const stepIndex = this.activeFlow.steps.findIndex(s => s.id === stepId);
    
    if (stepIndex !== -1) {
      this.activeFlow.steps[stepIndex] = {
        ...this.activeFlow.steps[stepIndex],
        ...updates
      };
      
      this.activeFlow.updatedAt = Date.now();
      this.saveFlows();
      this.renderActiveFlow();
    }
  }
  
  /**
   * Delete a step from the active flow
   * @param stepId Step ID
   */
  deleteStep(stepId: string): void {
    if (!this.activeFlow) return;
    
    const stepIndex = this.activeFlow.steps.findIndex(s => s.id === stepId);
    
    if (stepIndex !== -1) {
      this.activeFlow.steps.splice(stepIndex, 1);
      this.activeFlow.updatedAt = Date.now();
      
      this.saveFlows();
      this.renderActiveFlow();
    }
  }
  
  /**
   * Run the active flow
   */
  async runActiveFlow(): Promise<void> {
    if (!this.activeFlow || this.isRunning) return;
    
    this.isRunning = true;
    this.activeStepIndex = -1;
    
    try {
      // Run each step in sequence
      for (let i = 0; i < this.activeFlow.steps.length; i++) {
        this.activeStepIndex = i;
        
        // Update UI to show current step
        this.renderActiveFlow();
        
        const step = this.activeFlow.steps[i];
        
        // Check if we should skip this step
        if (step.skipIf && this.evaluateSkipCondition(step.skipIf)) {
          console.debug(`Skipping step: ${step.name}`);
          continue;
        }
        
        // Execute step
        const result = await this.executeStep(step);
        
        // Process step result (extract variables, etc.)
        this.processStepResult(step, result);
        
        // Add delay if specified
        if (step.delay && step.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }
      }
      
      this.activeStepIndex = -1;
      this.uiManager.showSuccess('Success', 'Flow executed successfully');
    } catch (error) {
      console.error('Flow execution failed:', error);
      this.uiManager.showError('Error', `Flow execution failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isRunning = false;
      this.renderActiveFlow();
    }
  }
  
  /**
   * Execute a flow step
   * @param step Flow step
   * @returns Step result
   */
  private async executeStep(step: FlowStep): Promise<any> {
    logger.info('Executing step:', step.name);
    
    // Check skip condition
    if (step.skipCondition) {
      try {
        const variables = this.variableManager?.getVariables() || {};
        if (evaluateCondition(step.skipCondition, variables)) {
          console.debug(`Skipping step: ${step.name}`);
          this.updateStepStatus(step.id, 'skipped');
          return { skipped: true };
        }
      } catch (error) {
        console.error('Failed to evaluate skip condition:', error);
        // Continue execution if condition evaluation fails?
      }
    }
    
    // Get the API endpoint for this step
    let url = step.url || '';
    
    // Replace variables in the URL
    url = this.variableManager.replaceVariables(url);
    
    // Prepare headers with variable substitution
    const headers: Record<string, string> = {};
    if (step.headers) {
      Object.entries(step.headers).forEach(([key, value]) => {
        headers[key] = this.variableManager.replaceVariables(value);
      });
    }
    
    // Prepare params with variable substitution
    const params: Record<string, string> = {};
    if (step.params) {
      Object.entries(step.params).forEach(([key, value]) => {
        params[key] = this.variableManager.replaceVariables(value);
      });
    }
    
    // Prepare body with variable substitution
    let body = step.body;
    if (body && typeof body === 'object') {
      body = JSON.parse(this.variableManager.replaceVariables(JSON.stringify(body)));
    }
    
    // Create request object
    const request = {
      method: step.method || 'GET',
      url,
      headers,
      params,
      body
    };
    
    try {
      // Show loading indicator
      this.uiManager.showLoading();
      
      const startTime = Date.now();
      
      // Execute request
      const response = await fetch(url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Parse response
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      // Create response object
      const responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        duration: responseTime
      };
      
      // Add to history
      this.historyManager.addEntry(request, responseData);
      
      return responseData;
    } finally {
      // Hide loading indicator
      this.uiManager.hideLoading();
    }
  }
  
  /**
   * Process the result of a step execution
   * @param step Flow step
   * @param result Step result
   */
  private processStepResult(step: FlowStep, result: any): void {
    // Extract variables if specified
    if (step.extractVariables && Array.isArray(step.extractVariables)) {
      step.extractVariables.forEach(variable => {
        // Extract variable using JSONPath or similar
        // Here we're using a simple version that only supports dot notation
        const value = this.extractValueByPath(result.data, variable.path);
        
        if (value !== undefined) {
          this.variableManager.setVariable(variable.name, value);
        }
      });
    }
  }
  
  /**
   * Extract a value by dot path from an object
   * @param obj Object to extract from
   * @param path Dot notation path (e.g., 'data.user.id')
   * @returns Extracted value or undefined
   */
  private extractValueByPath(obj: any, path: string): any {
    try {
      return path.split('.').reduce((o, p) => o?.[p], obj);
    } catch (error) {
      console.error(`Failed to extract value by path: ${path}`, error);
      return undefined;
    }
  }
  
  /**
   * Evaluate a skip condition expression
   * @param expression Skip condition expression
   * @returns Whether to skip the step
   */
  private evaluateSkipCondition(expression: string): boolean {
    try {
      // Replace variables in the expression
      const processedExpression = this.variableManager.replaceVariables(expression);
      
      // Simple evaluation (warning: use proper validation in production)
      // This is just a basic example and isn't secure for real-world use
      return !!eval(processedExpression);
    } catch (error) {
      console.error('Failed to evaluate skip condition:', error);
      return false;
    }
  }
  
  /**
   * Generate a unique ID
   * @returns Unique ID
   */
  private generateId(): string {
    return 'f_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }
  
  /**
   * Initialize flows from endpoints
   * @param endpoints API endpoints
   */
  initFlowsFromEndpoints(endpoints: any[]): void {
    // Create flows from endpoints
    const generatedFlows: Flow[] = [];
    
    // Group endpoints by category/tag
    const groupedEndpoints: Record<string, any[]> = {};
    
    endpoints.forEach(endpoint => {
      const category = endpoint.category || endpoint.tag || 'General';
      
      if (!groupedEndpoints[category]) {
        groupedEndpoints[category] = [];
      }
      
      groupedEndpoints[category].push(endpoint);
    });
    
    // Create a flow for each category
    Object.entries(groupedEndpoints).forEach(([category, categoryEndpoints]) => {
      const flow: Flow = {
        id: this.generateId(),
        name: category,
        description: `Generated flow for ${category} endpoints`,
        steps: categoryEndpoints.map(endpoint => ({
          id: this.generateId(),
          name: endpoint.name || endpoint.path,
          description: endpoint.description || '',
          method: endpoint.method || 'GET',
          url: endpoint.path,
          endpoint: endpoint.id
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['generated']
      };
      
      generatedFlows.push(flow);
    });
    
    // Add generated flows
    this.flows = [...this.flows, ...generatedFlows];
    
    // Set first flow as active if none is selected
    if (!this.activeFlow && this.flows.length > 0) {
      this.activeFlow = this.flows[0];
    }
    
    this.saveFlows();
    this.renderFlows();
  }
} 