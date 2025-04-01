/**
 * JSON Formatter
 * A simple library for formatting and displaying JSON data
 */

(function(global) {
  'use strict';
  
  /**
   * JSONFormatter class
   * Formats and displays JSON data with collapsible sections
   */
  class JSONFormatter {
    /**
     * Constructor
     * @param {Element} container - Container element
     * @param {Object} options - Configuration options
     */
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign({
        collapsed: false,
        maxDepth: 5,
        theme: 'light'
      }, options);
      
      this.data = null;
      this.initialized = false;
    }
    
    /**
     * Set JSON data
     * @param {any} data - JSON data to format
     */
    setData(data) {
      this.data = data;
      this.render();
    }
    
    /**
     * Render the JSON data
     */
    render() {
      if (!this.container) return;
      
      // Clear container
      this.container.innerHTML = '';
      
      // Add theme class
      this.container.classList.add(`json-formatter-${this.options.theme}`);
      
      // Create formatter element
      const formatterElement = document.createElement('div');
      formatterElement.className = 'json-formatter';
      
      // Render the data
      const content = this.renderValue(this.data, 0);
      formatterElement.appendChild(content);
      
      // Add to container
      this.container.appendChild(formatterElement);
      
      // Add event listeners
      this.addEventListeners();
      
      this.initialized = true;
    }
    
    /**
     * Render a value based on its type
     * @param {any} value - Value to render
     * @param {number} depth - Current depth
     * @returns {Element} Rendered element
     */
    renderValue(value, depth) {
      const type = this.getType(value);
      const element = document.createElement('div');
      element.className = `json-formatter-item json-formatter-${type}`;
      
      switch (type) {
        case 'object':
          return this.renderObject(value, depth);
        
        case 'array':
          return this.renderArray(value, depth);
        
        case 'string':
          element.innerHTML = `<span class="json-formatter-string">"${this.escapeHTML(value)}"</span>`;
          break;
        
        case 'number':
          element.innerHTML = `<span class="json-formatter-number">${value}</span>`;
          break;
        
        case 'boolean':
          element.innerHTML = `<span class="json-formatter-boolean">${value}</span>`;
          break;
        
        case 'null':
          element.innerHTML = `<span class="json-formatter-null">null</span>`;
          break;
        
        case 'undefined':
          element.innerHTML = `<span class="json-formatter-undefined">undefined</span>`;
          break;
      }
      
      return element;
    }
    
    /**
     * Render object
     * @param {Object} obj - Object to render
     * @param {number} depth - Current depth
     * @returns {Element} Rendered element
     */
    renderObject(obj, depth) {
      const element = document.createElement('div');
      element.className = 'json-formatter-object';
      
      const isCollapsed = this.options.collapsed || depth >= this.options.maxDepth;
      const keys = Object.keys(obj);
      const isEmpty = keys.length === 0;
      
      // Create toggle button
      const toggle = document.createElement('span');
      toggle.className = `json-formatter-toggle ${isCollapsed ? 'collapsed' : 'expanded'}`;
      toggle.innerHTML = isCollapsed ? '&#9654;' : '&#9660;';
      toggle.setAttribute('data-type', 'object');
      
      // Create preview
      const preview = document.createElement('span');
      preview.className = 'json-formatter-preview';
      preview.innerHTML = isEmpty 
        ? '{}'
        : `{ ${this.getObjectPreview(obj)} }`;
      
      // Create header
      const header = document.createElement('div');
      header.className = 'json-formatter-header';
      
      if (!isEmpty) {
        header.appendChild(toggle);
      }
      
      header.appendChild(preview);
      element.appendChild(header);
      
      // Create children container
      if (!isEmpty) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = `json-formatter-children ${isCollapsed ? 'hidden' : ''}`;
        
        // Add each property
        keys.forEach(key => {
          const property = document.createElement('div');
          property.className = 'json-formatter-property';
          
          // Property key
          const keyElement = document.createElement('span');
          keyElement.className = 'json-formatter-key';
          keyElement.textContent = key;
          
          // Property colon
          const colonElement = document.createElement('span');
          colonElement.className = 'json-formatter-colon';
          colonElement.textContent = ': ';
          
          // Property value
          const valueElement = this.renderValue(obj[key], depth + 1);
          
          // Assemble property
          property.appendChild(keyElement);
          property.appendChild(colonElement);
          property.appendChild(valueElement);
          
          childrenContainer.appendChild(property);
        });
        
        element.appendChild(childrenContainer);
      }
      
      return element;
    }
    
    /**
     * Render array
     * @param {Array} arr - Array to render
     * @param {number} depth - Current depth
     * @returns {Element} Rendered element
     */
    renderArray(arr, depth) {
      const element = document.createElement('div');
      element.className = 'json-formatter-array';
      
      const isCollapsed = this.options.collapsed || depth >= this.options.maxDepth;
      const isEmpty = arr.length === 0;
      
      // Create toggle button
      const toggle = document.createElement('span');
      toggle.className = `json-formatter-toggle ${isCollapsed ? 'collapsed' : 'expanded'}`;
      toggle.innerHTML = isCollapsed ? '&#9654;' : '&#9660;';
      toggle.setAttribute('data-type', 'array');
      
      // Create preview
      const preview = document.createElement('span');
      preview.className = 'json-formatter-preview';
      preview.innerHTML = isEmpty 
        ? '[]'
        : `[ ${this.getArrayPreview(arr)} ]`;
      
      // Create header
      const header = document.createElement('div');
      header.className = 'json-formatter-header';
      
      if (!isEmpty) {
        header.appendChild(toggle);
      }
      
      header.appendChild(preview);
      element.appendChild(header);
      
      // Create children container
      if (!isEmpty) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = `json-formatter-children ${isCollapsed ? 'hidden' : ''}`;
        
        // Add each item
        arr.forEach((item, index) => {
          const property = document.createElement('div');
          property.className = 'json-formatter-property';
          
          // Property key (index)
          const keyElement = document.createElement('span');
          keyElement.className = 'json-formatter-key json-formatter-index';
          keyElement.textContent = index;
          
          // Property colon
          const colonElement = document.createElement('span');
          colonElement.className = 'json-formatter-colon';
          colonElement.textContent = ': ';
          
          // Property value
          const valueElement = this.renderValue(item, depth + 1);
          
          // Assemble property
          property.appendChild(keyElement);
          property.appendChild(colonElement);
          property.appendChild(valueElement);
          
          childrenContainer.appendChild(property);
        });
        
        element.appendChild(childrenContainer);
      }
      
      return element;
    }
    
    /**
     * Add event listeners to toggle elements
     */
    addEventListeners() {
      const toggles = this.container.querySelectorAll('.json-formatter-toggle');
      
      toggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          const target = e.currentTarget;
          const isCollapsed = target.classList.contains('collapsed');
          
          if (isCollapsed) {
            target.classList.remove('collapsed');
            target.classList.add('expanded');
            target.innerHTML = '&#9660;';
            
            const children = target.parentElement.nextElementSibling;
            if (children) {
              children.classList.remove('hidden');
            }
          } else {
            target.classList.remove('expanded');
            target.classList.add('collapsed');
            target.innerHTML = '&#9654;';
            
            const children = target.parentElement.nextElementSibling;
            if (children) {
              children.classList.add('hidden');
            }
          }
        });
      });
    }
    
    /**
     * Get object preview
     * @param {Object} obj - Object to preview
     * @returns {string} Preview string
     */
    getObjectPreview(obj) {
      const keys = Object.keys(obj);
      
      if (keys.length === 0) {
        return '';
      }
      
      return keys.length > 3
        ? `${keys.slice(0, 3).join(', ')}, ...`
        : keys.join(', ');
    }
    
    /**
     * Get array preview
     * @param {Array} arr - Array to preview
     * @returns {string} Preview string
     */
    getArrayPreview(arr) {
      if (arr.length === 0) {
        return '';
      }
      
      return arr.length > 3
        ? `${arr.length} items`
        : arr.map(item => this.getValuePreview(item)).join(', ');
    }
    
    /**
     * Get value preview
     * @param {any} value - Value to preview
     * @returns {string} Preview string
     */
    getValuePreview(value) {
      const type = this.getType(value);
      
      switch (type) {
        case 'object':
          return '{...}';
        
        case 'array':
          return '[...]';
        
        case 'string':
          return value.length > 20
            ? `"${value.substring(0, 20)}..."`
            : `"${value}"`;
        
        default:
          return String(value);
      }
    }
    
    /**
     * Get type of value
     * @param {any} value - Value to check
     * @returns {string} Type of value
     */
    getType(value) {
      if (value === null) {
        return 'null';
      }
      
      if (value === undefined) {
        return 'undefined';
      }
      
      if (Array.isArray(value)) {
        return 'array';
      }
      
      return typeof value;
    }
    
    /**
     * Escape HTML
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHTML(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    
    /**
     * Clear the container
     */
    clear() {
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
    
    /**
     * Set theme
     * @param {string} theme - Theme name
     */
    setTheme(theme) {
      this.options.theme = theme;
      
      if (this.initialized) {
        this.container.classList.remove('json-formatter-light', 'json-formatter-dark');
        this.container.classList.add(`json-formatter-${theme}`);
      }
    }
  }
  
  // Export JSONFormatter
  global.JSONFormatter = JSONFormatter;
  
})(typeof window !== 'undefined' ? window : this); 