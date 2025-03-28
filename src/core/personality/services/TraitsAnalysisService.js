/**
 * Traits Analysis Service
 * 
 * Domain service that provides utilities for analyzing personality traits and AI attitudes.
 * Centralizes all personality analytics functions in the personality domain.
 */
const { personalityLogger } = require('../../infra/logging/domainLogger');

class TraitsAnalysisService {
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
      const sortedTraits = Object.entries(personalityTraits)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, score]) => score >= threshold)
        .map(([trait, _]) => trait);
      
      // Return top traits (or all above threshold)
      return sortedTraits;
    } catch (error) {
      this.logger.error('Error computing dominant traits', { error: error.message });
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
      return Object.fromEntries(
        Object.entries(clusters).filter(([_, traits]) => traits.length > 0)
      );
    } catch (error) {
      this.logger.error('Error identifying trait clusters', { error: error.message });
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
        if (relevantAttitudes.length === 0) return;
        
        const sum = relevantAttitudes.reduce((acc, att) => acc + aiAttitudes[att], 0);
        categoryScores[category] = Math.round(sum / relevantAttitudes.length);
      });
      
      // Calculate overall score
      const scores = Object.values(aiAttitudes);
      const overall = scores.length > 0 
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 50;
      
      // Determine overall stance
      let stance = 'neutral';
      if (overall >= 70) stance = 'positive';
      else if (overall <= 30) stance = 'cautious';
      
      return {
        overall: stance,
        score: overall,
        categories: categoryScores,
        summary: this.generateAttitudeSummary(stance, categoryScores)
      };
    } catch (error) {
      this.logger.error('Error analyzing AI attitudes', { error: error.message });
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
    const highestCategory = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .shift();
    
    if (!highestCategory) return 'No significant AI attitude patterns detected';
    
    const [category, score] = highestCategory;
    
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
   * Get personality profile with derived insights
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Personality profile with computed insights
   */
  async getEnrichedProfile(userId) {
    try {
      // Get or create personality profile
      let profile = await this.personalityRepository.findByUserId(userId);
      
      if (!profile) {
        return {
          userId,
          personalityTraits: {},
          aiAttitudes: {},
          dominantTraits: [],
          traitClusters: {},
          aiAttitudeProfile: {},
          insights: {}
        };
      }
      
      // Compute insights if needed
      if (Object.keys(profile.personalityTraits).length > 0 && 
          (!profile.dominantTraits || profile.dominantTraits.length === 0)) {
        
        const dominantTraits = this.computeDominantTraits(profile.personalityTraits);
        profile.setDominantTraits(dominantTraits);
        
        const traitClusters = this.identifyTraitClusters(dominantTraits);
        profile.setTraitClusters(traitClusters);
        
        await this.personalityRepository.save(profile);
      }
      
      // Compute AI attitude profile if needed
      if (Object.keys(profile.aiAttitudes).length > 0 && 
          (!profile.aiAttitudeProfile || Object.keys(profile.aiAttitudeProfile).length === 0)) {
        
        const aiAttitudeProfile = this.analyzeAiAttitudes(profile.aiAttitudes);
        profile.setAIAttitudeProfile(aiAttitudeProfile);
        
        await this.personalityRepository.save(profile);
      }
      
      return profile;
    } catch (error) {
      this.logger.error('Error getting enriched profile', { error: error.message, userId });
      throw error;
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

module.exports = TraitsAnalysisService; 