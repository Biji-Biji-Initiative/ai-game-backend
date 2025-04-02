// Types improved by ts-improve-types
/**
 * DOM Utility functions for safe DOM manipulation
 */

// Add this interface to allow 'class' property in element creation options
export interface ExtendedElementCreationOptions extends ElementCreationOptions {
  class?: string;
}

/**
 * Returns an HTMLElement by its ID with proper type checking
 * @param id Element ID
 * @returns The element or null if not found
 */
export function getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Gets an element by ID (shorthand for getElementById)
 * @param id Element ID
 * @returns The element or null if not found
 */
export function getById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return getElementById<T>(id);
}

/**
 * Returns the first element matching a selector within a parent with proper type checking
 * @param selector CSS selector
 * @param parent Parent element to search within (optional)
 * @returns The element or null if not found
 */
export function querySelector<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document,
): T | null {
  return parent.querySelector(selector) as T;
}

/**
 * Finds a single element using a selector
 * @param selector CSS selector
 * @param parent Parent element to search within (optional)
 * @returns The element or null if not found
 */
export function findElement<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document,
): T | null {
  return querySelector<T>(selector, parent);
}

/**
 * Returns all elements matching a selector as an array with proper type checking
 * @param selector CSS selector
 * @param parent Parent element to search within (optional)
 * @returns Array of matching elements
 */
export function querySelectorAll<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document,
): T[] {
  return Array.from(parent.querySelectorAll(selector)) as T[];
}

/**
 * Finds multiple elements using a selector
 * @param selector CSS selector
 * @param parent Parent element to search within (optional)
 * @returns Array of matching elements
 */
export function findElements<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document,
): T[] {
  return querySelectorAll<T>(selector, parent);
}

/**
 * Safely creates an HTML element with proper type checking
 * @param tagName Element tag name
 * @param options Element creation options (optional)
 * @returns The created element
 */
export function createElement<T extends HTMLElement = HTMLElement>(
  tagName: string,
  options?: ExtendedElementCreationOptions,
): T {
  const element = document.createElement(tagName) as T;

  // Apply class if provided in extended options
  if (options?.class) {
    element.className = options.class;
  }

  return element;
}

/**
 * Creates an element with attributes and optional content
 * @param tagName Element tag name
 * @param attributes Element attributes object
 * @param content Inner content (text, HTML string, or child elements)
 * @returns The created element
 */
export function createElementWithAttributes<T extends HTMLElement = HTMLElement>(
  tagName: string,
  attributes: Record<string, string> = {},
  content?: string | HTMLElement | HTMLElement[],
): T {
  const element = createElement<T>(tagName);

  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'innerHTML' && typeof value === 'string') {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  });

  // Add content
  if (content) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else if (Array.isArray(content)) {
      content.forEach(child => element.appendChild(child));
    } else {
      element.appendChild(content);
    }
  }

  return element;
}

/**
 * Safely sets text content on an element
 * @param element Target element
 * @param text Text content to set
 */
export function setText(element: HTMLElement | null, text: string): void {
  if (element) {
    element.textContent = text;
  }
}

/**
 * Safely sets HTML content on an element
 * @param element Target element
 * @param html HTML content to set
 */
export function setHTML(element: HTMLElement | null, html: string): void {
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * Safely adds a class to an element
 * @param element Target element
 * @param className Class to add
 */
export function addClass(element: HTMLElement | null, className: string): void {
  if (element) {
    element.classList.add(className);
  }
}

/**
 * Safely removes a class from an element
 * @param element Target element
 * @param className Class to remove
 */
export function removeClass(element: HTMLElement | null, className: string): void {
  if (element) {
    element.classList.remove(className);
  }
}

/**
 * Safely toggles a class on an element
 * @param element Target element
 * @param className Class to toggle
 * @param force Force state if provided
 */
export function toggleClass(element: HTMLElement | null, className: string, force?: boolean): void {
  if (element) {
    element.classList.toggle(className, force);
  }
}

/**
 * Safely checks if an element has a class
 * @param element Target element
 * @param className Class to check
 * @returns True if the element has the class
 */
export function hasClass(element: HTMLElement | null, className: string): boolean {
  return element ? element.classList.contains(className) : false;
}

/**
 * Safely adds an event listener to an element
 * @param element Target element
 * @param eventType Event type
 * @param handler Event handler
 * @param options Event listener options
 */
export function addEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  eventType: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): void {
  if (element) {
    element.addEventListener(eventType, handler, options);
  }
}

/**
 * Safely removes an event listener from an element
 * @param element Target element
 * @param eventType Event type
 * @param handler Event handler
 * @param options Event listener options
 */
export function removeEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  eventType: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
  options?: boolean | EventListenerOptions,
): void {
  if (element) {
    element.removeEventListener(eventType, handler, options);
  }
}

/**
 * Safely appends a child to an element
 * @param parent Parent element
 * @param child Child element
 */
export function appendChild(parent: HTMLElement | null, child: HTMLElement | string): void {
  if (parent) {
    if (typeof child === 'string') {
      parent.appendChild(document.createTextNode(child));
    } else {
      parent.appendChild(child);
    }
  }
}

/**
 * Safely removes all children from an element
 * @param element Target element
 */
export function removeChildren(element: HTMLElement | null): void {
  if (element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}

/**
 * Safely sets an attribute on an element
 * @param element Target element
 * @param name Attribute name
 * @param value Attribute value
 */
export function setAttribute(element: HTMLElement | null, name: string, value: string): void {
  if (element) {
    element.setAttribute(name, value);
  }
}

/**
 * Safely gets an attribute from an element
 * @param element Target element
 * @param name Attribute name
 * @returns Attribute value or null
 */
export function getAttribute(element: HTMLElement | null, name: string): string | null {
  return element ? element.getAttribute(name) : null;
}

/**
 * Safely removes an attribute from an element
 * @param element Target element
 * @param name Attribute name
 */
export function removeAttribute(element: HTMLElement | null, name: string): void {
  if (element) {
    element.removeAttribute(name);
  }
}

/**
 * Checks if an element is visible
 * @param element Target element
 * @returns True if the element is visible
 */
export function isVisible(element: HTMLElement | null): boolean {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
}

/**
 * Sets the display property of an element
 * @param element Target element
 * @param display Display value
 */
export function setDisplay(element: HTMLElement | null, display: string): void {
  if (element) {
    element.style.display = display;
  }
}

/**
 * Shows an element by setting its display style
 * @param element Target element
 * @param displayValue Display value to use (default: block)
 */
export function showElement(element: HTMLElement | null, displayValue = 'block'): void {
  setDisplay(element, displayValue);
}

/**
 * Hides an element by setting display to 'none'
 * @param element Target element
 */
export function hideElement(element: HTMLElement | null): void {
  setDisplay(element, 'none');
}

/**
 * Toggles the visibility of an element
 * @param element Target element
 * @param displayValue Display value when showing (default: block)
 */
export function toggleElementVisibility(element: HTMLElement | null, displayValue = 'block'): void {
  if (element) {
    element.style.display = isVisible(element) ? 'none' : displayValue;
  }
}

/**
 * Toggles an element's visibility
 * @param element Target element
 * @param force Force state if provided
 */
export function toggleElement(element: HTMLElement | null, force?: boolean): void {
  if (!element) return;

  const isHidden = element.style.display === 'none';
  if (force !== undefined) {
    element.style.display = force ? '' : 'none';
  } else {
    element.style.display = isHidden ? '' : 'none';
  }
}

/**
 * Add event listeners to multiple elements
 * @param selector CSS selector to find elements
 * @param eventType Event type
 * @param handler Event handler
 * @param options Event listener options
 */
export function addEventListeners<K extends keyof HTMLElementEventMap>(
  selector: string,
  eventType: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): void {
  const elements = findElements(selector);
  elements.forEach(element => {
    addEventListener(element, eventType, handler, options);
  });
}
