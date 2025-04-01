/**
 * User Profile DTO Mapper
 * 
 * Maps between domain user profile objects and data transfer objects.
 */

/**
 * Maps a user profile entity to a DTO for API responses
 */
class UserProfileDTOMapper {
  /**
   * Convert a user profile domain entity to a DTO suitable for API responses
   * @param {Object} userProfile - User profile domain entity
   * @returns {Object} - User profile DTO
   */
  static toDTO(userProfile) {
    if (!userProfile) return null;
    
    return {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.fullName || userProfile.displayName,
      displayName: userProfile.displayName,
      skillLevel: userProfile.skillLevel || 'intermediate',
      profession: userProfile.profession || userProfile.title,
      focusAreas: userProfile.focusAreas || [],
      learningGoals: userProfile.learningGoals || [],
      preferredLearningStyle: userProfile.preferredLearningStyle,
      createdAt: userProfile.createdAt,
      updatedAt: userProfile.updatedAt
    };
  }

  /**
   * Convert a collection of user profile domain entities to DTOs
   * @param {Array} userProfiles - Array of user profile domain entities
   * @returns {Array} - Array of user profile DTOs
   */
  static toDTOCollection(userProfiles) {
    if (!userProfiles || !Array.isArray(userProfiles)) return [];
    
    return userProfiles.map(userProfile => this.toDTO(userProfile));
  }

  /**
   * Convert request data to a user profile domain entity format
   * @param {Object} requestData - Request data from API
   * @returns {Object} - User profile data in domain format
   */
  static fromRequest(requestData) {
    if (!requestData) return {};
    
    return {
      email: requestData.email,
      fullName: requestData.name,
      displayName: requestData.displayName,
      skillLevel: requestData.skillLevel,
      profession: requestData.profession,
      focusAreas: requestData.focusAreas || [],
      learningGoals: requestData.learningGoals || [],
      preferredLearningStyle: requestData.preferredLearningStyle
    };
  }
}

export default UserProfileDTOMapper; 