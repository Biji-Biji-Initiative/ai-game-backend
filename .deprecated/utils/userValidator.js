/**
 * User Validator
 * Validates user data, personality traits, and AI attitudes
 */
const logger = require('./logger/logger');

/**
 * Validates user data
 * @param {Object} userData - User data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateUserData(userData) {
  const errors = [];
  
  // Check if userData is an object
  if (!userData || typeof userData !== 'object') {
    errors.push('User data must be an object');
    logger.error('Invalid user data format', { userData });
    return { isValid: false, errors };
  }
  
  // Validate email
  if (!userData.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(userData.email)) {
    errors.push('Invalid email format');
  }
  
  // Validate fullName
  if (!userData.fullName) {
    errors.push('Full name is required');
  }
  
  // Validate professionalTitle
  if (!userData.professionalTitle) {
    errors.push('Professional title is required');
  }
  
  // Log validation result
  if (errors.length > 0) {
    logger.error('User data validation failed', { errors, userData });
  } else {
    logger.debug('User data validation passed', { userData });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates personality traits
 * @param {Object} traits - Personality traits to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validatePersonalityTraits(traits) {
  const errors = [];
  const requiredTraits = ['creativity', 'analyticalThinking', 'empathy', 'riskTaking', 'adaptability'];
  
  // Check if traits is an object
  if (!traits || typeof traits !== 'object') {
    errors.push('Personality traits must be an object');
    logger.error('Invalid personality traits format', { traits });
    return { isValid: false, errors };
  }
  
  // Check for required traits
  const missingTraits = requiredTraits.filter(trait => !traits.hasOwnProperty(trait));
  if (missingTraits.length > 0) {
    errors.push('Missing required personality traits');
    logger.error('Missing personality traits', { missingTraits, traits });
  }
  
  // Validate trait values
  for (const [trait, value] of Object.entries(traits)) {
    if (typeof value !== 'number' || value < 0 || value > 1) {
      errors.push('Trait values must be between 0.0 and 1.0');
      logger.error('Invalid trait value', { trait, value });
      break; // Only add this error once
    }
  }
  
  // Log validation result
  if (errors.length > 0) {
    logger.error('Personality traits validation failed', { errors, traits });
  } else {
    logger.debug('Personality traits validation passed', { traits });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates AI attitudes
 * @param {Object} attitudes - AI attitudes to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
function validateAiAttitudes(attitudes) {
  const errors = [];
  const requiredAttitudes = ['trust', 'jobConcerns', 'impact', 'interest', 'interaction'];
  
  // Check if attitudes is an object
  if (!attitudes || typeof attitudes !== 'object') {
    errors.push('AI attitudes must be an object');
    logger.error('Invalid AI attitudes format', { attitudes });
    return { isValid: false, errors };
  }
  
  // Check for required attitudes
  const missingAttitudes = requiredAttitudes.filter(attitude => !attitudes.hasOwnProperty(attitude));
  if (missingAttitudes.length > 0) {
    errors.push('Missing required AI attitudes');
    logger.error('Missing AI attitudes', { missingAttitudes, attitudes });
  }
  
  // Validate attitude values
  for (const [attitude, value] of Object.entries(attitudes)) {
    if (typeof value !== 'number' || value < 0 || value > 1) {
      errors.push('Attitude values must be between 0.0 and 1.0');
      logger.error('Invalid attitude value', { attitude, value });
      break; // Only add this error once
    }
  }
  
  // Log validation result
  if (errors.length > 0) {
    logger.error('AI attitudes validation failed', { errors, attitudes });
  } else {
    logger.debug('AI attitudes validation passed', { attitudes });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  validateUserData,
  validatePersonalityTraits,
  validateAiAttitudes
};
