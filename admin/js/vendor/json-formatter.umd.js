// Types improved by ts-improve-types
/*!
 * JSON Formatter UMD v1.0.0
 * https://github.com/mohsen1/json-formatter-js
 * 
 * Simple library for formatting and displaying JSON in HTML
 */
(function (global, factory): any {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.JSONFormatter = factory());
}(this, function (): any { 'use strict';

    /**
     * Main JSONFormatter class
     */
    class JSONFormatter {
        /**
         * Constructor. Takes the JSON object to format and display.
         * @param {Object|Array|string|number|boolean|null} json - The JSON value to format
         * @param {number} [open=1] - Number of levels to expand when formatter is rendered
         * @param {Object} [options={}] - Configuration options for the formatter
         * @param {string} [options.theme=''] - Custom theme name or class prefix
         */
        constructor(json, open = 1, options = {}) {
            this.json = json;
            this.open = open;
            this.options = options;
            this.theme = options.theme || '';

            // Determine the type of this value
            this.type = this._getType(this.json);
            
            // Initialize HTML element
            this.element = this._createElement('div', 'json-formatter-row');
            
            // Add theme class if specified
            if (this.theme) {
                this.element.classList.add(`${this.theme}-row`);
            }

            // Create a wrapper element
            const wrappedValue = this._createWrappedValue();
            this.element.appendChild(wrappedValue);

            // Append children if needed
            if (this.type === 'object' || this.type === 'array') {
                this.isOpen = this.open > 0;

                // Create children and close tag
                this.children = this._createChildren(this.json, this.open - 1);
                this.element.appendChild(this.children);

                // Create toggle button if object/array has contents
                const isEmpty = this.type === 'array' ? !this.json.length : !Object.keys(this.json).length;
                if (!isEmpty) {
                    this.element.classList.add('json-formatter-open');
                    const toggler = this._createToggle();
                    wrappedValue.appendChild(toggler);
                    
                    // Listen to toggler
                    toggler.addEventListener('click', this._toggleOpen.bind(this));
                }
            }
        }

        /**
         * Toggles the "open" state
         */
        _toggleOpen(e) {
            e.preventDefault();
            e.stopPropagation();
            
            this.isOpen = !this.isOpen;
            this.element.classList.toggle('json-formatter-open', this.isOpen);
            this.element.classList.toggle('json-formatter-closed', !this.isOpen);
        }

        /**
         * Creates a toggle button for an object or array
         * @returns {HTMLElement} The toggle button
         */
        _createToggle() {
            const toggler = this._createElement('span', 'json-formatter-toggler');
            return toggler;
        }

        /**
         * Get the formatted type of a value
         * @param {*} value - The value to get the type of
         * @returns {string} - The type name
         */
        _getType(value) {
            if (value === null) return 'null';
            if (value === undefined) return 'undefined';
            
            const type = typeof value;
            
            if (type === 'object') {
                if (Array.isArray(value)) {
                    return 'array';
                }
                return 'object';
            }
            
            return type;
        }

        /**
         * Create an HTML element with the given type and class name
         * @param {string} type - Element type
         * @param {string} className - CSS class name
         * @returns {HTMLElement} The created element
         */
        _createElement(type, className) {
            const el = document.createElement(type);
            if (className) {
                el.classList.add(className);
            }
            return el;
        }

        /**
         * Creates the wrapped value (with key if needed) and possibly a toggler
         * @returns {HTMLElement} The wrapped value
         */
        _createWrappedValue() {
            const wrappedValue = this._createElement('div', 'json-formatter-value');
            
            // Add theme class if specified
            if (this.theme) {
                wrappedValue.classList.add(`${this.theme}-value`);
            }

            // Add the formatted value
            const formattedValue = this._createFormattedValue();
            wrappedValue.appendChild(formattedValue);

            return wrappedValue;
        }

        /**
         * Creates the formatted value HTML
         * @returns {HTMLElement} The formatted value element
         */
        _createFormattedValue() {
            const formattedValue = this._createElement('span', `json-formatter-${this.type}`);
            
            // Add theme class if specified
            if (this.theme) {
                formattedValue.classList.add(`${this.theme}-${this.type}`);
            }

            // Format based on type
            switch (this.type) {
                case 'null':
                    formattedValue.textContent = 'null';
                    break;
                case 'undefined':
                    formattedValue.textContent = 'undefined';
                    break;
                case 'string':
                    formattedValue.textContent = `"${this._escapeString(this.json)}"`;
                    break;
                case 'number':
                case 'boolean':
                    formattedValue.textContent = this.json.toString();
                    break;
                case 'array':
                    formattedValue.textContent = `Array(${this.json.length})`;
                    break;
                case 'object':
                    const keys = Object.keys(this.json);
                    formattedValue.textContent = `Object{${keys.length}}`;
                    break;
            }

            return formattedValue;
        }

        /**
         * Create children elements for array or object values
         * @param {Object|Array} value - The object or array value
         * @param {number} openLevel - The level to which children should be expanded
         * @returns {HTMLElement} The children container
         */
        _createChildren(value, openLevel) {
            const children = this._createElement('div', 'json-formatter-children');
            
            if (this.type === 'object') {
                Object.keys(value).forEach(key => {
                    const childElement = this._createChild(key, value[key], openLevel);
                    children.appendChild(childElement);
                });
            } else if (this.type === 'array') {
                value.forEach((item, index) => {
                    const childElement = this._createChild(index, item, openLevel);
                    children.appendChild(childElement);
                });
            }
            
            return children;
        }

        /**
         * Create a child element for a key-value pair
         * @param {string|number} key - The key or index
         * @param {*} value - The value
         * @param {number} openLevel - The level to which the child should be expanded
         * @returns {HTMLElement} The child formatter element
         */
        _createChild(key, value, openLevel) {
            const childFormatter = new JSONFormatter(value, openLevel, this.options);
            const childElement = childFormatter.element;
            
            // Create key element
            const keyElement = this._createElement('span', 'json-formatter-key');
            if (this.theme) {
                keyElement.classList.add(`${this.theme}-key`);
            }
            
            keyElement.textContent = this.type === 'array' ? `[${key}]` : `${key}:`;
            
            // Insert key before formatted value
            const valueElement = childElement.querySelector('.json-formatter-value');
            childElement.insertBefore(keyElement, valueElement);
            
            return childElement;
        }

        /**
         * Escape special characters in a string
         * @param {string} str - The string to escape
         * @returns {string} The escaped string
         */
        _escapeString(str) {
            return str
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
        }

        /**
         * Renders the element into a container
         * @param {HTMLElement} container - Container to render into
         */
        render(container) {
            if (container) {
                container.appendChild(this.element);
            }
            return this.element;
        }

        /**
         * Expanded all children to the given level
         * @param {number} [level=1] - The level to expand to
         */
        expand(level = 1) {
            if (this.type !== 'object' && this.type !== 'array') {
                return;
            }
            
            this.isOpen = true;
            this.element.classList.add('json-formatter-open');
            this.element.classList.remove('json-formatter-closed');
            
            if (level > 1) {
                // Expand children
                Array.from(this.children.children).forEach(child => {
                    const formatter = child.__formatter;
                    if (formatter) {
                        formatter.expand(level - 1);
                    }
                });
            }
        }

        /**
         * Collapses the formatter
         */
        collapse() {
            if (this.type !== 'object' && this.type !== 'array') {
                return;
            }
            
            this.isOpen = false;
            this.element.classList.remove('json-formatter-open');
            this.element.classList.add('json-formatter-closed');
        }

        /**
         * Toggle the open state
         */
        toggleOpen() {
            if (this.isOpen) {
                this.collapse();
            } else {
                this.expand();
            }
        }
    }

    return JSONFormatter;

})); 