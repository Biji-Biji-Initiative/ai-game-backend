/**
 * Trait Utility Functions
 * Provides functions for analyzing user personality traits and AI attitudes
 */
const { logger } = require('../logger');

/**
 * Compute dominant traits from personality data
 * @param {Object} personalityData - User's personality traits and scores
 * @param {number} threshold - Threshold for considering a trait dominant (0-100)
 * @returns {Array} Array of dominant trait IDs
 */
const computeDominantTraits = (personalityData, threshold = 70) => {
  try {
    const traits = [];
    
    for (const [traitId, score] of Object.entries(personalityData)) {
      if (score >= threshold) {
        traits.push(traitId);
      }
    }
    
    return traits;
  } catch (error) {
    logger.error('Error computing dominant traits', { error: error.message });
    throw new Error(`Failed to compute dominant traits: ${error.message}`);
  }
};

/**
 * Identify trait clusters based on dominant traits
 * @param {Array} dominantTraits - Array of dominant trait IDs
 * @returns {Array} Array of trait cluster names
 */
const identifyTraitClusters = (dominantTraits) => {
  try {
    // Define trait clusters (these would be defined based on psychological research)
    const clusters = {
      'analytical': ['analyticalThinking', 'criticalThinking', 'problemSolving'],
      'creative': ['creativity', 'innovation', 'imagination'],
      'empathetic': ['empathy', 'emotionalIntelligence', 'socialAwareness'],
      'risk-taking': ['riskTaking', 'adventurousness', 'courage'],
      'adaptable': ['adaptability', 'flexibility', 'resilience']
    };
    
    const userClusters = [];
    
    // Check each cluster to see if the user has a majority of traits in that cluster
    for (const [clusterName, clusterTraits] of Object.entries(clusters)) {
      const matchingTraits = dominantTraits.filter(trait => clusterTraits.includes(trait));
      const matchPercentage = matchingTraits.length / clusterTraits.length;
      
      if (matchPercentage >= 0.5) {
        userClusters.push(clusterName);
      }
    }
    
    return userClusters;
  } catch (error) {
    logger.error('Error identifying trait clusters', { error: error.message });
    throw new Error(`Failed to identify trait clusters: ${error.message}`);
  }
};

/**
 * Analyze AI attitudes to determine overall profile
 * @param {Object} aiAttitudes - User's attitudes toward AI
 * @returns {Object} AI attitude profile
 */
const analyzeAiAttitudes = (aiAttitudes) => {
  try {
    const sum = Object.values(aiAttitudes).reduce((acc, val) => acc + val, 0);
    const average = sum / Object.keys(aiAttitudes).length;
    
    let overallSentiment;
    if (average >= 70) {
      overallSentiment = 'highly positive';
    } else if (average >= 50) {
      overallSentiment = 'moderately positive';
    } else if (average >= 30) {
      overallSentiment = 'neutral';
    } else {
      overallSentiment = 'concerned';
    }
    
    // Check for specific concern patterns
    const concerns = [];
    if (aiAttitudes.jobConcerns > 70) {
      concerns.push('job displacement');
    }
    if (aiAttitudes.controlConcerns > 70) {
      concerns.push('control and autonomy');
    }
    if (aiAttitudes.privacyConcerns > 70) {
      concerns.push('privacy and security');
    }
    
    // Check for specific interest areas
    const interests = [];
    if (aiAttitudes.personalInterest > 70) {
      interests.push('personal use');
    }
    if (aiAttitudes.professionalInterest > 70) {
      interests.push('professional applications');
    }
    if (aiAttitudes.societalInterest > 70) {
      interests.push('societal impacts');
    }
    
    return {
      overallSentiment,
      concerns,
      interests,
      average
    };
  } catch (error) {
    logger.error('Error analyzing AI attitudes', { error: error.message });
    throw new Error(`Failed to analyze AI attitudes: ${error.message}`);
  }
};

module.exports = {
  computeDominantTraits,
  identifyTraitClusters,
  analyzeAiAttitudes
};
