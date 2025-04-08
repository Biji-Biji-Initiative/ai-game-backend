/**
 * PersonalityDTOMapper
 * 
 * Maps between personality domain objects and data transfer objects for API endpoints.
 */

class PersonalityDTOMapper {
  /**
   * Convert a personality domain entity to DTO for API responses
   * @param {Object} personalityProfile - Personality domain entity
   * @param {Object} options - Mapping options 
   * @param {boolean} options.includeTraits - Whether to include personality traits
   * @param {boolean} options.includeAttitudes - Whether to include AI attitudes
   * @param {boolean} options.includeInsights - Whether to include generated insights
   * @returns {Object} - Personality DTO
   */
  static toDTO(personalityProfile, options = {}) {
    if (!personalityProfile) return null;
    
    // Default configuration
    const { 
      includeTraits = false, 
      includeAttitudes = false, 
      includeInsights = false 
    } = options;
    
    // Basic DTO that's always included
    const dto = {
      id: personalityProfile.id,
      userId: personalityProfile.userId,
      dominantTraits: personalityProfile.dominantTraits || [],
      traitClusters: personalityProfile.traitClusters || [],
      createdAt: personalityProfile.createdAt,
      updatedAt: personalityProfile.updatedAt
    };
    
    // Add optional detailed sections
    if (includeTraits) {
      dto.personalityTraits = personalityProfile.personalityTraits || {};
    }
    
    if (includeAttitudes) {
      dto.aiAttitudes = personalityProfile.aiAttitudes || {};
      dto.aiAttitudeProfile = personalityProfile.aiAttitudeProfile || {};
    }
    
    if (includeInsights) {
      dto.insights = personalityProfile.insights || [];
    }
    
    return dto;
  }

  /**
   * Convert a collection of personality domain entities to DTOs
   * @param {Array} personalityProfiles - Array of personality domain entities
   * @param {Object} options - Mapping options
   * @returns {Array} - Array of personality DTOs
   */
  static toDTOCollection(personalityProfiles, options = {}) {
    if (!personalityProfiles || !Array.isArray(personalityProfiles)) return [];
    
    return personalityProfiles.map(profile => this.toDTO(profile, options));
  }

  /**
   * Convert request data to a personality domain format for updating traits
   * @param {Object} requestData - Request data from API
   * @returns {Object} - Personality data in domain format
   */
  static fromRequest(requestData) {
    if (!requestData) return {};
    
    // Map API request format to domain model format
    return {
      userId: requestData.userId,
      personalityTraits: requestData.personalityTraits,
      aiAttitudes: requestData.aiAttitudes,
    };
  }
}

export default PersonalityDTOMapper; 