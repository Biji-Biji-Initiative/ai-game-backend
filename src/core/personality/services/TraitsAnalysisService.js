import { applyRepositoryErrorHandling, applyServiceErrorHandling, applyControllerErrorHandling, createErrorMapper } from "../../infra/errors/centralizedErrorUtils.js";
import { PersonalityError, PersonalityNotFoundError, PersonalityValidationError, PersonalityProcessingError } from "../../personality/errors/PersonalityErrors.js";
import { personalityLogger } from "../../infra/logging/domainLogger.js";
'use strict';
// Create an error mapper for services
const personalityServiceErrorMapper = createErrorMapper({
  PersonalityNotFoundError: PersonalityNotFoundError,
  PersonalityValidationError: PersonalityValidationError,
  PersonalityProcessingError: PersonalityProcessingError,
  Error: PersonalityError
}, PersonalityError);

/**
 * Traits Analysis Service
 * 
 * Domain service responsible for analyzing personality traits data.
 * This service encapsulates core domain logic related to trait analysis
 * without external dependencies or infrastructure concerns.
 * 
 * As a domain service, it:
 * 1. Performs pure domain operations on trait data
 * 2. Is stateless - each method produces output based only on its input
 * 3. Contains no infrastructure dependencies (DB, external APIs)
 * 4. Implements domain rules and business logic related to personality traits
 */
class TraitsAnalysisService {
  /**
   * Constructor
   * @param {Object} personalityRepository - Repository for personality data
   */
  constructor(personalityRepository) {
    this.personalityRepository = personalityRepository;
    this.logger = personalityLogger.child('traitsAnalysis');
  }
  /**
   * Compute dominant traits from personality data
   * @param {Object} personalityTraits - Personality traits with scores
   * @param {number} threshold - Optional threshold for dominant trait selection
   * @returns {Array} Dominant traits
   */
  computeDominantTraits(personalityTraits, threshold = 70) {
    try {
      if (!personalityTraits || Object.keys(personalityTraits).length === 0) {
        return [];
      }
      // Sort traits by score (highest first)
      const sortedTraits = Object.entries(personalityTraits).sort((a, b) => b[1] - a[1]).filter(([_, score]) => score >= threshold).map(([trait, _]) => trait);
      // Return top traits (or all above threshold)
      return sortedTraits;
    } catch (error) {
      this.logger.error('Error computing dominant traits', {
        error: error.message
      });
      return [];
    }
  }
  /**
   * Identify trait clusters from dominant traits
   * @param {Array<string>} dominantTraits - List of dominant traits
   * @returns {Object} Categorized trait clusters
   */
  identifyTraitClusters(dominantTraits) {
    try {
      const clusters = {
        analytical: [],
        creative: [],
        communicative: [],
        teamwork: [],
        leadership: []
      };
      const traitMapping = {
        analytical: ['analytical', 'logical', 'methodical', 'detail_oriented', 'systematic'],
        creative: ['creative', 'innovative', 'original', 'visionary', 'imaginative'],
        communicative: ['articulate', 'expressive', 'persuasive', 'clear', 'concise'],
        teamwork: ['collaborative', 'supportive', 'empathetic', 'cooperative', 'adaptable'],
        leadership: ['decisive', 'influential', 'strategic', 'inspiring', 'delegating']
      };
      // Categorize traits into clusters
      dominantTraits.forEach(trait => {
        Object.entries(traitMapping).forEach(([cluster, traits]) => {
          if (traits.includes(trait)) {
            clusters[cluster].push(trait);
          }
        });
      });
      // Remove empty clusters
      return Object.fromEntries(Object.entries(clusters).filter(([_, traits]) => traits.length > 0));
    } catch (error) {
      this.logger.error('Error identifying trait clusters', {
        error: error.message
      });
      return {};
    }
  }
  /**
   * Analyze AI attitudes to create a profile
   * @param {Object} aiAttitudes - AI attitude scores
   * @returns {Object} Analyzed AI attitude profile
   */
  analyzeAiAttitudes(aiAttitudes) {
    try {
      if (!aiAttitudes || Object.keys(aiAttitudes).length === 0) {
        return {
          overall: 'neutral',
          categories: {},
          summary: 'No AI attitude data available'
        };
      }
      // Map attitudes to categories
      const categories = {
        adoption: ['early_adopter', 'tech_savvy', 'experimental'],
        caution: ['cautious', 'skeptical', 'security_conscious'],
        ethics: ['ethical_concern', 'fairness_focus', 'accountability']
      };
      // Calculate category scores
      const categoryScores = {};
      Object.entries(categories).forEach(([category, attitudes]) => {
        const relevantAttitudes = attitudes.filter(a => aiAttitudes[a] !== undefined);
        if (relevantAttitudes.length === 0) {
          return;
        }
        const sum = relevantAttitudes.reduce((acc, att) => acc + aiAttitudes[att], 0);
        categoryScores[category] = Math.round(sum / relevantAttitudes.length);
      });
      // Calculate overall score
      const scores = Object.values(aiAttitudes);
      const overall = scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 50;
      // Determine overall stance
      let stance = 'neutral';
      if (overall >= 70) {
        stance = 'positive';
      } else if (overall <= 30) {
        stance = 'cautious';
      }
      return {
        overall: stance,
        score: overall,
        categories: categoryScores,
        summary: this.generateAttitudeSummary(stance, categoryScores)
      };
    } catch (error) {
      this.logger.error('Error analyzing AI attitudes', {
        error: error.message
      });
      return {
        overall: 'neutral',
        categories: {},
        summary: 'Error analyzing AI attitudes'
      };
    }
  }
  /**
   * Generate a summary of AI attitudes
   * @param {string} stance - Overall stance
   * @param {Object} categoryScores - Scores by category
   * @returns {string} Summary description
   * @private
   */
  generateAttitudeSummary(stance, categoryScores) {
    const highestCategory = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]).shift();
    if (!highestCategory) {
      return 'No significant AI attitude patterns detected';
    }
    const [category, _score] = highestCategory;
    const summaries = {
      positive: {
        adoption: 'Shows strong interest in adopting and exploring AI technologies',
        ethics: 'Values ethical considerations while embracing AI technologies',
        caution: 'Carefully optimistic about AI with appropriate safeguards'
      },
      neutral: {
        adoption: 'Moderately interested in new AI technologies',
        ethics: 'Balances benefits with ethical considerations of AI',
        caution: 'Takes a measured approach to AI adoption'
      },
      cautious: {
        adoption: 'Selective and careful about AI technology adoption',
        ethics: 'Prioritizes ethical concerns regarding AI implementation',
        caution: 'Prefers proven, well-established AI applications with safeguards'
      }
    };
    return summaries[stance][category] || 'Balanced view of AI technologies';
  }
  /**
   * Get enriched personality profile with computed insights
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Enriched personality profile
   */
  async getEnrichedProfile(userId) {
    try {
      const profile = await this.personalityRepository.findByUserId(userId);
      if (!profile) {
        throw new ProfileNotFoundError(userId);
      }

      // Apply enrichments and computations
      const enrichedProfile = {
        ...profile.toObject(),
        dominantTraitCategories: this._computeDominantCategories(profile.personalityTraits)
      };
      return enrichedProfile;
    } catch (error) {
      this.logger.error('Error retrieving enriched profile', {
        error: error.message,
        userId
      });

      // Pass through domain errors
      if (error instanceof PersonalityError) {
        throw error;
      }
      throw new PersonalityProcessingError(`Failed to get enriched profile: ${error.message}`);
    }
  }
  /**
   * Calculate compatibility between traits and challenge requirements
   * @param {Object} personalityTraits - User personality traits
   * @param {Object} challengeTraits - Challenge trait requirements
   * @returns {number} Compatibility score (0-100)
   */
  calculateTraitCompatibility(personalityTraits, challengeTraits) {
    try {
      if (!personalityTraits || Object.keys(personalityTraits).length === 0) {
        return 50; // Neutral score if no traits available
      }
      if (!challengeTraits || Object.keys(challengeTraits).length === 0) {
        return 50; // Neutral score if no challenge traits available
      }
      let totalScore = 0;
      let totalWeight = 0;
      // Calculate weighted score based on trait importance
      Object.entries(challengeTraits).forEach(([trait, importance]) => {
        const userTraitScore = personalityTraits[trait] || 50; // Default to 50 if trait not assessed
        const weight = importance;
        totalScore += userTraitScore * weight;
        totalWeight += weight;
      });
      // Calculate normalized score (0-100)
      return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
    } catch (error) {
      this.logger.error('Error calculating trait compatibility', {
        error: error.message,
        personalityTraitsCount: personalityTraits ? Object.keys(personalityTraits).length : 0,
        challengeTraitsCount: challengeTraits ? Object.keys(challengeTraits).length : 0
      });
      return 50; // Default neutral score on error
    }
  }
}
export default TraitsAnalysisService;