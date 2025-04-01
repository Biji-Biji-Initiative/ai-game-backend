/**
 * VariableExtractor Component
 * Extracts variables from API response data using path expressions
 */

import { getValueByPath } from '../utils/json-utils';
import { logger } from '../utils/logger';

// Define variable extraction pattern
export interface VariableExtractionPattern {
  name: string;
  path: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
}

// Options for variable extractor
export interface VariableExtractorOptions {
  onVariableExtracted?: (name: string, value: any) => void;
  onExtractionComplete?: (variables: Record<string, any>) => void;
  onExtractionError?: (error: Error, pattern: VariableExtractionPattern) => void;
}

/**
 * Class for extracting variables from response data
 */
export class VariableExtractor {
  private options: VariableExtractorOptions;
  private extractionPatterns: VariableExtractionPattern[];
  private extractedVariables: Record<string, any>;
  
  /**
   * Creates a new variable extractor
   * @param options Options for the extractor
   */
  constructor(options: VariableExtractorOptions = {}) {
    this.options = options;
    this.extractionPatterns = [];
    this.extractedVariables = {};
  }
  
  /**
   * Adds an extraction pattern
   * @param pattern Extraction pattern to add
   * @returns This instance for chaining
   */
  addPattern(pattern: VariableExtractionPattern): VariableExtractor {
    this.extractionPatterns.push(pattern);
    return this;
  }
  
  /**
   * Adds multiple extraction patterns
   * @param patterns Extraction patterns to add
   * @returns This instance for chaining
   */
  addPatterns(patterns: VariableExtractionPattern[]): VariableExtractor {
    this.extractionPatterns.push(...patterns);
    return this;
  }
  
  /**
   * Removes an extraction pattern by name
   * @param name Name of the pattern to remove
   * @returns This instance for chaining
   */
  removePattern(name: string): VariableExtractor {
    this.extractionPatterns = this.extractionPatterns.filter(pattern => pattern.name !== name);
    return this;
  }
  
  /**
   * Clears all extraction patterns
   * @returns This instance for chaining
   */
  clearPatterns(): VariableExtractor {
    this.extractionPatterns = [];
    return this;
  }
  
  /**
   * Gets all extraction patterns
   * @returns Array of extraction patterns
   */
  getPatterns(): VariableExtractionPattern[] {
    return [...this.extractionPatterns];
  }
  
  /**
   * Gets a specific extraction pattern by name
   * @param name Name of the pattern to get
   * @returns The pattern or undefined if not found
   */
  getPattern(name: string): VariableExtractionPattern | undefined {
    return this.extractionPatterns.find(pattern => pattern.name === name);
  }
  
  /**
   * Extracts variables from response data
   * @param data Response data to extract from
   * @param clearExisting Whether to clear existing extracted variables
   * @returns Object containing extracted variables
   */
  extract(data: any, clearExisting: boolean = true): Record<string, any> {
    // Clear existing variables if needed
    if (clearExisting) {
      this.extractedVariables = {};
    }
    
    // Extract variables based on patterns
    for (const pattern of this.extractionPatterns) {
      try {
        // Extract the value using the path
        const value = getValueByPath(data, pattern.path, pattern.defaultValue);
        
        // Handle required fields
        if (pattern.required && (value === undefined || value === null)) {
          throw new Error(`Required variable '${pattern.name}' not found at path '${pattern.path}'`);
        }
        
        // Store the extracted variable
        this.extractedVariables[pattern.name] = value;
        
        // Call the variable extracted callback
        if (this.options.onVariableExtracted) {
          this.options.onVariableExtracted(pattern.name, value);
        }
      } catch (error) {
        // Handle extraction errors
        const extractionError = error instanceof Error ? error : new Error(String(error));
        
        logger.warn(`Error extracting variable '${pattern.name}': ${extractionError.message}`);
        
        // Call the error callback if provided
        if (this.options.onExtractionError) {
          this.options.onExtractionError(extractionError, pattern);
        }
        
        // Use default value if provided
        if (pattern.defaultValue !== undefined) {
          this.extractedVariables[pattern.name] = pattern.defaultValue;
        }
      }
    }
    
    // Call the extraction complete callback
    if (this.options.onExtractionComplete) {
      this.options.onExtractionComplete({ ...this.extractedVariables });
    }
    
    return { ...this.extractedVariables };
  }
  
  /**
   * Gets all extracted variables
   * @returns Object containing all extracted variables
   */
  getVariables(): Record<string, any> {
    return { ...this.extractedVariables };
  }
  
  /**
   * Gets a specific variable value
   * @param name Name of the variable
   * @returns Variable value or undefined if not found
   */
  getVariable(name: string): any {
    return this.extractedVariables[name];
  }
  
  /**
   * Sets a variable value manually
   * @param name Name of the variable
   * @param value Value to set
   * @returns This instance for chaining
   */
  setVariable(name: string, value: any): VariableExtractor {
    this.extractedVariables[name] = value;
    
    // Call the variable extracted callback
    if (this.options.onVariableExtracted) {
      this.options.onVariableExtracted(name, value);
    }
    
    return this;
  }
  
  /**
   * Clears all extracted variables
   * @returns This instance for chaining
   */
  clearVariables(): VariableExtractor {
    this.extractedVariables = {};
    return this;
  }
  
  /**
   * Extracts variables from a JSON response string
   * @param jsonString JSON string to extract from
   * @param clearExisting Whether to clear existing extracted variables
   * @returns Object containing extracted variables
   */
  extractFromJson(jsonString: string, clearExisting: boolean = true): Record<string, any> {
    try {
      const data = JSON.parse(jsonString);
      return this.extract(data, clearExisting);
    } catch (error) {
      const parseError = error instanceof Error ? error : new Error(String(error));
      logger.error('Error parsing JSON:', parseError.message);
      
      if (clearExisting) {
        this.extractedVariables = {};
      }
      
      return { ...this.extractedVariables };
    }
  }
  
  /**
   * Parses a response and extracts variables based on content type
   * @param response Response object
   * @param contentType Content type of the response
   * @param clearExisting Whether to clear existing extracted variables
   * @returns Object containing extracted variables
   */
  extractFromResponse(
    response: Response | any, 
    contentType?: string, 
    clearExisting: boolean = true
  ): Promise<Record<string, any>> {
    return new Promise(async (resolve, reject) => {
      try {
        // If it's a fetch Response object
        if (response instanceof Response) {
          // Determine content type
          const responseContentType = contentType || response.headers.get('content-type') || '';
          
          // Handle different content types
          if (responseContentType.includes('application/json')) {
            const jsonData = await response.json();
            const variables = this.extract(jsonData, clearExisting);
            resolve(variables);
          } else if (responseContentType.includes('text/')) {
            const textData = await response.text();
            
            // Try to parse as JSON anyway
            try {
              const jsonData = JSON.parse(textData);
              const variables = this.extract(jsonData, clearExisting);
              resolve(variables);
            } catch {
              // Not JSON, just extract from the raw text
              const variables = this.extract({ text: textData }, clearExisting);
              resolve(variables);
            }
          } else {
            // Unknown content type, use the response object as is
            const variables = this.extract(response, clearExisting);
            resolve(variables);
          }
        } else {
          // Not a Response object, use as is
          const variables = this.extract(response, clearExisting);
          resolve(variables);
        }
      } catch (error) {
        const extractionError = error instanceof Error ? error : new Error(String(error));
        logger.error('Error extracting variables from response:', extractionError.message);
        reject(extractionError);
      }
    });
  }

  /**
   * Shows the variable extraction modal
   * @param responseData Response data to extract variables from
   */
  showExtractionModal(responseData: any): void {
    // Create modal if it doesn't exist
    this.createModal();
    
    // Store response data for extraction
    this._responseData = responseData;
    
    // Populate the path input with suggestions if possible
    this.suggestPaths(responseData);
    
    // Show the modal
    const modal = document.getElementById('variable-extractor-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  /**
   * Creates the variable extraction modal
   */
  private createModal(): void {
    // Check if modal already exists
    if (document.getElementById('variable-extractor-modal')) {
      return;
    }
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'variable-extractor-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    
    // Create modal content
    modal.innerHTML = `
      <div class="bg-bg-card p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">Extract Variables</h2>
          <button id="close-extractor-modal" class="text-text-muted hover:text-text">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Variable Name</label>
            <input id="variable-name-input" type="text" class="w-full px-3 py-2 border border-border rounded bg-bg text-sm" placeholder="e.g. userId">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">JSON Path</label>
            <div class="flex">
              <input id="variable-path-input" type="text" class="flex-1 px-3 py-2 border border-border rounded-l bg-bg text-sm" placeholder="e.g. data.user.id">
              <button id="test-path-btn" class="px-3 py-2 bg-primary-600 text-white rounded-r">Test</button>
            </div>
            <div id="path-suggestion-container" class="mt-1 text-xs text-text-muted"></div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Description (optional)</label>
            <input id="variable-description-input" type="text" class="w-full px-3 py-2 border border-border rounded bg-bg text-sm" placeholder="Optional description">
          </div>
          
          <div class="flex items-center">
            <input id="variable-required-checkbox" type="checkbox" class="mr-2">
            <label for="variable-required-checkbox" class="text-sm">Required (extraction fails if not found)</label>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Default Value (optional)</label>
            <input id="variable-default-input" type="text" class="w-full px-3 py-2 border border-border rounded bg-bg text-sm" placeholder="Default value if not found">
          </div>
          
          <div id="test-result-container" class="mt-2 p-3 border border-border rounded bg-bg-sidebar hidden">
            <div class="text-sm font-medium mb-1">Test Result:</div>
            <div id="test-result" class="text-sm font-mono break-all"></div>
          </div>
        </div>
        
        <div class="flex justify-end mt-6 space-x-2">
          <button id="cancel-extraction-btn" class="px-4 py-2 border border-border rounded text-text-muted hover:bg-bg-sidebar">
            Cancel
          </button>
          <button id="add-extraction-btn" class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
            Add Variable
          </button>
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    
    // Set up event listeners
    this.setupModalEventListeners();
  }

  /**
   * Sets up event listeners for the variable extraction modal
   */
  private setupModalEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('close-extractor-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideModal());
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancel-extraction-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideModal());
    }
    
    // Test path button
    const testPathBtn = document.getElementById('test-path-btn');
    if (testPathBtn) {
      testPathBtn.addEventListener('click', () => this.testPath());
    }
    
    // Add variable button
    const addBtn = document.getElementById('add-extraction-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addVariableFromModal());
    }
    
    // Path input (test on Enter key)
    const pathInput = document.getElementById('variable-path-input');
    if (pathInput) {
      pathInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.testPath();
        }
      });
    }
  }

  /**
   * Hides the variable extraction modal
   */
  private hideModal(): void {
    const modal = document.getElementById('variable-extractor-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Tests the current path against the response data
   */
  private testPath(): void {
    if (!this._responseData) {
      this.showTestResult('No response data available', false);
      return;
    }
    
    const pathInput = document.getElementById('variable-path-input') as HTMLInputElement;
    if (!pathInput) return;
    
    const path = pathInput.value.trim();
    if (!path) {
      this.showTestResult('Please enter a path', false);
      return;
    }
    
    try {
      const value = getValueByPath(this._responseData, path, undefined);
      if (value === undefined) {
        this.showTestResult('Path not found in response data', false);
      } else {
        this.showTestResult(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value), true);
      }
    } catch (error) {
      this.showTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`, false);
    }
  }

  /**
   * Shows the test result
   * @param result Result to show
   * @param success Whether the test was successful
   */
  private showTestResult(result: string, success: boolean): void {
    const resultContainer = document.getElementById('test-result-container');
    const resultElement = document.getElementById('test-result');
    
    if (resultContainer && resultElement) {
      resultContainer.classList.remove('hidden');
      resultContainer.classList.toggle('border-green-500', success);
      resultContainer.classList.toggle('border-red-500', !success);
      resultContainer.classList.toggle('bg-green-50', success);
      resultContainer.classList.toggle('bg-red-50', !success);
      
      resultElement.textContent = result;
    }
  }

  /**
   * Adds a variable from the modal inputs
   */
  private addVariableFromModal(): void {
    // Get input values
    const nameInput = document.getElementById('variable-name-input') as HTMLInputElement;
    const pathInput = document.getElementById('variable-path-input') as HTMLInputElement;
    const descriptionInput = document.getElementById('variable-description-input') as HTMLInputElement;
    const requiredCheckbox = document.getElementById('variable-required-checkbox') as HTMLInputElement;
    const defaultInput = document.getElementById('variable-default-input') as HTMLInputElement;
    
    if (!nameInput || !pathInput) return;
    
    const name = nameInput.value.trim();
    const path = pathInput.value.trim();
    
    // Validate inputs
    if (!name) {
      this.showTestResult('Please enter a variable name', false);
      return;
    }
    
    if (!path) {
      this.showTestResult('Please enter a JSON path', false);
      return;
    }
    
    // Create extraction pattern
    const pattern: VariableExtractionPattern = {
      name,
      path,
      description: descriptionInput?.value.trim() || undefined,
      required: requiredCheckbox?.checked || false,
      defaultValue: defaultInput?.value.trim() || undefined
    };
    
    // Add pattern
    this.addPattern(pattern);
    
    // Extract variable if response data is available
    if (this._responseData) {
      try {
        const value = getValueByPath(this._responseData, path, pattern.defaultValue);
        this.setVariable(name, value);
        
        // Show success message
        this.showTestResult(`Variable '${name}' extracted successfully`, true);
        
        // Hide modal after a short delay
        setTimeout(() => this.hideModal(), 1000);
      } catch (error) {
        this.showTestResult(`Error extracting variable: ${error instanceof Error ? error.message : String(error)}`, false);
      }
    } else {
      // No response data, just add the pattern
      this.showTestResult(`Pattern added, but no response data to extract from`, true);
      
      // Hide modal after a short delay
      setTimeout(() => this.hideModal(), 1000);
    }
  }

  /**
   * Suggests paths based on response data
   * @param data Response data to suggest paths from
   */
  private suggestPaths(data: any): void {
    if (!data || typeof data !== 'object') return;
    
    const suggestionsContainer = document.getElementById('path-suggestion-container');
    if (!suggestionsContainer) return;
    
    // Find common or important paths
    const suggestions: string[] = [];
    
    // Helper function to recursively find paths up to a certain depth
    const findPaths = (obj: any, currentPath: string = '', depth: number = 0) => {
      if (depth > 3 || typeof obj !== 'object' || obj === null) return;
      
      // Add primitive values or arrays with primitives
      if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] !== 'object') {
          suggestions.push(`${currentPath}[0]`);
        } else if (obj.length > 0) {
          // Check first array item for common fields
          findPaths(obj[0], `${currentPath}[0]`, depth + 1);
        }
        return;
      }
      
      // Check each property
      for (const key of Object.keys(obj)) {
        const path = currentPath ? `${currentPath}.${key}` : key;
        
        // Add this path if it's a primitive or empty object
        if (typeof obj[key] !== 'object' || obj[key] === null) {
          suggestions.push(path);
        } else {
          // Recursively search deeper
          findPaths(obj[key], path, depth + 1);
        }
        
        // Limit suggestions to 10
        if (suggestions.length >= 10) return;
      }
    };
    
    // Find paths
    findPaths(data);
    
    // Display suggestions
    if (suggestions.length > 0) {
      const html = `
        <div class="text-xs mb-1">Suggested paths:</div>
        <div class="flex flex-wrap gap-1">
          ${suggestions.map(path => `
            <span class="cursor-pointer px-1 py-0.5 bg-bg-sidebar hover:bg-primary-100 rounded text-xs path-suggestion" data-path="${path}">
              ${path}
            </span>
          `).join('')}
        </div>
      `;
      
      suggestionsContainer.innerHTML = html;
      
      // Add event listeners to suggestion spans
      const suggestionSpans = suggestionsContainer.querySelectorAll('.path-suggestion');
      suggestionSpans.forEach(span => {
        span.addEventListener('click', () => {
          const path = span.getAttribute('data-path');
          const pathInput = document.getElementById('variable-path-input') as HTMLInputElement;
          if (pathInput && path) {
            pathInput.value = path;
            this.testPath();
          }
        });
      });
    } else {
      suggestionsContainer.innerHTML = '';
    }
  }

  // Store response data for extraction
  private _responseData: any = null;
} 