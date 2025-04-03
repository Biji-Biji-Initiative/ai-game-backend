/**
 * DOM Utilities
 * 
 * Helper functions for DOM manipulation
 */

/**
 * Find an element by selector
 * @param selector CSS selector
 * @param parent Optional parent element
 * @returns The found element or null
 */
export function findElement(selector: string, parent: HTMLElement | Document = document): HTMLElement | null {
  return parent.querySelector(selector) as HTMLElement | null;
}

/**
 * Find elements by selector
 * @param selector CSS selector
 * @param parent Optional parent element
 * @returns The found elements
 */
export function findElements(selector: string, parent: HTMLElement | Document = document): HTMLElement[] {
  return Array.from(parent.querySelectorAll(selector)) as HTMLElement[];
}

/**
 * Get element by ID
 * @param id Element ID
 * @returns The element or null
 */
export function getById(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/**
 * Set HTML content of an element
 * @param element Element to set HTML on
 * @param html HTML content
 */
export function setHTML(element: HTMLElement, html: string): void {
  element.innerHTML = html;
}

/**
 * Toggle an element's visibility
 * @param element Element to toggle
 * @param show Whether to show or hide
 */
export function toggleElement(element: HTMLElement, show?: boolean): void {
  if (show === undefined) {
    // Toggle current state
    element.style.display = element.style.display === 'none' ? '' : 'none';
  } else {
    // Set to specified state
    element.style.display = show ? '' : 'none';
  }
}

/**
 * Add event listeners to multiple elements
 * @param selector CSS selector
 * @param eventType Event type
 * @param handler Event handler
 * @param parent Optional parent element
 */
export function addEventListeners(
  selector: string,
  eventType: string,
  handler: (event: Event) => void,
  parent: HTMLElement | Document = document,
): void {
  const elements = parent.querySelectorAll(selector);
  elements.forEach(element => {
    element.addEventListener(eventType, handler);
  });
}

/**
 * Create an element
 * @param tagName Tag name
 * @param options Element options
 * @returns The created element
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: {
    className?: string;
    id?: string;
    attributes?: Record<string, string>;
    textContent?: string;
    innerHTML?: string;
    dataset?: Record<string, string>;
  } = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  
  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;
  if (options.textContent) element.textContent = options.textContent;
  if (options.innerHTML) element.innerHTML = options.innerHTML;
  
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }
  
  return element;
}

/**
 * Remove all children from an element
 * @param element Element to clear
 */
export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Get the value of a form element
 * @param element Form element
 * @returns The element's value
 */
export function getFormElementValue(element: HTMLElement): string | boolean | string[] {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked;
    }
    return element.value;
  } else if (element instanceof HTMLSelectElement) {
    if (element.multiple) {
      return Array.from(element.selectedOptions).map(option => option.value);
    }
    return element.value;
  } else if (element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  return '';
}

/**
 * Set the value of a form element
 * @param element Form element
 * @param value Value to set
 */
export function setFormElementValue(
  element: HTMLElement,
  value: string | boolean | string[],
): void {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = Boolean(value);
    } else {
      element.value = String(value);
    }
  } else if (element instanceof HTMLSelectElement) {
    if (element.multiple && Array.isArray(value)) {
      Array.from(element.options).forEach(option => {
        option.selected = value.includes(option.value);
      });
    } else {
      element.value = String(value);
    }
  } else if (element instanceof HTMLTextAreaElement) {
    element.value = String(value);
  }
} 