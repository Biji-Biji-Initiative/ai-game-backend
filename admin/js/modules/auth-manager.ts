// Types improved by ts-improve-types
/**
 * Auth Manager
 * Handles authentication and user management
 */

import { ComponentLogger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { StorageService } from '../services/StorageService';
import { DependencyContainer } from '../core/DependencyContainer';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface AuthManagerOptions {
  storageService?: StorageService;
  tokenKey?: string;
  userKey?: string;
  eventBus: EventBus;
  logger: ComponentLogger;
}

export class AuthManager {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
  };
  private storageService: StorageService;
  private tokenKey: string;
  private userKey: string;
  private eventBus: EventBus;
  private logger: ComponentLogger;

  constructor(options: AuthManagerOptions) {
    // Get storage service from options or dependency container
    this.storageService =
      options.storageService ||
      DependencyContainer.getInstance().get<StorageService>('storageService');

    // Set event bus and logger
    this.eventBus = options.eventBus;
    this.logger = options.logger;

    // Set configuration options with defaults
    this.tokenKey = options.tokenKey || 'authToken';
    this.userKey = options.userKey || 'authUser';

    // Initialize token from storage
    this.authState.token = this.storageService.get<string>(this.tokenKey);

    this.logger.info('AuthManager initialized');

    // Try to restore auth from storage
    this.tryRestoreAuth();
  }

  /**
   * Try to restore authentication from storage
   */
  private async tryRestoreAuth(): Promise<void> {
    const token = this.storageService.get<string>(this.tokenKey);
    if (!token) return;

    try {
      this.authState.token = token;

      // Try to get saved user from storage
      const savedUser = this.storageService.get<User>(this.userKey);

      if (savedUser) {
        this.authState.user = savedUser;
      } else {
        // Mock user for testing if no saved user
        this.authState.user = {
          id: 'mock-user-id',
          email: 'user@example.com',
          fullName: 'Mock User',
          role: 'user',
          createdAt: new Date().toISOString(),
        };
      }

      this.authState.isAuthenticated = true;
      this.eventBus.publish('auth-changed', this.authState);

      this.logger.info('Authentication restored from storage');
    } catch (error) {
      this.logger.error('Failed to restore authentication', error);
      this.logout();
    }
  }

  /**
   * Get the current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get the current user
   */
  getUser(): User | null {
    return this.authState.user;
  }

  /**
   * Get the auth token
   */
  getToken(): string | null {
    return this.authState.token;
  }

  /**
   * Login with credentials
   * @param email Email
   * @param password Password
   */
  async login(email: string, password: string): Promise<AuthState> {
    try {
      // Mock login for testing
      const mockResponse = {
        token: 'mock-token-' + Date.now(),
        user: {
          id: 'mock-user-id',
          email: email,
          fullName: 'Mock User',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      };

      // Save token and user to storage
      this.storageService.set(this.tokenKey, mockResponse.token);
      this.storageService.set(this.userKey, mockResponse.user);

      // Update auth state
      this.authState = {
        isAuthenticated: true,
        user: mockResponse.user,
        token: mockResponse.token,
      };

      this.eventBus.publish('auth-changed', this.authState);
      this.logger.info('User logged in successfully', { email });

      return { ...this.authState };
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  logout(): void {
    // Clear token and user from storage
    this.storageService.remove(this.tokenKey);
    this.storageService.remove(this.userKey);

    // Reset auth state
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null,
    };

    this.eventBus.publish('auth-changed', this.authState);
    this.logger.info('User logged out');
  }

  /**
   * Register a new user
   * @param email Email
   * @param password Password
   * @param fullName Full name
   */
  async register(email: string, password: string, fullName: string): Promise<AuthState> {
    try {
      // Mock registration for testing
      const mockResponse = {
        token: 'mock-token-' + Date.now(),
        user: {
          id: 'mock-user-id',
          email: email,
          fullName: fullName,
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      };

      // Save token and user to storage
      this.storageService.set(this.tokenKey, mockResponse.token);
      this.storageService.set(this.userKey, mockResponse.user);

      // Update auth state
      this.authState = {
        isAuthenticated: true,
        user: mockResponse.user,
        token: mockResponse.token,
      };

      this.eventBus.publish('auth-changed', this.authState);
      this.logger.info('User registered successfully', { email });

      return { ...this.authState };
    } catch (error) {
      this.logger.error('Registration failed', error);
      throw error;
    }
  }
}
