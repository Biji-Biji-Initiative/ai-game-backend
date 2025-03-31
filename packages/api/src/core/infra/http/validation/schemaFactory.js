/**
 * Schema Factory
 * 
 * This module provides factory functions to create validation schemas for API endpoints.
 * It helps maintain consistency across API validation and reduces boilerplate.
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema, sortDirectionSchema } from './commonSchemas.js';

/**
 * Create a schema for API resource creation
 * 
 * @param {Object} schemaConfig - Schema configuration
 * @param {z.ZodObject} schemaConfig.resourceSchema - The schema for the resource being created
 * @param {Array<string>} [schemaConfig.requiredFields] - Fields that must be included
 * @param {Array<string>} [schemaConfig.optionalFields] - Fields that may be included
 * @param {boolean} [schemaConfig.strict=true] - Whether to use strict mode
 * @returns {z.ZodObject} API create schema
 */
export function createApiCreateSchema(schemaConfig) {
  const { resourceSchema, requiredFields = [], optionalFields = [], strict = true } = schemaConfig;
  
  if (!resourceSchema || !(resourceSchema instanceof z.ZodObject)) {
    throw new Error('resourceSchema must be a Zod object schema');
  }
  
  // Start with the resource schema
  let schema = resourceSchema;
  
  // Make specified fields required or optional
  if (requiredFields.length > 0 || optionalFields.length > 0) {
    const shape = { ...resourceSchema.shape };
    
    // Make specified fields required
    for (const field of requiredFields) {
      if (shape[field]) {
        shape[field] = shape[field].removeDefault();
      }
    }
    
    // Make specified fields optional
    for (const field of optionalFields) {
      if (shape[field]) {
        shape[field] = shape[field].optional();
      }
    }
    
    schema = z.object(shape);
  }
  
  // Apply strict mode if specified
  if (strict) {
    schema = schema.strict();
  }
  
  return schema;
}

/**
 * Create a schema for API resource updates
 * 
 * @param {Object} schemaConfig - Schema configuration
 * @param {z.ZodObject} schemaConfig.resourceSchema - The schema for the resource being updated
 * @param {Array<string>} [schemaConfig.allowedFields] - Fields that may be updated
 * @param {Array<string>} [schemaConfig.requiredFields] - Fields that must be included
 * @param {boolean} [schemaConfig.strict=true] - Whether to use strict mode
 * @param {boolean} [schemaConfig.requireAtLeastOneField=true] - Whether to require at least one field
 * @returns {z.ZodObject} API update schema
 */
export function createApiUpdateSchema(schemaConfig) {
  const { 
    resourceSchema, 
    allowedFields = [], 
    requiredFields = [], 
    strict = true,
    requireAtLeastOneField = true
  } = schemaConfig;
  
  if (!resourceSchema || !(resourceSchema instanceof z.ZodObject)) {
    throw new Error('resourceSchema must be a Zod object schema');
  }
  
  // Start with the resource schema shape
  const shape = { ...resourceSchema.shape };
  const newShape = {};
  
  // If allowedFields is not empty, only include those fields
  const fieldsToInclude = allowedFields.length > 0 
    ? allowedFields 
    : Object.keys(shape);
  
  // Make all fields optional by default for updates
  for (const field of fieldsToInclude) {
    if (shape[field]) {
      // Make field optional by default, unless it's in requiredFields
      newShape[field] = requiredFields.includes(field) 
        ? shape[field]
        : shape[field].optional();
    }
  }
  
  // Create the schema
  let schema = z.object(newShape);
  
  // Apply strict mode if specified
  if (strict) {
    schema = schema.strict();
  }
  
  // Require at least one field if specified
  if (requireAtLeastOneField && Object.keys(newShape).length > 0) {
    schema = schema.refine(
      data => Object.keys(data).length > 0,
      {
        message: 'At least one field must be provided for update',
        path: []
      }
    );
  }
  
  return schema;
}

/**
 * Create a schema for API resource list query parameters
 * 
 * @param {Object} schemaConfig - Schema configuration
 * @param {Array<string>} [schemaConfig.sortableFields=[]] - Fields that can be used for sorting
 * @param {Array<string>} [schemaConfig.filterableFields=[]] - Fields that can be used for filtering
 * @param {boolean} [schemaConfig.includeDeleted=false] - Whether to include a flag for including deleted items
 * @param {z.ZodObject} [schemaConfig.additionalFilters] - Additional filter schema
 * @param {boolean} [schemaConfig.strict=true] - Whether to use strict mode
 * @returns {z.ZodObject} API list query schema
 */
export function createApiListQuerySchema(schemaConfig) {
  const { 
    sortableFields = [], 
    filterableFields = [], 
    includeDeleted = false, 
    additionalFilters = null,
    strict = true
  } = schemaConfig;
  
  // Start with pagination
  const queryShape = {
    ...paginationSchema.shape
  };
  
  // Add sort field if sortable fields are specified
  if (sortableFields.length > 0) {
    queryShape.sortBy = z.enum(sortableFields, {
      errorMap: () => ({ 
        message: `sortBy must be one of: ${sortableFields.join(', ')}` 
      })
    }).optional();
    
    queryShape.sortDirection = sortDirectionSchema.optional();
  }
  
  // Add filter fields
  if (filterableFields.length > 0) {
    for (const field of filterableFields) {
      queryShape[field] = z.string().optional();
    }
  }
  
  // Add include_deleted flag if specified
  if (includeDeleted) {
    queryShape.includeDeleted = z.boolean().optional().default(false);
  }
  
  // Merge in additional filters if provided
  if (additionalFilters && additionalFilters instanceof z.ZodObject) {
    Object.assign(queryShape, additionalFilters.shape);
  }
  
  // Create the schema
  let schema = z.object(queryShape);
  
  // Apply strict mode if specified
  if (strict) {
    schema = schema.strict();
  }
  
  return schema;
}

/**
 * Create a schema for validating resource ID parameters
 * 
 * @param {Object} schemaConfig - Schema configuration
 * @param {string} [schemaConfig.paramName='id'] - The name of the ID parameter
 * @param {z.ZodSchema} [schemaConfig.idSchema=uuidSchema] - The schema for validating the ID
 * @returns {z.ZodObject} API resource ID schema
 */
export function createResourceIdSchema(schemaConfig = {}) {
  const { 
    paramName = 'id', 
    idSchema = uuidSchema 
  } = schemaConfig;
  
  return z.object({
    [paramName]: idSchema
  }).strict();
}

export default {
  createApiCreateSchema,
  createApiUpdateSchema,
  createApiListQuerySchema,
  createResourceIdSchema
}; 