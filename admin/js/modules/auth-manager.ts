/**
 * Auth Manager
 * 
 * Handles JWT authentication for API requests, including token storage,
 * refresh handling, and request interception.
 */

import { logger } from '../utils/logger';

export interface JwtToken {
  token: string;
  refreshToken?: string;
  expiresAt?: number; // Timestamp in milliseconds
  tokenType?: string;
}

export interface AuthManagerOptions {
  storageKey?: string;
  tokenExpiryBuffer?: number; // Buffer time in milliseconds before expiry to trigger refresh
  onAuthStateChanged?: (isAuthenticated: boolean) => void;
}

export class AuthManager {
  private token: JwtToken | null = null;
  private storageKey: string;
  private tokenExpiryBuffer: number;
  private options: AuthManagerOptions;
  
  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: AuthManagerOptions = {}) {
    this.options = options;
    this.storageKey = options.storageKey || 'auth_token';
    this.tokenExpiryBuffer = options.tokenExpiryBuffer || 5 * 60 * 1000; // 5 minutes in ms
    
    // Load token from storage
    this.loadToken();
  }
  
  /**
   * Initialize the manager
   */
  initialize(): void {
    logger.info('Auth Manager initialized');
  }
  
  /**
   * Load token from local storage
   */
  private loadToken(): void {
    try {
      const storedToken = localStorage.getItem(this.storageKey);
      if (storedToken) {
        this.token = JSON.parse(storedToken);
        logger.info('Auth token loaded from storage');
        
        // Check if token is expired
        if (this.isTokenExpired()) {
          logger.info('Loaded token is expired');
          if (this.token?.refreshToken) {
            logger.info('Refresh token available, attempting refresh');
            this.refreshToken();
          } else {
            logger.info('No refresh token, clearing expired token');
            this.clearToken();
          }
        }
      } else {
        logger.info('No stored auth token found');
      }
      
      // Notify listeners
      this.notifyAuthStateChanged();
    } catch (error) {
      logger.error('Error loading token from storage:', error);
      this.clearToken();
    }
  }
  
  /**
   * Save token to local storage
   */
  private saveToken(): void {
    try {
      if (this.token) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.token));
        logger.info('Auth token saved to storage');
      } else {
        localStorage.removeItem(this.storageKey);
        logger.info('Auth token removed from storage');
      }
      
      // Notify listeners
      this.notifyAuthStateChanged();
    } catch (error) {
      logger.error('Error saving token to storage:', error);
    }
  }
  
  /**
   * Clear the token
   */
  clearToken(): void {
    this.token = null;
    this.saveToken();
    logger.info('Auth token cleared');
  }
  
  /**
   * Set a new token
   * @param token JWT token object
   */
  setToken(token: JwtToken): void {
    this.token = token;
    this.saveToken();
    logger.info('New auth token set');
  }
  
  /**
   * Get the current token
   * @returns Current JWT token or null
   */
  getToken(): JwtToken | null {
    // Check if token is expired or about to expire
    if (this.token && this.isTokenExpiringSoon()) {
      if (this.token.refreshToken) {
        // Attempt to refresh the token
        this.refreshToken();
      } else if (this.isTokenExpired()) {
        // Token is expired and can't be refreshed
        this.clearToken();
        return null;
      }
    }
    
    return this.token;
  }
  
  /**
   * Check if user is authenticated
   * @returns True if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
  
  /**
   * Check if token is expired
   * @returns True if token is expired
   */
  isTokenExpired(): boolean {
    if (!this.token || !this.token.expiresAt) return true;
    return Date.now() >= this.token.expiresAt;
  }
  
  /**
   * Check if token is expiring soon
   * @returns True if token is expiring soon
   */
  isTokenExpiringSoon(): boolean {
    if (!this.token || !this.token.expiresAt) return true;
    return Date.now() >= (this.token.expiresAt - this.tokenExpiryBuffer);
  }
  
  /**
   * Refresh the token
   * @returns Promise resolving to true if refresh successful
   */
  async refreshToken(): Promise<boolean> {
    if (!this.token || !this.token.refreshToken) {
      logger.warn('Cannot refresh token: No refresh token available');
      return false;
    }
    
    try {
      logger.info('Refreshing auth token');
      
      // Implementation-specific token refresh logic
      // For example, making a request to a refresh endpoint
      
      // This is a placeholder for the actual implementation
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.token.refreshToken,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }
      
      const newToken = await response.json();
      this.setToken(newToken);
      logger.info('Auth token refreshed successfully');
      return true;
    } catch (error) {
      logger.error('Error refreshing token:', error);
      this.clearToken();
      return false;
    }
  }
  
  /**
   * Login with credentials
   * @param username Username
   * @param password Password
   * @returns Promise resolving to true if login successful
   */
  async login(username: string, password: string): Promise<boolean> {
    try {
      logger.info('Logging in user:', username);
      
      // Implementation-specific login logic
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }
      
      const tokenData = await response.json();
      this.setToken(tokenData);
      logger.info('Login successful');
      return true;
    } catch (error) {
      logger.error('Login error:', error);
      return false;
    }
  }
  
  /**
   * Logout the current user
   * @returns Promise resolving when logout is complete
   */
  async logout(): Promise<void> {
    try {
      logger.info('Logging out user');
      
      // If we have a token, call the logout endpoint
      if (this.token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token.token}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => {
          logger.warn('Error calling logout endpoint:', err);
        });
      }
      
      // Clear the token regardless of whether the logout request succeeded
      this.clearToken();
      logger.info('Logout complete');
    } catch (error) {
      logger.error('Logout error:', error);
      // Clear token even if the logout request failed
      this.clearToken();
    }
  }
  
  /**
   * Get auth header for requests
   * @returns Authorization header object or empty object if not authenticated
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    if (!token) return {};
    
    const tokenType = token.tokenType || 'Bearer';
    return {
      'Authorization': `${tokenType} ${token.token}`,
    };
  }
  
  /**
   * Intercept a request to add authentication
   * @param headers Request headers
   * @returns Modified headers with auth token if authenticated
   */
  interceptRequest(headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      ...this.getAuthHeader(),
    };
  }
  
  /**
   * Notify auth state changed
   */
  private notifyAuthStateChanged(): void {
    if (this.options.onAuthStateChanged) {
      this.options.onAuthStateChanged(this.isAuthenticated());
    }
  }
} 