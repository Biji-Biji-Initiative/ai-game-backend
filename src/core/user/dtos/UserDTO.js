'use strict';

/**
 * User Data Transfer Object (DTO)
 *
 * Represents the API representation of a User.
 * Decouples the domain model from the API contract.
 */

/**
 * User DTO
 * Used for sending user data to clients
 */
class UserDTO {
  /**
   * Create a new UserDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.email = data.email || '';
    this.fullName = data.fullName || '';
    this.professionalTitle = data.professionalTitle || '';
    this.location = data.location || '';
    this.country = data.country || '';
    this.focusArea = data.focusArea || '';
    this.lastActive = data.lastActive || null;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
    this.status = data.status || 'active';
    this.roles = data.roles || ['user'];
    this.onboardingCompleted = data.onboardingCompleted || false;

    // Add computed properties relevant to API consumers
    this.isActive = data.status === 'active';
    this.hasCompletedProfile = Boolean(data.fullName && data.professionalTitle);
    this.preferences = data.preferences || {};
  }

  /**
   * Convert to plain object format suitable for JSON serialization
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      professionalTitle: this.professionalTitle,
      location: this.location,
      country: this.country,
      focusArea: this.focusArea,
      lastActive: this.lastActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this.status,
      roles: this.roles,
      onboardingCompleted: this.onboardingCompleted,
      isActive: this.isActive,
      hasCompletedProfile: this.hasCompletedProfile,
      preferences: this.preferences
    };
  }
}

/**
 * User DTO Mapper
 * Converts between domain entities and DTOs
 */
class UserDTOMapper {
  /**
   * Convert a domain User to a UserDTO
   * @param {User} user - Domain User entity
   * @returns {UserDTO} User DTO for API consumption
   */
  static toDTO(user) {
    if (!user) {
      return null;
    }

    // Convert snake_case properties to camelCase for consistency
    const dto = new UserDTO({
      id: user.id,
      email: user.email,
      fullName: user.fullName || user.full_name,
      professionalTitle: user.professionalTitle || user.professional_title,
      location: user.location,
      country: user.country,
      focusArea: user.focusArea || user.focus_area,
      lastActive: user.lastActive || user.last_active,
      createdAt: user.createdAt || user.created_at,
      updatedAt: user.updatedAt || user.updated_at,
      status: user.status,
      roles: user.roles,
      onboardingCompleted: user.onboardingCompleted || user.onboarding_completed,
      preferences: user.preferences
    });

    return dto;
  }

  /**
   * Convert an array of domain Users to UserDTOs
   * @param {Array<User>} users - Array of domain User entities
   * @returns {Array<UserDTO>} Array of User DTOs
   */
  static toDTOCollection(users) {
    if (!Array.isArray(users)) {
      return [];
    }

    return users.map(user => UserDTOMapper.toDTO(user));
  }

  /**
   * Convert a request body to parameters for domain operations
   * @param {Object} requestBody - API request body
   * @returns {Object} Parameters for domain operations
   */
  static fromRequest(requestBody) {
    if (!requestBody) {
      return {};
    }

    // Extract and validate fields from request
    const {
      email,
      firstName,
      lastName,
      fullName,
      professionalTitle,
      location,
      country,
      focusArea,
      preferences,
      status
    } = requestBody;

    // Construct a sanitized object for domain operations
    const params = {};

    // Handle email - always lowercase
    if (email) {
      params.email = email.trim().toLowerCase();
    }

    // Handle name - allow either fullName or firstName/lastName combination
    if (fullName) {
      params.fullName = fullName.trim();
    } else if (firstName && lastName) {
      params.fullName = `${firstName.trim()} ${lastName.trim()}`;
    }

    // Handle other fields
    if (professionalTitle) params.professionalTitle = professionalTitle.trim();
    if (location) params.location = location.trim();
    if (country) params.country = country.trim();
    if (focusArea) params.focusArea = focusArea.trim();
    
    // Only include status if it's valid
    if (status && ['active', 'inactive', 'suspended', 'pending'].includes(status)) {
      params.status = status;
    }

    // Handle preferences as a complete object
    if (preferences && typeof preferences === 'object') {
      params.preferences = preferences;
    }

    return params;
  }
}

module.exports = {
  UserDTO,
  UserDTOMapper
};
