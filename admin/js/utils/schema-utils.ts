// Types improved by ts-improve-types
/**
 * Schema Utility Functions
 * Utilities for working with JSON schema and example generation
 */

interface SchemaProperty {
  type?: string;
  format?: string;
  example?: unknown;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JSONSchema;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

interface JSONSchema {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  items?: JSONSchema;
  [key: string]: unknown;
}

/**
 * Generates an example object based on a JSON schema
 * @param schema JSON Schema
 * @returns Example object based on the schema
 */
export function generateExampleFromSchema(schema: JSONSchema): unknown {
  // Handle specific types
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

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
      // If type is unknown or multiple types, try object first
      if (schema.properties) {
        return generateObjectExample(schema);
      }
      // Fallback for unknown type
      return {};
  }
}

/**
 * Generates an example object from a schema
 * @param schema Object schema
 * @returns Example object
 */
function generateObjectExample(schema: JSONSchema): Record<string, unknown> {
  const example: Record<string, unknown> = {};

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      // Use example or default if available
      if (prop.example !== undefined) {
        example[key] = prop.example;
        continue;
      }
      if (prop.default !== undefined) {
        example[key] = prop.default;
        continue;
      }
      if (prop.enum && prop.enum.length > 0) {
        example[key] = prop.enum[0];
        continue;
      }

      // Generate based on type
      switch (prop.type) {
        case 'object':
          // Recursively generate example for nested object
          example[key] = generateObjectExample(prop);
          break;
        case 'array':
          // Recursively generate example for array items
          example[key] = generateArrayExample(prop);
          break;
        case 'string':
          example[key] = generateStringExample(prop);
          break;
        case 'number':
        case 'integer':
          example[key] = generateNumberExample(prop);
          break;
        case 'boolean':
          example[key] = generateBooleanExample(prop);
          break;
        case 'null':
          example[key] = null;
          break;
        default:
          // Assign default value based on key name heuristics or default to null
          if (key.toLowerCase().includes('id')) {
            example[key] = 'example_id_123';
          } else if (key.toLowerCase().includes('name')) {
            example[key] = 'Example Name';
          } else {
            example[key] = null;
          }
      }
    }
  }

  return example;
}

/**
 * Generates an example array from a schema
 * @param schema Array schema
 * @returns Example array
 */
function generateArrayExample(schema: JSONSchema): unknown[] {
  if (!schema.items) {
    return []; // No item schema defined
  }

  // Generate one example item based on the item schema
  const itemExample = generateExampleFromSchema(schema.items);
  // Return array containing the generated example
  return [itemExample];
}

/**
 * Generates an example string from a property schema
 * @param schema String schema property
 * @returns Example string
 */
function generateStringExample(schema: SchemaProperty): string {
  // Use example or default if available
  if (schema.example !== undefined) return String(schema.example);
  if (schema.default !== undefined) return String(schema.default);
  if (schema.enum && schema.enum.length > 0) return String(schema.enum[0]);

  // Use format if available
  switch (schema.format) {
    case 'date':
      return new Date().toISOString().split('T')[0];
    case 'date-time':
      return new Date().toISOString();
    case 'email':
      return 'user@example.com';
    case 'hostname':
      return 'example.com';
    case 'ipv4':
      return '192.168.1.1';
    case 'ipv6':
      return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    case 'uri':
      return 'https://example.com/path';
    case 'url':
      return 'https://example.com/';
    case 'uuid':
      return 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6';
    case 'password':
      return 'password123';
    case 'byte': // Base64 encoded string
      return 'U3dhZ2dlciByb2Nrcw==';
    case 'binary':
      return 'binary_data_placeholder';
  }

  // Use pattern if available
  if (schema.pattern) {
    // Basic pattern generation - might need a library for complex regex
    // This is a very naive implementation
    try {
      // @ts-ignore - RandExp might not be available
      if (typeof RandExp !== 'undefined') {
        // @ts-ignore - RandExp might not be available
        return new RandExp(schema.pattern).gen();
      }
    } catch (e) {
      console.warn('Could not generate string from pattern:', e);
    }
    return 'string_matching_pattern';
  }

  // Generate based on min/max length
  const minLength = schema.minLength ?? 3;
  const maxLength = schema.maxLength ?? 20;
  const length = Math.max(minLength, Math.min(maxLength, 10)); // Aim for a reasonable length

  // Simple placeholder string
  return 'example_'.padEnd(length, 'x').substring(0, length);
}

/**
 * Generates an example number from a property schema
 * @param schema Number schema property
 * @returns Example number
 */
function generateNumberExample(schema: SchemaProperty): number {
  // Use example or default if available
  if (schema.example !== undefined) return Number(schema.example);
  if (schema.default !== undefined) return Number(schema.default);
  if (schema.enum && schema.enum.length > 0) return Number(schema.enum[0]);

  // Use min/max if available
  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? 100;

  // Generate a number within the range, or default to min
  if (schema.type === 'integer') {
    return Math.floor(min + (max - min) / 2);
  } else {
    return min + (max - min) / 2;
  }
}

/**
 * Generates an example boolean from a property schema
 * @param schema Boolean schema
 * @returns Example boolean
 */
function generateBooleanExample(schema: SchemaProperty): boolean {
  // Use example or default if available
  if (schema.example !== undefined) return Boolean(schema.example);
  if (schema.default !== undefined) return Boolean(schema.default);

  // Default to false
  return false;
}

/**
 * Validates an object against a JSON schema
 * @param data Data to validate
 * @param schema Schema to validate against
 * @returns Validation result with errors if any
 */
export function validateAgainstSchema(
  data: unknown[] | Record<string, unknown>,
  schema: JSONSchema,
): { valid: boolean; errors: string[] } {
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
          if (prop.type === 'object' && prop.properties && data[key] !== undefined) {
            // Ensure data[key] is an object before recursive call
            if (typeof data[key] === 'object' && data[key] !== null) {
              const nestedResult = validateAgainstSchema(
                data[key] as Record<string, unknown>,
                prop,
              ); // Assert as Record
              errors.push(...nestedResult.errors.map(err => `${key}.${err}`));
            } else {
              errors.push(`Invalid type for nested object ${key}: expected object`);
            }
          }

          // Validate arrays
          if (prop.type === 'array' && prop.items && Array.isArray(data[key])) {
            const itemSchema = prop.items; // Ensure itemSchema is defined
            if (itemSchema) {
              (data[key] as unknown[]).forEach((item, index) => {
                // Ensure item is suitable for validation
                if ((typeof item === 'object' && item !== null) || Array.isArray(item)) {
                  const itemResult = validateAgainstSchema(
                    item as unknown[] | Record<string, unknown>,
                    itemSchema,
                  );
                  errors.push(...itemResult.errors.map(err => `${key}[${index}].${err}`));
                } else {
                  // Handle primitive types in array if needed, or report error
                  if (!validateType(String(item), itemSchema.type || 'unknown')) {
                    // Assuming validateType can handle primitives
                    errors.push(
                      `Invalid type for item ${key}[${index}]: expected ${itemSchema.type}`,
                    );
                  }
                }
              });
            }
          }
        }
      }
    }
  } else if (schema.type && !validateType(data, schema.type)) {
    errors.push(`Invalid root type: expected ${schema.type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a value against a type
 * @param value Value to validate
 * @param type Expected type
 * @returns Whether the value matches the type
 */
function validateType(value: unknown, type: string): boolean {
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
