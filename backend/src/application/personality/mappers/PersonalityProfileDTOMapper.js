/**
 * PersonalityProfileDTOMapper
 * 
 * Maps between personality profile domain objects and data transfer objects for API endpoints.
 * This mapper is specifically for the personality profile endpoints.
 */

class PersonalityProfileDTOMapper {
  /**
   * Convert a personality profile domain entity to DTO for API responses
   * @param {Object} personalityProfile - Personality profile domain entity
   * @param {Object} options - Mapping options 
   * @param {boolean} options.includeTraits - Whether to include personality traits
   * @param {boolean} options.includeAttitudes - Whether to include AI attitudes
   * @param {boolean} options.includeInsights - Whether to include generated insights
   * @returns {Object} - Personality profile DTO
   */
  static toDTO(personalityProfile, options = {}) {
    if (!personalityProfile) return null;
    
    // Default configuration
    const { 
      includeTraits = false, 
      includeAttitudes = false, 
      includeInsights = false 
    } = options;
    
    // Basic profile DTO that's always included
    const dto = {
      id: personalityProfile.id,
      userId: personalityProfile.userId,
      dominantTraits: personalityProfile.dominantTraits || [],
      traitClusters: personalityProfile.traitClusters || {},
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
   * Convert request data to a personality profile domain format
   * @param {Object} requestData - Request data from API
   * @returns {Object} - Personality profile data in domain format
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

export default PersonalityProfileDTOMapper; 