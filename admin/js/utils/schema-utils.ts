/**
 * Schema Utility Functions
 * Utilities for working with JSON schema and example generation
 */

interface SchemaProperty {
  type?: string;
  format?: string;
  example?: any;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: any;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  [key: string]: any;
}

interface JSONSchema {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  items?: JSONSchema;
  [key: string]: any;
}

/**
 * Generates an example object from a JSON schema
 * @param schema JSON Schema object
 * @returns Generated example object
 */
export function generateExampleFromSchema(schema: JSONSchema): any {
  if (!schema) return null;
  
  // Handle different schema types
  switch (schema.type) {
    case 'object':
      return generateObjectExample(schema);
    case 'array':
      return generateArrayExample(schema);
    case 'string':
      return generateStringExample(schema);
    case 'number':
    case 'integer':
      return generateNumberExample(schema);
    case 'boolean':
      return generateBooleanExample(schema);
    case 'null':
      return null;
    default:
      // If no type is specified but properties exist, assume object
      if (schema.properties) {
        return generateObjectExample(schema);
      }
      // If items exist, assume array
      if (schema.items) {
        return generateArrayExample(schema);
      }
      return null;
  }
}

/**
 * Generates an example object from an object schema
 * @param schema Object schema
 * @returns Example object
 */
function generateObjectExample(schema: JSONSchema): Record<string, any> {
  const result: Record<string, any> = {};
  
  if (!schema.properties) return result;
  
  // Process each property
  Object.entries(schema.properties).forEach(([key, prop]) => {
    // Skip if property doesn't exist
    if (!prop) return;
    
    // Use example if provided
    if (prop.example !== undefined) {
      result[key] = prop.example;
      return;
    }
    
    // Use default if provided
    if (prop.default !== undefined) {
      result[key] = prop.default;
      return;
    }
    
    // Use enumeration value if provided
    if (prop.enum && prop.enum.length > 0) {
      result[key] = prop.enum[0];
      return;
    }
    
    // Generate based on type
    switch (prop.type) {
      case 'object':
        result[key] = generateObjectExample(prop);
        break;
      case 'array':
        result[key] = generateArrayExample(prop);
        break;
      case 'string':
        result[key] = generateStringExample(prop);
        break;
      case 'number':
      case 'integer':
        result[key] = generateNumberExample(prop);
        break;
      case 'boolean':
        result[key] = generateBooleanExample(prop);
        break;
      case 'null':
        result[key] = null;
        break;
      default:
        // If no type but has properties, assume object
        if (prop.properties) {
          result[key] = generateObjectExample(prop);
        } else {
          result[key] = null;
        }
    }
  });
  
  return result;
}

/**
 * Generates an example array from an array schema
 * @param schema Array schema
 * @returns Example array
 */
function generateArrayExample(schema: JSONSchema): any[] {
  if (!schema.items) return [];
  
  // Generate a single example item from the items schema
  const exampleItem = generateExampleFromSchema(schema.items);
  
  // Return array with one example item
  return [exampleItem];
}

/**
 * Generates an example string based on format and constraints
 * @param schema String schema
 * @returns Example string
 */
function generateStringExample(schema: SchemaProperty): string {
  // Handle different string formats
  if (schema.format) {
    switch (schema.format) {
      case 'email':
        return 'user@example.com';
      case 'uri':
      case 'url':
        return 'https://example.com';
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'date-time':
        return new Date().toISOString();
      case 'uuid':
        return '00000000-0000-0000-0000-000000000000';
      case 'hostname':
        return 'example.com';
      case 'ipv4':
        return '192.168.1.1';
      case 'ipv6':
        return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      case 'phone':
      case 'tel':
        return '+1-555-123-4567';
      case 'password':
        return '********';
      default:
        return `string (${schema.format})`;
    }
  }
  
  // Handle pattern if specified
  if (schema.pattern) {
    return `string matching pattern ${schema.pattern}`;
  }
  
  // Handle length constraints
  if (schema.minLength || schema.maxLength) {
    let example = 'example';
    
    if (schema.minLength && example.length < schema.minLength) {
      example = example.padEnd(schema.minLength, 'x');
    }
    
    if (schema.maxLength && example.length > schema.maxLength) {
      example = example.substring(0, schema.maxLength);
    }
    
    return example;
  }
  
  return 'string';
}

/**
 * Generates an example number based on constraints
 * @param schema Number schema
 * @returns Example number
 */
function generateNumberExample(schema: SchemaProperty): number {
  // Use minimum if specified
  if (schema.minimum !== undefined) {
    return schema.minimum;
  }
  
  // Use maximum if specified
  if (schema.maximum !== undefined) {
    return schema.maximum;
  }
  
  // Default values based on type
  if (schema.type === 'integer') {
    return 0;
  }
  
  return 0.0;
}

/**
 * Generates an example boolean
 * @param schema Boolean schema
 * @returns Example boolean
 */
function generateBooleanExample(schema: SchemaProperty): boolean {
  return false;
}

/**
 * Validates an object against a JSON schema
 * @param data Data to validate
 * @param schema Schema to validate against
 * @returns Validation result with errors if any
 */
export function validateAgainstSchema(data: any, schema: JSONSchema): { valid: boolean, errors: string[] } {
  const errors: string[] = [];
  
  // Simple schema validation
  if (schema.type === 'object' && data && typeof data === 'object' && !Array.isArray(data)) {
    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (data[requiredProp] === undefined) {
          errors.push(`Missing required property: ${requiredProp}`);
        }
      }
    }
    
    // Check property types if properties are defined
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (data[key] !== undefined) {
          // Validate property type
          if (prop.type && !validateType(data[key], prop.type)) {
            errors.push(`Invalid type for property ${key}: expected ${prop.type}`);
          }
          
          // Validate nested objects
          if (prop.type === 'object' && prop.properties && data[key]) {
            const nestedResult = validateAgainstSchema(data[key], prop);
            errors.push(...nestedResult.errors.map(err => `${key}.${err}`));
          }
          
          // Validate arrays
          if (prop.type === 'array' && prop.items && Array.isArray(data[key])) {
            data[key].forEach((item, index) => {
              const itemResult = validateAgainstSchema(item, prop.items);
              errors.push(...itemResult.errors.map(err => `${key}[${index}].${err}`));
            });
          }
        }
      }
    }
  } else if (schema.type && !validateType(data, schema.type)) {
    errors.push(`Invalid root type: expected ${schema.type}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a value against a type
 * @param value Value to validate
 * @param type Expected type
 * @returns Whether the value matches the type
 */
function validateType(value: any, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'integer':
      return typeof value === 'number' && !isNaN(value) && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return false;
  }
} 