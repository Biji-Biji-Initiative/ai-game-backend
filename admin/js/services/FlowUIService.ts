import {
  Flow,
  FlowStep,
  RequestStep,
  ConditionStep,
  StepType,
  StepStatus,
} from '../types/flow-types';
import { EventBus } from '../core/EventBus';
import { DomService } from '../services/DomService';
import { ComponentLogger } from '../core/Logger';

export class FlowUIService {
  private domService: DomService;
  private flowDetailsContainerId: string;
  private flowMenuContainerId: string;
  private eventBus: EventBus;
  private logger: ComponentLogger;

  constructor(options: {
    domService: DomService;
    flowDetailsContainerId: string;
    flowMenuContainerId: string;
    eventBus: EventBus;
    logger: ComponentLogger;
  }) {
    this.domService = options.domService;
    this.flowDetailsContainerId = options.flowDetailsContainerId;
    this.flowMenuContainerId = options.flowMenuContainerId;
    this.eventBus = options.eventBus;
    this.logger = options.logger;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('flow:select', (flowId: string) => {
      this.handleFlowSelect(flowId);
    });

    this.eventBus.on('flow:create', () => {
      this.handleFlowCreate();
    });

    this.eventBus.on('flow:delete', (flowId: string) => {
      this.handleFlowDelete(flowId);
    });

    this.eventBus.on('flow:update', (flow: Flow) => {
      this.handleFlowUpdate(flow);
    });
  }

  private handleFlowSelect(flowId: string): void {
    this.eventBus.emit('flow:selected', flowId);
  }

  private handleFlowCreate(): void {
    this.eventBus.emit('flow:created');
  }

  private handleFlowDelete(flowId: string): void {
    this.eventBus.emit('flow:deleted', flowId);
  }

  private handleFlowUpdate(flow: Flow): void {
    this.eventBus.emit('flow:updated', flow);
  }

  private renderStep(step: FlowStep): HTMLElement {
    const stepItem = this.domService.createElementWithContent('div', {
      className: 'flow-step',
      'data-step-id': step.id,
    });

    const stepHeader = this.domService.createElementWithContent('div', {
      className: 'flow-step-header',
    });

    const stepTitle = this.domService.createElementWithContent('span', {
      className: 'flow-step-title',
      textContent: step.name,
    });

    const stepDetails = this.domService.createElementWithContent('div', {
      className: 'flow-step-details',
    });

    const detailsContent = this.domService.createElementWithContent('div', {
      className: 'flow-step-content',
    });

    this.domService.appendChild(stepHeader, stepTitle);

    switch (step.type) {
      case StepType.REQUEST:
        return this.renderRequestStep(
          step as RequestStep,
          detailsContent,
          stepItem,
          stepHeader,
          stepDetails,
        );
      case StepType.CONDITION:
        return this.renderConditionStep(
          step as ConditionStep,
          detailsContent,
          stepItem,
          stepHeader,
          stepDetails,
        );
      default:
        return this.renderUnknownStep(
          step,
          detailsContent,
          stepItem,
          stepHeader,
          stepDetails,
        );
    }
  }

  private renderRequestStep(
    step: RequestStep,
    detailsContent: HTMLElement,
    stepItem: HTMLElement,
    stepHeader: HTMLElement,
    stepDetails: HTMLElement,
  ): HTMLElement {
    this.domService.setTextContent(
      detailsContent,
      `${step.method || '[No Method]'} ${step.url || step.endpointId || '[No URL/Endpoint]'}`,
    );
    return this.assembleStepElement(stepItem, stepHeader, stepDetails, detailsContent);
  }

  private renderConditionStep(
    step: ConditionStep,
    detailsContent: HTMLElement,
    stepItem: HTMLElement,
    stepHeader: HTMLElement,
    stepDetails: HTMLElement,
  ): HTMLElement {
    this.domService.setTextContent(
      detailsContent,
      `Condition: ${step.condition || '[No Condition]'}`,
    );
    return this.assembleStepElement(stepItem, stepHeader, stepDetails, detailsContent);
  }

  private renderUnknownStep(
    step: FlowStep,
    detailsContent: HTMLElement,
    stepItem: HTMLElement,
    stepHeader: HTMLElement,
    stepDetails: HTMLElement,
  ): HTMLElement {
    this.domService.setTextContent(detailsContent, `Unknown Step: ${step.name || '[No Name]'}`);
    return this.assembleStepElement(stepItem, stepHeader, stepDetails, detailsContent);
  }

  private assembleStepElement(
    stepItem: HTMLElement,
    stepHeader: HTMLElement,
    stepDetails: HTMLElement,
    detailsContent: HTMLElement,
  ): HTMLElement {
    this.domService.appendChild(stepDetails, detailsContent);
    this.domService.appendChild(stepItem, stepHeader);
    this.domService.appendChild(stepItem, stepDetails);
    return stepItem;
  }

  public renderFlows(flows: Map<string, Flow>, activeFlowId?: string): void {
    const container = this.domService.getElementById(this.flowMenuContainerId);
    if (!container) {
      this.logger.error('Flow menu container not found');
      return;
    }

    this.domService.removeAllChildren(container);

    flows.forEach((flow) => {
      const flowElement = this.renderFlowMenuItem(flow, flow.id === activeFlowId);
      this.domService.appendChild(container, flowElement);
    });
  }

  private renderFlowMenuItem(flow: Flow, isActive: boolean): HTMLElement {
    const flowItem = this.domService.createElementWithContent('div', {
      className: `flow-menu-item${isActive ? ' active' : ''}`,
      'data-flow-id': flow.id,
    });

    const flowName = this.domService.createElementWithContent('span', {
      className: 'flow-name',
      textContent: flow.name,
    });

    this.domService.appendChild(flowItem, flowName);
    return flowItem;
  }

  public renderActiveFlow(flow: Flow, stepStatuses: Map<string, StepStatus>, isExecuting: boolean): void {
    const container = this.domService.getElementById(this.flowDetailsContainerId);
    if (!container) {
      this.logger.error('Flow details container not found');
      return;
    }

    this.domService.removeAllChildren(container);

    const flowHeader = this.renderFlowHeader(flow, isExecuting);
    this.domService.appendChild(container, flowHeader);

    const stepsContainer = this.domService.createElementWithContent('div', {
      className: 'flow-steps',
    });

    flow.steps.forEach((step) => {
      const stepElement = this.renderStep(step);
      const status = stepStatuses.get(step.id);
      if (status) {
        const currentClassName = stepElement.className;
        stepElement.className = `${currentClassName} status-${status}`;
      }
      this.domService.appendChild(stepsContainer, stepElement);
    });

    this.domService.appendChild(container, stepsContainer);
  }

  private renderFlowHeader(flow: Flow, isExecuting: boolean): HTMLElement {
    const header = this.domService.createElementWithContent('div', {
      className: 'flow-header',
    });

    const title = this.domService.createElementWithContent('h2', {
      className: 'flow-title',
      textContent: flow.name,
    });

    const description = this.domService.createElementWithContent('p', {
      className: 'flow-description',
      textContent: flow.description || '',
    });

    const controls = this.domService.createElementWithContent('div', {
      className: 'flow-controls',
    });

    const runButton = this.domService.createElementWithContent('button', {
      className: 'flow-run-button',
      textContent: isExecuting ? 'Stop' : 'Run',
      disabled: isExecuting,
    });

    this.domService.appendChild(header, title);
    this.domService.appendChild(header, description);
    this.domService.appendChild(controls, runButton);
    this.domService.appendChild(header, controls);

    return header;
  }
} 