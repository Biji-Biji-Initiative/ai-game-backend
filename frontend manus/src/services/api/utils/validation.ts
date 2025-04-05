/**
 * API Response Validation
 * 
 * Utilities for validating API responses against expected schemas
 */

import { z } from 'zod';
import { ApiResponse } from '../interfaces/api-client';

/**
 * Validate an API response against a Zod schema
 * @param response The API response to validate
 * @param schema The Zod schema to validate against
 * @returns A validated API response or an error response
 */
export function validateApiResponse<T, U>(
  response: ApiResponse<T>,
  schema: z.ZodType<U>
): ApiResponse<U> {
  // If the response has an error, return it as-is but with the generic type U
  if (!response.ok || !response.data) {
    return response as unknown as ApiResponse<U>;
  }
  
  // Validate the data against the schema
  const validationResult = schema.safeParse(response.data);
  
  // If validation fails, return an error response
  if (!validationResult.success) {
    return {
      data: null,
      error: {
        message: 'Invalid API response format',
        code: 'validation_error',
        details: validationResult.error.format()
      },
      status: response.status,
      ok: false
    };
  }
  
  // Return the validated data
  return {
    ...response,
    data: validationResult.data
  };
}

/**
 * Create a validated query function for use with React Query
 * @param queryFn The original query function
 * @param schema The Zod schema to validate against
 * @returns A query function that validates the response
 */
export function createValidatedQueryFn<T, U>(
  queryFn: () => Promise<ApiResponse<T>>,
  schema: z.ZodType<U>
): () => Promise<ApiResponse<U>> {
  return async () => {
    const response = await queryFn();
    return validateApiResponse(response, schema);
  };
} 