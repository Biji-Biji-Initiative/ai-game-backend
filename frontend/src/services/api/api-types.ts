/**
 * Represents an error returned from the API
 */
export interface ApiServiceError {
  message: string;
}

/**
 * Represents a paginated result from the API
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Generic API result type with data and error handling
 */
export interface ApiResult<T> {
  data: T | null;
  error: ApiServiceError | null;
  loading: boolean;
  refetch: () => Promise<ApiResult<T>>;
}

/**
 * Paginated API result with pagination info
 */
export interface PaginatedApiResult<T> extends Omit<ApiResult<T[]>, 'data'> {
  data: T[];
  pagination: PaginationInfo;
} 