/**
 * Flow Controller
 * Handles flow execution and state management
 */

import { EndpointManager } from '../modules/endpoint-manager';
import { UIManager } from '../components/UIManagerNew';
import { VariableManager } from '../modules/variable-manager';
import { HistoryManager } from '../modules/history-manager';
import { APIClient } from '../api/api-client';
import { AppController } from './AppController';
import { ComponentLogger, Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { Flow, FlowStep, StepStatus } from '../types/flow-types';

export interface FlowControllerOptions {
  endpointManager: EndpointManager;
  uiManager: UIManager;
  variableManager: VariableManager;
  historyManager: HistoryManager;
  apiClient: APIClient;
  appController: AppController;
  eventBus: EventBus;
}

export class FlowController {
  private endpointManager: EndpointManager;
  private uiManager: UIManager;
  private variableManager: VariableManager;
  private historyManager: HistoryManager;
  private apiClient: APIClient;
  private appController: AppController;
  private eventBus: EventBus;
  private logger: ComponentLogger;

  private currentFlow: Flow | null = null;
  private stepStatuses: Map<string, StepStatus> = new Map();
  private isRunning = false;

  constructor(options: FlowControllerOptions) {
    this.endpointManager = options.endpointManager;
    this.uiManager = options.uiManager;
    this.variableManager = options.variableManager;
    this.historyManager = options.historyManager;
    this.apiClient = options.apiClient;
    this.appController = options.appController;
    this.eventBus = options.eventBus;
    this.logger = Logger.getLogger('FlowController');
  }

  /**
   * Initialize the controller
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing FlowController');
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Flow execution events
    this.eventBus.on('flow:start', (flow: Flow) => {
      this.startFlow(flow);
    });

    this.eventBus.on('flow:stop', () => {
      this.stopFlow();
    });

    this.eventBus.on('flow:step', (stepId: string) => {
      this.executeStep(stepId);
    });

    // Flow state events
    this.eventBus.on('flow:reset', () => {
      this.resetFlow();
    });

    this.eventBus.on('flow:update', (flow: Flow) => {
      this.updateFlow(flow);
    });
  }

  /**
   * Start executing a flow
   */
  private async startFlow(flow: Flow): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Flow already running');
      return;
    }

    this.currentFlow = flow;
    this.isRunning = true;
    this.resetStepStatuses();

    this.eventBus.emit('flow:started', flow);
    this.logger.info('Starting flow execution:', flow.name);

    try {
      for (const step of flow.steps) {
        await this.executeStep(step.id);
        if (!this.isRunning) break;
      }

      if (this.isRunning) {
        this.eventBus.emit('flow:completed', flow);
        this.logger.info('Flow completed successfully:', flow.name);
      }
    } catch (error) {
      this.eventBus.emit('flow:error', { flow, error });
      this.logger.error('Flow execution failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the current flow execution
   */
  private stopFlow(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.eventBus.emit('flow:stopped', this.currentFlow);
    this.logger.info('Flow execution stopped');
  }

  /**
   * Execute a specific step in the flow
   */
  private async executeStep(stepId: string): Promise<void> {
    if (!this.currentFlow) return;

    const step = this.currentFlow.steps.find(s => s.id === stepId);
    if (!step) {
      this.logger.error('Step not found:', stepId);
      return;
    }

    this.stepStatuses.set(stepId, 'running');
    this.eventBus.emit('flow:step:started', { flowId: this.currentFlow.id, stepId });

    try {
      // Execute step based on type
      switch (step.type) {
        case 'request':
          await this.executeRequestStep(step);
          break;
        case 'script':
          await this.executeScriptStep(step);
          break;
        case 'condition':
          await this.executeConditionStep(step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      this.stepStatuses.set(stepId, 'success');
      this.eventBus.emit('flow:step:completed', { flowId: this.currentFlow.id, stepId });
    } catch (error) {
      this.stepStatuses.set(stepId, 'error');
      this.eventBus.emit('flow:step:error', { flowId: this.currentFlow.id, stepId, error });
      throw error;
    }
  }

  /**
   * Execute a request step
   */
  private async executeRequestStep(step: FlowStep): Promise<void> {
    // Implementation details...
  }

  /**
   * Execute a script step
   */
  private async executeScriptStep(step: FlowStep): Promise<void> {
    // Implementation details...
  }

  /**
   * Execute a condition step
   */
  private async executeConditionStep(step: FlowStep): Promise<void> {
    // Implementation details...
  }

  /**
   * Reset the current flow state
   */
  private resetFlow(): void {
    this.currentFlow = null;
    this.resetStepStatuses();
    this.isRunning = false;
    this.eventBus.emit('flow:reset');
  }

  /**
   * Update the current flow
   */
  private updateFlow(flow: Flow): void {
    this.currentFlow = flow;
    this.resetStepStatuses();
    this.eventBus.emit('flow:updated', flow);
  }

  /**
   * Reset step statuses
   */
  private resetStepStatuses(): void {
    this.stepStatuses.clear();
    if (this.currentFlow) {
      this.currentFlow.steps.forEach(step => {
        this.stepStatuses.set(step.id, 'pending');
      });
    }
  }

  /**
   * Get the current flow
   */
  public getCurrentFlow(): Flow | null {
    return this.currentFlow;
  }

  /**
   * Get step statuses
   */
  public getStepStatuses(): Map<string, StepStatus> {
    return new Map(this.stepStatuses);
  }

  /**
   * Check if a flow is running
   */
  public isFlowRunning(): boolean {
    return this.isRunning;
  }
}
