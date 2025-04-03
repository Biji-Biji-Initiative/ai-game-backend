// Types improved by ts-improve-types
/**
 * Condition evaluator utility
 * Provides functions for evaluating condition expressions using a sandboxed approach.
 */

import { logger } from './logger';

/**
 * Options for condition evaluation
 */
export interface ConditionEvaluationOptions {
  variables?: Record<string, unknown>;
  debug?: boolean;
  defaultResult?: boolean;
  functions?: Record<string, (...args: any[]) => any>; // Replace Function with a specific signature
}

const DEFAULT_OPTIONS: ConditionEvaluationOptions = {
  variables: {},
  debug: false,
  defaultResult: false,
  functions: {},
};

/**
 * Safely evaluates a condition expression within a restricted context.
 */
export function evaluateCondition(
  condition: string,
  options: ConditionEvaluationOptions = {},
): boolean {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  if (!condition || typeof condition !== 'string') {
    return mergedOptions.defaultResult as boolean;
  }

  const trimmedCondition = condition.trim();
  if (!trimmedCondition) {
    return mergedOptions.defaultResult as boolean;
  }

  try {
    const contextVars = mergedOptions.variables || {};
    // Define a safe context with allowed globals and helper functions
    const safeContext = {
      // Variables passed in
      ...contextVars,
      // Custom functions passed in
      ...mergedOptions.functions,
      // Safe built-ins (add more as needed)
      Math: Math,
      Date: Date,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Array: Array,
      Object: Object,
      JSON: JSON,
      // Helper functions
      isEmpty: (val: any): boolean => val === null || val === undefined || val === '',
      isNotEmpty: (val: any): boolean => val !== null && val !== undefined && val !== '',
      includes: (arrOrStr: any[] | string, val: any): boolean => {
        if (Array.isArray(arrOrStr)) {
          return arrOrStr.includes(val);
        } else if (typeof arrOrStr === 'string') {
          return arrOrStr.includes(String(val));
        }
        return false;
      },
      startsWith: (str: string, val: string): boolean =>
        typeof str === 'string' && typeof val === 'string' && str.startsWith(val),
      endsWith: (str: string, val: string): boolean =>
        typeof str === 'string' && typeof val === 'string' && str.endsWith(val),
      match: (str: string, regexStr: string): boolean => {
        try {
          return new RegExp(regexStr).test(str);
        } catch (e) {
          return false;
        }
      },
      length: (val: string | any[]): number => val?.length || 0,
      // Prevent access to dangerous globals like 'eval', 'window', 'document', etc.
      eval: undefined,
      Function: undefined,
      window: undefined,
      document: undefined,
      global: undefined,
      process: undefined,
      require: undefined,
    };

    // Create the sandboxed function
    // Use Function constructor carefully, injecting context variables as parameters
    const paramNames = Object.keys(safeContext);
    const paramValues = Object.values(safeContext);

    // Construct the function body
    // Adding parentheses around the condition can help with some expressions
    const functionBody = `"use strict"; try { return !!(${trimmedCondition}); } catch(e) { console.error('Condition execution error:', e); return false; }`;

    // Create the function
    // eslint-disable-next-line no-new-func
    const conditionFunction = new Function(...paramNames, functionBody);

    // Execute the function with the safe context values
    const result = conditionFunction(...paramValues);

    if (mergedOptions.debug) {
      logger.debug(`Condition: "${trimmedCondition}" => ${result}`, {
        context: safeContext,
        result,
      });
    }

    return result; // Already boolean due to !! in function body
  } catch (error) {
    // Catch errors during function creation or execution
    logger.error(`Error evaluating condition "${trimmedCondition}":`, error);
    return mergedOptions.defaultResult as boolean;
  }
}

export const ConditionOperators = {
  equals: (a: any, b: any): boolean => a === b,
  notEquals: (a: any, b: any): boolean => a !== b,
  greaterThan: (a: number, b: number): boolean => a > b,
  lessThan: (a: number, b: number): boolean => a < b,
  greaterThanOrEquals: (a: number, b: number): boolean => a >= b,
  lessThanOrEquals: (a: number, b: number): boolean => a <= b,
  contains: (str: string, sub: string): boolean => str.includes(sub),
  startsWith: (str: string, sub: string): boolean => str.startsWith(sub),
  endsWith: (str: string, sub: string): boolean => str.endsWith(sub),
  includes: (arrOrStr: any[] | string, val: any): boolean => {
    if (Array.isArray(arrOrStr)) {
      return arrOrStr.includes(val);
    } else if (typeof arrOrStr === 'string') {
      return arrOrStr.includes(String(val));
    }
    return false;
  },
  isEmpty: (val: any): boolean => val === null || val === undefined || val === '',
  isNotEmpty: (val: any): boolean => val !== null && val !== undefined && val !== '',
  match: (str: string, regexStr: string): boolean => {
    try {
      return new RegExp(regexStr).test(str);
    } catch (e) {
      return false; // Invalid regex
    }
  },
  length: (val: string | any[]): number => val?.length || 0,
  // ... other operators can be added here ...
};
