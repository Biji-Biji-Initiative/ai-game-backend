/**
 * Form Utilities Module
 * Helper functions for form handling
 */

/**
 * Serializes a form into a JSON object
 * @param {HTMLFormElement|string} form - Form element or selector
 * @returns {Object} The serialized form data
 */
export function serializeForm(form) {
    // Get form element if selector is provided
    const formElement = typeof form === "string" ? document.querySelector(form) : form;
    
    if (!formElement || !(formElement instanceof HTMLFormElement)) {
        throw new Error("Invalid form element");
    }
    
    // Create FormData object
    const formData = new FormData(formElement);
    const result = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
        // Handle array fields (multiple select or checkboxes with same name)
        if (key.endsWith("[]")) {
            const baseKey = key.slice(0, -2);
            if (!result[baseKey]) {
                result[baseKey] = [];
            }
            result[baseKey].push(value);
        } else {
            result[key] = value;
        }
    }
    
    return result;
}

/**
 * Populates a form with data
 * @param {HTMLFormElement|string} form - Form element or selector
 * @param {Object} data - Data to populate the form with
 */
export function populateForm(form, data) {
    // Get form element if selector is provided
    const formElement = typeof form === "string" ? document.querySelector(form) : form;
    
    if (!formElement || !(formElement instanceof HTMLFormElement)) {
        throw new Error("Invalid form element");
    }
    
    // Iterate through form elements
    Array.from(formElement.elements).forEach(element => {
        // Skip elements without a name
        if (!element.name) return;
        
        // Get value from data
        const value = data[element.name];
        
        // Skip if value is undefined
        if (value === undefined) return;
        
        // Handle different element types
        switch (element.type) {
        case "checkbox":
            element.checked = Boolean(value);
            break;
        case "radio":
            element.checked = (element.value === value.toString());
            break;
        case "select-multiple":
            if (Array.isArray(value)) {
                Array.from(element.options).forEach(option => {
                    option.selected = value.includes(option.value);
                });
            }
            break;
        default:
            element.value = value;
            break;
        }
    });
}

/**
 * Validates a form using HTML5 validation
 * @param {HTMLFormElement|string} form - Form element or selector
 * @returns {boolean} Whether the form is valid
 */
export function validateForm(form) {
    // Get form element if selector is provided
    const formElement = typeof form === "string" ? document.querySelector(form) : form;
    
    if (!formElement || !(formElement instanceof HTMLFormElement)) {
        throw new Error("Invalid form element");
    }
    
    return formElement.checkValidity();
}

/**
 * Gets validation errors from a form
 * @param {HTMLFormElement|string} form - Form element or selector
 * @returns {Object} An object with field names as keys and error messages as values
 */
export function getFormValidationErrors(form) {
    // Get form element if selector is provided
    const formElement = typeof form === "string" ? document.querySelector(form) : form;
    
    if (!formElement || !(formElement instanceof HTMLFormElement)) {
        throw new Error("Invalid form element");
    }
    
    const errors = {};
    
    // Check each form element
    Array.from(formElement.elements).forEach(element => {
        // Skip elements without a name
        if (!element.name) return;
        
        // Skip elements that don't support validation
        if (!("checkValidity" in element)) return;
        
        // Check validity
        if (!element.checkValidity()) {
            errors[element.name] = element.validationMessage;
        }
    });
    
    return errors;
}

/**
 * Resets a form
 * @param {HTMLFormElement|string} form - Form element or selector
 */
export function resetForm(form) {
    // Get form element if selector is provided
    const formElement = typeof form === "string" ? document.querySelector(form) : form;
    
    if (!formElement || !(formElement instanceof HTMLFormElement)) {
        throw new Error("Invalid form element");
    }
    
    formElement.reset();
} 