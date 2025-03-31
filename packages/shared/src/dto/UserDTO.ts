/**
 * User Data Transfer Object (DTO)
 *
 * Used for transferring user data between packages in a serialized format.
 * Contains only data, no behavior.
 */
export interface UserDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Creation DTO
 */
export interface UserCreateDTO {
  email: string;
  name: string;
  password?: string;
}

/**
 * Partial User DTO for updates
 */
export interface UserUpdateDTO {
  email?: string;
  name?: string;
}

/**
 * Data Transfer Object for User entity
 */
export interface CreateUserDTO {
  email: string;
  name: string;
  password?: string;
}
