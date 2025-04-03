// Types improved by ts-improve-types
/**
 * User-Friendly Form Component
 * Handles form rendering and submission
 */

import { logger } from '../../utils/logger';
import { FlowStep, StepType, RequestStep } from '../../types/flow-types';

export interface UserFriendlyFormOptions {
  formInputsId?: string;
}

/**
 * Form component for user-friendly UI
 */
export class UserFriendlyForm {
  private formInputsElement: HTMLElement | null = null;

  constructor(option: UserFriendlyFormOptions = {}) {
    this.formInputsElement = document.getElementById(option.formInputsId || 'form-inputs'); // Property added
  }

  /**
   * Render form fields for a step
   * @param step Step to render form for
   */
  renderStepForm(step: FlowStep): void {
    if (!this.formInputsElement) {
      logger.error('Form inputs element not found');
      return;
    }

    this.formInputsElement.innerHTML = '';

    if (step.type === StepType.REQUEST) {
      // Add method and URL (read-only)
      const methodUrlGroup = document.createElement('div');
      methodUrlGroup.className = 'form-group';

      const methodUrlLabel = document.createElement('label');
      methodUrlLabel.className = 'block mb-1 font-medium';
      methodUrlLabel.textContent = 'Endpoint';

      const methodUrlDisplay = document.createElement('div');
      methodUrlDisplay.className = 'p-2 bg-bg-sidebar rounded font-mono text-sm';
      methodUrlDisplay.textContent = `${step.method} ${step.url}`;

      methodUrlGroup.appendChild(methodUrlLabel);
      methodUrlGroup.appendChild(methodUrlDisplay);
      this.formInputsElement.appendChild(methodUrlGroup);

      // Check for URL variables
      this.renderUrlVariables(step);

      // Add request body
      this.renderRequestBody(step);

      // Add helpful instructions
      this.renderInstructions(step);
    }
  }

  /**
   * Render URL variables form fields
   * @param step Step containing URL variables
   */
  private renderUrlVariables(step: FlowStep): void {
    if (!this.formInputsElement) return;

    // Check if step is a RequestStep with a URL
    if (step.type === StepType.REQUEST && 'url' in step && step.url) {
      const url = step.url;
      const variableRegex = /\{\{([^}]+)\}\}/g;
      const matches = [...url.matchAll(variableRegex)];

      if (matches.length > 0) {
        const urlVarsGroup = document.createElement('div');
        urlVarsGroup.className = 'mt-4 p-3 bg-amber-50 border border-amber-200 rounded';

        const urlVarsTitle = document.createElement('h4');
        urlVarsTitle.className = 'font-medium mb-2';
        urlVarsTitle.textContent = 'URL Parameters';

        const urlVarsDesc = document.createElement('p');
        urlVarsDesc.className = 'text-sm mb-3';
        urlVarsDesc.textContent = 'Enter values for the parameters in the URL:';

        urlVarsGroup.appendChild(urlVarsTitle);
        urlVarsGroup.appendChild(urlVarsDesc);

        matches.forEach(match => {
          const variableName = match[1];

          const varFormGroup = document.createElement('div');
          varFormGroup.className = 'mb-3';

          const varLabel = document.createElement('label');
          varLabel.className = 'block mb-1 text-sm font-medium';
          varLabel.htmlFor = variableName;
          varLabel.textContent = this.formatLabel(variableName);

          const varInput = document.createElement('input');
          varInput.className = 'w-full p-2 rounded border border-border bg-bg text-sm';
          varInput.type = 'text';
          varInput.id = variableName;
          varInput.name = variableName;

          // Try to get stored value from localStorage
          try {
            const storedValue = localStorage.getItem(`var_${variableName}`);
            if (storedValue) {
              const parsedValue = JSON.parse(storedValue);
              varInput.value = parsedValue;

              const savedIndicator = document.createElement('span');
              savedIndicator.className = 'text-xs text-green-600 ml-1';
              savedIndicator.textContent = '(saved value)';
              varLabel.appendChild(savedIndicator);
            }
          } catch (e) {
            // Ignore errors from localStorage
          }

          varFormGroup.appendChild(varLabel);
          varFormGroup.appendChild(varInput);

          urlVarsGroup.appendChild(varFormGroup);
        });

        this.formInputsElement.appendChild(urlVarsGroup);
      }
    }
  }

  /**
   * Render request body form fields
   * @param step Step containing request body
   */
  private renderRequestBody(step: FlowStep): void {
    if (!this.formInputsElement) return;

    // Check if step is a RequestStep with a body
    if (step.type === StepType.REQUEST && 'body' in step && step.body) {
      try {
        // Try to parse the body as JSON
        const body = step.body;
        const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;

        const bodyGroup = document.createElement('div');
        bodyGroup.className = 'mt-4';

        const bodyTitle = document.createElement('h4');
        bodyTitle.className = 'font-medium mb-2';
        bodyTitle.textContent = 'Request Body';

        bodyGroup.appendChild(bodyTitle);

        // Create editable fields for each body property
        Object.entries(bodyObj).forEach(([key, value]) => {
          const formGroup = document.createElement('div');
          formGroup.className = 'mb-3';

          const label = document.createElement('label');
          label.className = 'block mb-1 text-sm font-medium';
          label.htmlFor = `body-${key}`;
          label.textContent = this.formatLabel(key);

          let input;

          // Different input types based on value type
          if (typeof value === 'boolean') {
            input = document.createElement('select');
            input.className = 'w-full p-2 rounded border border-border bg-bg';
            input.id = `body-${key}`;
            input.name = `body-${key}`;

            const trueOption = document.createElement('option');
            trueOption.value = 'true';
            trueOption.textContent = 'Yes (true)';
            trueOption.selected = Boolean(value);

            const falseOption = document.createElement('option');
            falseOption.value = 'false';
            falseOption.textContent = 'No (false)';
            falseOption.selected = !value;

            input.appendChild(trueOption);
            input.appendChild(falseOption);
          } else if (typeof value === 'number') {
            input = document.createElement('input');
            input.type = 'number';
            input.className = 'w-full p-2 rounded border border-border bg-bg';
            input.id = `body-${key}`;
            input.name = `body-${key}`;
            input.value = String(value);
          } else if (typeof value === 'object' && value !== null) {
            input = document.createElement('textarea');
            input.className = 'w-full p-2 rounded border border-border bg-bg font-mono text-sm';
            input.id = `body-${key}`;
            input.name = `body-${key}`;
            input.rows = 4;
            input.value = JSON.stringify(value, null, 2);
          } else {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'w-full p-2 rounded border border-border bg-bg';
            input.id = `body-${key}`;
            input.name = `body-${key}`;
            input.value = String(value || '');
          }

          // Add helpful description
          const helpText = document.createElement('p');
          helpText.className = 'text-xs text-text-muted mt-1';

          if (key === 'email') {
            helpText.textContent = 'Enter your email address';
          } else if (key === 'password') {
            helpText.textContent = 'Enter a secure password (min 8 characters)';
          } else if (key === 'username') {
            helpText.textContent = 'Choose a username for your profile';
          } else if (key === 'token') {
            helpText.textContent = 'Enter the token you received';
          } else {
            helpText.textContent = `Enter ${this.formatLabel(key).toLowerCase()}`;
          }

          formGroup.appendChild(label);
          formGroup.appendChild(input);
          formGroup.appendChild(helpText);

          bodyGroup.appendChild(formGroup);
        });

        this.formInputsElement.appendChild(bodyGroup);
      } catch (e) {
        // If JSON parsing fails, show the body as a textarea
        const bodyGroup = document.createElement('div');
        bodyGroup.className = 'mt-4';

        const bodyLabel = document.createElement('label');
        bodyLabel.className = 'block mb-1 font-medium';
        bodyLabel.htmlFor = 'request-body';
        bodyLabel.textContent = 'Request Body';

        const bodyInput = document.createElement('textarea');
        bodyInput.className = 'w-full p-2 rounded border border-border bg-bg font-mono text-sm';
        bodyInput.id = 'request-body';
        bodyInput.rows = 10;
        bodyInput.value =
          typeof (step as RequestStep).body === 'string'
            ? ((step as RequestStep).body as string)
            : JSON.stringify((step as RequestStep).body, null, 2);

        const helpText = document.createElement('p');
        helpText.className = 'text-xs text-text-muted mt-1';
        helpText.textContent = 'This is the raw JSON body for the request. Edit with caution.';

        bodyGroup.appendChild(bodyLabel);
        bodyGroup.appendChild(bodyInput);
        bodyGroup.appendChild(helpText);

        this.formInputsElement.appendChild(bodyGroup);
      }
    }
  }

  /**
   * Render step instructions
   * @param step Step to render instructions for
   */
  private renderInstructions(step: FlowStep): void {
    if (!this.formInputsElement) return;

    const instructionsBox = document.createElement('div');
    instructionsBox.className = 'mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm';
    instructionsBox.innerHTML = `
      <h4 class="font-medium mb-1">What This Step Does:</h4>
      <p class="mb-2">${step.description || 'Executes a request to the API'}</p>
      <h4 class="font-medium mb-1">What To Do:</h4>
      <ol class="list-decimal list-inside">
        <li>Fill in the required information above</li>
        <li>Click "Run This Step" to execute the request</li>
        <li>Check the result below</li>
      </ol>
    `;

    this.formInputsElement.appendChild(instructionsBox);
  }

  /**
   * Collect form values
   * @returns Record of form values
   */
  collectFormValues(): Record<string, unknown> {
    const values: Record<string, unknown> = {};

    // Get all inputs and textareas
    const inputs = document.querySelectorAll(
      '#form-inputs input, #form-inputs textarea, #form-inputs select',
    );

    inputs.forEach((input: Element) => {
      if (
        input instanceof HTMLInputElement ||
        input instanceof HTMLTextAreaElement ||
        input instanceof HTMLSelectElement
      ) {
        // Handle different input types
        if (input instanceof HTMLSelectElement) {
          // For selects, convert to boolean if it's a boolean value
          if (input.value === 'true' || input.value === 'false') {
            values[input.id] = input.value === 'true';
          } else {
            values[input.id] = input.value;
          }
        } else if (input.type === 'number') {
          // For number inputs, convert to actual numbers
          values[input.id] = input.value !== '' ? Number(input.value) : '';
        } else {
          values[input.id] = input.value;
        }
      }
    });

    return values;
  }

  /**
   * Clear the form
   */
  clearForm(): void {
    const inputs = document.querySelectorAll(
      '#form-inputs input, #form-inputs textarea, #form-inputs select',
    );

    inputs.forEach((input: Element) => {
      if (
        input instanceof HTMLInputElement ||
        input instanceof HTMLTextAreaElement ||
        input instanceof HTMLSelectElement
      ) {
        input.value = '';
      }
    });
  }

  /**
   * Format a field key into a user-readable label
   * @param key The key to format
   * @returns Formatted label
   */
  private formatLabel(key: string): string {
    // Replace underscores and hyphens with spaces
    let formatted = key.replace(/[_-]/g, ' ');

    // Insert space before capital letters
    formatted = formatted.replace(/([A-Z])/g, ' $1');

    // Capitalize first letter and trim
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
  }
}
