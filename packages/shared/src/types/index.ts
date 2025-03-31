/**
 * Common types used across packages
 *
 * Note: These are simple representations of domain concepts.
 * The full domain models with behavior live in the API package.
 */

// Generic ID type
export type ID = string;

// Common user roles
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

// Common pagination parameters
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Common response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Simple string literal types for API contracts
// These are NOT the rich domain models - those live in the API
export type DifficultyLevelType = 'easy' | 'medium' | 'hard' | 'expert';
