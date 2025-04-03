// Types improved by ts-improve-types
/**
 * Variable Extractor Component
 *
 * UI component for extracting variables from API responses
 */

import { logger } from '../utils/logger';
import { VariableManager } from '../modules/variable-manager';
import { ComponentBase, ComponentOptions } from '../types/component-base';

// Extend ComponentOptions
interface VariableExtractorOptions extends ComponentOptions {
  container: HTMLElement | null;
  variableManager: VariableManager;
  onExtract?: (variables: Map<string, unknown>) => void;
}

// Define ExtractionRule interface locally
interface ExtractionRule {
  name: string;
  path: string;
  defaultValue?: any;
}

/**
 * Variable Extractor Component
 * Provides a UI for extracting variables from API responses
 */
export class VariableExtractor extends ComponentBase {
  // Use protected for options to match base class expectation
  protected options: VariableExtractorOptions;
  private variableManager: VariableManager;
  private extractionRules: ExtractionRule[] = [];
  // Declare missing properties
  private container: HTMLElement | null;
  private rulesContainer: HTMLElement | null = null;
  private addRuleButton: HTMLElement | null = null;
  private variableList: HTMLElement | null = null;
  private extractionModal: HTMLElement | null = null;
  private extractionRulesContainer: HTMLElement | null = null;
  private currentResponseData: unknown = null;

  constructor(options: VariableExtractorOptions) {
    // Pass base options correctly
    super({ containerId: undefined, debug: options.debug });

    // Validate required options
    if (!options.container) {
      throw new Error('Container element is required for VariableExtractor');
    }
    if (!options.variableManager) {
      throw new Error('VariableManager is required for VariableExtractor');
    }

    // Assign options and declared properties
    this.options = options;
    this.container = this.options.container;
    this.variableManager = this.options.variableManager;

    this.initialize(); // Call initialize after properties are set
  }

  /**
   * Initializes the component
   * Needs to be public/protected to match base class
   */
  public initialize(): void {
    // Create the basic UI structure
    this.container.innerHTML = `
      <div class="variables-panel">
        <div class="variables-header">
          <h3>Variables</h3>
          <div class="variables-actions">
            <button type="button" id="extract-variables-btn" class="btn btn-sm btn-secondary">
              Extract from Response
            </button>
            <button type="button" id="clear-variables-btn" class="btn btn-sm">
              Clear All
            </button>
          </div>
        </div>
        
        <div class="variables-content">
          <div class="variable-list" id="variable-list">
            <div class="empty-message">No variables defined. Extract from response or add manually.</div>
          </div>
          
          <div class="variable-form">
            <div class="input-group">
              <input type="text" id="new-variable-name" placeholder="Variable name" class="form-control">
              <input type="text" id="new-variable-value" placeholder="Value or JSONPath (e.g. $.data.id)" class="form-control">
              <button type="button" id="add-variable-btn" class="btn btn-sm btn-primary">Add</button>
            </div>
          </div>
        </div>
      </div>
      
      <div id="extraction-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h4>Extract Variables from Response</h4>
            <button type="button" id="close-extraction-modal" class="close-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            <p>Specify paths to extract values from the API response. Use $.data.id syntax to extract specific fields.</p>
            
            <div id="extraction-rules" class="extraction-rules">
              <!-- Extraction rules will be added here -->
            </div>
            
            <div class="modal-actions">
              <button type="button" id="add-extraction-rule" class="btn btn-secondary">Add Rule</button>
              <button type="button" id="apply-extraction-rules" class="btn btn-primary">Extract Variables</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Get references to DOM elements
    this.variableList = this.container.querySelector('#variable-list'); // Property added
    this.extractionModal = document.getElementById('extraction-modal'); // Property added
    this.extractionRulesContainer = document.getElementById('extraction-rules'); // Property added

    // Add event listeners
    const extractBtn = this.container.querySelector('#extract-variables-btn');
    if (extractBtn) {
      extractBtn.addEventListener('click', () => this.showExtractionModal());
    }

    const clearBtn = this.container.querySelector('#clear-variables-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearVariables());
    }

    const addBtn = this.container.querySelector('#add-variable-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addVariable());
    }

    const closeModalBtn = document.getElementById('close-extraction-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.hideExtractionModal());
    }

    const addRuleBtn = document.getElementById('add-extraction-rule');
    if (addRuleBtn) {
      addRuleBtn.addEventListener('click', () => this.addExtractionRule());
    }

    const applyRulesBtn = document.getElementById('apply-extraction-rules');
    if (applyRulesBtn) {
      applyRulesBtn.addEventListener('click', () => this.applyExtractionRules());
    }

    // Listen for variable changes
    this.variableManager.on('variable:set', () => this.renderVariables());
    this.variableManager.on('variable:deleted', () => this.renderVariables());
    this.variableManager.on('variables:cleared', () => this.renderVariables());
    this.variableManager.on('variables:loaded', () => this.renderVariables());

    // Initial render
    this.renderVariables();
  }

  /**
   * Set the current response to extract variables from
   * @param response API response
   */
  setResponse(respons: Event): void {
    this.currentResponseData = respons; // Property added
    logger.debug('Response set for variable extraction', {
      hasResponse: !!respons,
      responseType: respons ? typeof respons : 'none',
    });
  }

  /**
   * Show the extraction modal
   */
  private showExtractionModal(): void {
    if (!this.currentResponseData) {
      this.showNotification('No response available for extraction', 'warning');
      return;
    }

    if (this.extractionModal && this.extractionRulesContainer) {
      // Clear existing rules
      this.extractionRulesContainer.innerHTML = '';

      // Add default rule
      this.addExtractionRule();

      // Show modal
      this.extractionModal.classList.remove('hidden');

      // Add path suggestions
      this.addPathSuggestions();
    }
  }

  /**
   * Hide the extraction modal
   */
  private hideExtractionModal(): void {
    if (this.extractionModal) {
      this.extractionModal.classList.add('hidden');
    }
  }

  /**
   * Add a new extraction rule
   */
  private addExtractionRule(): void {
    if (!this.extractionRulesContainer) return;

    const ruleId = `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const ruleEl = document.createElement('div');
    ruleEl.className = 'extraction-rule';
    (ruleEl as HTMLElement).dataset.ruleId = ruleId;

    ruleEl.innerHTML = `
      <div class="rule-inputs">
        <input type="text" class="form-control rule-name" placeholder="Variable name">
        <input type="text" class="form-control rule-path" placeholder="JSONPath (e.g. $.data.id)">
        <input type="text" class="form-control rule-default" placeholder="Default value (optional)">
      </div>
      <button type="button" class="btn btn-sm btn-icon remove-rule">🗑️</button>
      <div class="path-validation-result"></div>
    `;

    // Add event for removing the rule
    const removeBtn = ruleEl.querySelector('.remove-rule');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => ruleEl.remove());
    }

    // Add event for validating path
    const pathInput = ruleEl.querySelector('.rule-path');
    const validationEl = ruleEl.querySelector('.path-validation-result');

    if (pathInput && validationEl) {
      pathInput.addEventListener('input', () => {
        this.validateJsonPath((pathInput as HTMLInputElement).value, validationEl as HTMLElement);
      });

      pathInput.addEventListener('blur', () => {
        if ((pathInput as HTMLInputElement).value && this.currentResponseData) {
          this.testJsonPathExtraction(
            (pathInput as HTMLInputElement).value,
            validationEl as HTMLElement,
          );
        }
      });
    }

    this.extractionRulesContainer.appendChild(ruleEl);

    this.extractionRules.push({ name: '', path: '', defaultValue: undefined });
    this.extractionRules;

    // Clear input fields
    if (pathInput) (pathInput as HTMLInputElement).value = '';
    if (validationEl) validationEl.innerHTML = '';
  }

  /**
   * Validate if a string is a proper JSONPath
   * @param path Path to validate
   * @param validationElement Element to show validation result
   */
  private validateJsonPath(path: string, validationElement: HTMLElement): void {
    if (!path) {
      validationElement.innerHTML = '';
      return;
    }

    // Basic validation for JSONPath pattern
    const jsonPathIndicator = '$.';

    if (!path.startsWith(jsonPathIndicator)) {
      validationElement.innerHTML = `<small class="text-warning">Should start with ${jsonPathIndicator}</small>`;
      return;
    }

    // Check for common syntax issues
    if (path.includes('..') || path.includes('//')) {
      validationElement.innerHTML = '<small class="text-danger">Invalid path syntax</small>';
      return;
    }

    validationElement.innerHTML = '<small class="text-success">Valid syntax</small>';

    if (path) {
      const input = document.querySelector(`input[value="${path}"]`) as HTMLInputElement | null;
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = Boolean(path);
        } else {
          input.value = String(path);
        }
      }
    }
  }

  /**
   * Test if a JSONPath actually extracts a value from the current response
   * @param path Path to test
   * @param validationElement Element to show validation result
   */
  private testJsonPathExtraction(path: string, validationElement: HTMLElement): void {
    if (!this.currentResponseData || !path) return;

    try {
      const extractedValue = this.variableManager.extractValueFromResponse(
        this.currentResponseData,
        path,
      );

      if (extractedValue !== undefined) {
        const displayValue =
          typeof extractedValue === 'object'
            ? JSON.stringify(extractedValue).substring(0, 30) +
              (JSON.stringify(extractedValue).length > 30 ? '...' : '')
            : String(extractedValue);

        validationElement.innerHTML = `<small class="text-success">Found: ${displayValue}</small>`;
      } else {
        validationElement.innerHTML =
          '<small class="text-danger">No value found at this path</small>';
      }
    } catch (error) {
      validationElement.innerHTML = `<small class="text-danger">Error: ${error instanceof Error ? error.message : 'Unknown error'}</small>`;
    }
  }

  /**
   * Apply extraction rules to extract variables from the current response
   */
  private applyExtractionRules(): void {
    if (!this.currentResponseData || !this.extractionRulesContainer) {
      return;
    }

    const rules: ExtractionRule[] = [];
    const ruleElements = this.extractionRulesContainer.querySelectorAll('.extraction-rule');

    ruleElements.forEach(ruleElement => {
      // Cast using angle bracket syntax
      const nameInput = ruleElement.querySelector('.rule-name');
      const pathInput = ruleElement.querySelector('.rule-path');
      const defaultInput = ruleElement.querySelector('.rule-default');

      const nameValue = nameInput ? (<HTMLInputElement>nameInput).value : null;
      const pathValue = pathInput ? (<HTMLInputElement>pathInput).value : null;
      const defaultValue = defaultInput ? (<HTMLInputElement>defaultInput).value : null;

      if (nameValue && pathValue) {
        const rule: ExtractionRule = {
          name: nameValue,
          path: pathValue,
        };
        if (defaultValue !== null) {
          try {
            rule.defaultValue = JSON.parse(defaultValue);
          } catch {
            rule.defaultValue = defaultValue;
          }
        }
        rules.push(rule);
      }
    });

    if (rules.length > 0) {
      logger.debug('Applying extraction rules:', rules);
      const extracted = this.variableManager.extractVariablesFromResponse(
        this.currentResponseData,
        rules,
      );
      this.showNotification(`${extracted.size} variables extracted/updated.`, 'success');
      if (this.options.onExtract) {
        this.options.onExtract(extracted);
      }
    }

    this.hideExtractionModal();
  }

  /**
   * Add a variable manually from the form
   */
  private addVariable(): void {
    const nameInputElement = this.container?.querySelector('#new-variable-name');
    const valueInputElement = this.container?.querySelector('#new-variable-value');

    const nameValue = nameInputElement ? (<HTMLInputElement>nameInputElement).value : null;
    const valueValue = valueInputElement ? (<HTMLInputElement>valueInputElement).value : null;

    if (nameValue && valueValue !== null) {
      // Check value is not null (can be empty string)
      const name = nameValue.trim();
      let value: any = valueValue;

      const jsonPathIndicator = '$.';
      const isJsonPath = value.startsWith(jsonPathIndicator);

      if (isJsonPath && this.currentResponseData) {
        try {
          value = this.variableManager.extractValueFromResponse(this.currentResponseData, value);
          if (value === undefined) {
            this.showNotification(`Could not extract value for path: ${valueValue}`, 'warning');
            return;
          }
        } catch (err) {
          logger.error('Error extracting value via JSONPath:', err);
          this.showNotification(
            `Error extracting value: ${err instanceof Error ? err.message : String(err)}`,
            'error',
          );
          return;
        }
      } else if (isJsonPath && !this.currentResponseData) {
        this.showNotification(
          'Cannot extract from JSONPath: No response data available.',
          'warning',
        );
        return;
      } else {
        try {
          if (
            (value.startsWith('{') && value.endsWith('}')) ||
            (value.startsWith('[') && value.endsWith(']'))
          ) {
            value = JSON.parse(value);
          }
        } catch (e) {
          /* Ignore */
        }
      }

      this.variableManager.setVariable(name, value);

      // Clear inputs after successful add
      if (nameInputElement) (<HTMLInputElement>nameInputElement).value = '';
      if (valueInputElement) (<HTMLInputElement>valueInputElement).value = '';

      this.showNotification(`Variable '${name}' added/updated.`, 'success');
    }
  }

  /**
   * Render variables in the UI
   */
  private renderVariables(): void {
    if (!this.variableList) return;

    const variables = this.variableManager.getVariables();
    const variableNames = Object.keys(variables);

    if (variableNames.length === 0) {
      this.variableList.innerHTML =
        '<div class="empty-message text-text-muted italic">No variables defined.</div>';
      return;
    }

    this.variableList.innerHTML = variableNames
      .map(name => {
        const value = variables[name];
        // Hardcode variable reference format
        const variableReference = `$${name}`;
        return `
        <div class="variable-item flex items-center justify-between p-1 border-b border-border last:border-0">
          <div class="variable-info">
            <span class="variable-name font-medium text-sm">${name}</span>:
            <code class="variable-value text-xs ml-1">${this.formatValuePreview(value)}</code>
          </div>
          <div class="variable-actions flex gap-1">
             <button title="Copy Reference (${variableReference})" class="copy-var-btn text-xs p-1 hover:bg-bg-sidebar rounded" data-var-ref="${variableReference}">📄</button>
             <button title="Delete Variable" class="delete-var-btn text-xs p-1 text-red-500 hover:bg-bg-sidebar rounded" data-var-name="${name}">🗑️</button>
        </div>
      </div>
    `;
      })
      .join('');

    // Add event listeners to delete/copy buttons
    this.variableList.querySelectorAll('.delete-var-btn').forEach(button => {
      button.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const varName = (target as HTMLElement).dataset.varName;
        if (varName) {
          this.variableManager.deleteVariable(varName);
        }
      });
    });
    this.variableList.querySelectorAll('.copy-var-btn').forEach(button => {
      button.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const varRef = (target as HTMLElement).dataset.varRef;
        if (varRef) {
          navigator.clipboard
            .writeText(varRef)
            .then(() => this.showNotification(`Copied ${varRef} to clipboard`, 'info'))
            .catch(err => this.showNotification(`Failed to copy: ${err}`, 'error'));
        }
      });
    });
  }

  /**
   * Clear all variables
   */
  private clearVariables(): void {
    if (confirm('Are you sure you want to clear all variables?')) {
      this.variableManager.clearVariables();
      this.showNotification('All variables cleared', 'success');
    }
  }

  /**
   * Add path suggestions based on the current response
   */
  private addPathSuggestions(): void {
    if (
      !this.currentResponseData ||
      typeof this.currentResponseData !== 'object' ||
      this.currentResponseData === null
    ) {
      return;
    }

    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'path-suggestions mt-4 p-2 border-t border-border';
    suggestionsContainer.innerHTML = '<h5 class="text-sm font-medium mb-2">Suggested Paths:</h5>';

    const suggestionList = document.createElement('ul');
    suggestionList.className = 'space-y-1';

    const paths = this.findJsonPaths(this.currentResponseData);
    // Hardcode JSON path indicator
    const jsonPathPrefix = '$.';

    paths.slice(0, 15).forEach(pathInfo => {
      const fullPath = `${jsonPathPrefix}${pathInfo.path}`;
      const li = document.createElement('li');
      li.className =
        'suggestion-item flex items-center justify-between text-xs p-1 hover:bg-bg-sidebar rounded';
      li.innerHTML = `
            <code class="suggestion-path font-mono text-primary-600" title="${fullPath}">${fullPath}</code>
            <span class="suggestion-value truncate ml-2 text-text-muted">(${pathInfo.type}: ${this.formatValuePreview(pathInfo.value)})</span>
            <button type="button" class="btn btn-xs btn-secondary ml-2 use-path-btn">Use</button>
        `;

      const useButton = li.querySelector('.use-path-btn');
      if (useButton) {
        useButton.addEventListener('click', () => {
          const firstEmptyPath =
            (this.extractionRulesContainer?.querySelector(
              '.variable-path:placeholder-shown',
            ) as HTMLInputElement | null) ||
            (this.extractionRulesContainer?.querySelector(
              '.variable-path',
            ) as HTMLInputElement | null);
          if (firstEmptyPath) {
            firstEmptyPath.value = fullPath;
          }
        });
      }
      suggestionList.appendChild(li);
    });

    if (paths.length > 0) {
      suggestionsContainer.appendChild(suggestionList);
      this.extractionModal?.querySelector('.modal-body')?.appendChild(suggestionsContainer);
    } else {
      suggestionsContainer.innerHTML +=
        '<p class="text-xs text-text-muted italic">No paths found in response.</p>';
      this.extractionModal?.querySelector('.modal-body')?.appendChild(suggestionsContainer);
    }
  }

  /**
   * Show a notification
   * @param message Message to display
   * @param type Notification type (success, error, warning, info)
   */
  private showNotification(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
  ): void {
    // Assuming a toast/notification mechanism exists, possibly via uiManager if available
    console.log(`[${type.toUpperCase()}] ${message}`); // Basic console log fallback
    // Example using a potential uiManager:
    // if (this.options.uiManager) {
    //     this.options.uiManager.showToast({ message, type });
    // }
  }

  /**
   * Finds all possible JSON paths within an object.
   * @param obj The object to analyze.
   * @param currentPath The current path prefix.
   * @param paths Array to store the results.
   * @returns Array of objects containing path, value, and type.
   */
  private findJsonPaths(
    obj: unknown,
    currentPath = '',
    paths: { path: string; value: string; type: string }[] = [],
  ): { path: string; value: string; type: string }[] {
    if (obj === null || typeof obj !== 'object') {
      return paths;
    }

    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        const arrayPath = `${currentPath}[0]`;
        paths.push({
          path: arrayPath,
          value: this.formatValuePreview(obj[0]),
          type: 'array_element',
        });
        this.findJsonPaths(obj[0], arrayPath, paths);
      }
    } else {
      const recordObj = obj as Record<string, unknown>;
      for (const key in recordObj) {
        if (Object.prototype.hasOwnProperty.call(recordObj, key)) {
          const value = recordObj[key];
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          const valueType = typeof value;
          paths.push({ path: newPath, value: this.formatValuePreview(value), type: valueType });
          if (typeof value === 'object' && value !== null) {
            this.findJsonPaths(value, newPath, paths);
          }
        }
      }
    }
    return paths;
  }

  /**
   * Formats a value for preview display.
   * @param value The value to format.
   * @returns A string representation for preview.
   */
  private formatValuePreview(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') {
      return `"${value.substring(0, 20)}${value.length > 20 ? '...' : ''}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    if (typeof value === 'object') return '{...}';
    return String(value);
  }

  /**
   * Extracts a variable value from a response object based on a JSONPath
   * @param response - The response object
   * @param name - Variable name
   * @param path - The JSONPath string
   * @returns The extracted value, or null if extraction fails
   */
  extractVariable(response: unknown, name: string, path: string): unknown | null {
    // Implementation...
    // Use a JSONPath library or manual traversal with type checks
    try {
      const parts = path.split('.');
      let current: unknown = response;
      for (const part of parts) {
        if (current === null || typeof current !== 'object') return null;
        current = (current as Record<string, unknown>)[part];
      }
      return current;
    } catch (e) {
      logger.error(`Failed to extract variable ${name} with path ${path}`, e);
      return null;
    }
  }
}
