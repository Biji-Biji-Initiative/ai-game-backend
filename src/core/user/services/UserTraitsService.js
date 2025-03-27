/**
 * User Traits Service
 * 
 * Domain service that provides utilities for handling user traits.
 * Moved from utilities to follow Domain-Driven Design principles.
 */
const { logger } = require('../../../core/infra/logging/logger');

class UserTraitsService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Get user's dominant traits based on personality assessment
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User's dominant traits
   */
  async getDominantTraits(userId) {
    try {
      // Get user data including personality assessment
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      if (!user.personalityTraits || Object.keys(user.personalityTraits).length === 0) {
        return [];
      }
      
      // Sort traits by score (highest first)
      const sortedTraits = Object.entries(user.personalityTraits)
        .sort((a, b) => b[1] - a[1])
        .map(([trait, _]) => trait);
      
      // Return top 3 traits
      return sortedTraits.slice(0, 3);
    } catch (error) {
      logger.error('Error getting dominant traits', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate trait compatibility between user and challenge type
   * @param {Object} userTraits - User personality traits {trait: score}
   * @param {Object} challengeTraits - Challenge type traits requirements {trait: importance}
   * @returns {number} Compatibility score (0-100)
   */
  calculateTraitCompatibility(userTraits, challengeTraits) {
    if (!userTraits || Object.keys(userTraits).length === 0) {
      return 50; // Neutral score if no traits available
    }
    
    if (!challengeTraits || Object.keys(challengeTraits).length === 0) {
      return 50; // Neutral score if no challenge traits available
    }
    
    let totalScore = 0;
    let totalWeight = 0;
    
    // Calculate weighted score based on trait importance
    Object.entries(challengeTraits).forEach(([trait, importance]) => {
      const userTraitScore = userTraits[trait] || 0.5; // Default to 0.5 if trait not assessed
      const weight = importance;
      
      totalScore += userTraitScore * weight;
      totalWeight += weight;
    });
    
    // Calculate normalized score (0-100)
    const normalizedScore = totalWeight > 0 
      ? Math.round((totalScore / totalWeight) * 100)
      : 50;
    
    return normalizedScore;
  }

  /**
   * Get trait-based challenge recommendations
   * @param {string} userId - User ID
   * @param {Array} availableChallengeTypes - Available challenge types with trait requirements
   * @returns {Promise<Array>} Recommended challenge types sorted by compatibility
   */
  async getTraitBasedRecommendations(userId, availableChallengeTypes) {
    try {
      // Get user data including personality assessment
      const user = await this.userRepository.findById(userId);
      
      if (!user || !user.personalityTraits) {
        return availableChallengeTypes;
      }
      
      // Calculate compatibility for each challenge type
      const scoredTypes = availableChallengeTypes.map(type => {
        const compatibility = this.calculateTraitCompatibility(
          user.personalityTraits,
          type.traitRequirements || {}
        );
        
        return {
          ...type,
          compatibility
        };
      });
      
      // Sort by compatibility (highest first)
      return scoredTypes.sort((a, b) => b.compatibility - a.compatibility);
    } catch (error) {
      logger.error('Error getting trait-based recommendations', { error: error.message });
      return availableChallengeTypes;
    }
  }

  /**
   * Adjust difficulty based on user traits
   * @param {Object} difficulty - Difficulty parameters
   * @param {Object} userTraits - User personality traits
   * @returns {Object} Adjusted difficulty
   */
  adjustDifficultyForTraits(difficulty, userTraits) {
    if (!difficulty || !userTraits) {
      return difficulty;
    }
    
    const adjustedDifficulty = { ...difficulty };
    
    // Adjust for analytical trait
    if (userTraits.analytical > 0.7) {
      adjustedDifficulty.complexity = Math.min(1.0, adjustedDifficulty.complexity + 0.1);
    }
    
    // Adjust for creative trait
    if (userTraits.creative > 0.7) {
      adjustedDifficulty.depth = Math.min(1.0, adjustedDifficulty.depth + 0.1);
    }
    
    // Adjust for patient trait
    if (userTraits.patient > 0.7) {
      adjustedDifficulty.timeAllocation = adjustedDifficulty.timeAllocation * 0.9; // Reduce time as they're patient
    }
    
    // Adjust for adaptable trait
    if (userTraits.adaptable < 0.3) {
      // Less adaptable users need more consistent difficulty
      adjustedDifficulty.complexity = Math.max(0.3, Math.min(0.7, adjustedDifficulty.complexity));
    }
    
    return adjustedDifficulty;
  }
}

module.exports = UserTraitsService; 