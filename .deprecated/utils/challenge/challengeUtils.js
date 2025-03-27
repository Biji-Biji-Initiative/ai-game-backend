/**
 * Challenge Utility Functions
 * Provides functions for challenge generation, selection, and management
 */
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');
const { logger } = require('../logger');
const { getChallengeTypes, getTraitMappings, getFocusAreaMappings } = require('../../core/challenge/repositories/ChallengeTypeRepository');

/**
 * Generate a unique challenge ID
 * @param {string} userEmail - User's email for namespacing
 * @returns {string} Unique challenge ID
 */
const generateChallengeId = (userEmail) => {
  if (!userEmail) {
    throw new Error('User email is required to generate challenge ID');
  }
  
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const emailPrefix = userEmail.split('@')[0].substring(0, 5);
  return `${emailPrefix}-${timestamp}-${random}`;
};

/**
 * Select appropriate challenge type based on user traits
 * @param {Array} dominantTraits - User's dominant trait IDs
 * @param {Array} focusAreas - User's chosen focus areas
 * @returns {Promise<Object>} Challenge type information
 */
const selectChallengeType = async (dominantTraits, focusAreas) => {
  if (!dominantTraits || !Array.isArray(dominantTraits)) {
    throw new Error('Dominant traits must be provided as an array');
  }
  
  if (!focusAreas || !Array.isArray(focusAreas)) {
    throw new Error('Focus areas must be provided as an array');
  }
  
  // Get all challenge types from the database
  const challengeTypes = await getChallengeTypes();
  
  if (!challengeTypes || challengeTypes.length === 0) {
    throw new Error('No challenge types found in the database');
  }
  
  // Get trait and focus area mappings from database
  const traitMappings = await getTraitMappings();
  const focusAreaMappings = await getFocusAreaMappings();
  
  if (!traitMappings) {
    throw new Error('Failed to retrieve trait mappings from database');
  }
  
  if (!focusAreaMappings) {
    throw new Error('Failed to retrieve focus area mappings from database');
  }
  
  // Get all valid challenge type codes
  const allChallengeTypeCodes = challengeTypes.map(type => type.code);
  
  // Try to match based on dominant traits
  let selectedTypeCode = null;
  
  for (const trait of dominantTraits) {
    const mappedType = traitMappings[trait];
    if (mappedType && allChallengeTypeCodes.includes(mappedType)) {
      selectedTypeCode = mappedType;
      break;
    }
  }
  
  // If no match based on traits, try to match based on focus areas
  if (!selectedTypeCode) {
    for (const focusArea of focusAreas) {
      const mappedType = focusAreaMappings[focusArea];
      if (mappedType && allChallengeTypeCodes.includes(mappedType)) {
        selectedTypeCode = mappedType;
        break;
      }
    }
  }
  
  // If still no match, use default critical-thinking if available
  if (!selectedTypeCode && allChallengeTypeCodes.includes('critical-thinking')) {
    selectedTypeCode = 'critical-thinking';
  } else if (!selectedTypeCode && allChallengeTypeCodes.length > 0) {
    // Use the first available type
    selectedTypeCode = allChallengeTypeCodes[0];
  }
  
  if (!selectedTypeCode) {
    throw new Error('Failed to select a valid challenge type');
  }
  
  // Find the selected type from the database
  const selectedType = challengeTypes.find(type => type.code === selectedTypeCode);
  
  if (!selectedType) {
    throw new Error(`Challenge type with code ${selectedTypeCode} not found`);
  }
  
  return {
    code: selectedTypeCode,
    id: selectedType.id,
    name: selectedType.name,
    metadata: {
      description: selectedType.description
    }
  };
};

/**
 * Determine challenge difficulty based on user performance
 * @param {Object} userPerformance - User's performance metrics
 * @param {string} challengeType - Type of challenge
 * @returns {Object} Difficulty parameters
 */
const determineDifficulty = (userPerformance, challengeType) => {
  if (!userPerformance) {
    throw new Error('User performance object is required');
  }
  
  if (!challengeType) {
    throw new Error('Challenge type is required for difficulty determination');
  }
  
  const { averageScore = 0, completedChallenges = 0 } = userPerformance;
  
  // Base difficulty on average score and number of completed challenges
  let level, complexity, depth, timeAllocation;
  
  if (completedChallenges < 3) {
    // New users start with beginner challenges
    level = 'beginner';
    complexity = 0.3;
    depth = 0.3;
    timeAllocation = 300; // 5 minutes
  } else if (averageScore < 50) {
    // Struggling users get easier challenges
    level = 'beginner';
    complexity = 0.4;
    depth = 0.4;
    timeAllocation = 360; // 6 minutes
  } else if (averageScore < 70) {
    // Average users get moderate challenges
    level = 'intermediate';
    complexity = 0.6;
    depth = 0.6;
    timeAllocation = 480; // 8 minutes
  } else {
    // High-performing users get difficult challenges
    level = 'advanced';
    complexity = 0.8;
    depth = 0.8;
    timeAllocation = 600; // 10 minutes
  }
  
  // Reflection-based challenge types need more time
  const reflectionTypes = ['critical-thinking', 'ethical-dilemma', 'human-ai-boundary'];
  if (reflectionTypes.includes(challengeType)) {
    // These types need more time for reflection
    timeAllocation += 120; // Add 2 minutes
  }
  
  return {
    level,
    complexity,
    depth,
    timeAllocation
  };
};

module.exports = {
  generateChallengeId,
  selectChallengeType,
  determineDifficulty
};
