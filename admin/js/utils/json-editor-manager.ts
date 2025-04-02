// Types improved by ts-improve-types
/**
 * JSON Editor Manager Module
 * Manages JSON Editor instances
 */

import { JSONEditor } from '../vendor/jsoneditor.min.js';

/**
 *
 */
export class JSONEditorManager {
  /**
   * Creates a new JSONEditorManager instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      defaultMode: 'code',
      defaultModes: ['code', 'view', 'form', 'text'],
      placeholderSelector: '.json-editor-container',
      onChange: null,
      ...options,
    };

    this.editors = new Map(); // Property added
    this.defaultOptions = {
      mode: this.options.defaultMode,
      modes: this.options.defaultModes,
    };
  }

  /**
   * Initializes JSON editors based on placeholders in the DOM
   * @param {string} containerSelector - The container selector to look within (optional)
   * @returns {Map} The initialized editors
   */
  initializeEditors(containerSelector = null) {
    const container = containerSelector ? document.querySelector(containerSelector) : document;

    if (!container) {
      console.error('JSON Editor Manager: Container not found');
      return this.editors;
    }

    // Find all editor placeholders
    const placeholders = container.querySelectorAll(this.options.placeholderSelector);

    // Initialize each editor
    placeholders.forEach(placeholder => {
      this.createEditor(placeholder);
    });

    return this.editors;
  }

  /**
   * Creates a JSON editor in a placeholder element
   * @param {HTMLElement|string} placeholder - The placeholder element or selector
   * @param {Object} options - JSON editor options
   * @returns {JSONEditor} The created editor
   */
  createEditor(placeholder, options = {}) {
    try {
      // Get placeholder element
      const element =
        typeof placeholder === 'string' ? document.querySelector(placeholder) : placeholder;

      if (!element) {
        throw new Error('Placeholder element not found');
      }

      // Get placeholder ID or create one
      const id = element.id || `editor-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      if (!element.id) {
        element.id = id;
      }

      // Check if editor already exists for this placeholder
      if (this.editors.has(id)) {
        return this.editors.get(id);
      }

      // Merge with default options
      const mergedOptions = {
        ...this.defaultOptions,
        ...options,
      };

      // Add change handler if defined
      if (this.options.onChange) {
        mergedOptions.onChange = this.options.onChange;
      }

      // Create editor
      const editor = new JSONEditor(element, mergedOptions);

      // Set default empty object
      if (!options.content) {
        editor.set({});
      } else {
        // Set provided content
        editor.set(options.content);
      }

      // Store editor
      this.editors.set(id, editor);

      // Add reference to editor in element
      element._jsonEditor = editor;

      return editor;
    } catch (error) {
      console.error('Failed to create JSON editor:', error);
      return null;
    }
  }

  /**
   * Gets an editor by ID
   * @param {string} id - The editor ID
   * @returns {JSONEditor} The editor or null if not found
   */
  getEditor(id) {
    return this.editors.get(id) || null;
  }

  /**
   * Gets all editors
   * @returns {Map} The editors
   */
  getEditors() {
    return this.editors;
  }

  /**
   * Gets an editor by its container element
   * @param {HTMLElement} element - The container element
   * @returns {JSONEditor} The editor or null if not found
   */
  getEditorByElement(element) {
    // If the element has a direct reference, use it
    if (element._jsonEditor) {
      return element._jsonEditor;
    }

    // Otherwise, try to find it by ID
    return this.getEditor(element.id);
  }

  /**
   * Sets content for an editor
   * @param {string} id - The editor ID
   * @param {Object} content - The content to set
   */
  setContent(id, content) {
    const editor = this.getEditor(id);
    if (editor) {
      editor.set(content);
    }
  }

  /**
   * Gets content from an editor
   * @param {string} id - The editor ID
   * @returns {Object} The editor content
   */
  getContent(id) {
    const editor = this.getEditor(id);
    if (editor) {
      try {
        return editor.get();
      } catch (error) {
        console.error(`Error getting content from editor ${id}:`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Destroys an editor
   * @param {string} id - The editor ID
   */
  destroyEditor(id) {
    const editor = this.getEditor(id);
    if (editor) {
      try {
        editor.destroy();
      } catch (error) {
        console.error(`Error destroying editor ${id}:`, error);
      }
      this.editors.delete(id);
    }
  }

  /**
   * Destroys all editors
   */
  destroyAllEditors() {
    this.editors.forEach((editor, id) => {
      try {
        editor.destroy();
      } catch (error) {
        console.error(`Error destroying editor ${id}:`, error);
      }
    });

    this.editors.clear();
  }
}
