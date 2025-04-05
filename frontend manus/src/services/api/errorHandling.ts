/**
 * API Error Handling Utilities
 * 
 * Provides standardized error handling for API operations
 */

// ApiResponse type isn't directly used in this file

// Define standard error types
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

// API error class with additional metadata
export class ApiError extends Error {
  type: ErrorType;
  status?: number;
  details?: Record<string, unknown>;
  
  constructor(message: string, type: ErrorType = ErrorType.UNKNOWN, status?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
}

// Parse error responses from the API
export function parseApiError(error: unknown): ApiError {
  // Handle network errors (e.g., no internet connection)
  if (error instanceof Error && 'message' in error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
      return new ApiError(
        'Network error. Please check your internet connection and try again.',
        ErrorType.NETWORK
      );
    }
  }
  
  // Handle errors from our own API
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response: unknown }).response;
    if (response && typeof response === 'object') {
      // Define types for our response objects
      interface ErrorResponse {
        success: false;
        error: {
          code: string;
          message?: string;
          details?: Record<string, unknown>;
        };
        status?: number;
      }
      
      interface StatusResponse {
        status: number;
        statusText?: string;
      }
      
      // Handle ApiResponse format
      if ('success' in response && 
          response.success === false && 
          'error' in response && 
          response.error && 
          typeof response.error === 'object') {
        
        // Type guard to ensure response has the correct shape
        const isErrorResponse = (obj: object): obj is ErrorResponse => {
          // Check if obj has a success property that is explicitly false
          if (!('success' in obj)) {return false;}
          const successValue = (obj as Record<string, unknown>)['success'];
          if (successValue !== false) {return false;}
          
          // Check if obj has an error property that is an object
          if (!('error' in obj)) {return false;}
          const errorValue = (obj as Record<string, unknown>)['error'];
          if (!errorValue || typeof errorValue !== 'object') {return false;}
          
          // Check if error has a code property
          return 'code' in (errorValue as object);
        };
        
        if (isErrorResponse(response)) {
          const { error, status } = response;
          
          return new ApiError(
            error.message || 'An error occurred during the API request',
            getErrorTypeFromCode(error.code),
            status,
            error.details
          );
        }
      }
      
      // Handle status codes for other responses
      if ('status' in response && typeof response.status === 'number') {
        // Type guard to ensure response has status properties
        const isStatusResponse = (obj: object): obj is StatusResponse => {
          if (!('status' in obj)) {return false;}
          const statusValue = (obj as Record<string, unknown>)['status'];
          return typeof statusValue === 'number';
        };
        
        if (isStatusResponse(response)) {
          return new ApiError(
            response.statusText || `Request failed with status ${response.status}`,
            getErrorTypeFromStatus(response.status),
            response.status
          );
        }
      }
    }
  }
  
  // Default error for anything else
  return new ApiError(
    error instanceof Error ? error.message : 'An unknown error occurred',
    ErrorType.UNKNOWN
  );
}

// Map API error codes to types
function getErrorTypeFromCode(code: string): ErrorType {
  switch (code) {
    case 'validation_error':
      return ErrorType.VALIDATION;
    case 'unauthorized':
      return ErrorType.AUTHENTICATION;
    case 'forbidden':
      return ErrorType.AUTHORIZATION;
    case 'not_found':
      return ErrorType.NOT_FOUND;
    case 'server_error':
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
}

// Map HTTP status codes to error types
function getErrorTypeFromStatus(status: number): ErrorType {
  if (status >= 400 && status < 500) {
    if (status === 400) {return ErrorType.VALIDATION;}
    if (status === 401) {return ErrorType.AUTHENTICATION;}
    if (status === 403) {return ErrorType.AUTHORIZATION;}
    if (status === 404) {return ErrorType.NOT_FOUND;}
    return ErrorType.VALIDATION; // Default for 4xx
  }
  
  if (status >= 500) {
    return ErrorType.SERVER;
  }
  
  return ErrorType.UNKNOWN;
}

// User-friendly error messages based on error type
export function getUserFriendlyErrorMessage(error: ApiError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case ErrorType.VALIDATION:
      return 'There was an issue with the data you provided. Please check your input and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Your session has expired or you are not logged in. Please sign in and try again.';
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorType.SERVER:
      return 'Our server is experiencing issues. Please try again later or contact support if the problem persists.';
    case ErrorType.UNKNOWN:
    default:
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
}

// Format validation errors for display
export function formatValidationErrors(details: unknown): string[] {
  if (!details) {return [];}
  
  // Handle array of error messages
  if (Array.isArray(details)) {
    return details.map(d => {
      if (typeof d === 'string') {return d;}
      if (d && typeof d === 'object' && 'message' in d && typeof d.message === 'string') {
        return d.message;
      }
      return 'Validation error';
    });
  }
  
  // Handle object with field-specific errors
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    return Object.entries(details as Record<string, unknown>).map(([field, message]) => 
      `${field}: ${typeof message === 'string' ? message : 'Invalid value'}`
    );
  }
  
  return ['Validation error'];
}
