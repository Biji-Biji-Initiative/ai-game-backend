/**
 * Core API client interface
 * This defines the contract for all API implementations (mock or real)
 */

export interface ApiResponse<T> {
  data: T | null | undefined;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  } | null | string;
  status: number;
  ok: boolean;
}

export interface ApiClient {
  get<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>>;
  post<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>>;
  put<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>>;
  delete<T>(url: string): Promise<ApiResponse<T>>;
}

export interface ApiOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  mockMode?: boolean;
}
