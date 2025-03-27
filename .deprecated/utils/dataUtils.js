/**
 * Data Utilities Facade
 * Provides a unified interface to access domain-specific utility functions
 * This file follows the Facade pattern to maintain backward compatibility
 * while delegating to more specialized modules
 */

// Import specialized utility modules
const traitUtils = require('./user/traitUtils');
const challengeUtils = require('./challenge/challengeUtils');
const performanceMetrics = require('./performance/performanceMetrics');
const { logger } = require('./logger');

/**
 * @deprecated Use traitUtils.computeDominantTraits instead
 */
const computeDominantTraits = (personalityData, threshold = 70) => {
  try {
    return traitUtils.computeDominantTraits(personalityData, threshold);
  } catch (error) {
    logger.error('Error in computeDominantTraits facade', { error: error.message });
    throw error;
  }
};

/**
 * @deprecated Use traitUtils.identifyTraitClusters instead
 */
const identifyTraitClusters = (dominantTraits) => {
  try {
    return traitUtils.identifyTraitClusters(dominantTraits);
  } catch (error) {
    logger.error('Error in identifyTraitClusters facade', { error: error.message });
    throw error;
  }
};

/**
 * @deprecated Use traitUtils.analyzeAiAttitudes instead
 */
const analyzeAiAttitudes = (aiAttitudes) => {
  try {
    return traitUtils.analyzeAiAttitudes(aiAttitudes);
  } catch (error) {
    logger.error('Error in analyzeAiAttitudes facade', { error: error.message });
    throw error;
  }
};

/**
 * @deprecated Use challengeUtils.generateChallengeId instead
 */
const generateChallengeId = (userEmail) => {
  try {
    return challengeUtils.generateChallengeId(userEmail);
  } catch (error) {
    logger.error('Error in generateChallengeId facade', { error: error.message });
    throw error;
  }
};

/**
 * @deprecated Use challengeUtils.selectChallengeType instead
 */
const selectChallengeType = (dominantTraits, focusAreas) => {
  try {
    return challengeUtils.selectChallengeType(dominantTraits, focusAreas);
  } catch (error) {
    logger.error('Error in selectChallengeType facade', { error: error.message });
    throw error;
  }
};

/**
 * @deprecated Use performanceMetrics.calculatePerformanceMetrics instead
 */
const calculatePerformanceMetrics = (challengeHistory) => {
  try {
    return performanceMetrics.calculatePerformanceMetrics(challengeHistory);
  } catch (error) {
    logger.error('Error in calculatePerformanceMetrics facade', { error: error.message });
    throw error;
  }
};

/**
 * @deprecated Use performanceMetrics.analyzeProgressTrend instead
 */
const analyzeProgressTrend = (challengeHistory, timeWindow = 30) => {
  try {
    return performanceMetrics.analyzeProgressTrend(challengeHistory, timeWindow);
  } catch (error) {
    logger.error('Error in analyzeProgressTrend facade', { error: error.message });
    throw error;
  }
};

module.exports = {
  computeDominantTraits,
  identifyTraitClusters,
  analyzeAiAttitudes,
  generateChallengeId,
  selectChallengeType,
  calculatePerformanceMetrics,
  analyzeProgressTrend
};
