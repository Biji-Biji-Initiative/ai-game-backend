// Types improved by ts-improve-types
/**
 * User-Friendly Results Component
 * Handles displaying API responses in a user-friendly format
 */

import { logger } from '../../utils/logger';
import { FlowStep, StepType } from '../../types/flow-types';

export interface UserFriendlyResultsOptions {
  resultPanelId?: string;
  resultStatusId?: string;
  resultContentId?: string;
  variablesPanelId?: string;
}

/**
 * Results component for user-friendly UI
 */
export class UserFriendlyResults {
  private resultPanelElement: HTMLElement | null = null;
  private resultStatusElement: HTMLElement | null = null;
  private resultContentElement: HTMLElement | null = null;
  private variablesPanelElement: HTMLElement | null = null;

  constructor(option: UserFriendlyResultsOptions = {}) {
    this.resultPanelElement = document.getElementById(options.resultPanelId || 'result-panel'); // Property added
    this.resultStatusElement = document.getElementById(options.resultStatusId || 'result-status'); // Property added
    this.resultContentElement = document.getElementById(
      options.resultContentId || 'result-content',
    ); // Property added
    this.variablesPanelElement = document.getElementById(
      options.variablesPanelId || 'variables-panel',
    ); // Property added
  }

  /**
   * Display the result of a step
   * @param result The result to display
   * @param step The step that was executed
   */
  displayResult(resul: anyt, step: FlowStep): void {
    if (!this.resultPanelElement || !this.resultStatusElement || !this.resultContentElement) {
      logger.error('Result elements not found');
      return;
    }

    // Show the result panel
    this.resultPanelElement.classList.remove('hidden');

    // Display status
    let statusText = '';
    let statusClass = '';
    let statusIcon = '';

    if (result && result.status) {
      const status = result.status;

      if (status >= 200 && status < 300) {
        statusText = `Success (${status})`;
        statusClass = 'text-green-500';
        statusIcon = '✓';
      } else if (status >= 300 && status < 400) {
        statusText = `Redirect (${status})`;
        statusClass = 'text-amber-500';
        statusIcon = '↪';
      } else if (status >= 400 && status < 500) {
        statusText = `Client Error (${status})`;
        statusClass = 'text-red-500';
        statusIcon = '✗';
      } else if (status >= 500) {
        statusText = `Server Error (${status})`;
        statusClass = 'text-red-700';
        statusIcon = '⚠';
      } else {
        statusText = `Status: ${status}`;
        statusClass = 'text-text-muted';
        statusIcon = 'ℹ';
      }
    }

    this.resultStatusElement.innerHTML = `<span class="status-icon">${statusIcon}</span> ${statusText}`;
    this.resultStatusElement.className = `flex items-center gap-2 font-medium mb-2 ${statusClass}`;

    // Display content
    this.resultContentElement.innerHTML = '';

    if (result) {
      try {
        // Parse data for better display
        const formattedData = this.formatResponseData(result);
        this.resultContentElement.appendChild(formattedData);

        // Add explanations based on response
        const explanation = this.getResponseExplanation(result, step);
        if (explanation) {
          const explanationEl = document.createElement('div');
          explanationEl.className =
            'mt-4 p-3 bg-blue-50 text-blue-800 rounded border border-blue-200';
          explanationEl.innerHTML = `<h4 class="font-medium mb-1">Explanation:</h4><p>${explanation}</p>`;
          this.resultContentElement.appendChild(explanationEl);
        }
      } catch (e) {
        // Fallback to string representation
        const pre = document.createElement('pre');
        pre.className = 'bg-bg-sidebar p-2 rounded overflow-auto';
        pre.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        this.resultContentElement.appendChild(pre);
      }
    } else {
      this.resultContentElement.innerHTML =
        '<div class="text-center text-text-muted py-10">No result data</div>';
    }
  }

  /**
   * Display an error
   * @param error The error to display
   */
  displayError(erro: anyr): void {
    if (!this.resultPanelElement || !this.resultStatusElement || !this.resultContentElement) {
      logger.error('Result elements not found');
      return;
    }

    // Show the result panel
    this.resultPanelElement.classList.remove('hidden');

    // Display status
    this.resultStatusElement.innerHTML = '<span class="status-icon">✗</span> Error';
    this.resultStatusElement.className = 'flex items-center gap-2 font-medium mb-2 text-red-500';

    // Display error
    this.resultContentElement.innerHTML = '';

    const errorBox = document.createElement('div');
    errorBox.className = 'bg-red-50 border-l-4 border-red-500 text-red-700 p-4';

    const errorTitle = document.createElement('h3');
    errorTitle.className = 'font-bold';
    errorTitle.textContent = 'Error';

    const errorMessage = document.createElement('p');
    errorMessage.className = 'mt-2';
    errorMessage.textContent = error instanceof Error ? error.message : String(error);

    const errorHelp = document.createElement('p');
    errorHelp.className = 'mt-4 text-sm';
    errorHelp.textContent = 'Try checking the following:';

    const errorTips = document.createElement('ul');
    errorTips.className = 'list-disc pl-5 mt-2 text-sm';

    const tips = [
      'Make sure the API server is running',
      'Check that your input values are correct',
      'Verify that you have the necessary permissions',
      'Check the browser console for more details',
    ];

    tips.forEach(tip => {
      const li = document.createElement('li');
      li.textContent = tip;
      errorTips.appendChild(li);
    });

    errorBox.appendChild(errorTitle);
    errorBox.appendChild(errorMessage);
    errorBox.appendChild(errorHelp);
    errorBox.appendChild(errorTips);

    this.resultContentElement.appendChild(errorBox);
  }

  /**
   * Format response data for better display
   * @param result API response
   */
  private formatResponseData(resul: anyt): HTMLElement {
    const container = document.createElement('div');
    container.className = 'response-data';

    // If we have a formatted JSON viewer available
    if (typeof window !== 'undefined' && window.jsonFormatter) {
      try {
        const jsonEl = window.jsonFormatter.formatJSON(result);
        container.appendChild(jsonEl);
        return container;
      } catch (e) {
        logger.warn('Failed to use JSON formatter:', e);
      }
    }

    // Fallback formatting
    if (typeof result === 'object') {
      // Check if it's an API response with data
      if (result.data) {
        // Check for user data or auth data (common patterns)
        if (result.data.user || result.data.token) {
          const userSection = document.createElement('div');
          userSection.className = 'mb-4';

          // Display user info if available
          if (result.data.user) {
            userSection.innerHTML = `
              <h4 class="font-medium mb-2">User Information</h4>
              <div class="grid grid-cols-2 gap-2 border p-2 rounded bg-bg-alt">
                ${Object.entries(result.data.user)
                  .map(
                    ([key, value]) =>
                      `<div class="text-sm font-medium">${this.formatLabel(key)}:</div>
                   <div class="text-sm">${value}</div>`,
                  )
                  .join('')}
              </div>
            `;
          }

          // Display token info if available
          if (result.data.token) {
            const tokenSection = document.createElement('div');
            tokenSection.className = 'mt-4';
            tokenSection.innerHTML = `
              <h4 class="font-medium mb-2">Authentication Token</h4>
              <div class="border p-2 rounded bg-bg-alt break-all">
                <code class="text-xs">${result.data.token}</code>
              </div>
              <p class="text-xs mt-1 text-text-muted">This token will be used for future authenticated requests.</p>
            `;
            userSection.appendChild(tokenSection);
          }

          container.appendChild(userSection);
        } else {
          // General data display
          const dataSection = document.createElement('div');
          dataSection.className = 'mb-4';

          const pre = document.createElement('pre');
          pre.className = 'bg-bg-sidebar p-2 rounded overflow-auto text-sm';
          pre.textContent = JSON.stringify(result.data, null, 2);

          dataSection.appendChild(pre);
          container.appendChild(dataSection);
        }
      } else {
        // Direct JSON display
        const pre = document.createElement('pre');
        pre.className = 'bg-bg-sidebar p-2 rounded overflow-auto text-sm';
        pre.textContent = JSON.stringify(result, null, 2);
        container.appendChild(pre);
      }
    } else {
      // String or other primitive
      const content = document.createElement('div');
      content.textContent = String(result);
      container.appendChild(content);
    }

    return container;
  }

  /**
   * Get a user-friendly explanation of the response
   * @param result API response
   * @param step The step that was executed
   */
  private getResponseExplanation(resul: anyt, step: FlowStep): string | null {
    if (!result) return null;

    // Generate explanation based on status and step
    if (result.status) {
      const status = result.status;

      // Error explanation
      if (status >= 400) {
        if (status === 401) {
          return 'Authentication failed. You need to log in first or your session has expired.';
        } else if (status === 403) {
          return "You don't have permission to access this resource.";
        } else if (status === 404) {
          return 'The requested resource was not found. Check if the URL is correct.';
        } else if (status === 422) {
          return 'The request contained invalid data. Please check your inputs and try again.';
        } else if (status >= 500) {
          return 'The server encountered an error. This is not your fault - please try again later or contact support.';
        }
      }

      // Success explanation
      if (status >= 200 && status < 300) {
        // Check if step is a RequestStep with a url property
        const url = step.type === StepType.REQUEST ? step.url : '';

        if (url) {
          // Login success
          if (url.includes('/login') || url.includes('/signin')) {
            return "Login successful! You've now received an authentication token that will be used for all future requests.";
          }

          // Registration success
          if (url.includes('/register') || url.includes('/signup')) {
            return "Registration successful! Your account has been created and you're now logged in.";
          }

          // Profile retrieval
          if (url.includes('/me')) {
            return 'Your profile information was successfully retrieved.';
          }
        }

        // General success
        return 'Request successful! The server processed your request without any errors.';
      }
    }

    return null;
  }

  /**
   * Clear the result panel
   */
  clearResult(): void {
    if (this.resultStatusElement) {
      this.resultStatusElement.textContent = '';
      this.resultStatusElement.className = '';
    }

    if (this.resultContentElement) {
      this.resultContentElement.innerHTML =
        '<div class="text-center text-text-muted py-10">No results to display yet</div>';
    }

    if (this.variablesPanelElement) {
      this.variablesPanelElement.innerHTML = '';
    }
  }

  /**
   * Extract and display variables from a response
   * @param extractRules Rules for extracting variables
   * @param response API response
   */
  extractVariablesFromResponse(
    extractRule: Array<{ name: string; path: string; defaultValue?: any }>,
    response: Event,
  ): void {
    try {
      if (!response || !response.data || !this.variablesPanelElement) return;

      const extractedVariables: Record<string, unknown> = {};

      extractRules.forEach(rule => {
        try {
          let value;

          // Simple path extraction (e.g., "data.user.id")
          if (rule.path.includes('.')) {
            const pathParts = rule.path.split('.');
            let currentObj = response;

            for (const part of pathParts) {
              if (currentObj && currentObj[part] !== undefined) {
                currentObj = currentObj[part];
              } else {
                currentObj = undefined;
                break;
              }
            }

            value = currentObj;
          } else {
            // Direct property access
            value = response.data[rule.path];
          }

          // Use default value if extraction failed
          if (value === undefined && rule.defaultValue !== undefined) {
            value = rule.defaultValue;
          }

          if (value !== undefined) {
            extractedVariables[rule.name] = value;

            // Save to localStorage for persistence
            localStorage.setItem(`var_${rule.name}`, JSON.stringify(value));

            logger.info(`Extracted variable ${rule.name} = ${JSON.stringify(value)}`);
          }
        } catch (e) {
          logger.warn(`Failed to extract variable ${rule.name}:`, e);
        }
      });

      // If variables were extracted, show a notification
      if (Object.keys(extractedVariables).length > 0) {
        this.variablesPanelElement.innerHTML = `
          <div class="extracted-variables p-3 mt-4 bg-green-50 border border-green-200 rounded">
            <h4 class="font-medium mb-2">Extracted Variables</h4>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2">
              ${Object.entries(extractedVariables)
                .map(
                  ([name, value]) => `
                <div class="font-medium">${name}:</div>
                <div class="font-mono text-sm overflow-hidden text-ellipsis">${
                  typeof value === 'object' ? JSON.stringify(value) : String(value)
                }</div>
              `,
                )
                .join('')}
            </div>
          </div>
        `;
      }
    } catch (error) {
      logger.error('Failed to extract variables:', error);
    }
  }

  /**
   * Format a camelCase or snake_case label to Title Case with spaces
   * @param key The key to format
   */
  private formatLabel(ke: string): string {
    // Replace underscores and hyphens with spaces
    let formatted = ke.replace(/[_-]/g, ' ');

    // Insert space before capital letters
    formatted = formatted.replace(/([A-Z])/g, ' $1');

    // Capitalize first letter and trim
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
  }
}
