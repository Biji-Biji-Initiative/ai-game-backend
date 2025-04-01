/**
 * Form Utilities
 * 
 * Utilities for generating and validating forms from schemas.
 */

import { logger } from './logger';

/**
 * Form field type enum
 */
export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  DATE = 'date',
  DATETIME = 'datetime-local',
  TIME = 'time',
  FILE = 'file',
  HIDDEN = 'hidden',
  PASSWORD = 'password',
  EMAIL = 'email',
  URL = 'url',
  COLOR = 'color',
  RANGE = 'range',
  JSON = 'json',
  CHECKBOX = 'checkbox'
}

/**
 * Form field schema
 */
export interface FormFieldSchema {
  name: string;
  label?: string;
  type: FieldType | string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{
    value: string;
    label: string;
  }>;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  validation?: {
    pattern?: string;
    message?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    required?: boolean;
    custom?: (value: any) => boolean | string;
  };
}

/**
 * Form schema
 */
export interface FormSchema {
  id: string;
  title?: string;
  description?: string;
  fields: FormFieldSchema[];
  submitButtonText?: string;
  cancelButtonText?: string;
  className?: string;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Form generation and validation utilities
 */
export class FormUtils {
  /**
   * Generate a form from a schema
   * @param schema Form schema
   * @param container Container element to append form
   * @param values Initial form values
   * @param onSubmit Submit handler
   * @param onCancel Cancel handler
   * @returns The form element
   */
  static generateForm(
    schema: FormSchema,
    container: HTMLElement,
    values: Record<string, any> = {},
    onSubmit?: (data: Record<string, any>) => void,
    onCancel?: () => void
  ): HTMLFormElement {
    // Clear container
    container.innerHTML = '';
    
    // Create form element
    const form = document.createElement('form');
    form.id = schema.id;
    form.className = schema.className || 'space-y-4';
    
    // Add form title and description if provided
    if (schema.title) {
      const title = document.createElement('h3');
      title.className = 'text-lg font-medium';
      title.textContent = schema.title;
      form.appendChild(title);
    }
    
    if (schema.description) {
      const description = document.createElement('p');
      description.className = 'text-sm text-text-muted mb-4';
      description.textContent = schema.description;
      form.appendChild(description);
    }
    
    // Generate form fields
    schema.fields.forEach(field => {
      const formGroup = this.generateField(field, values[field.name]);
      form.appendChild(formGroup);
    });
    
    // Add form actions
    const actions = document.createElement('div');
    actions.className = 'flex space-x-2 mt-6';
    
    // Submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'btn btn-primary';
    submitButton.textContent = schema.submitButtonText || 'Submit';
    actions.appendChild(submitButton);
    
    // Cancel button if handler provided
    if (onCancel) {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn-secondary';
      cancelButton.textContent = schema.cancelButtonText || 'Cancel';
      cancelButton.addEventListener('click', onCancel);
      actions.appendChild(cancelButton);
    }
    
    form.appendChild(actions);
    
    // Handle form submission
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      
      // Get form data
      const formData = new FormData(form);
      const data: Record<string, any> = {};
      
      // Process form values
      schema.fields.forEach(field => {
        const value = formData.get(field.name);
        
        // Handle special field types
        switch (field.type) {
          case FieldType.NUMBER:
            data[field.name] = value === '' ? null : Number(value);
            break;
          case FieldType.BOOLEAN:
            data[field.name] = value === 'on' || value === 'true';
            break;
          case FieldType.JSON:
            try {
              data[field.name] = value === '' ? null : JSON.parse(value as string);
            } catch (error) {
              logger.error(`Invalid JSON for field ${field.name}:`, error);
              data[field.name] = null;
            }
            break;
          default:
            data[field.name] = value;
        }
      });
      
      // Validate form data
      const validation = this.validateForm(schema, data);
      
      // Clear previous error messages
      form.querySelectorAll('.error-message').forEach(el => el.remove());
      
      // Display error messages if any
      if (!validation.valid) {
        Object.entries(validation.errors).forEach(([field, message]) => {
          const fieldElement = form.querySelector(`[name="${field}"]`);
          if (fieldElement) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message text-red-500 text-sm mt-1';
            errorMessage.textContent = message;
            fieldElement.parentElement?.appendChild(errorMessage);
          }
        });
        
        return;
      }
      
      // Call submit handler if provided
      if (onSubmit) {
        onSubmit(data);
      }
    });
    
    // Append form to container
    container.appendChild(form);
    
    return form;
  }
  
  /**
   * Generate a form field
   * @param field Field schema
   * @param value Initial value
   * @returns Form field element
   */
  static generateField(
    field: FormFieldSchema,
    value: any = field.defaultValue
  ): HTMLDivElement {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group mb-4';
    
    // Create label if provided
    if (field.label) {
      const label = document.createElement('label');
      label.htmlFor = field.name;
      label.className = 'block text-sm font-medium mb-1';
      label.textContent = field.label;
      
      if (field.required) {
        const required = document.createElement('span');
        required.className = 'text-red-500 ml-1';
        required.textContent = '*';
        label.appendChild(required);
      }
      
      formGroup.appendChild(label);
    }
    
    // Create input field based on type
    let input: HTMLElement;
    
    switch (field.type) {
      case FieldType.TEXTAREA:
        input = document.createElement('textarea');
        (input as HTMLTextAreaElement).rows = 4;
        (input as HTMLTextAreaElement).value = value || '';
        break;
        
      case FieldType.SELECT:
        input = document.createElement('select');
        
        // Add options
        if (field.options && Array.isArray(field.options)) {
          // Add empty option if not required
          if (!field.required) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Select...';
            input.appendChild(emptyOption);
          }
          
          // Add field options
          field.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            
            // Set selected if value matches
            if (value === option.value) {
              optionElement.selected = true;
            }
            
            input.appendChild(optionElement);
          });
        }
        break;
        
      case FieldType.BOOLEAN:
        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'flex items-center';
        
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'checkbox';
        input.className = 'h-4 w-4 mr-2';
        
        if (value === true) {
          (input as HTMLInputElement).checked = true;
        }
        
        checkboxWrapper.appendChild(input);
        
        // Move label next to checkbox
        if (formGroup.querySelector('label')) {
          const label = formGroup.querySelector('label');
          formGroup.removeChild(label as Node);
          checkboxWrapper.appendChild(label as Node);
        }
        
        formGroup.appendChild(checkboxWrapper);
        break;
        
      case FieldType.JSON:
        input = document.createElement('textarea');
        (input as HTMLTextAreaElement).rows = 6;
        (input as HTMLTextAreaElement).className = 'font-mono text-sm';
        
        // Format JSON if value is an object
        if (typeof value === 'object' && value !== null) {
          (input as HTMLTextAreaElement).value = JSON.stringify(value, null, 2);
    } else {
          (input as HTMLTextAreaElement).value = value || '';
        }
        break;
        
      default:
        input = document.createElement('input');
        (input as HTMLInputElement).type = field.type as string;
        (input as HTMLInputElement).value = value !== undefined ? String(value) : '';
        
        // Set min, max, step for number inputs
        if (field.type === FieldType.NUMBER || field.type === FieldType.RANGE) {
          if (field.min !== undefined) (input as HTMLInputElement).min = String(field.min);
          if (field.max !== undefined) (input as HTMLInputElement).max = String(field.max);
          if (field.step !== undefined) (input as HTMLInputElement).step = String(field.step);
        }
    }
    
    // Set common attributes
    input.id = field.name;
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
      input.name = field.name;
    }
    input.className = field.className || this.getDefaultClassForType(field.type as string);
    
    if (field.placeholder) (input as HTMLInputElement).placeholder = field.placeholder;
    if (field.required) input.setAttribute('required', 'required');
    if (field.disabled) input.setAttribute('disabled', 'disabled');
    if (field.readOnly) input.setAttribute('readonly', 'readonly');
    if (field.pattern) (input as HTMLInputElement).pattern = field.pattern;
    
    // Add description if provided
    if (field.description) {
      const description = document.createElement('div');
      description.className = 'text-xs text-text-muted mt-1';
      description.textContent = field.description;
      formGroup.appendChild(description);
    }
    
    // Only append input if not already appended (like in checkbox case)
    if (!formGroup.contains(input)) {
      formGroup.appendChild(input);
    }
    
    return formGroup;
  }
  
  /**
   * Get default CSS class for input type
   * @param type Input type
   * @returns CSS class string
   */
  static getDefaultClassForType(type: string): string {
    const baseClass = 'w-full rounded border border-border p-2 focus:outline-none focus:ring-2 focus:ring-primary-500';
    
    switch (type) {
      case FieldType.CHECKBOX:
      case FieldType.BOOLEAN:
        return 'h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500';
      case FieldType.TEXTAREA:
      case FieldType.JSON:
        return `${baseClass} min-h-[6rem]`;
      default:
        return baseClass;
    }
  }
  
  /**
   * Validate form data against schema
   * @param schema Form schema
   * @param data Form data
   * @returns Validation result
   */
  static validateForm(schema: FormSchema, data: Record<string, any>): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: {}
    };
    
    // Validate each field
    schema.fields.forEach(field => {
      const value = data[field.name];
      const validation = field.validation || {};
      
      // Required field
      const isRequired = field.required || validation.required;
      if (isRequired && (value === undefined || value === null || value === '')) {
        result.valid = false;
        result.errors[field.name] = `${field.label || field.name} is required`;
        return;
      }
      
      // Skip remaining validation if value is empty
      if (value === undefined || value === null || value === '') {
        return;
      }
      
      // String validations
      if (typeof value === 'string') {
        // Min length
        if (validation.minLength !== undefined && value.length < validation.minLength) {
          result.valid = false;
          result.errors[field.name] = `${field.label || field.name} must be at least ${validation.minLength} characters`;
          return;
        }
        
        // Max length
        if (validation.maxLength !== undefined && value.length > validation.maxLength) {
          result.valid = false;
          result.errors[field.name] = `${field.label || field.name} must be no more than ${validation.maxLength} characters`;
          return;
        }
        
        // Pattern
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          result.valid = false;
          result.errors[field.name] = validation.message || `${field.label || field.name} has an invalid format`;
          return;
        }
      }
      
      // Number validations
      if (typeof value === 'number') {
        // Min value
        if (validation.min !== undefined && value < validation.min) {
          result.valid = false;
          result.errors[field.name] = `${field.label || field.name} must be at least ${validation.min}`;
          return;
        }
        
        // Max value
        if (validation.max !== undefined && value > validation.max) {
          result.valid = false;
          result.errors[field.name] = `${field.label || field.name} must be no more than ${validation.max}`;
          return;
        }
      }
      
      // Custom validation
      if (validation.custom) {
        const customResult = validation.custom(value);
        if (customResult !== true) {
          result.valid = false;
          result.errors[field.name] = typeof customResult === 'string' 
            ? customResult 
            : `${field.label || field.name} is invalid`;
          return;
        }
      }
    });

  return result;
}

/**
   * Get form data as an object
   * @param form Form element or form ID
   * @returns Form data as object
   */
  static getFormData(form: HTMLFormElement | string): Record<string, any> {
    // Get form element
    const formElement = typeof form === 'string'
      ? document.getElementById(form) as HTMLFormElement
      : form;

  if (!formElement || !(formElement instanceof HTMLFormElement)) {
    throw new Error('Invalid form element');
  }

    // Get form data
    const formData = new FormData(formElement);
    const data: Record<string, any> = {};
    
    // Convert FormData to object
    formData.forEach((value, key) => {
      // Handle file inputs
      if (value instanceof File) {
        data[key] = value;
        return;
      }
      
      // Handle other inputs
      const input = formElement.querySelector(`[name="${key}"]`) as HTMLInputElement;
      if (!input) {
        data[key] = value;
        return;
      }
      
      // Process based on input type
      switch (input.type) {
        case 'number':
          data[key] = value === '' ? null : Number(value);
          break;
        case 'checkbox':
          data[key] = input.checked;
          break;
        default:
          data[key] = value;
      }
    });
    
    return data;
  }
  
  /**
   * Set form values
   * @param form Form element or form ID
   * @param values Values to set
   */
  static setFormValues(form: HTMLFormElement | string, values: Record<string, any>): void {
    // Get form element
    const formElement = typeof form === 'string'
      ? document.getElementById(form) as HTMLFormElement
      : form;
    
    if (!formElement || !(formElement instanceof HTMLFormElement)) {
      throw new Error('Invalid form element');
    }
    
    // Set values for each field
    Object.entries(values).forEach(([key, value]) => {
      const input = formElement.querySelector(`[name="${key}"]`) as HTMLInputElement;
      if (!input) return;
      
      // Set value based on input type
      switch (input.type) {
      case 'checkbox':
          input.checked = !!value;
        break;
      case 'radio':
          const radio = formElement.querySelector(`[name="${key}"][value="${value}"]`) as HTMLInputElement;
          if (radio) radio.checked = true;
        break;
        case 'select-one':
      case 'select-multiple':
          if (input instanceof HTMLSelectElement) {
            Array.from(input.options).forEach(option => {
              option.selected = Array.isArray(value)
                ? value.includes(option.value)
                : option.value === String(value);
          });
        }
        break;
      default:
          if (typeof value === 'object' && value !== null) {
            input.value = JSON.stringify(value, null, 2);
          } else if (value !== null && value !== undefined) {
            input.value = String(value);
          } else {
            input.value = '';
          }
    }
  });
}

/**
   * Reset a form
   * @param form Form element or form ID
   */
  static resetForm(form: HTMLFormElement | string): void {
    // Get form element
    const formElement = typeof form === 'string'
      ? document.getElementById(form) as HTMLFormElement
      : form;
    
    if (!formElement || !(formElement instanceof HTMLFormElement)) {
      throw new Error('Invalid form element');
    }
    
    // Reset the form
    formElement.reset();
    
    // Clear error messages
    formElement.querySelectorAll('.error-message').forEach(el => el.remove());
  }
}

// Add legacy compatibility methods

/**
 * Serializes a form into a JSON object (legacy compatibility method)
 * @param form Form element or selector
 * @returns The serialized form data
 */
export function serializeForm(form: HTMLFormElement | string): Record<string, any> {
  return FormUtils.getFormData(form);
}

/**
 * Validates a form using HTML5 validation (legacy compatibility method)
 * @param form Form element or selector
 * @returns Whether the form is valid
 */
export function validateForm(form: HTMLFormElement | string): boolean {
  // Get form element
  const formElement = typeof form === 'string'
    ? document.getElementById(form) as HTMLFormElement
    : form;

  if (!formElement || !(formElement instanceof HTMLFormElement)) {
    throw new Error('Invalid form element');
  }

  return formElement.checkValidity();
}

/**
 * Populates a form with data (legacy compatibility method)
 * @param form Form element or selector
 * @param data Data to populate the form with
 */
export function populateForm(form: HTMLFormElement | string, data: Record<string, any>): void {
  FormUtils.setFormValues(form, data);
}

/**
 * Resets a form (legacy compatibility method)
 * @param form Form element or selector
 */
export function resetForm(form: HTMLFormElement | string): void {
  FormUtils.resetForm(form);
}
