// Types improved by ts-improve-types
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
  CHECKBOX = 'checkbox',
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
  defaultValue?: unknown;
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
    custom?: (value: string) => boolean | string;
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
    values: Record<string, unknown> = {},
    onSubmit?: (data: Record<string, unknown>) => void,
    onCancel?: () => void,
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
      const fieldValue = values[field.name];
      // Ensure the value passed to generateField is string | undefined
      const initialValue = typeof fieldValue === 'string' ? fieldValue : undefined;
      const formGroup = this.generateField(field, initialValue);
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
    form.addEventListener('submit', event => {
      event.preventDefault();

      // Get form data
      const formData = new FormData(form);
      const data: Record<string, unknown> = {};

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
    value: unknown = field.defaultValue,
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
      case FieldType.TEXTAREA: {
        input = document.createElement('textarea');
        (input as HTMLTextAreaElement).rows = 4;
        (input as HTMLTextAreaElement).value = String(value ?? '');
        break;
      }
      case FieldType.SELECT: {
        input = document.createElement('select');
        if (field.options && Array.isArray(field.options)) {
          if (!field.required) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'Select...';
            input.appendChild(emptyOption);
          }
          field.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            if (String(value ?? '') === option.value) {
              optionElement.selected = true;
            }
            input.appendChild(optionElement);
          });
        }
        break;
      }
      case FieldType.BOOLEAN: {
        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'flex items-center';
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'checkbox';
        input.className = 'h-4 w-4 mr-2';
        if (value) {
          (input as HTMLInputElement).checked = true;
        }
        checkboxWrapper.appendChild(input);
        if (formGroup.querySelector('label')) {
          const label = formGroup.querySelector('label');
          formGroup.removeChild(label as Node);
          checkboxWrapper.appendChild(label as Node);
        }
        formGroup.appendChild(checkboxWrapper);
        break;
      }
      case FieldType.JSON: {
        input = document.createElement('textarea');
        (input as HTMLTextAreaElement).rows = 6;
        (input as HTMLTextAreaElement).className = 'font-mono text-sm';
        if (typeof value === 'object' && value !== null) {
          (input as HTMLTextAreaElement).value = JSON.stringify(value, null, 2);
        } else {
          (input as HTMLTextAreaElement).value = String(value ?? '');
        }
        break;
      }
      default: {
        input = document.createElement('input');
        (input as HTMLInputElement).type = field.type as string;
        (input as HTMLInputElement).value = value !== undefined ? String(value) : '';
        if (field.type === FieldType.NUMBER || field.type === FieldType.RANGE) {
          if (field.min !== undefined) (input as HTMLInputElement).min = String(field.min);
          if (field.max !== undefined) (input as HTMLInputElement).max = String(field.max);
          if (field.step !== undefined) (input as HTMLInputElement).step = String(field.step);
        }
        break;
      }
    }

    // Throw error if input wasn't assigned (shouldn't happen with default case)
    if (!input) {
      throw new Error(`Failed to create input element for field type: ${field.type}`);
    }

    // Set common attributes (input is now guaranteed to be HTMLElement)
    input.id = field.name;
    if (
      input instanceof HTMLInputElement ||
      input instanceof HTMLTextAreaElement ||
      input instanceof HTMLSelectElement
    ) {
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
    const baseClass =
      'w-full rounded border border-border p-2 focus:outline-none focus:ring-2 focus:ring-primary-500';

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
   * @param _rules (Optional) Additional rules - currently unused
   * @returns Validation result
   */
  static validateForm(schema: FormSchema, data: Record<string, unknown>, _rules?: unknown): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: {},
    };

    schema.fields.forEach(field => {
      const value = data[field.name];
      const validation = field.validation || {};

      const isRequired = field.required || validation.required;
      if (isRequired && (value === undefined || value === null || value === '')) {
        result.valid = false;
        result.errors[field.name] = `${field.label || field.name} is required`;
        return;
      }

      if (!isRequired && (value === undefined || value === null || value === '')) {
          return;
      }

      const stringValue = String(value);
      const numberValue = Number(value);

      if (validation.minLength !== undefined && stringValue.length < validation.minLength) {
          result.valid = false;
          result.errors[field.name] = `${field.label || field.name} must be at least ${validation.minLength} characters`;
          return;
      }
      if (validation.maxLength !== undefined && stringValue.length > validation.maxLength) {
          result.valid = false;
          result.errors[field.name] = `${field.label || field.name} must be no more than ${validation.maxLength} characters`;
          return;
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(stringValue)) {
          result.valid = false;
          result.errors[field.name] = validation.message || `${field.label || field.name} has an invalid format`;
          return;
      }

      if (typeof value === 'number' || !isNaN(numberValue)) {
          const numToCheck = typeof value === 'number' ? value : numberValue;
          if (validation.min !== undefined && numToCheck < validation.min) {
              result.valid = false;
              result.errors[field.name] = `${field.label || field.name} must be at least ${validation.min}`;
              return;
          }
          if (validation.max !== undefined && numToCheck > validation.max) {
              result.valid = false;
              result.errors[field.name] = `${field.label || field.name} must be no more than ${validation.max}`;
              return;
          }
      }

      // Custom validation
      if (validation.custom) {
          // Pass string representation to custom validator
          const customResult = validation.custom(String(value));
          if (customResult !== true) {
              result.valid = false;
              result.errors[field.name] = typeof customResult === 'string' ? customResult : `${field.label || field.name} is invalid`;
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
  static getFormData(form: HTMLFormElement | string): Record<string, unknown> {
    const formElement =
      typeof form === 'string' ? (document.getElementById(form) as HTMLFormElement) : form;

    if (!formElement || !(formElement instanceof HTMLFormElement)) {
      throw new Error('Invalid form element');
    }

    const formData = new FormData(formElement);
    const data: Record<string, unknown> = {};

    formData.forEach((value, key) => {
      if (value instanceof File) {
        data[key] = value;
        return;
      }

      const input = formElement.querySelector(`[name="${key}"]`) as HTMLInputElement;
      if (!input) {
        data[key] = value;
        return;
      }

      switch (input.type) {
        case 'number': {
          data[key] = value === '' ? null : Number(value);
          break;
        }
        case 'checkbox': {
          data[key] = input.checked;
          break;
        }
        case 'radio': {
          const radio = formElement.querySelector(
            `[name="${key}"][value="${value}"]`,
          ) as HTMLInputElement;
          if (radio) radio.checked = true;
          break;
        }
        case 'select-one':
        case 'select-multiple': {
          if (input instanceof HTMLSelectElement) {
            Array.from(input.options).forEach(option => {
              if (option.value === String(value)) {
                option.selected = true;
              }
            });
          }
          break;
        default:
          if (typeof value === 'object' && value !== null) {
            data[key] = JSON.stringify(value, null, 2);
          } else if (value !== null && value !== undefined) {
            data[key] = String(value);
          } else {
            data[key] = '';
          }
      }
    });

    return data;
  }

  /**
   * Set form values
   * @param form Form element or form ID
   * @param values Values to set
   */
  static setFormValues(form: HTMLFormElement | string, values: Record<string, unknown>): void {
    const formElement =
      typeof form === 'string' ? (document.getElementById(form) as HTMLFormElement | null) : form;

    if (!formElement || !(formElement instanceof HTMLFormElement)) {
      logger.error('Invalid form element provided to setFormValues');
      return;
    }

    Object.entries(values).forEach(([key, value]) => {
      const elements = formElement.querySelectorAll(`[name="${key}"]`);
      if (elements.length === 0) return;

      const firstElement = elements[0];

      if (firstElement instanceof HTMLInputElement && firstElement.type === 'radio') {
        // Handle radio buttons
        elements.forEach(el => {
          if (el instanceof HTMLInputElement) {
            el.checked = (el.value === String(value));
          }
        });
      } else if (firstElement instanceof HTMLInputElement || firstElement instanceof HTMLTextAreaElement || firstElement instanceof HTMLSelectElement) {
        // Handle other input types
        const input = firstElement;
        const inputType = input.type;

        switch (inputType) {
          case 'checkbox':
            if (input instanceof HTMLInputElement) {
              input.checked = !!value;
            }
            break;
          case 'select-one':
          case 'select-multiple':
             Array.from((input as HTMLSelectElement).options).forEach(option => {
                 option.selected = Array.isArray(value)
                   ? value.some(val => String(val) === option.value)
                   : String(value) === option.value;
             });
            break;
          case 'file':
            logger.warn(`Cannot set value for file input '${key}'`);
            break;
          default:
            if ('value' in input) {
              if (typeof value === 'object' && value !== null) {
                input.value = JSON.stringify(value, null, 2);
              } else if (value !== null && value !== undefined) {
                input.value = String(value);
              } else {
                input.value = '';
              }
            }
            break;
        } // End switch
      } // End else if
    }); // End forEach
  }

  /**
   * Reset a form
   * @param form Form element or form ID
   */
  static resetForm(form: HTMLFormElement | string): void {
    const formElement =
      typeof form === 'string' ? (document.getElementById(form) as HTMLFormElement | null) : form;

    if (!formElement || !(formElement instanceof HTMLFormElement)) {
      logger.error('Invalid form element provided to resetForm');
      return;
    }
    formElement.reset();
    formElement.querySelectorAll('.error-message').forEach(el => el.remove());
  }
}

/*
// Add legacy compatibility methods

export function serializeForm(form: HTMLFormElement | string): Record<string, unknown> {
  return FormUtils.getFormData(form);
}

export function validateHtml5Form(form: HTMLFormElement | string): boolean {
  const formElement =
    typeof form === 'string' ? (document.getElementById(form) as HTMLFormElement) : form;
  if (!formElement || !(formElement instanceof HTMLFormElement)) {
    throw new Error('Invalid form element');
  }
  return formElement.checkValidity();
}

export function populateForm(form: HTMLFormElement | string, data: Record<string, unknown>): void {
  FormUtils.setFormValues(form, data);
}

export function resetFormLegacy(form: HTMLFormElement | string): void {
  FormUtils.resetForm(form);
}
*/
