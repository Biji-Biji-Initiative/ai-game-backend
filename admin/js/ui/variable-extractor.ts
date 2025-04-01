/**
 * Variable Extractor
 * Extracts variables from API responses for reuse
 */

import { VariableManager } from '../modules/variable-manager';
import { VariableExtractorOptions } from '../types/ui';

interface SuggestedVariable {
  name: string;
  path: string;
  value: any;
  description?: string;
}

/**
 * VariableExtractor class
 * Extracts variables from API responses for reuse in other requests
 */
export class VariableExtractor {
  private variableManager?: VariableManager;
  private options: Omit<Required<VariableExtractorOptions>, 'variableManager'> & { variableManager?: VariableManager };
  
  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: VariableExtractorOptions) {
        this.options = {
      autoExtract: true,
      suggestionLimit: 5,
            ...options
        };
    this.variableManager = options.variableManager;
  }
  
  /**
   * Extract variables from a response
   * @param response Response object to extract variables from
   * @param extractionPaths Paths to extract (key: variable name, value: JSON path)
   * @returns Object with extracted variable values
   */
  extractVariables(response: any, extractionPaths?: Record<string, string>): Record<string, any> {
    if (!this.variableManager || !response) return {};
    
    const result: Record<string, any> = {};
    
    if (extractionPaths) {
      // Extract variables using provided paths
      return this.extractVariablesFromJson(response, extractionPaths);
    } else if (this.options.autoExtract) {
      // Auto-extract variables based on common patterns
      return this.autoExtractVariables(response);
    }
    
    return result;
  }
  
  /**
   * Extract variables from JSON using object paths
   * @param data Source data object
   * @param paths Object mapping variable names to path expressions
   * @returns Object containing extracted variables
   */
  private extractVariablesFromJson(data: any, paths: Record<string, string>): Record<string, any> {
    if (!this.variableManager) return {};
    
    const result: Record<string, any> = {};
    
    for (const [varName, path] of Object.entries(paths)) {
      try {
        const value = this.variableManager.extractValueFromResponse(data, path);
        if (value !== undefined) {
          result[varName] = value;
          this.variableManager.setVariable(varName, value);
        }
      } catch (error) {
        console.error(`Error extracting variable ${varName} with path ${path}:`, error);
      }
    }
    
    return result;
  }
  
  /**
   * Auto-extract variables based on common patterns
   * @param response Response object to extract variables from
   * @returns Object with extracted variables
   */
  private autoExtractVariables(response: any): Record<string, any> {
    if (!this.variableManager || !response || typeof response !== 'object') return {};
    
    const extractedVars: Record<string, any> = {};
    
    // Common response structures
    if (response.data && typeof response.data === 'object') {
      // Most APIs wrap their response in a data property
      this.extractCommonVariables(response.data, extractedVars, 'data');
            } else {
      // Direct response object
      this.extractCommonVariables(response, extractedVars);
    }
    
    // Save extracted variables
    if (Object.keys(extractedVars).length > 0 && this.variableManager) {
      Object.entries(extractedVars).forEach(([name, value]) => {
        this.variableManager?.setVariable(name, value);
      });
    }
    
    return extractedVars;
  }
  
  /**
   * Extract common variables from an object
   * @param obj Object to extract from
   * @param result Object to store results in
   * @param prefix Optional prefix for variable names
   */
  private extractCommonVariables(obj: any, result: Record<string, any>, prefix = ''): void {
    if (!obj || typeof obj !== 'object') return;
    
    // Common field patterns to extract automatically
    const commonIdPatterns = ['id', 'uuid', '_id', 'identifier'];
    const commonTokenPatterns = ['token', 'access_token', 'accessToken', 'jwt', 'api_key', 'apiKey'];
    const commonFields = [
      ...commonIdPatterns,
      ...commonTokenPatterns,
      'code', 'status', 'ref', 'key', 'secret'
    ];
    
    // Check for common fields at the top level
    for (const field of commonFields) {
      if (obj[field] !== undefined && obj[field] !== null && 
          (typeof obj[field] === 'string' || typeof obj[field] === 'number')) {
        const varName = prefix ? `${prefix}_${field}` : field;
        result[varName] = obj[field];
      }
    }
    
    // Look for nested objects that might be resources
    for (const [key, value] of Object.entries(obj)) {
      // Skip if we already have extracted too many variables
      if (Object.keys(result).length >= this.options.suggestionLimit) continue;
      
      // If it's a nested object with an ID, it might be a resource
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Check if it has any ID field
        const hasId = commonIdPatterns.some(pattern => 
          value[pattern as keyof typeof value] !== undefined);
        
        if (hasId) {
          // Extract ID field
          for (const idPattern of commonIdPatterns) {
            if (value[idPattern as keyof typeof value] !== undefined) {
              const resourceName = key.replace(/s$/, ''); // Remove plural 's' if present
              const varName = `${resourceName}_id`;
              result[varName] = value[idPattern as keyof typeof value];
              break;
            }
          }
        }
      }
      
      // If it's an array of objects with IDs
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        // Check if first item has an ID
        const firstItem = value[0];
        
        for (const idPattern of commonIdPatterns) {
          if (firstItem[idPattern as keyof typeof firstItem] !== undefined) {
            const singularName = key.replace(/s$/, ''); // Remove plural 's'
            const varName = `first_${singularName}_id`;
            result[varName] = firstItem[idPattern as keyof typeof firstItem];
            break;
          }
        }
      }
    }
  }
  
  /**
   * Suggest variables based on a response
   * @param response Response to analyze
   * @returns List of suggested variables (name/path pairs)
   */
  suggestVariables(response: any): SuggestedVariable[] {
    if (!response || typeof response !== 'object') return [];
    
    const suggestions: SuggestedVariable[] = [];
    
    // Helper function to build path
    const buildPath = (basePath: string, key: string): string => {
      return basePath ? `${basePath}.${key}` : key;
    };
    
    // Helper function to search for interesting values
    const findInterestingValues = (obj: any, basePath = '$'): void => {
      if (!obj || typeof obj !== 'object') return;
      
      // Stop if we've reached the suggestion limit
      if (suggestions.length >= this.options.suggestionLimit) return;
      
      if (Array.isArray(obj)) {
        // Handle arrays
        if (obj.length > 0 && typeof obj[0] === 'object') {
          // Only check the first item in arrays
          findInterestingValues(obj[0], `${basePath}[0]`);
        }
      } else {
        // Handle objects
        for (const [key, value] of Object.entries(obj)) {
          // Skip if we've reached the limit
          if (suggestions.length >= this.options.suggestionLimit) break;
          
          const currentPath = buildPath(basePath, key);
          
          // Check for common interesting fields
          if ((key === 'id' || key.endsWith('Id') || key.endsWith('_id')) && 
              (typeof value === 'string' || typeof value === 'number')) {
            // ID fields
            const parentKey = basePath.split('.').pop() || '';
            const name = parentKey === '$' ? 'id' : `${parentKey}_id`;
            suggestions.push({
              name,
              path: currentPath,
              value,
              description: `ID from ${parentKey === '$' ? 'root' : parentKey}`
            });
          } else if ((key === 'token' || key.endsWith('Token') || key.includes('access_token')) && 
                     typeof value === 'string') {
            // Token fields
            suggestions.push({
              name: key,
              path: currentPath,
              value,
              description: `Token from ${basePath}`
            });
          } else if (typeof value === 'object' && value !== null) {
            // Recurse into objects
            findInterestingValues(value, currentPath);
          }
        }
      }
    };
    
    // Start searching
    findInterestingValues(response);
    
    return suggestions;
  }
  
  /**
   * Extract a specific variable using a JSON path
   * @param response Response object
   * @param name Variable name
   * @param path Path to the value (using dot notation)
   * @returns Value or undefined if not found
   */
  extractVariable(response: any, name: string, path: string): any {
    if (!this.variableManager || !response) return undefined;
    
    try {
      const value = this.variableManager.extractValueFromResponse(response, path);
      
      if (value !== undefined) {
        this.variableManager.setVariable(name, value);
      }
      
      return value;
    } catch (error) {
      console.error(`Failed to extract variable ${name} with path ${path}:`, error);
      return undefined;
        }
    }
    
    /**
   * Render variable suggestions UI
   * @param container Container element to render in
   * @param suggestions List of suggested variables
   * @param onSelect Callback when a suggestion is selected
   */
  renderSuggestions(
    container: HTMLElement,
    suggestions: SuggestedVariable[],
    onSelect: (suggestion: SuggestedVariable) => void
  ): void {
    if (!container || !suggestions || suggestions.length === 0) {
      if (container) {
        container.innerHTML = '<div class="empty-suggestions">No variable suggestions available</div>';
      }
            return;
        }
        
    let html = '<div class="variable-suggestions">';
    html += '<h3>Suggested Variables</h3>';
    html += '<div class="suggestions-list">';
    
    suggestions.forEach(suggestion => {
      const valuePreview = this.formatValuePreview(suggestion.value);
      
      html += `
        <div class="suggestion-item" data-name="${suggestion.name}" data-path="${suggestion.path}">
          <div class="suggestion-name">${suggestion.name}</div>
          <div class="suggestion-path">${suggestion.path}</div>
          <div class="suggestion-value">${valuePreview}</div>
          <button class="btn btn-sm btn-add-var">Add</button>
        </div>
      `;
    });
    
    html += '</div></div>';
    
    // Set the HTML content
    container.innerHTML = html;
    
    // Add event listeners
    const addButtons = container.querySelectorAll('.btn-add-var');
    addButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const item = (event.target as HTMLElement).closest('.suggestion-item');
        if (!item) return;
        
        const name = (item as HTMLElement).dataset.name || '';
        const path = (item as HTMLElement).dataset.path || '';
        
        const suggestion = suggestions.find(s => s.name === name && s.path === path);
        if (suggestion) {
          onSelect(suggestion);
          
          // Update UI to show it's been added
          (event.target as HTMLElement).textContent = 'Added';
          (event.target as HTMLElement).classList.add('btn-added');
          
          // Add the variable if we have a manager
          if (this.variableManager && suggestion.value !== undefined) {
            this.variableManager.setVariable(suggestion.name, suggestion.value);
          }
        }
      });
    });
  }
  
  /**
   * Format a value for display in the suggestions UI
   * @param value Value to format
   * @returns Formatted string representation
   */
  private formatValuePreview(value: any): string {
    if (value === undefined || value === null) {
      return '<span class="null-value">null</span>';
    }
    
    if (typeof value === 'string') {
      // Truncate long strings
      if (value.length > 30) {
        return `<span class="string-value">"${this.escapeHtml(value.substring(0, 30))}..."</span>`;
      }
      return `<span class="string-value">"${this.escapeHtml(value)}"</span>`;
    }
    
    if (typeof value === 'number') {
      return `<span class="number-value">${value}</span>`;
    }
    
    if (typeof value === 'boolean') {
      return `<span class="boolean-value">${value}</span>`;
    }
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `<span class="array-value">Array[${value.length}]</span>`;
      }
      return `<span class="object-value">Object</span>`;
    }
    
    return String(value);
  }
  
  /**
   * Escape HTML entities in a string
   * @param str String to escape
   * @returns Escaped string
   */
  private escapeHtml(str: string): string {
        return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    }
} 