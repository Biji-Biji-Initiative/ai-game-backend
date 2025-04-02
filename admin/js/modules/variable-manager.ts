// Types improved by ts-improve-types
/**
 * Variable Manager
 *
 * Handles extracting, storing, and applying variables from API responses
 * to be used in subsequent requests
 */

import { logger } from '../utils/logger';
import { EventEmitter } from '../utils/event-emitter';

interface VariableManagerOptions {
  persistVariables?: boolean;
  storageKey?: string;
  variableSyntax?: {
    prefix: string;
    suffix: string;
    jsonPathIndicator: string;
  };
}

interface ExtractionRule {
  name: string;
  path: string;
  defaultValue?: any;
}

/**
 * Variable Manager for storing and using variables across API requests
 */
export class VariableManager extends EventEmitter {
  private variables: Map<string, any>;
  private options: VariableManagerOptions;

  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: VariableManagerOptions = {}) {
    super();

    this.options = {
      // Whether to persist variables to localStorage
      persistVariables: true,
      // localStorage key for variable storage
      storageKey: 'api_tester_variables',
      // Variable syntax, used for pattern matching
      variableSyntax: {
        prefix: '${',
        suffix: '}',
        jsonPathIndicator: '$.',
      },
      ...options,
    };

    this.variables = new Map(); // Property added

    // Load variables from localStorage if enabled
    if (this.options.persistVariables) {
      this.loadVariables();
    }

    logger.debug('VariableManager initialized', { variableCount: this.variables.size });
  }

  /**
   * Loads variables from localStorage
   * @private
   */
  private loadVariables(): void {
    try {
      const storedVariables = localStorage.getItem(this.options.storageKey!);
      if (storedVariables) {
        const parsedVariables = JSON.parse(storedVariables);
        Object.entries(parsedVariables).forEach(([key, value]) => {
          this.variables.set(key, value);
        });

        this.emit('variables:loaded', {
          count: this.variables.size,
          variables: this.getVariables(),
        });
      }
    } catch (error) {
      logger.error('Error loading variables from localStorage:', error);
    }
  }

  /**
   * Saves variables to localStorage
   * @private
   */
  private saveVariables(): void {
    if (!this.options.persistVariables) return;

    try {
      const variables = Object.fromEntries(this.variables.entries());
      localStorage.setItem(this.options.storageKey!, JSON.stringify(variables));
    } catch (error) {
      logger.error('Error saving variables to localStorage:', error);
    }
  }

  /**
   * Extracts a value from a response using a JSONPath-like syntax
   * @param response The response object to extract from
   * @param path JSONPath-like path, e.g. $.data.id
   * @returns The extracted value or undefined if not found
   */
  extractValueFromResponse(response: unknown, path: string): unknown {
    // Remove the JSONPath indicator if present
    const actualPath = path.startsWith(this.options.variableSyntax!.jsonPathIndicator)
      ? path.substring(this.options.variableSyntax!.jsonPathIndicator.length)
      : path;

    // Split the path into parts
    const parts = actualPath.split('.');

    // Traverse the response object
    let current = response;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indices, e.g. data.items[0].id
      if (part.includes('[') && part.includes(']')) {
        const [arrayName, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''), 10);

        if (
          current[arrayName] &&
          Array.isArray(current[arrayName]) &&
          current[arrayName][index] !== undefined
        ) {
          current = current[arrayName][index];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Extracts variables from a response based on defined extraction rules
   * @param response The response object
   * @param extractionRules Rules for extracting variables
   * @returns Map of extracted variables
   */
  extractVariablesFromResponse(
    response: unknown,
    extractionRules: ExtractionRule[],
  ): Map<string, unknown> {
    const extractedVariables = new Map<string, unknown>();

    extractionRules.forEach(rule => {
      const { name, path, defaultValue } = rule;

      if (!name || !path) {
        logger.warn('Invalid extraction rule: name and path are required', rule);
        return;
      }

      try {
        const value = this.extractValueFromResponse(response, path);

        if (value !== undefined) {
          extractedVariables.set(name, value);
        } else if (defaultValue !== undefined) {
          extractedVariables.set(name, defaultValue);
        }
      } catch (error) {
        logger.error(`Error extracting variable '${name}' from path '${path}':`, error);

        if (defaultValue !== undefined) {
          extractedVariables.set(name, defaultValue);
        }
      }
    });

    // Add the extracted variables to our variables map
    extractedVariables.forEach((value, name) => {
      this.setVariable(name, value);
    });

    return extractedVariables;
  }

  /**
   * Sets a variable
   * @param name The variable name
   * @param value The variable value
   */
  setVariable(name: string, value: unknown): void {
    // Don't store undefined values
    if (value === undefined) {
      return;
    }

    const oldValue = this.variables.get(name);
    this.variables.set(name, value);

    // Save to localStorage if enabled
    if (this.options.persistVariables) {
      this.saveVariables();
    }

    // Emit event
    this.emit('variable:set', {
      name,
      value,
      oldValue,
    });
  }

  /**
   * Gets a variable by name
   * @param name The variable name
   * @returns The variable value or undefined if not found
   */
  getVariable(name: string): unknown {
    return this.variables.get(name);
  }

  /**
   * Checks if a variable exists
   * @param name The variable name
   * @returns Whether the variable exists
   */
  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  /**
   * Deletes a variable
   * @param name The variable name
   * @returns Whether the variable was deleted
   */
  deleteVariable(name: string): boolean {
    const deleted = this.variables.delete(name);

    if (deleted) {
      // Save to localStorage if enabled
      if (this.options.persistVariables) {
        this.saveVariables();
      }

      // Emit event
      this.emit('variable:deleted', { name });
    }

    return deleted;
  }

  /**
   * Clears all variables
   */
  clearVariables(): void {
    this.variables.clear();

    // Save to localStorage if enabled
    if (this.options.persistVariables) {
      this.saveVariables();
    }

    // Emit event
    this.emit('variables:cleared');
  }

  /**
   * Gets all variables
   * @returns All variables as an object
   */
  getVariables(): Record<string, unknown> {
    return Object.fromEntries(this.variables.entries());
  }

  /**
   * Checks if a string contains variable references
   * @param str The string to check
   * @returns Whether the string contains variable references
   */
  containsVariables(str: string): boolean {
    if (typeof str !== 'string') return false;

    const { prefix, suffix } = this.options.variableSyntax!;

    // Create regex to match variable references
    const variableRegex = new RegExp(
      `${this.escapeRegExp(prefix)}\\s*([^${this.escapeRegExp(suffix)}]+?)\\s*${this.escapeRegExp(suffix)}`,
      'g',
    );

    return variableRegex.test(str);
  }

  /**
   * Extracts variable names from a string
   * @param str The string to extract variable names from
   * @returns Array of variable names
   */
  extractVariableNames(str: string): string[] {
    if (typeof str !== 'string') return [];

    const { prefix, suffix } = this.options.variableSyntax!;

    // Create regex to match variable references
    const variableRegex = new RegExp(
      `${this.escapeRegExp(prefix)}\\s*([^${this.escapeRegExp(suffix)}]+?)\\s*${this.escapeRegExp(suffix)}`,
      'g',
    );

    const variableNames: string[] = [];
    let match;

    while ((match = variableRegex.exec(str)) !== null) {
      // Extract just the variable name without whitespace
      const varName = match[1].trim();

      if (varName && !variableNames.includes(varName)) {
        variableNames.push(varName);
      }
    }

    return variableNames;
  }

  /**
   * Replaces variable references in a string with their values
   * @param str The string to process
   * @returns The processed string
   */
  replaceVariablesInString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    const { prefix, suffix } = this.options.variableSyntax!;
    const pattern = new RegExp(
      `${this.escapeRegExp(prefix)}([^${this.escapeRegExp(suffix)}]+)${this.escapeRegExp(suffix)}`,
      'g',
    );

    return str.replace(pattern, (match, variableName) => {
      const value = this.getVariable(variableName.trim());

      if (value === undefined) {
        // Keep the reference if the variable is not found
        return match;
      }

      // Convert non-string values to strings
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
  }

  /**
   * Processes an object or array to replace all variable references
   * @param input The input to process
   * @returns The processed input
   */
  processVariables(input: unknown): unknown {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return this.replaceVariablesInString(input);
    }

    if (typeof input === 'object') {
      // Handle arrays
      if (Array.isArray(input)) {
        return input.map(item => this.processVariables(item));
      }

      // Handle objects
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        result[key] = this.processVariables(value);
      }
      return result;
    }

    // For other types, return as is
    return input;
  }

  /**
   * Processes a request by replacing variable references with their values
   * @param request The request object to process
   * @returns The processed request with variables replaced
   */
  processRequest(request: unknown): unknown {
    // Create a deep copy to avoid modifying the original
    // Ensure request is an object before trying to stringify/parse
    if (typeof request !== 'object' || request === null) return request;
    let processedRequest: Record<string, unknown>;
    try {
      processedRequest = JSON.parse(JSON.stringify(request));
    } catch (e) {
      logger.error('Could not deep copy request object in processRequest', e);
      return request; // Return original if copy fails
    }

    // Process URL path
    if (processedRequest.path && typeof processedRequest.path === 'string') {
      processedRequest.path = this.replaceVariablesInString(processedRequest.path);
    }

    // Process URL
    if (processedRequest.url && typeof processedRequest.url === 'string') {
      processedRequest.url = this.replaceVariablesInString(processedRequest.url);
    }

    // Process headers
    if (processedRequest.headers && typeof processedRequest.headers === 'object') {
      const headers = processedRequest.headers as Record<string, unknown>;
      for (const key in headers) {
        if (
          Object.prototype.hasOwnProperty.call(headers, key) &&
          typeof headers[key] === 'string'
        ) {
          headers[key] = this.replaceVariablesInString(headers[key] as string);
        }
      }
    }

    // Process body
    if ('body' in processedRequest) {
      processedRequest.body = this.processVariables(processedRequest.body);
    }

    // Process data (for Axios-like clients)
    if ('data' in processedRequest) {
      processedRequest.data = this.processVariables(processedRequest.data);
    }

    // Process params
    if (processedRequest.params && typeof processedRequest.params === 'object') {
      const params = processedRequest.params as Record<string, unknown>;
      for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key) && typeof params[key] === 'string') {
          params[key] = this.replaceVariablesInString(params[key] as string);
        }
      }
    }

    return processedRequest;
  }

  /**
   * Helper method to escape special characters for use in RegExp
   * @param string String to escape
   * @returns Escaped string
   * @private
   */
  private escapeRegExp(string: string): string {
    // Ensure input is a string before calling replace
    if (typeof string !== 'string') return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
}

// Export a singleton instance creator for convenience
export default function createVariableManager(
  options: VariableManagerOptions = {},
): VariableManager {
  return new VariableManager(options);
}
