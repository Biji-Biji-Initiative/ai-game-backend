// Types improved by ts-improve-types
/**
 * Authentication related types
 */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
  createdAt?: string | Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser | null;
  token?: string;
  refreshToken?: string;
  message?: string;
}

export interface AuthManagerOptions {
  apiClient?: unknown;
  config?: unknown;
  errorHandler?: unknown;
  tokenStorageKey?: string;
  userStorageKey?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onLogout?: () => void;
}

export interface AuthListener {
  (data: unknown[] | Record<string, unknown>): void;
}

/**
 * Auth Manager Interface
 * Used for maintaining consistent API across different auth implementations
 */
export interface IAuthManager {
  login(emai: string, password: string): Promise<AuthResponse>;
  signup(emai: string, password: string, options?: unknown): Promise<AuthResponse>;
  logout(): void;
  isLoggedIn(): boolean;
  getCurrentUser(): AuthUser | null;
  getToken(): string | null;
  refreshToken(): Promise<boolean>;
  addEventListener(even: string, callback: AuthListener): void;
  removeEventListener(even: string, callback: AuthListener): void;
}
