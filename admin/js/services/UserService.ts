/**
 * User Service
 * 
 * Handles user-related operations and management
 */

import { Service } from '../core/ServiceManager';
import { ApiClient, ApiError } from '../api/ApiClient';
import { EventBus } from '../core/EventBus';
import { logger } from '../utils/logger';
import { User } from './AuthService';

/**
 * User role
 */
export interface Role {
  /**
   * Role ID
   */
  id: string;
  
  /**
   * Role name
   */
  name: string;
  
  /**
   * Role description
   */
  description: string;
  
  /**
   * Role permissions
   */
  permissions: string[];
}

/**
 * User creation parameters
 */
export interface CreateUserParams {
  /**
   * Username
   */
  username: string;
  
  /**
   * Email address
   */
  email: string;
  
  /**
   * Full name
   */
  fullName: string;
  
  /**
   * Initial password
   */
  password: string;
  
  /**
   * Role IDs
   */
  roleIds?: string[];
}

/**
 * User update parameters
 */
export interface UpdateUserParams {
  /**
   * Email address
   */
  email?: string;
  
  /**
   * Full name
   */
  fullName?: string;
  
  /**
   * New password
   */
  password?: string;
  
  /**
   * Role IDs
   */
  roleIds?: string[];
  
  /**
   * Whether the user is active
   */
  isActive?: boolean;
}

/**
 * User list parameters
 */
export interface UserListParams {
  /**
   * Page number
   */
  page?: number;
  
  /**
   * Items per page
   */
  limit?: number;
  
  /**
   * Search query
   */
  query?: string;
  
  /**
   * Sort field
   */
  sortBy?: string;
  
  /**
   * Sort direction
   */
  sortDir?: 'asc' | 'desc';
  
  /**
   * Filter by role ID
   */
  roleId?: string;
  
  /**
   * Filter by active status
   */
  isActive?: boolean;
  
  /**
   * Allow indexing by any string key
   */
  [key: string]: string | number | boolean | undefined;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  /**
   * Result items
   */
  items: T[];
  
  /**
   * Total count of items
   */
  total: number;
  
  /**
   * Current page
   */
  page: number;
  
  /**
   * Items per page
   */
  limit: number;
  
  /**
   * Total number of pages
   */
  pages: number;
}

/**
 * User service for managing users
 */
export class UserService implements Service {
  private apiClient: ApiClient;
  private eventBus: EventBus;
  private baseUrl: string;
  
  /**
   * Constructor
   * @param apiClient API client instance
   * @param baseUrl Base URL for user endpoints
   */
  constructor(apiClient: ApiClient, baseUrl: string = '/users') {
    this.apiClient = apiClient;
    this.eventBus = EventBus.getInstance();
    this.baseUrl = baseUrl;
  }
  
  /**
   * Initialize the service
   */
  public async init(): Promise<void> {
    logger.debug('UserService initialized');
  }
  
  /**
   * Get list of users
   * @param params List parameters
   */
  public async getUsers(params: UserListParams = {}): Promise<PaginatedResult<User>> {
    try {
      const response = await this.apiClient.get<PaginatedResult<User>>(
        this.baseUrl,
        params,
      );
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get users:', error);
      this.eventBus.emit('user:error', { error, operation: 'getUsers' });
      throw error;
    }
  }
  
  /**
   * Get user by ID
   * @param userId User ID
   */
  public async getUserById(userId: string): Promise<User> {
    try {
      const response = await this.apiClient.get<{ user: User }>(
        `${this.baseUrl}/${userId}`,
      );
      
      return response.data.user;
    } catch (error) {
      logger.error(`Failed to get user ${userId}:`, error);
      this.eventBus.emit('user:error', { error, operation: 'getUserById', userId });
      throw error;
    }
  }
  
  /**
   * Create a new user
   * @param params User creation parameters
   */
  public async createUser(params: CreateUserParams): Promise<User> {
    try {
      const response = await this.apiClient.post<{ user: User }>(
        this.baseUrl,
        params,
      );
      
      const user = response.data.user;
      this.eventBus.emit('user:created', { user });
      
      return user;
    } catch (error) {
      logger.error('Failed to create user:', error);
      this.eventBus.emit('user:error', { error, operation: 'createUser' });
      throw error;
    }
  }
  
  /**
   * Update an existing user
   * @param userId User ID
   * @param params User update parameters
   */
  public async updateUser(userId: string, params: UpdateUserParams): Promise<User> {
    try {
      const response = await this.apiClient.put<{ user: User }>(
        `${this.baseUrl}/${userId}`,
        params,
      );
      
      const user = response.data.user;
      this.eventBus.emit('user:updated', { user });
      
      return user;
    } catch (error) {
      logger.error(`Failed to update user ${userId}:`, error);
      this.eventBus.emit('user:error', { error, operation: 'updateUser', userId });
      throw error;
    }
  }
  
  /**
   * Delete a user
   * @param userId User ID
   */
  public async deleteUser(userId: string): Promise<void> {
    try {
      await this.apiClient.delete(`${this.baseUrl}/${userId}`);
      this.eventBus.emit('user:deleted', { userId });
    } catch (error) {
      logger.error(`Failed to delete user ${userId}:`, error);
      this.eventBus.emit('user:error', { error, operation: 'deleteUser', userId });
      throw error;
    }
  }
  
  /**
   * Get all available roles
   */
  public async getRoles(): Promise<Role[]> {
    try {
      const response = await this.apiClient.get<{ roles: Role[] }>(
        `${this.baseUrl}/roles`,
      );
      
      return response.data.roles;
    } catch (error) {
      logger.error('Failed to get roles:', error);
      this.eventBus.emit('user:error', { error, operation: 'getRoles' });
      throw error;
    }
  }
  
  /**
   * Assign roles to a user
   * @param userId User ID
   * @param roleIds Role IDs to assign
   */
  public async assignRoles(userId: string, roleIds: string[]): Promise<User> {
    try {
      const response = await this.apiClient.post<{ user: User }>(
        `${this.baseUrl}/${userId}/roles`,
        { roleIds },
      );
      
      const user = response.data.user;
      this.eventBus.emit('user:rolesUpdated', { user, roleIds });
      
      return user;
    } catch (error) {
      logger.error(`Failed to assign roles to user ${userId}:`, error);
      this.eventBus.emit('user:error', { error, operation: 'assignRoles', userId });
      throw error;
    }
  }
  
  /**
   * Change user password
   * @param userId User ID
   * @param currentPassword Current password
   * @param newPassword New password
   */
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await this.apiClient.post(
        `${this.baseUrl}/${userId}/password`,
        {
          currentPassword,
          newPassword,
        },
      );
      
      this.eventBus.emit('user:passwordChanged', { userId });
    } catch (error) {
      logger.error(`Failed to change password for user ${userId}:`, error);
      this.eventBus.emit('user:error', { error, operation: 'changePassword', userId });
      throw error;
    }
  }
  
  /**
   * Reset user password
   * @param userId User ID
   */
  public async resetPassword(userId: string): Promise<string> {
    try {
      const response = await this.apiClient.post<{ temporaryPassword: string }>(
        `${this.baseUrl}/${userId}/reset-password`,
      );
      
      const temporaryPassword = response.data.temporaryPassword;
      this.eventBus.emit('user:passwordReset', { userId });
      
      return temporaryPassword;
    } catch (error) {
      logger.error(`Failed to reset password for user ${userId}:`, error);
      this.eventBus.emit('user:error', { error, operation: 'resetPassword', userId });
      throw error;
    }
  }
  
  /**
   * Check if a username is available
   * @param username Username to check
   */
  public async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const response = await this.apiClient.get<{ available: boolean }>(
        `${this.baseUrl}/check-username`,
        { username },
      );
      
      return response.data.available;
    } catch (error) {
      logger.error(`Failed to check username availability for ${username}:`, error);
      this.eventBus.emit('user:error', { error, operation: 'isUsernameAvailable' });
      throw error;
    }
  }
  
  /**
   * Dispose of the service
   */
  public async dispose(): Promise<void> {
    logger.debug('UserService disposed');
  }
} 