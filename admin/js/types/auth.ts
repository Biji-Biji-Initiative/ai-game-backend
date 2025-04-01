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
  apiClient?: any;
  config?: any;
  errorHandler?: any;
  tokenStorageKey?: string;
  userStorageKey?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onLogout?: () => void;
}

export interface AuthListener {
  (data: any): void;
}

/**
 * Auth Manager Interface
 * Used for maintaining consistent API across different auth implementations
 */
export interface IAuthManager {
  login(email: string, password: string): Promise<AuthResponse>;
  signup(email: string, password: string, options?: any): Promise<AuthResponse>;
  logout(): void;
  isLoggedIn(): boolean;
  getCurrentUser(): AuthUser | null;
  getToken(): string | null;
  refreshToken(): Promise<boolean>;
  addEventListener(event: string, callback: AuthListener): void;
  removeEventListener(event: string, callback: AuthListener): void;
} 