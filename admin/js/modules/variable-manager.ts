/**
 * Variable Manager
 * Handles variable extraction and substitution for requests
 */

import { VariableManagerOptions } from '../types/modules';

/**
 * VariableManager class
 * Manages variables that can be extracted from responses and reused in future requests
 */
export class VariableManager extends EventTarget {
  private variables: Record<string, any> = {};
  private options: VariableManagerOptions;
  
    /**
   * Constructor
   * @param options Configuration options
     */
  constructor(options: VariableManagerOptions = {}) {
    super();
        this.options = {
            persistVariables: true,
            storageKey: 'api_tester_variables',
            variableSyntax: {
                prefix: '{{',
                suffix: '}}',
        jsonPathIndicator: '$'
            },
            ...options
        };
        
            this.loadVariables();
  }
  
  /**
   * Load variables from local storage if persistence is enabled
   */
  private loadVariables(): void {
    if (this.options.persistVariables && this.options.storageKey) {
      try {
        const storedConfig = localStorage.getItem(this.options.storageKey);
        if (storedConfig) {
          this.variables = JSON.parse(storedConfig);
          console.debug('Loaded variables from storage:', Object.keys(this.variables).length);
          
          // Dispatch variables:loaded event
          this.dispatchEvent(new CustomEvent('variables:loaded', {
            detail: { variables: this.variables }
          }));
        } else {
          this.variables = {};
        }
      } catch (error) {
        console.error('Failed to load variables from storage:', error);
      }
    }
    
    // Initialize with any initial variables provided
    if (this.options.initialVariables) {
      this.setVariables(this.options.initialVariables);
        }
    }
    
    /**
   * Save variables to local storage if persistence is enabled
   */
  private saveVariables(): void {
    if (this.options.persistVariables && this.options.storageKey) {
      try {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.variables));
      } catch (error) {
        console.error('Failed to save variables to storage:', error);
            }
        }
    }
    
    /**
   * Get a variable value by name
   * @param name Variable name
   * @returns Variable value or undefined if not found
   */
  getVariable(name: string): any {
    return this.variables[name];
  }
  
  /**
   * Get all variables
   * @returns Object containing all variables
   */
  getVariables(): Record<string, any> {
    return { ...this.variables };
  }
  
  /**
   * Set a variable value
   * @param name Variable name
   * @param value Variable value
   */
  setVariable(name: string, value: any): void {
    this.variables[name] = value;
    this.saveVariables();
    
    // Dispatch variable:set event
    this.dispatchEvent(new CustomEvent('variable:set', {
      detail: { name, value }
    }));
  }
  
  /**
   * Set multiple variables at once
   * @param vars Object containing variable name-value pairs
   */
  setVariables(vars: Record<string, any>): void {
    this.variables = {
      ...this.variables,
      ...vars
    };
            this.saveVariables();
    
    // Dispatch variables:updated event
    this.dispatchEvent(new CustomEvent('variables:updated', {
      detail: { variables: vars }
    }));
  }
  
  /**
   * Delete a variable
   * @param name Variable name
   */
  deleteVariable(name: string): void {
    delete this.variables[name];
    this.saveVariables();
    
    // Dispatch variable:deleted event
    this.dispatchEvent(new CustomEvent('variable:deleted', {
      detail: { name }
    }));
  }
  
  /**
   * Clear all variables
   */
  clearVariables(): void {
    this.variables = {};
                this.saveVariables();
    
    // Dispatch variables:cleared event
    this.dispatchEvent(new CustomEvent('variables:cleared'));
  }
  
  /**
   * Replace variable placeholders in a string
   * @param text Text to process
   * @returns Text with variables replaced
   */
  public replaceVariables(text: string): string {
    if (!text) return '';
    
    // Use the nested syntax options
    const prefix = this.options.variableSyntax?.prefix || '{{';
    const suffix = this.options.variableSyntax?.suffix || '}}';
    
    // Handle different variable formats based on prefix/suffix
    if (suffix) {
      // Escape prefix and suffix for regex
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variableRegex = new RegExp(`${escapedPrefix}(.*?)${escapedSuffix}`, 'g');
      
      return text.replace(variableRegex, (match, variableName) => {
        return this.getVariableValue(variableName.trim(), match);
      });
    } else {
      // If we only have prefix (e.g., $variable)
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variableRegex = new RegExp(`${escapedPrefix}(\\w+)`, 'g');
      return text.replace(variableRegex, (match, variableName) => {
        return this.getVariableValue(variableName, match);
      });
    }
  }
  
  /**
   * Get variable value, or return the original text if variable not found
   * @param name Variable name
   * @param originalText Original text to return if variable not found
   * @returns Variable value or original text
   */
  private getVariableValue(name: string, originalText: string): string {
    const value = this.variables[name];
    
    if (value === undefined) {
      return originalText;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }
  
  /**
   * Find variables in a text string
   * @param text Text to search
   * @returns Array of variable names
   */
  public findVariables(text: string): string[] {
    if (!text) return [];
    
    // Use the nested syntax options
    const prefix = this.options.variableSyntax?.prefix || '{{';
    const suffix = this.options.variableSyntax?.suffix || '}}';
    
    const variableNames: string[] = [];
    
    // Handle different variable formats based on prefix/suffix
    if (suffix) {
      // Escape prefix and suffix for regex
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variableRegex = new RegExp(`${escapedPrefix}(.*?)${escapedSuffix}`, 'g');
      let match;
      while ((match = variableRegex.exec(text)) !== null) {
        variableNames.push(match[1].trim());
      }
    } else {
      // If we only have prefix (e.g., $variable)
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variableRegex = new RegExp(`${escapedPrefix}(\\w+)`, 'g');
      let match;
      while ((match = variableRegex.exec(text)) !== null) {
        variableNames.push(match[1]);
      }
    }
    
    return variableNames;
  }
  
  /**
   * Check if a string contains variable references
   * @param text Text to check
   * @returns True if text contains variables
   */
  public hasVariables(text: string): boolean {
    if (!text) return false;
    
    // Use the nested syntax options
    const prefix = this.options.variableSyntax?.prefix || '{{';
    const suffix = this.options.variableSyntax?.suffix || '}}';
    
    // Handle different variable formats based on prefix/suffix
    if (suffix) {
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variableRegex = new RegExp(`${escapedPrefix}(.*?)${escapedSuffix}`);
      return variableRegex.test(text);
    } else {
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variableRegex = new RegExp(`${escapedPrefix}\\w+`);
      return variableRegex.test(text);
    }
  }
  
  /**
   * Extract variable names from a string
   * @param input String containing variable references
   * @returns Array of variable names found in the string
   */
  extractVariableNames(input: string): string[] {
    if (!input || typeof input !== 'string') {
      return [];
    }
    
    // Provide default values if variableSyntax is undefined
    const prefix = this.options.variableSyntax?.prefix || '{{';
    const suffix = this.options.variableSyntax?.suffix || '}}';
    
    // Escape prefix and suffix for regex safety
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const variablePattern = new RegExp(`${escapedPrefix}(.*?)${escapedSuffix}`, 'g');
    
    const matches = input.match(variablePattern) || [];
    return matches.map(match => {
      // Extract the content between prefix and suffix
      return match.substring(prefix.length, match.length - suffix.length).trim();
    });
  }
    
    /**
   * Extract variables from a response object using JSONPath expressions
   * @param response Response object
   * @param extractionRules Rules for extraction (variable name to path mapping)
   * @returns Map of variable names to extracted values
   */
  extractVariablesFromResponse(response: any, extractionRules: Array<{ name: string, path: string, defaultValue?: any }>): Map<string, any> {
    const extractedVars = new Map<string, any>();
    
    for (const rule of extractionRules) {
      try {
        const value = this.extractValueFromResponse(response, rule.path);
        
        if (value !== undefined) {
          extractedVars.set(rule.name, value);
          this.setVariable(rule.name, value);
        } else if (rule.defaultValue !== undefined) {
          extractedVars.set(rule.name, rule.defaultValue);
          this.setVariable(rule.name, rule.defaultValue);
        }
      } catch (error) {
        console.error(`Error extracting variable ${rule.name} with path ${rule.path}:`, error);
      }
    }
    
    return extractedVars;
  }
  
  /**
   * Extract variables from JSON using object paths
   * @param data Source data object
   * @param paths Object mapping variable names to path expressions
   * @returns Object containing extracted variables
   */
  extractVariablesFromJson(data: any, paths: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [varName, path] of Object.entries(paths)) {
      try {
        const value = this.extractValueFromResponse(data, path);
        if (value !== undefined) {
          result[varName] = value;
          this.setVariable(varName, value);
        }
      } catch (error) {
        console.error(`Error extracting variable ${varName} with path ${path}:`, error);
      }
    }
    
            return result;
        }
        
  /**
   * Extract a value from a response using a JSONPath expression
   * @param response Response object
   * @param path JSONPath expression
   * @returns Extracted value or undefined if not found
   */
  extractValueFromResponse(response: any, path: string): any {
    if (!response || !path) return undefined;
    
    const jsonPathIndicator = this.options.variableSyntax?.jsonPathIndicator || '$';
    if (!path.startsWith(jsonPathIndicator)) {
      return undefined;
    }
    
    try {
      // Basic JSONPath implementation (only supports $ and dot notation)
      // Remove the $ prefix
      const normalizedPath = path.substring(jsonPathIndicator.length);
      
      // Handle root reference
      if (normalizedPath === '') {
        return response;
      }
      
      // Split on dots, but handle array indexing
      const segments = this.parsePathSegments(normalizedPath);
      let current = response;
      
      for (const segment of segments) {
        if (current === undefined || current === null) {
          return undefined;
        }
        
        // Handle array index notation: [0], [1], etc.
        if (segment.match(/^\[\d+\]$/)) {
          const index = parseInt(segment.substring(1, segment.length - 1), 10);
          if (Array.isArray(current) && index >= 0 && index < current.length) {
            current = current[index];
          } else {
            return undefined;
          }
        } else {
          current = current[segment];
        }
      }
      
      return current;
    } catch (error) {
      console.error(`Error extracting value with path ${path}:`, error);
      return undefined;
    }
  }
  
  /**
   * Parse a JSONPath string into segments, accounting for array indexing
   * @param path JSONPath string (without the $ prefix)
   * @returns Array of path segments
   */
  private parsePathSegments(path: string): string[] {
    if (!path || path === '.') return [];
    
    const segments: string[] = [];
    let currentSegment = '';
    let inBracket = false;
    
    // Remove leading dot if present
    const normalizedPath = path.startsWith('.') ? path.substring(1) : path;
    
    for (let i = 0; i < normalizedPath.length; i++) {
      const char = normalizedPath[i];
      
      if (char === '[' && !inBracket) {
        if (currentSegment) {
          segments.push(currentSegment);
          currentSegment = '';
        }
        currentSegment += char;
        inBracket = true;
      } else if (char === ']' && inBracket) {
        currentSegment += char;
        segments.push(currentSegment);
        currentSegment = '';
        inBracket = false;
      } else if (char === '.' && !inBracket) {
        if (currentSegment) {
          segments.push(currentSegment);
          currentSegment = '';
        }
            } else {
        currentSegment += char;
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    return segments;
  }
}

// Export a singleton instance creator for convenience
export default function createVariableManager(options?: VariableManagerOptions): VariableManager {
  return new VariableManager(options);
} 