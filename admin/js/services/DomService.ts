/**
 * DOM Service
 * 
 * Provides an abstraction for DOM manipulations to make components testable
 * and decoupled from direct DOM access
 */

/**
 * Attributes type for DOM elements
 */
export type Attributes = Record<string, string | number | boolean | undefined>;

/**
 * DomService interface for DOM manipulation operations
 */
export interface DomService {
  /**
   * Gets an element by ID
   * @param id Element ID
   * @returns The element or null if not found
   */
  getElementById(id: string): HTMLElement | null;
  
  /**
   * Gets elements by class name
   * @param className The class name
   * @returns HTMLCollection of elements
   */
  getElementsByClassName(className: string): HTMLCollectionOf<Element>;
  
  /**
   * Gets elements by tag name
   * @param tagName The tag name
   * @returns HTMLCollection of elements
   */
  getElementsByTagName(tagName: string): HTMLCollectionOf<Element>;
  
  /**
   * Finds elements by selector
   * @param selector CSS selector
   * @param parent Parent element
   * @returns The found elements
   */
  querySelectorAll(selector: string, parent?: HTMLElement): NodeListOf<Element>;
  
  /**
   * Finds an element by selector
   * @param selector CSS selector
   * @param parent Parent element
   * @returns The found element or null
   */
  querySelector(selector: string, parent?: HTMLElement): Element | null;
  
  /**
   * Creates an element
   * @param tagName Tag name
   * @returns The created element
   */
  createElement(tagName: string): HTMLElement;
  
  /**
   * Creates an element with content
   * @param tagName Tag name
   * @param attributes Attributes to set
   * @param content Content to set
   * @returns The created element
   */
  createElementWithContent(
    tagName: string,
    attributes?: Attributes,
    content?: string | HTMLElement | HTMLElement[]
  ): HTMLElement;
  
  /**
   * Sets attributes on an element
   * @param element Element to set attributes on
   * @param attributes Attributes to set
   */
  setAttributes(element: HTMLElement, attributes: Attributes): void;
  
  /**
   * Sets text content on an element
   * @param element Element to set text on
   * @param text Text to set
   */
  setTextContent(element: HTMLElement, text: string): void;
  
  /**
   * Sets HTML content on an element
   * @param element Element to set HTML on
   * @param html HTML to set
   */
  setInnerHTML(element: HTMLElement, html: string): void;
  
  /**
   * Appends a child to an element
   * @param parent Parent element
   * @param child Child element
   */
  appendChild(parent: HTMLElement, child: HTMLElement): void;
  
  /**
   * Removes a child from an element
   * @param parent Parent element
   * @param child Child element
   */
  removeChild(parent: HTMLElement, child: HTMLElement): void;
  
  /**
   * Removes all children from an element
   * @param element Element to remove children from
   */
  removeAllChildren(element: HTMLElement): void;
}

/**
 * Browser DOM Service implementation
 */
export class BrowserDomService implements DomService {
  /**
   * Gets an element by ID
   * @param id Element ID
   * @returns The element or null if not found
   */
  getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
  }
  
  /**
   * Gets elements by class name
   * @param className The class name
   * @returns HTMLCollection of elements
   */
  getElementsByClassName(className: string): HTMLCollectionOf<Element> {
    return document.getElementsByClassName(className);
  }
  
  /**
   * Gets elements by tag name
   * @param tagName The tag name
   * @returns HTMLCollection of elements
   */
  getElementsByTagName(tagName: string): HTMLCollectionOf<Element> {
    return document.getElementsByTagName(tagName);
  }
  
  /**
   * Finds elements by selector
   * @param selector CSS selector
   * @param parent Parent element
   * @returns The found elements
   */
  querySelectorAll(selector: string, parent: HTMLElement = document.body): NodeListOf<Element> {
    return parent.querySelectorAll(selector);
  }
  
  /**
   * Finds an element by selector
   * @param selector CSS selector
   * @param parent Parent element
   * @returns The found element or null
   */
  querySelector(selector: string, parent: HTMLElement = document.body): Element | null {
    return parent.querySelector(selector);
  }
  
  /**
   * Creates an element
   * @param tagName Tag name
   * @returns The created element
   */
  createElement(tagName: string): HTMLElement {
    return document.createElement(tagName);
  }
  
  /**
   * Creates an element with content
   * @param tagName Tag name
   * @param attributes Attributes to set
   * @param content Content to set
   * @returns The created element
   */
  createElementWithContent(
    tagName: string,
    attributes: Attributes = {},
    content?: string | HTMLElement | HTMLElement[]
  ): HTMLElement {
    const element = this.createElement(tagName);
    this.setAttributes(element, attributes);

    if (content !== undefined) {
      if (typeof content === 'string') {
        this.setTextContent(element, content);
      } else if (Array.isArray(content)) {
        content.forEach(child => {
          this.appendChild(element, child);
        });
      } else {
        this.appendChild(element, content);
      }
    }

    return element;
  }
  
  /**
   * Sets attributes on an element
   * @param element Element to set attributes on
   * @param attributes Attributes to set
   */
  setAttributes(element: HTMLElement, attributes: Attributes): void {
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined) {
        element.removeAttribute(name);
      } else if (typeof value === 'boolean') {
        if (value) {
          element.setAttribute(name, '');
        } else {
          element.removeAttribute(name);
        }
      } else {
        element.setAttribute(name, String(value));
      }
    }
  }
  
  /**
   * Sets text content on an element
   * @param element Element to set text on
   * @param text Text to set
   */
  setTextContent(element: HTMLElement, text: string): void {
    element.textContent = text;
  }
  
  /**
   * Sets HTML content on an element
   * @param element Element to set HTML on
   * @param html HTML to set
   */
  setInnerHTML(element: HTMLElement, html: string): void {
    element.innerHTML = html;
  }
  
  /**
   * Appends a child to an element
   * @param parent Parent element
   * @param child Child element
   */
  appendChild(parent: HTMLElement, child: HTMLElement): void {
    parent.appendChild(child);
  }
  
  /**
   * Removes a child from an element
   * @param parent Parent element
   * @param child Child element
   */
  removeChild(parent: HTMLElement, child: HTMLElement): void {
    parent.removeChild(child);
  }
  
  /**
   * Removes all children from an element
   * @param element Element to remove children from
   */
  removeAllChildren(element: HTMLElement): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
} 