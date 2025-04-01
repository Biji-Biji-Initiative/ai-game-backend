/**
 * Template Utility Functions
 * Utilities for processing templates and dynamic content
 */

/**
 * Parses a template string with variable substitution using {{variable}} syntax
 * @param template Template string with {{variable}} placeholders 
 * @param variables Object containing variable values
 * @returns String with variables replaced
 */
export function parseTemplate(template: string, variables: Record<string, any>): string {
  if (!template) return '';
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
    const name = variableName.trim();
    return variables[name] !== undefined ? String(variables[name]) : match;
  });
}

/**
 * Parses a template string with more advanced expressions using ${expression} syntax
 * Similar to JavaScript template literals but safer
 * @param template Template string with ${expression} placeholders
 * @param context Object containing context values
 * @returns String with expressions evaluated and replaced
 */
export function parseExpressionTemplate(template: string, context: Record<string, any>): string {
  if (!template) return '';
  
  return template.replace(/\${([^}]+)}/g, (match, expression) => {
    try {
      // Create a safe evaluation context with only the provided variables
      const evaluator = new Function(...Object.keys(context), `return ${expression.trim()};`);
      const result = evaluator(...Object.values(context));
      return result !== undefined ? String(result) : '';
    } catch (error) {
      console.error(`Error evaluating expression "${expression}":`, error);
      return match; // Return the original placeholder if evaluation fails
    }
  });
}

/**
 * Creates a template function from an HTML string
 * @param html HTML template string with placeholders
 * @returns Function that accepts data and returns rendered HTML
 */
export function createTemplateFunction(html: string): (data: Record<string, any>) => string {
  return (data: Record<string, any>) => parseTemplate(html, data);
}

/**
 * Renders an HTML template string with the provided data
 * @param templateId ID of the template element
 * @param data Data to render the template with
 * @returns Rendered HTML string
 */
export function renderTemplate(templateId: string, data: Record<string, any>): string {
  const templateElement = document.getElementById(templateId) as HTMLTemplateElement;
  if (!templateElement || !templateElement.innerHTML) {
    console.error(`Template with ID "${templateId}" not found`);
    return '';
  }
  
  const template = templateElement.innerHTML;
  return parseTemplate(template, data);
}

/**
 * Renders a template directly to a container element
 * @param templateId ID of the template element
 * @param containerId ID of the container element
 * @param data Data to render the template with
 */
export function renderTemplateToContainer(
  templateId: string, 
  containerId: string, 
  data: Record<string, any>
): void {
  const rendered = renderTemplate(templateId, data);
  const container = document.getElementById(containerId);
  
  if (container) {
    container.innerHTML = rendered;
  } else {
    console.error(`Container with ID "${containerId}" not found`);
  }
}

/**
 * Creates a DocumentFragment from an HTML string
 * @param html HTML string
 * @returns DocumentFragment
 */
export function createFragmentFromHTML(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Performs conditional rendering based on a condition
 * @param condition Condition to evaluate
 * @param trueTemplate Template to use if condition is true
 * @param falseTemplate Template to use if condition is false
 * @param data Data to render the template with
 * @returns Rendered HTML string
 */
export function conditionalRender(
  condition: boolean,
  trueTemplate: string,
  falseTemplate: string,
  data: Record<string, any>
): string {
  return condition 
    ? parseTemplate(trueTemplate, data)
    : parseTemplate(falseTemplate, data);
}

/**
 * Renders a list of items using a template
 * @param items Array of items to render
 * @param templateFn Function that returns HTML for each item
 * @returns Combined HTML string
 */
export function renderList<T>(
  items: T[],
  templateFn: (item: T, index: number) => string
): string {
  return items.map((item, index) => templateFn(item, index)).join('');
}

/**
 * Escapes a string for safe use in HTML attributes
 * @param value String to escape
 * @returns Escaped string
 */
export function escapeAttribute(value: string): string {
  if (!value) return '';
  
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Renders a data binding into an element
 * @param element Element to set data binding on
 * @param data Data object to bind
 * @param path Path to the property in the data object (dot notation)
 */
export function bindData(element: HTMLElement, data: Record<string, any>, path: string): void {
  // Get initial value from the data object
  const getValue = (obj: Record<string, any>, path: string): any => {
    return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
  };
  
  const setValue = (obj: Record<string, any>, path: string, value: any): void => {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((o, p) => (o[p] = o[p] || {}), obj);
    
    if (last) {
      target[last] = value;
    }
  };
  
  // Set initial value
  const value = getValue(data, path);
  
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox') {
      element.checked = Boolean(value);
      
      // Add event listener to update data when checkbox changes
      element.addEventListener('change', () => {
        setValue(data, path, element.checked);
      });
    } else {
      element.value = value !== undefined ? String(value) : '';
      
      // Add event listener to update data when input changes
      element.addEventListener('input', () => {
        setValue(data, path, element.value);
      });
    }
  } else if (element instanceof HTMLSelectElement) {
    element.value = value !== undefined ? String(value) : '';
    
    // Add event listener to update data when select changes
    element.addEventListener('change', () => {
      setValue(data, path, element.value);
    });
  } else if (element instanceof HTMLTextAreaElement) {
    element.value = value !== undefined ? String(value) : '';
    
    // Add event listener to update data when textarea changes
    element.addEventListener('input', () => {
      setValue(data, path, element.value);
    });
  } else {
    // For other elements, update the textContent
    element.textContent = value !== undefined ? String(value) : '';
  }
} 