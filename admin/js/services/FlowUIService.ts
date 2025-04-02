// Types improved by ts-improve-types
/**
 * Flow UI Service
 * Handles UI rendering for flows and steps
 */

import { DomService, BrowserDomService } from './DomService';
import { Logger, ComponentLogger } from '../core/Logger';
import { Flow, FlowStep, StepType, RequestStep, DelayStep, ConditionStep, LogStep } from '../types/flow-types';
import { EventEmitter } from '../utils/event-emitter';

/**
 * Step status types
 */
export type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

/**
 * Flow UI Service options
 */
export interface FlowUIServiceOptions {
  domService?: DomService;
  flowDetailsContainerId?: string;
  flowMenuContainerId?: string;
}

/**
 * Flow UI Service
 * Responsible for rendering flows and steps in the UI
 */
export class FlowUIService extends EventEmitter {
  private domService: DomService;
  private logger: ComponentLogger;
  private flowDetailsContainer: HTMLElement | null = null;
  private flowMenuContainer: HTMLElement | null = null;
  private options: FlowUIServiceOptions;

  /**
   * Creates a new FlowUIService
   * @param options Service options
   */
  constructor(options: FlowUIServiceOptions = {}) {
    super();
    this.options = {
      flowDetailsContainerId: 'flow-details',
      flowMenuContainerId: 'flow-menu',
      ...options
    };

    this.domService = options.domService || new BrowserDomService();
    this.logger = Logger.getLogger('FlowUIService');
    
    this.initialize();
  }

  /**
   * Initialize the service
   */
  private initialize(): void {
    this.logger.debug('Initializing FlowUIService');
    this.flowDetailsContainer = this.domService.getElementById(this.options.flowDetailsContainerId || 'flow-details');
    this.flowMenuContainer = this.domService.getElementById(this.options.flowMenuContainerId || 'flow-menu');
    
    if (!this.flowDetailsContainer) {
      this.logger.warn(`Flow details container not found: ${this.options.flowDetailsContainerId}`);
    }
    
    if (!this.flowMenuContainer) {
      this.logger.warn(`Flow menu container not found: ${this.options.flowMenuContainerId}`);
    }
    
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners for UI interactions
   */
  private setupEventListeners(): void {
    this.domService.querySelector('body')?.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      
      // Handle flow selection clicks
      const flowItem = target.closest('.flow-item');
      if (flowItem && flowItem instanceof HTMLElement) {
        const flowId = flowItem.dataset.flowId;
        if (flowId) {
          this.emit('flow:select', { flowId });
        }
      }
      
      // Handle edit flow button clicks
      if (target.closest('.edit-flow-btn')) {
        const flowItem = target.closest('[data-flow-id]');
        const flowId = flowItem?.getAttribute('data-flow-id');
        if (flowId) {
          this.emit('flow:edit', { flowId });
        }
      }
      
      // Handle delete flow button clicks
      if (target.closest('.delete-flow-btn')) {
        const flowItem = target.closest('[data-flow-id]');
        const flowId = flowItem?.getAttribute('data-flow-id');
        if (flowId) {
          if (confirm('Are you sure you want to delete this flow?')) {
            this.emit('flow:delete', { flowId });
          }
        }
      }
      
      // Handle run flow button clicks
      if (target.closest('.run-flow-btn')) {
        const flowItem = target.closest('[data-flow-id]');
        const flowId = flowItem?.getAttribute('data-flow-id');
        if (flowId) {
          this.emit('flow:run', { flowId });
        }
      }
      
      // Handle add step button clicks
      if (target.closest('.add-step-btn')) {
        const flowItem = target.closest('[data-flow-id]');
        const flowId = flowItem?.getAttribute('data-flow-id');
        if (flowId) {
          this.emit('step:add', { flowId });
        }
      }
      
      // Handle edit step button clicks
      if (target.closest('.edit-step-btn')) {
        const stepItem = target.closest('[data-step-id]');
        const stepId = stepItem?.getAttribute('data-step-id');
        if (stepId) {
          this.emit('step:edit', { stepId });
          e.stopPropagation();
        }
      }
      
      // Handle delete step button clicks
      if (target.closest('.delete-step-btn')) {
        const stepItem = target.closest('[data-step-id]');
        const stepId = stepItem?.getAttribute('data-step-id');
        if (stepId) {
          if (confirm('Are you sure you want to delete this step?')) {
            this.emit('step:delete', { stepId });
          }
          e.stopPropagation();
        }
      }
    });
  }

  /**
   * Render the list of flows
   * @param flows Map of flows to render
   * @param activeFlowId Currently active flow ID
   */
  public renderFlows(flows: Map<string, Flow>, activeFlowId?: string): void {
    if (!this.flowMenuContainer) return;
    
    this.logger.debug('Rendering flow list');
    this.domService.removeAllChildren(this.flowMenuContainer);
    
    flows.forEach(flow => {
      const flowItem = this.domService.createElementWithContent('div', {
        class: `flow-item p-2 my-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${activeFlowId === flow.id ? 'bg-primary-100 dark:bg-primary-900' : ''}`,
        'data-flow-id': flow.id,
      });
      
      const flowName = this.domService.createElementWithContent('div', {
        class: 'font-medium',
      }, flow.name);
      
      const flowDesc = this.domService.createElementWithContent('div', {
        class: 'text-xs text-gray-500 dark:text-gray-400',
      }, flow.description || '');
      
      this.domService.appendChild(flowItem, flowName);
      this.domService.appendChild(flowItem, flowDesc);
      this.domService.appendChild(this.flowMenuContainer, flowItem);
    });
    
    // Add "New Flow" button
    const newFlowButton = this.domService.createElementWithContent('button', {
      class: 'btn btn-sm btn-secondary w-full mt-2',
    }, '+ New Flow');
    
    newFlowButton.addEventListener('click', () => {
      this.emit('flow:create', {});
    });
    
    this.domService.appendChild(this.flowMenuContainer, newFlowButton);
  }

  /**
   * Render an active flow
   * @param flow Flow to render
   * @param stepStatuses Map of step statuses
   * @param isRunning Whether the flow is currently running
   */
  public renderActiveFlow(flow: Flow | null, stepStatuses: Map<string, StepStatus>, isRunning: boolean): void {
    if (!this.flowDetailsContainer) return;
    
    // Clear flow container
    this.domService.removeAllChildren(this.flowDetailsContainer);
    
    if (!flow) {
      const emptyState = this.domService.createElementWithContent('div', {
        class: 'text-center p-8 text-gray-500 dark:text-gray-400',
      }, 'Select a flow from the list or create a new one.');
      
      this.domService.appendChild(this.flowDetailsContainer, emptyState);
      return;
    }
    
    this.logger.debug(`Rendering active flow: ${flow.id}`);
    
    // Create header
    const header = this.domService.createElement('div');
    this.domService.setAttributes(header, { class: 'flex justify-between items-center mb-4' });
    
    const title = this.domService.createElementWithContent('h2', {
      class: 'text-xl font-bold',
    }, flow.name);
    
    const actions = this.domService.createElement('div');
    this.domService.setAttributes(actions, { class: 'flex gap-2' });
    
    const runButton = this.domService.createElementWithContent('button', {
      class: `btn btn-sm btn-primary run-flow-btn ${isRunning ? 'loading' : ''}`,
      disabled: isRunning ? 'disabled' : undefined,
      'data-flow-id': flow.id,
    }, isRunning ? 'Running...' : 'Run Flow');
    
    const editButton = this.domService.createElementWithContent('button', {
      class: 'btn btn-sm btn-secondary edit-flow-btn',
      'data-flow-id': flow.id,
    }, 'Edit Flow');
    
    const deleteButton = this.domService.createElementWithContent('button', {
      class: 'btn btn-sm btn-danger delete-flow-btn',
      'data-flow-id': flow.id,
    }, 'Delete Flow');
    
    this.domService.appendChild(actions, runButton);
    this.domService.appendChild(actions, editButton);
    this.domService.appendChild(actions, deleteButton);
    
    this.domService.appendChild(header, title);
    this.domService.appendChild(header, actions);
    
    // Create description
    const description = this.domService.createElementWithContent('p', {
      class: 'text-gray-600 dark:text-gray-400 mb-4',
    }, flow.description || 'No description provided');
    
    // Create steps container
    const stepsContainer = this.domService.createElement('div');
    this.domService.setAttributes(stepsContainer, { class: 'mt-6' });
    
    const stepsTitle = this.domService.createElementWithContent('h3', {
      class: 'text-lg font-semibold mb-2',
    }, 'Steps');
    
    this.domService.appendChild(stepsContainer, stepsTitle);
    
    // Create steps list
    const stepsList = this.domService.createElement('div');
    this.domService.setAttributes(stepsList, { class: 'space-y-3' });
    
    if (flow.steps.length === 0) {
      const emptySteps = this.domService.createElementWithContent('div', {
        class: 'text-gray-500 dark:text-gray-400 text-center p-4 border border-dashed rounded',
      }, 'No steps defined. Add a step to get started.');
      
      this.domService.appendChild(stepsList, emptySteps);
    } else {
      // Render each step
      flow.steps.forEach((step: FlowStep, index: number) => {
        const stepItem = this.createStepElement(step, index, stepStatuses.get(step.id));
        this.domService.appendChild(stepsList, stepItem);
      });
    }
    
    this.domService.appendChild(stepsContainer, stepsList);
    
    // Add new step button
    const addStepBtn = this.domService.createElementWithContent('button', {
      class: 'btn btn-sm btn-outline mt-4 w-full add-step-btn',
      'data-flow-id': flow.id,
    }, '+ Add Step');
    
    this.domService.appendChild(stepsContainer, addStepBtn);
    
    // Append all elements to container
    this.domService.appendChild(this.flowDetailsContainer, header);
    this.domService.appendChild(this.flowDetailsContainer, description);
    this.domService.appendChild(this.flowDetailsContainer, stepsContainer);
  }

  /**
   * Create a DOM element for a step
   * @param step Step data
   * @param index Step index
   * @param status Step status
   * @returns Step DOM element
   */
  private createStepElement(step: FlowStep, index: number, status?: StepStatus): HTMLElement {
    const stepItem = this.domService.createElement('div');
    this.domService.setAttributes(stepItem, {
      class: 'card',
      'data-step-id': step.id,
      'data-step-type': step.type,
    });
    
    const stepHeader = this.domService.createElement('div');
    this.domService.setAttributes(stepHeader, { class: 'flex justify-between items-center' });
    
    const stepTitle = this.domService.createElementWithContent('div', {
      class: 'font-medium',
    }, `${index + 1}. ${step.name}`);
    
    const stepActions = this.domService.createElement('div');
    this.domService.setAttributes(stepActions, { class: 'flex gap-1' });
    
    const editStepBtn = this.domService.createElementWithContent('button', {
      class: 'text-xs px-2 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 edit-step-btn',
    }, 'Edit');
    
    const deleteStepBtn = this.domService.createElementWithContent('button', {
      class: 'text-xs px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 delete-step-btn',
    }, 'Delete');
    
    this.domService.appendChild(stepActions, editStepBtn);
    this.domService.appendChild(stepActions, deleteStepBtn);
    
    this.domService.appendChild(stepHeader, stepTitle);
    this.domService.appendChild(stepHeader, stepActions);
    
    // Add status indicator if available
    if (status) {
      const statusBadge = this.domService.createElementWithContent('span', {
        class: `ml-2 badge badge-sm badge-${this.getStatusColor(status)}`
      }, status);
      
      this.domService.appendChild(stepHeader, statusBadge);
    }
    
    // Step details
    const stepDetails = this.domService.createElement('div');
    this.domService.setAttributes(stepDetails, { class: 'mt-2 text-sm' });
    
    // Add description if available
    if (step.description) {
      const stepDesc = this.domService.createElementWithContent('div', {
        class: 'text-gray-600 dark:text-gray-400 mb-2',
      }, step.description);
      
      this.domService.appendChild(stepDetails, stepDesc);
    }
    
    // Add step details based on type
    const detailsContent = this.domService.createElement('div');
    this.domService.setAttributes(detailsContent, {
      class: 'font-mono text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded',
    });
    
    // Set content based on step type
    switch (step.type) {
      case StepType.REQUEST:
        this.domService.setTextContent(
          detailsContent,
          `${step.method || '[No Method]'} ${step.url || step.endpointId || '[No URL/Endpoint]'}`
        );
        break;
        
      case StepType.DELAY:
        this.domService.setTextContent(
          detailsContent,
          `Delay: ${step.delay}ms`
        );
        break;
        
      case StepType.CONDITION:
        this.domService.setTextContent(
          detailsContent,
          `Condition: ${step.condition || '[No Condition]'}`
        );
        break;
        
      case StepType.LOG:
        this.domService.setTextContent(
          detailsContent,
          `Log: ${step.message || '[No Message]'}`
        );
        break;
    }
    
    this.domService.appendChild(stepDetails, detailsContent);
    this.domService.appendChild(stepItem, stepHeader);
    this.domService.appendChild(stepItem, stepDetails);
    
    return stepItem;
  }

  /**
   * Show step editor modal
   * @param step Step to edit, or null for a new step
   * @param callback Callback function when step is saved
   */
  public showStepEditor(step?: FlowStep, callback?: (step: FlowStep) => void): void {
    // This is a placeholder for a proper modal implementation
    // In a real implementation, this would create and show a modal with form fields
    // For now, we'll just emit an event that the controller can handle
    
    this.emit('ui:showStepEditor', { step });
  }

  /**
   * Show flow editor modal
   * @param flow Flow to edit, or null for a new flow
   * @param callback Callback function when flow is saved
   */
  public showFlowEditor(flow?: Flow, callback?: (flow: Flow) => void): void {
    // This is a placeholder for a proper modal implementation
    // In a real implementation, this would create and show a modal with form fields
    // For now, we'll just emit an event that the controller can handle
    
    this.emit('ui:showFlowEditor', { flow });
  }

  /**
   * Get color class based on status
   * @param status Step status
   * @returns Tailwind color class
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
} 