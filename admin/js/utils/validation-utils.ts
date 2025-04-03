/**
 * Validation Utilities
 * 
 * Functions for validating data against schemas
 */

/**
 * Validation error
 */
export interface ValidationError {
  /**
   * Path to the field with error
   */
  path: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Type of validation that failed
   */
  type: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  valid: boolean;
  
  /**
   * Validation errors
   */
  errors: ValidationError[];
}

/**
 * Schema field definition
 */
export interface SchemaField {
  /**
   * Field type
   */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  
  /**
   * Field is required
   */
  required?: boolean;
  
  /**
   * Field description
   */
  description?: string;
  
  /**
   * Nested schema for objects
   */
  properties?: Record<string, SchemaField>;
  
  /**
   * Schema for array items
   */
  items?: SchemaField;
  
  /**
   * Minimum value for numbers
   */
  minimum?: number;
  
  /**
   * Maximum value for numbers
   */
  maximum?: number;
  
  /**
   * Minimum length for strings/arrays
   */
  minLength?: number;
  
  /**
   * Maximum length for strings/arrays
   */
  maxLength?: number;
  
  /**
   * Pattern for strings
   */
  pattern?: string;
  
  /**
   * Enum values
   */
  enum?: (string | number | boolean)[];
  
  /**
   * Default value
   */
  default?: unknown;
  
  /**
   * Format validator
   */
  format?: 'email' | 'uri' | 'date' | 'time' | 'date-time' | 'uuid' | 'ip' | 'hostname';
  
  /**
   * Custom validator function
   */
  validate?: (value: unknown) => boolean | string;
}

/**
 * Schema definition
 */
export interface Schema {
  /**
   * Schema title
   */
  title?: string;
  
  /**
   * Schema description
   */
  description?: string;
  
  /**
   * Schema type
   */
  type: 'object';
  
  /**
   * Schema properties
   */
  properties: Record<string, SchemaField>;
  
  /**
   * Required properties
   */
  required?: string[];
}

/**
 * Validate data against a schema
 * @param data Data to validate
 * @param schema Schema to validate against
 * @returns Validation result
 */
export function validateSchema(data: unknown, schema: Schema): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate the data against the schema
  validateObject(data, schema.properties, '', errors, schema.required || []);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate an object against schema properties
 */
function validateObject(
  data: unknown,
  properties: Record<string, SchemaField>,
  path: string,
  errors: ValidationError[],
  requiredFields: string[],
): void {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push({
      path,
      message: 'Must be an object',
      type: 'type',
    });
    return;
  }
  
  const obj = data as Record<string, unknown>;
  
  // Check required fields
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      errors.push({
        path: path ? `${path}.${field}` : field,
        message: 'Required field is missing',
        type: 'required',
      });
    }
  }
  
  // Validate each property
  for (const [key, schema] of Object.entries(properties)) {
    const value = obj[key];
    const fieldPath = path ? `${path}.${key}` : key;
    
    // Skip validation if value is undefined and field is not required
    if ((value === undefined || value === null) && !schema.required) {
      continue;
    }
    
    validateField(value, schema, fieldPath, errors);
  }
}

/**
 * Validate a field against its schema
 */
function validateField(
  value: unknown,
  schema: SchemaField,
  path: string,
  errors: ValidationError[],
): void {
  // Skip validation for type 'any'
  if (schema.type === 'any') {
    return;
  }
  
  // Check type
  if (!validateType(value, schema.type)) {
    errors.push({
      path,
      message: `Must be of type ${schema.type}`,
      type: 'type',
    });
    return;
  }
  
  // Type-specific validation
  switch (schema.type) {
    case 'string':
      validateString(value as string, schema, path, errors);
      break;
    
    case 'number':
      validateNumber(value as number, schema, path, errors);
      break;
    
    case 'boolean':
      // No additional validation for booleans
      break;
    
    case 'object':
      if (schema.properties) {
        validateObject(
          value,
          schema.properties,
          path,
          errors,
          Object.entries(schema.properties)
            .filter(([, prop]) => prop.required)
            .map(([key]) => key),
        );
      }
      break;
    
    case 'array':
      validateArray(value as unknown[], schema, path, errors);
      break;
  }
  
  // Custom validation
  if (schema.validate) {
    const result = schema.validate(value);
    if (result !== true) {
      errors.push({
        path,
        message: typeof result === 'string' ? result : 'Failed custom validation',
        type: 'custom',
      });
    }
  }
}

/**
 * Validate a value's type
 */
function validateType(value: unknown, type: SchemaField['type']): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  
  switch (type) {
    case 'string':
      return typeof value === 'string';
    
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    
    case 'boolean':
      return typeof value === 'boolean';
    
    case 'object':
      return typeof value === 'object' && !Array.isArray(value);
    
    case 'array':
      return Array.isArray(value);
    
    case 'any':
      return true;
    
    default:
      return false;
  }
}

/**
 * Validate a string
 */
function validateString(
  value: string,
  schema: SchemaField,
  path: string,
  errors: ValidationError[],
): void {
  // Minimum length
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({
      path,
      message: `Must be at least ${schema.minLength} characters long`,
      type: 'minLength',
    });
  }
  
  // Maximum length
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push({
      path,
      message: `Must be at most ${schema.maxLength} characters long`,
      type: 'maxLength',
    });
  }
  
  // Pattern
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
    errors.push({
      path,
      message: `Must match pattern: ${schema.pattern}`,
      type: 'pattern',
    });
  }
  
  // Enum
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      path,
      message: `Must be one of: ${schema.enum.join(', ')}`,
      type: 'enum',
    });
  }
  
  // Format
  if (schema.format) {
    const formatValid = validateFormat(value, schema.format);
    if (!formatValid) {
      errors.push({
        path,
        message: `Must be a valid ${schema.format}`,
        type: 'format',
      });
    }
  }
}

/**
 * Validate a number
 */
function validateNumber(
  value: number,
  schema: SchemaField,
  path: string,
  errors: ValidationError[],
): void {
  // Minimum
  if (schema.minimum !== undefined && value < schema.minimum) {
    errors.push({
      path,
      message: `Must be at least ${schema.minimum}`,
      type: 'minimum',
    });
  }
  
  // Maximum
  if (schema.maximum !== undefined && value > schema.maximum) {
    errors.push({
      path,
      message: `Must be at most ${schema.maximum}`,
      type: 'maximum',
    });
  }
  
  // Enum
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      path,
      message: `Must be one of: ${schema.enum.join(', ')}`,
      type: 'enum',
    });
  }
}

/**
 * Validate an array
 */
function validateArray(
  value: unknown[],
  schema: SchemaField,
  path: string,
  errors: ValidationError[],
): void {
  // Minimum length
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({
      path,
      message: `Must contain at least ${schema.minLength} items`,
      type: 'minLength',
    });
  }
  
  // Maximum length
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push({
      path,
      message: `Must contain at most ${schema.maxLength} items`,
      type: 'maxLength',
    });
  }
  
  // Validate items
  if (schema.items) {
    value.forEach((item, index) => {
      validateField(item, schema.items!, `${path}[${index}]`, errors);
    });
  }
}

/**
 * Validate a string against a format
 */
function validateFormat(value: string, format: SchemaField['format']): boolean {
  if (!format) return true;
  
  const formatValidators: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uri: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i,
    date: /^\d{4}-\d{2}-\d{2}$/,
    time: /^\d{2}:\d{2}(:\d{2})?$/,
    'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    ip: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
    hostname: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/,
  };
  
  const validator = formatValidators[format];
  if (!validator) return true;
  
  return validator.test(value);
}

/**
 * Create a validator function from a schema
 * @param schema Schema to create validator from
 * @returns Validator function
 */
export function createValidator(schema: Schema): (data: unknown) => ValidationResult {
  return (data: unknown) => validateSchema(data, schema);
} 