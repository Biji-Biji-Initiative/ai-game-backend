/**
 * Standardized API Response Formats
 * 
 * Provides consistent response structures for our mock API
 */

// Basic API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
  };
}

// API response factory
const apiResponse = {
  // Success response
  success: <T>(data: T, meta = {}): ApiResponse<T> => ({
    success: true,
    status: 200,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }),

  // Created response (201)
  created: <T>(data: T): ApiResponse<T> => ({
    success: true,
    status: 201,
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  // No content response (204)
  noContent: (): ApiResponse => ({
    success: true,
    status: 204,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  // Bad request error (400)
  badRequest: (message = 'Bad request', details?: any): ApiResponse => ({
    success: false,
    status: 400,
    error: {
      code: 'BAD_REQUEST',
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  // Validation error (422)
  validationError: (details: any): ApiResponse => ({
    success: false,
    status: 422,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  // Not found error (404)
  notFound: (message = 'Resource not found'): ApiResponse => ({
    success: false,
    status: 404,
    error: {
      code: 'NOT_FOUND',
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  // Server error (500)
  serverError: (message = 'Internal server error'): ApiResponse => ({
    success: false,
    status: 500,
    error: {
      code: 'SERVER_ERROR',
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),

  // Unauthorized error (401)
  unauthorized: (message = 'Unauthorized'): ApiResponse => ({
    success: false,
    status: 401,
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),
};

export default apiResponse;
