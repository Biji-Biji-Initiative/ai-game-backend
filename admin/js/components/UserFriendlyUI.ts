// Types improved by ts-improve-types
/**
 * User-Friendly UI Component
 *
 * Provides a simplified UI for non-technical users to test API functionality
 */

import { logger } from '../utils/logger';
import { UIManager } from './UIManagerNew';
import { UserFriendlyFlowManager } from '../modules/user-friendly-flow-manager';
import { VariableManager } from '../modules/variable-manager';
import { VariableExtractor } from './VariableExtractor';
import { DomainStateViewer } from './DomainStateViewer';
import { DomainStateManager } from '../modules/domain-state-manager';
import { dependencyContainer } from '../utils/dependency-container';
import { ConfigManager } from '../core/ConfigManager';
import { UserFriendlyForm } from './user-friendly/UserFriendlyForm';
import { UserFriendlyResults } from './user-friendly/UserFriendlyResults';
import { Flow, FlowStep, StepType, RequestStep } from '../types/flow-types';

/**
 * User-Friendly UI Options
 */
interface UserFriendlyUIOptions {
  /** API client for making requests */
  apiClient: any;
  /** Endpoint manager for managing API endpoints */
  endpointManager: any;
  /** Variable manager for handling variables */
  variableManager: any;
  /** History manager for request history */
  historyManager: any;
  /** Application controller */
  appController: any;
  /** Optional flow manager */
  userFriendlyFlowManager?: any;
  /** Optional container element - can be provided either in options or found by ID */
  container?: HTMLElement;
  /** Optional UI manager */
  uiManager?: UIManager;
  /** Optional variable extractor */
  variableExtractor?: VariableExtractor | null;
  /** Optional dependency container */
  dependencyContainer?: any;
  /** Optional container ID */
  containerId?: string;
}

export class UserFriendlyUI {
  private options: UserFriendlyUIOptions;
  private container: HTMLElement;
  private resultsContainer: HTMLElement | null;
  private form: UserFriendlyForm | null;
  private results: UserFriendlyResults | null;
  private uiManager: UIManager;
  private flowManager: UserFriendlyFlowManager;
  private variableExtractor: VariableExtractor;
  private dependencyContainer: any;
  private categoryContainer: HTMLElement | null;
  private currentFlow = null;
  private currentStep = 0;
  private apiClient: any;
  private variables: Record<string, unknown> = {};
  private variableManager: VariableManager | null = null;

  /**
   * Constructor
   * @param options Component options
   */
  constructor(options: UserFriendlyUIOptions) {
    this.options = {
      containerId: '',
      apiClient: null,
      variableManager: null,
      endpointManager: null,
      defaultEndpoint: '',
      ...options,
    };
    this.container = this.options.container;
    this.resultsContainer = null;
    this.form = null;
    this.results = null;

    // Assign managers from options - Ensure these are passed correctly
    this.uiManager = options.uiManager;
    this.flowManager = options.flowManager;
    this.variableExtractor = options.variableExtractor;
    this.dependencyContainer = options.dependencyContainer;

    if (!this.container) {
      throw new Error('Container element is required for UserFriendlyUI');
    }
    this.initializeUI();
  }

  /**
   * Initialize the component
   */
  private initializeUI(): void {
    this.renderCategories();
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Search flows
    const searchInput = document.getElementById('user-flow-search');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const value = (e.target as HTMLInputElement).value.toLowerCase();
        this.filterFlows(value);
      });
    }

    // Run Step button
    const runStepBtn = document.getElementById('run-step-btn');
    if (runStepBtn) {
      runStepBtn.addEventListener('click', () => this.executeStep());
    }

    // Clear form button
    const clearFormBtn = document.getElementById('clear-form-btn');
    if (clearFormBtn) {
      clearFormBtn.addEventListener('click', () => this.clearForm());
    }

    // Clear result button
    const clearResultBtn = document.getElementById('user-clear-result-btn');
    if (clearResultBtn) {
      clearResultBtn.addEventListener('click', () => this.clearResult());
    }

    // Extract variables button
    const extractVariablesBtn = document.getElementById('user-extract-variables-btn');
    if (extractVariablesBtn) {
      extractVariablesBtn.addEventListener('click', () => this.extractVariables());
    }

    // Clear variables button
    const clearVariablesBtn = document.getElementById('user-clear-variables-btn');
    if (clearVariablesBtn) {
      clearVariablesBtn.addEventListener('click', () => this.clearVariables());
    }
  }

  /**
   * Render flow categories
   */
  private renderCategories(): void {
    if (!this.categoryContainer) return;

    try {
      const categories = this.flowManager.getCategories();

      // Clear container
      this.categoryContainer.innerHTML = '';

      // Create category sections
      for (const category of categories) {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section mb-4';

        // Create category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className =
          'category-header bg-bg-sidebar p-2 rounded-t border border-border font-medium uppercase text-xs text-primary-600';
        categoryHeader.textContent = category.name;
        categorySection.appendChild(categoryHeader);

        // Create category flows
        const flowList = document.createElement('div');
        flowList.className = 'flow-list border border-t-0 border-border rounded-b overflow-hidden';

        // Get flows for this category
        const flows = this.flowManager.getFlowsByCategory(category.id);

        // Add flows to list
        for (const flow of flows) {
          const flowItem = document.createElement('div');
          flowItem.className =
            'flow-item p-2 border-b border-border hover:bg-bg-sidebar cursor-pointer';
          flowItem.setAttribute('data-flow-id', flow.id);
          flowItem.textContent = flow.name;

          // Add flow description as tooltip
          if (flow.description) {
            flowItem.title = flow.description;
          }

          // Add click handler
          flowItem.addEventListener('click', () => this.selectFlow(flow));

          flowList.appendChild(flowItem);
        }

        categorySection.appendChild(flowList);
        this.categoryContainer.appendChild(categorySection);
      }
    } catch (error) {
      logger.error('Error rendering flow categories:', error);

      if (this.categoryContainer) {
        this.categoryContainer.innerHTML = `
          <div class="bg-red-100 text-red-700 p-4 rounded">
            <p class="font-medium">Error loading flow categories</p>
            <p class="text-sm">${error instanceof Error ? error.message : String(error)}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Filter flows by search term
   * @param searchTerm Search term
   */
  private filterFlows(searchTerm: string): void {
    // Get all flow items
    const flowItems = document.querySelectorAll('.flow-item');

    // Filter items
    flowItems.forEach(item => {
      const flowName = item.textContent?.toLowerCase() || '';
      const flowDescription = item.getAttribute('title')?.toLowerCase() || '';

      // Show/hide based on match
      if (flowName.includes(searchTerm) || flowDescription.includes(searchTerm)) {
        (item as HTMLElement).style.display = '';
      } else {
        (item as HTMLElement).style.display = 'none';
      }
    });

    // Show/hide categories with no visible flows
    const categories = document.querySelectorAll('.category-section');
    categories.forEach(category => {
      const visibleFlows = category.querySelectorAll('.flow-item[style="display: none;"]');

      if (visibleFlows.length === 0) {
        (category as HTMLElement).style.display = 'none';
      } else {
        (category as HTMLElement).style.display = '';
      }
    });
  }

  /**
   * Select a flow to display
   * @param flow Flow data
   */
  private selectFlow(flow: Flow): void {
    try {
      this.currentFlow = flow; // Property added
      this.currentStep = 0; // Property added

      // Hide welcome message
      const welcomeMsg = document.getElementById('welcome-message');
      if (welcomeMsg) welcomeMsg.classList.add('hidden');

      // Show test flow area
      const testFlowArea = document.getElementById('test-flow-area');
      if (testFlowArea) testFlowArea.classList.remove('hidden');

      // Render flow steps
      this.renderFlowSteps();

      // Select first step
      if (flow.steps && flow.steps.length > 0) {
        this.selectStep(0);
      }
    } catch (error) {
      logger.error('Error selecting flow:', error);
      this.uiManager.showError(
        'Error',
        `Failed to load flow: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Render flow steps
   */
  private renderFlowSteps(): void {
    const stepsContainer = document.getElementById('user-flow-steps');
    if (!stepsContainer || !this.currentFlow) return;

    stepsContainer.innerHTML = '';

    // Create steps list
    const stepsList = document.createElement('div');
    stepsList.className = 'steps-list space-y-2';

    // Add steps
    if (this.currentFlow.steps && this.currentFlow.steps.length > 0) {
      this.currentFlow.steps.forEach((step, index: number) => {
        const stepItem = document.createElement('div');
        stepItem.className =
          'step-item flex items-center p-2 rounded hover:bg-bg-sidebar cursor-pointer';
        stepItem.setAttribute('data-step-index', index.toString());

        // Step number
        const stepNumber = document.createElement('div');
        stepNumber.className =
          'step-number w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium mr-2';
        stepNumber.textContent = (index + 1).toString();
        stepItem.appendChild(stepNumber);

        // Step content
        const stepContent = document.createElement('div');
        stepContent.className = 'step-content flex-1';

        const stepName = document.createElement('div');
        stepName.className = 'step-name font-medium';
        stepName.textContent = step.name || `Step ${index + 1}`;
        stepContent.appendChild(stepName);

        if (step.description) {
          const stepDescription = document.createElement('div');
          stepDescription.className = 'step-description text-sm text-text-muted';
          stepDescription.textContent = step.description;
          stepContent.appendChild(stepDescription);
        }

        stepItem.appendChild(stepContent);

        // Status indicator (will be updated later)
        const stepStatus = document.createElement('div');
        stepStatus.className = 'step-status ml-2';
        stepStatus.innerHTML = '<div class="w-4 h-4 rounded-full bg-bg-sidebar"></div>';
        stepItem.appendChild(stepStatus);

        // Add click handler
        stepItem.addEventListener('click', () => this.selectStep(index));

        stepsList.appendChild(stepItem);
      });
    } else {
      stepsList.innerHTML = '<div class="text-text-muted italic p-4">This flow has no steps</div>';
    }

    stepsContainer.appendChild(stepsList);
  }

  /**
   * Select a step to display
   * @param index Step index
   */
  private selectStep(index: number): void {
    if (!this.currentFlow || !this.currentFlow.steps || index >= this.currentFlow.steps.length) {
      return;
    }

    this.currentStep = index;
    const step = this.currentFlow.steps[index];

    // Highlight selected step
    const stepItems = document.querySelectorAll('.step-item');
    stepItems.forEach(item => {
      const stepIndex = parseInt(item.getAttribute('data-step-index') || '-1');
      item.classList.toggle('bg-bg-sidebar', stepIndex === index);
    });

    // Show step details
    const stepDetails = document.getElementById('step-details');
    if (stepDetails) {
      stepDetails.classList.remove('hidden');
      const stepTitle = document.getElementById('step-title');
      if (stepTitle) stepTitle.textContent = step.name || `Step ${index + 1}`;
      const stepDescription = document.getElementById('step-description');
      if (stepDescription) {
        stepDescription.textContent = step.description || 'No description available.';
      }
      this.renderStepForm(step);
    }
  }

  /**
   * Render step form
   * @param step Step data
   */
  private renderStepForm(step: FlowStep): void {
    const formInputs = document.getElementById('form-inputs');
    if (!formInputs) return;
    formInputs.innerHTML = '';

    // Check if step is of a type that has inputs (e.g., RequestStep)
    // and use a type assertion/guard
    if (step.type === StepType.REQUEST && 'inputs' in step && Array.isArray(step.inputs)) {
      const requestStep = step as RequestStep & { inputs: Array<any> }; // Assert type
      if (requestStep.inputs.length > 0) {
          requestStep.inputs.forEach(input => {
              // ... input generation logic using 'input' from requestStep ...
          });
      } else {
          formInputs.innerHTML = '<div class="text-text-muted italic">This step has no inputs</div>';
      }
    } else {
      // Handle steps without inputs
      formInputs.innerHTML = '<div class="text-text-muted italic">This step type does not have inputs</div>';
    }
  }

  /**
   * Execute current step
   */
  private async executeStep(): Promise<void> {
    if (
      !this.currentFlow ||
      !this.currentFlow.steps ||
      this.currentStep >= this.currentFlow.steps.length
    ) {
      logger.warn('No step selected or step index out of bounds');
      return;
    }

    const step = this.currentFlow.steps[this.currentStep];
    const form = document.getElementById('user-form-inputs') as HTMLFormElement;

    if (!form || !step) {
      logger.error('Form or step data not found');
      return;
    }

    try {
      // Show loading indicator
      this.setLoading(true);

      // ** BEFORE SNAPSHOT is handled by DomainStateViewer's button click **
      // The DomainStateViewer component will call takeBeforeSnapshot via its button.

      // Prepare request data
      const requestDetails = this.getCurrentRequestDetails();
      if (!requestDetails) {
        throw new Error('Could not prepare request details from form.');
      }

      // Construct full URL
      let baseUrl = '';
      const configManager = this.dependencyContainer.get('configManager') as ConfigManager | null;
      if (configManager) {
        baseUrl = configManager.get('apiBaseUrl', '') || '';
      }
      const requestUrl = step.endpoint.startsWith('/')
        ? `${baseUrl}${step.endpoint}`
        : step.endpoint;

      // Default headers
      const baseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      // Process headers with variables (merge step headers and base headers)
      const processedHeaders = this.variableManager?.processVariables({
        ...baseHeaders,
        ...step.headers,
      }) || { ...baseHeaders, ...step.headers };

      // Get auth token if available
      const authToken = this.variableManager?.getVariable('authToken');
      if (authToken) {
        processedHeaders['Authorization'] = `Bearer ${authToken}`;
      }

      // Prepare request options using the apiClient adapter
      const requestOptions = {
        method: step.method || 'GET',
        url: requestUrl,
        headers: processedHeaders,
        data: requestDetails.body, // Use 'data' for the adapter (matches common clients like axios)
      };

      logger.debug('Executing step with options:', requestOptions);

      // Make the API request via the adapter
      const response = await this.apiClient.request(requestOptions);

      // Assuming the adapter returns a consistent structure like { status: number, data[] | Record<string, unknown>, headers: Record<string, string> }
      logger.info('Step execution successful', { status: response.status });
      this.displayResult(response.data, response.status || 200, response.headers || {});

      // Set response data for variable extractor
      const variableExtractor = this.variableExtractor as VariableExtractor | null;
      variableExtractor?.setResponse(response.data);

      // **Trigger After Snapshot** - only if before snapshot was taken
      const domainStateViewer = this.dependencyContainer.get(
        'domainStateViewer',
      ) as DomainStateViewer | null;
      const domainStateManager = this.dependencyContainer.get(
        'domainStateManager',
      ) as DomainStateManager | null;
      if (
        domainStateViewer &&
        domainStateManager?.getSnapshots().before &&
        Object.keys(domainStateManager.getSnapshots().before).length > 0
      ) {
        logger.info('Triggering AFTER domain state snapshot...');
        await domainStateViewer.triggerAfterSnapshot();
      } else {
        logger.debug(
          'Skipping AFTER snapshot because no BEFORE snapshot was taken or viewer/manager not found.',
        );
      }

      // Auto-advance if configured
      if (step.autoAdvance && this.currentStep < this.currentFlow.steps.length - 1) {
        this.currentStep++;
        this.renderStep();
      }
    } catch (error) {
      logger.error('Error executing step:', error);

      let errorData = { message: 'An unexpected error occurred.' };
      let status = 500;

      // Attempt to parse error response if it looks like an API error
      if (error.response) {
        // Axios-like error structure
        errorData = error.response.data || { message: error.message || 'API Error' };
        status = error.response.status || 500;
      } else if (error.status) {
        // Fetch-like error structure or our adapter's structure
        errorData = error.data || { message: error.message || 'Request Failed' };
        status = error.status;
      } else if (error instanceof Error) {
        errorData = { message: error.message };
      }

      this.displayResult(errorData, status, {});

      // **Trigger After Snapshot even on error?**
      // Decide if state changes should be captured after a failed request.
      // Generally yes, as errors might still cause state changes (e.g., failed validation).
      const domainStateViewer = this.dependencyContainer.get(
        'domainStateViewer',
      ) as DomainStateViewer | null;
      const domainStateManager = this.dependencyContainer.get(
        'domainStateManager',
      ) as DomainStateManager | null;
      if (
        domainStateViewer &&
        domainStateManager?.getSnapshots().before &&
        Object.keys(domainStateManager.getSnapshots().before).length > 0
      ) {
        logger.info('Triggering AFTER domain state snapshot after error...');
        await domainStateViewer.triggerAfterSnapshot();
      }
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Retrieves the current request details (path, body) from the form, applying variables.
   * Used by DomainStateViewer to get context for snapshots.
   * @returns Object containing path and body, or null if unable to determine.
   */
  public getCurrentRequestDetails(): { path: string; body: unknown } | null {
    if (
      !this.currentFlow ||
      !this.currentFlow.steps ||
      this.currentStep >= this.currentFlow.steps.length
    ) {
      logger.warn('Cannot get request details: No current flow or step.');
      return null;
    }

    const step = this.currentFlow.steps[this.currentStep];
    const formContainer = document.getElementById('user-form-inputs');
    if (!formContainer || !step) {
      logger.warn('Cannot get request details: Form container or step data missing.');
      return null;
    }

    const inputs = formContainer.querySelectorAll('input, select, textarea');
    const body: Record<string, unknown> = {};
    let path = step.endpoint || '';

    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const key = element.name;
      if (!key) return; // Skip elements without a name

      let value: unknown; // Use unknown initially
      if (element.type === 'checkbox' && element instanceof HTMLInputElement) {
        value = element.checked;
      } else {
        value = element.value;
      }

      // Attempt to parse JSON for textareas (e.g., raw JSON body)
      if (element.tagName === 'TEXTAREA' && (element as HTMLElement).dataset.inputType === 'json') {
        try {
          value = JSON.parse(value as string);
        } catch (e) {
          logger.warn(`Could not parse JSON from textarea ${key}, using as string.`);
        }
      }

      // Replace path parameters (e.g., /users/:userId)
      const pathParamRegex = new RegExp(`:${key}(?=\/|$)`);
      if (path.match(pathParamRegex)) {
        path = path.replace(pathParamRegex, String(value));
      } else {
        const keys = key.split('.');
        let current: Record<string, unknown> = body;
        for (let i = 0; i < keys.length - 1; i++) {
            const currentKey = keys[i];
            // Check if current level is an object before assigning/traversing
            if (typeof current[currentKey] !== 'object' || current[currentKey] === null) {
                current[currentKey] = {};
            }
            // Assert type after check
            current = current[currentKey] as Record<string, unknown>;
        }
        current[keys[keys.length - 1]] = value;
      }
    });

    const processedPath = this.variableManager?.replaceVariablesInString(path) || path;
    // Ensure templates are objects before spreading
    const processedStepBodyTemplate = typeof step.body === 'object' && step.body !== null
        ? this.variableManager?.processVariables(step.body) ?? step.body
        : {};
    const formDataBody = typeof body === 'object' && body !== null ? body : {};
    const finalBody = { ...processedStepBodyTemplate, ...formDataBody };
    const processedBody = this.variableManager?.processVariables(finalBody) || finalBody;

    return { path: processedPath, body: processedBody };
  }

  /**
   * Display API result
   * @param response API response
   */
  private displayResult(
    data: unknown[] | Record<string, unknown>,
    status: number,
    headers: Record<string, string>,
  ): void {
    const responseContentElement = document.getElementById('user-flow-response-content');
    if (!responseContentElement) return;
    responseContentElement.innerHTML = ''; // Clear previous result

    // Display Status
    const statusEl = document.createElement('div');
    statusEl.className = `result-status-badge status-${status >= 200 && status < 300 ? 'success' : 'error'}`;
    statusEl.textContent = `Status: ${status}`;
    responseContentElement.appendChild(statusEl);

    // Display Headers (optional, simple implementation)
    if (Object.keys(headers).length > 0) {
      const headersEl = document.createElement('details');
      headersEl.className = 'result-headers';
      headersEl.innerHTML = '<summary>Headers</summary>';
      const preHeaders = document.createElement('pre');
      preHeaders.textContent = JSON.stringify(headers, null, 2);
      headersEl.appendChild(preHeaders);
      responseContentElement.appendChild(headersEl);
    }

    // Display Body (using JSON formatter or preformatted text)
    const bodyEl = document.createElement('div');
    bodyEl.className = 'result-body';
    if (typeof data === 'object' && data !== null) {
        try {
            // Assuming a method like renderJson exists or using a helper
            bodyEl.innerHTML = this.renderJsonWithCollapsibleSections(data); // Use the helper
        } catch (e) {
            bodyEl.innerHTML = '<pre>Could not render JSON response.</pre>';
        }
    } else {
        const preBody = document.createElement('pre');
        // Use String(data) to handle various primitive types
        preBody.textContent = String(data);
        bodyEl.appendChild(preBody);
    }
    responseContentElement.appendChild(bodyEl);
  }

  // Assuming showStatus takes only one argument based on error
  private showStatus(message: string, _level: string = 'info'): void {
    const statusEl = document.getElementById('user-flow-status');
    if (statusEl) {
        statusEl.textContent = message;
        // Maybe add classes based on level later
    }
  }

  private setLoading(isLoading: boolean): void {
    const loadingEl = document.getElementById('user-flow-loading');
    if(loadingEl) {
        loadingEl.style.display = isLoading ? 'block' : 'none';
    }
    // Also disable/enable run button?
    const runBtn = document.getElementById('run-step-btn');
    if (runBtn) {
      (runBtn as HTMLButtonElement).disabled = isLoading;
    }
  }

  /**
   * Clear form inputs
   */
  private clearForm(): void {
    const formInputs = document.getElementById('form-inputs');
    if (!formInputs) return;

    // Reset all inputs
    const inputs = formInputs.querySelectorAll('input, textarea, select');
    inputs.forEach((input: Element) => {
      if (input instanceof HTMLInputElement) {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      } else if (input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
        input.value = '';
      }
    });
  }

  /**
   * Clear result display
   */
  private clearResult(): void {
    const resultStatus = document.getElementById('result-status');
    const resultContent = document.getElementById('result-content');

    if (resultStatus) resultStatus.innerHTML = '';
    if (resultContent) {
    {resultContent.innerHTML =
        '<div class="text-center text-text-muted py-10">No results to display yet</div>';
    }
  }

  /**
   * Extract variables from response
   */
  private extractVariables(): void {
    // TODO: Implement variable extraction from response
    this.uiManager.showToast({
      message: 'Variable extraction is not yet implemented',
      type: 'warning',
      duration: 3000,
    });
  }

  /**
   * Clear stored variables
   */
  private clearVariables(): void {
    this.variables = {};

    // Update variables display
    const variablesList = document.getElementById('user-variables-list');
    if (variablesList) {
      variablesList.innerHTML = '<div class="text-text-muted italic">No variables defined</div>';
    }

    this.uiManager.showToast({
      message: 'All variables have been cleared',
      type: 'info',
      duration: 3000,
    });
  }

  /**
   * Replace variables in string
   * @param str String with variables
   * @returns String with replaced variables
   */
  private replaceVariables(st: string): string {
    return str.replace(/\${([^}]+)}/g, (match, varName) => {
      if (this.variables[varName] !== undefined) {
        return this.variables[varName];
      }
      return match;
    });
  }

  private renderStep(): void {
    // Implementation of renderStep method
  }

  /**
   * Displays an error message in the results area.
   * @param error The error object or message to display.
   */
  private displayError(error: any): void {
    logger.error('Displaying error in UserFriendlyUI:', error);
    let errorMessage = 'An unknown error occurred';
    let errorData = null;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = error.message || error.error || JSON.stringify(error);
      errorData = error.response?.data || error; // Corrected: Removed extra dot
    }

    this.results?.displayError(errorMessage, errorData);
    this.setLoadingState(false);
  }
}
