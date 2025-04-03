/**
 * Authentication Service
 * 
 * Handles user authentication and session management
 */

import { Service } from '../core/ServiceManager';
import { ApiClient, ApiError } from '../api/ApiClient';
import { EventBus } from '../core/EventBus';
import { logger } from '../utils/logger';
import { StorageType } from '../utils/storage-utils';

/**
 * User information
 */
export interface User {
  /**
   * User ID
   */
  id: string;
  
  /**
   * Username or email
   */
  username: string;
  
  /**
   * User display name
   */
  displayName: string;
  
  /**
   * User roles
   */
  roles: string[];
  
  /**
   * User permissions
   */
  permissions: string[];
  
  /**
   * Additional user metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Authentication status
 */
export enum AuthStatus {
  /**
   * Initial state before checking authentication
   */
  UNKNOWN = 'unknown',
  
  /**
   * Checking authentication status
   */
  CHECKING = 'checking',
  
  /**
   * User is authenticated
   */
  AUTHENTICATED = 'authenticated',
  
  /**
   * User is not authenticated
   */
  UNAUTHENTICATED = 'unauthenticated',
  
  /**
   * Authentication error occurred
   */
  ERROR = 'error',
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  /**
   * Username or email
   */
  username: string;
  
  /**
   * User password
   */
  password: string;
  
  /**
   * Remember me flag
   */
  rememberMe?: boolean;
}

/**
 * Login response
 */
export interface LoginResponse {
  /**
   * Authentication token
   */
  token: string;
  
  /**
   * Token expiration time
   */
  expiresAt?: number;
  
  /**
   * Refresh token
   */
  refreshToken?: string;
  
  /**
   * User information
   */
  user: User;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /**
   * API endpoints
   */
  endpoints: {
    /**
     * Login endpoint
     */
    login: string;
    
    /**
     * Logout endpoint
     */
    logout: string;
    
    /**
     * Get current user endpoint
     */
    me: string;
    
    /**
     * Refresh token endpoint
     */
    refresh?: string;
  };
  
  /**
   * Storage keys
   */
  storageKeys: {
    /**
     * Token storage key
     */
    token: string;
    
    /**
     * User storage key
     */
    user: string;
    
    /**
     * Refresh token storage key
     */
    refreshToken?: string;
  };
  
  /**
   * Storage type for tokens
   */
  tokenStorage: StorageType;
  
  /**
   * Storage type for user info
   */
  userStorage: StorageType;
  
  /**
   * Token expiration time in milliseconds
   */
  tokenExpiration?: number;
  
  /**
   * Auto refresh token before expiration
   */
  autoRefresh?: boolean;
  
  /**
   * Refresh token before this many milliseconds of expiration
   */
  refreshBeforeExpiration?: number;
}

/**
 * Authentication service for handling user auth
 */
export class AuthService implements Service {
  private apiClient: ApiClient;
  private eventBus: EventBus;
  private config: AuthConfig;
  private currentUser: User | null;
  private status: AuthStatus;
  private refreshTimer: number | null;
  
  /**
   * Constructor
   * @param apiClient API client instance
   * @param config Auth configuration
   */
  constructor(apiClient: ApiClient, config: AuthConfig) {
    this.apiClient = apiClient;
    this.eventBus = EventBus.getInstance();
    this.currentUser = null;
    this.status = AuthStatus.UNKNOWN;
    this.refreshTimer = null;
    
    // Default configuration
    const defaultConfig: Partial<AuthConfig> = {
      endpoints: {
        login: '/auth/login',
        logout: '/auth/logout',
        me: '/auth/me',
        refresh: '/auth/refresh',
      },
      storageKeys: {
        token: 'auth_token',
        user: 'auth_user',
        refreshToken: 'auth_refresh_token',
      },
      tokenStorage: StorageType.LOCAL,
      userStorage: StorageType.LOCAL,
      tokenExpiration: 60 * 60 * 1000, // 1 hour
      autoRefresh: true,
      refreshBeforeExpiration: 5 * 60 * 1000, // 5 minutes
    };
    
    this.config = {
      ...defaultConfig,
      ...config,
      endpoints: { ...defaultConfig.endpoints, ...config.endpoints },
      storageKeys: { ...defaultConfig.storageKeys, ...config.storageKeys },
    } as AuthConfig;
    
    // Setup authentication header interceptor
    this.setupAuthInterceptor();
  }
  
  /**
   * Initialize auth service
   */
  public async init(): Promise<void> {
    // Set initial auth status to checking
    this.status = AuthStatus.CHECKING;
    this.eventBus.emit('auth:statusChange', { status: this.status });
    
    try {
      // Try to restore session from storage
      const token = this.getToken();
      
      if (token) {
        // Token exists, try to get current user
        await this.fetchCurrentUser();
        
        // Setup token refresh if needed
        this.setupTokenRefresh();
      } else {
        // No token, set unauthenticated
        this.status = AuthStatus.UNAUTHENTICATED;
        this.eventBus.emit('auth:statusChange', { status: this.status });
      }
    } catch (error) {
      logger.error('Failed to initialize auth service:', error);
      this.status = AuthStatus.ERROR;
      this.eventBus.emit('auth:statusChange', { status: this.status });
    }
    
    logger.debug('AuthService initialized');
  }
  
  /**
   * Login with credentials
   * @param credentials User credentials
   */
  public async login(credentials: LoginCredentials): Promise<User> {
    this.status = AuthStatus.CHECKING;
    this.eventBus.emit('auth:statusChange', { status: this.status });
    
    try {
      const response = await this.apiClient.post<LoginResponse>(
        this.config.endpoints.login,
        credentials,
      );
      
      const { token, expiresAt, refreshToken, user } = response.data;
      
      // Store token and user
      this.storeToken(token, expiresAt);
      if (refreshToken && this.config.storageKeys.refreshToken) {
        this.storeRefreshToken(refreshToken);
      }
      this.storeUser(user);
      
      // Update current user
      this.currentUser = user;
      this.status = AuthStatus.AUTHENTICATED;
      
      // Setup token refresh if needed
      this.setupTokenRefresh();
      
      // Emit events
      this.eventBus.emit('auth:login', { user });
      this.eventBus.emit('auth:statusChange', { status: this.status });
      
      return user;
    } catch (error) {
      this.status = AuthStatus.ERROR;
      this.eventBus.emit('auth:statusChange', { status: this.status });
      this.eventBus.emit('auth:error', { error });
      
      if (error instanceof ApiError) {
        logger.error(`Login failed: ${error.message}`, error);
      } else {
        logger.error('Login failed:', error);
      }
      
      throw error;
    }
  }
  
  /**
   * Logout current user
   */
  public async logout(sendRequest = true): Promise<void> {
    try {
      if (sendRequest) {
        // Call logout endpoint
        await this.apiClient.post(this.config.endpoints.logout);
      }
    } catch (error) {
      logger.warn('Logout request failed, continuing with local logout:', error);
    } finally {
      // Clear token and user from storage
      this.clearTokens();
      this.clearUser();
      
      // Clear refresh timer
      if (this.refreshTimer !== null) {
        window.clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
      
      // Update state
      this.currentUser = null;
      this.status = AuthStatus.UNAUTHENTICATED;
      
      // Emit events
      this.eventBus.emit('auth:logout');
      this.eventBus.emit('auth:statusChange', { status: this.status });
    }
  }
  
  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }
  
  /**
   * Get current authentication status
   */
  public getStatus(): AuthStatus {
    return this.status;
  }
  
  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.status === AuthStatus.AUTHENTICATED && this.currentUser !== null;
  }
  
  /**
   * Check if user has specific role
   * @param role Role to check
   */
  public hasRole(role: string): boolean {
    return this.currentUser?.roles?.includes(role) ?? false;
  }
  
  /**
   * Check if user has specific permission
   * @param permission Permission to check
   */
  public hasPermission(permission: string): boolean {
    return this.currentUser?.permissions?.includes(permission) ?? false;
  }
  
  /**
   * Get authentication token
   */
  public getToken(): string | null {
    return localStorage.getItem(this.config.storageKeys.token);
  }
  
  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken || !this.config.endpoints.refresh) {
      throw new Error('Refresh token not available or refresh endpoint not configured');
    }
    
    try {
      const response = await this.apiClient.post<{ token: string; expiresAt?: number }>(
        this.config.endpoints.refresh,
        { refreshToken },
        { skipInterceptors: true }, // Skip authentication header
      );
      
      const { token, expiresAt } = response.data;
      
      // Store new token
      this.storeToken(token, expiresAt);
      
      // Setup refresh timer again
      this.setupTokenRefresh();
      
      // Emit token refresh event
      this.eventBus.emit('auth:tokenRefresh', { token });
      
      return token;
    } catch (error) {
      logger.error('Failed to refresh token:', error);
      
      // Token refresh failed, logout user
      await this.logout(false);
      
      throw error;
    }
  }
  
  /**
   * Fetch current user information
   */
  private async fetchCurrentUser(): Promise<void> {
    try {
      const response = await this.apiClient.get<{ user: User }>(this.config.endpoints.me);
      const { user } = response.data;
      
      // Store and update user
      this.storeUser(user);
      this.currentUser = user;
      this.status = AuthStatus.AUTHENTICATED;
      
      // Emit events
      this.eventBus.emit('auth:userUpdate', { user });
      this.eventBus.emit('auth:statusChange', { status: this.status });
    } catch (error) {
      logger.error('Failed to fetch current user:', error);
      
      // User fetch failed, logout user
      await this.logout(false);
      
      throw error;
    }
  }
  
  /**
   * Store authentication token
   */
  private storeToken(token: string, expiresAt?: number): void {
    // Store token with expiration data
    const storageData = {
      value: token,
      timestamp: Date.now(),
      expiration: expiresAt || (Date.now() + (this.config.tokenExpiration || 0)),
    };
    
    if (this.config.tokenStorage === StorageType.SESSION) {
      sessionStorage.setItem(this.config.storageKeys.token, JSON.stringify(storageData));
    } else {
      localStorage.setItem(this.config.storageKeys.token, JSON.stringify(storageData));
    }
  }
  
  /**
   * Store refresh token
   */
  private storeRefreshToken(refreshToken: string): void {
    if (!this.config.storageKeys.refreshToken) return;
    
    const storageType = this.config.tokenStorage;
    if (storageType === StorageType.SESSION) {
      sessionStorage.setItem(this.config.storageKeys.refreshToken, refreshToken);
    } else {
      localStorage.setItem(this.config.storageKeys.refreshToken, refreshToken);
    }
  }
  
  /**
   * Get refresh token
   */
  private getRefreshToken(): string | null {
    if (!this.config.storageKeys.refreshToken) return null;
    
    const storageType = this.config.tokenStorage;
    if (storageType === StorageType.SESSION) {
      return sessionStorage.getItem(this.config.storageKeys.refreshToken);
    } else {
      return localStorage.getItem(this.config.storageKeys.refreshToken);
    }
  }
  
  /**
   * Store user information
   */
  private storeUser(user: User): void {
    const userData = JSON.stringify(user);
    const storageType = this.config.userStorage;
    
    if (storageType === StorageType.SESSION) {
      sessionStorage.setItem(this.config.storageKeys.user, userData);
    } else {
      localStorage.setItem(this.config.storageKeys.user, userData);
    }
  }
  
  /**
   * Clear authentication tokens
   */
  private clearTokens(): void {
    const storageType = this.config.tokenStorage;
    
    if (storageType === StorageType.SESSION) {
      sessionStorage.removeItem(this.config.storageKeys.token);
      if (this.config.storageKeys.refreshToken) {
        sessionStorage.removeItem(this.config.storageKeys.refreshToken);
      }
    } else {
      localStorage.removeItem(this.config.storageKeys.token);
      if (this.config.storageKeys.refreshToken) {
        localStorage.removeItem(this.config.storageKeys.refreshToken);
      }
    }
  }
  
  /**
   * Clear user information
   */
  private clearUser(): void {
    const storageType = this.config.userStorage;
    
    if (storageType === StorageType.SESSION) {
      sessionStorage.removeItem(this.config.storageKeys.user);
    } else {
      localStorage.removeItem(this.config.storageKeys.user);
    }
  }
  
  /**
   * Setup authentication header interceptor
   */
  private setupAuthInterceptor(): void {
    this.apiClient.addRequestInterceptor(options => {
      const token = this.getToken();
      
      if (token) {
        // Add Authorization header
        return {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
          },
        };
      }
      
      return options;
    });
    
    // Handle 401 Unauthorized errors
    this.apiClient.addErrorInterceptor(async error => {
      if (error.status === 401 && this.status === AuthStatus.AUTHENTICATED) {
        // Try to refresh token if available
        const refreshToken = this.getRefreshToken();
        const refreshEndpoint = this.config.endpoints.refresh;
        
        if (refreshToken && refreshEndpoint && error.request.url !== refreshEndpoint) {
          try {
            // Refresh the token
            await this.refreshToken();
            
            // Retry the original request
            const { request } = error;
            return await this.apiClient.request(request);
          } catch (refreshError) {
            // Token refresh failed, logout user
            await this.logout(false);
          }
        } else {
          // No refresh token or already trying to refresh, logout user
          await this.logout(false);
        }
      }
      
      return error;
    });
  }
  
  /**
   * Setup token refresh timer
   */
  private setupTokenRefresh(): void {
    if (!this.config.autoRefresh || !this.config.endpoints.refresh) {
      return;
    }
    
    // Clear existing timer
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // Calculate time until refresh
    const token = this.getToken();
    if (!token) return;
    
    // Try to get token data with expiration
    let tokenData;
    try {
      const storageType = this.config.tokenStorage;
      const storageKey = this.config.storageKeys.token;
      const raw = storageType === StorageType.SESSION
        ? sessionStorage.getItem(storageKey)
        : localStorage.getItem(storageKey);
        
      if (raw) {
        tokenData = JSON.parse(raw);
      }
    } catch (error) {
      logger.error('Failed to parse token data:', error);
      return;
    }
    
    if (!tokenData || !tokenData.expiration) return;
    
    const now = Date.now();
    const expiresAt = tokenData.expiration;
    const refreshTime = expiresAt - (this.config.refreshBeforeExpiration || 0);
    
    // Don't set timer if token is already expired
    if (expiresAt <= now) {
      this.logout(false);
      return;
    }
    
    // Don't set timer if refresh time is in the past
    if (refreshTime <= now) {
      // Refresh immediately
      this.refreshToken().catch(error => {
        logger.error('Failed to refresh token:', error);
      });
      return;
    }
    
    // Set timer to refresh token
    const timeUntilRefresh = refreshTime - now;
    this.refreshTimer = window.setTimeout(() => {
      this.refreshToken().catch(error => {
        logger.error('Failed to refresh token:', error);
      });
    }, timeUntilRefresh);
    
    logger.debug(`Token refresh scheduled in ${timeUntilRefresh / 1000}s`);
  }
  
  /**
   * Dispose of the service
   */
  public async dispose(): Promise<void> {
    // Clear refresh timer
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    logger.debug('AuthService disposed');
  }
} 