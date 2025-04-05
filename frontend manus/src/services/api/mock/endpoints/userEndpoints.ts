/**
 * User Mock Endpoints
 * 
 * Provides mock implementations for user-related API operations.
 */

import { ApiResponse } from '@/services/api/apiResponse';
import { mockUsers } from '../data';
import { UIUser } from '@/types/api';
import { UpdateProfileRequest } from '@/services/api/services/userService';

/**
 * Get user profile by ID
 * 
 * @param userId The ID of the user to retrieve
 * @returns ApiResponse with user profile data
 */
export const getUserProfile = (userId?: string): ApiResponse<UIUser> => {
  // Validate input
  if (!userId) {
    return {
      success: false,
      status: 400,
      error: {
        code: 'validation_error',
        message: 'User ID is required',
      }
    };
  }

  // Find user in mock data
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    return {
      success: false,
      status: 404,
      error: {
        code: 'not_found',
        message: `User with ID ${userId} not found`,
      }
    };
  }

  return {
    success: true,
    status: 200,
    data: user as UIUser,
  };
};

/**
 * Update user profile
 * 
 * @param data The profile data to update
 * @returns ApiResponse with updated user profile
 */
export const updateUserProfile = (data?: { userId: string; data: UpdateProfileRequest }): ApiResponse<UIUser> => {
  // Validate input
  if (!data || !data.userId) {
    return {
      success: false,
      status: 400,
      error: {
        code: 'validation_error',
        message: 'User ID is required',
      }
    };
  }

  // Find user in mock data
  const userIndex = mockUsers.findIndex(u => u.id === data.userId);
  
  if (userIndex === -1) {
    return {
      success: false,
      status: 404,
      error: {
        code: 'not_found',
        message: `User with ID ${data.userId} not found`,
      }
    };
  }

  // Update user data
  const updatedUser = {
    ...mockUsers[userIndex],
    ...data.data,
    updatedAt: new Date().toISOString(),
  };

  // In a real implementation, we would update the database
  // Here we're just returning the updated user
  
  return {
    success: true,
    status: 200,
    data: updatedUser as UIUser,
  };
};

/**
 * Get current user profile (authenticated user)
 * 
 * @returns ApiResponse with current user profile
 */
export const getCurrentUser = (): ApiResponse<UIUser> => {
  // For mock purposes, we'll return the first user as the current user
  const currentUser = mockUsers[0];
  
  return {
    success: true,
    status: 200,
    data: currentUser as UIUser,
  };
};

/**
 * Delete user account
 * 
 * @param userId The ID of the user to delete
 * @returns ApiResponse with success message
 */
export const deleteUserAccount = (userId?: string): ApiResponse<{ message: string }> => {
  // Validate input
  if (!userId) {
    return {
      success: false,
      status: 400,
      error: {
        code: 'validation_error',
        message: 'User ID is required',
      }
    };
  }

  // Find user in mock data
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return {
      success: false,
      status: 404,
      error: {
        code: 'not_found',
        message: `User with ID ${userId} not found`,
      }
    };
  }

  // In a real implementation, we would delete from the database
  // Here we're just returning success
  
  return {
    success: true,
    status: 200,
    data: { message: 'User account deleted successfully' },
  };
};
