'use strict';

/**
 * Domain-specific Error Codes
 * 
 * This module defines standardized error codes for each domain in the application.
 * Error codes follow the pattern: <DOMAIN>_<TYPE>_<SUBTYPE>
 * 
 * Pattern structure:
 * - Domain prefix: 2-4 letter code representing the domain
 * - Type: Describes the general error category (e.g., NOT_FOUND, VALIDATION)
 * - Subtype: Optional specific error within the category
 * 
 * Example: USER_NOT_FOUND, CHAL_VALIDATION_FORMAT
 */

/**
 * User domain error codes (USER_*)
 */
export const UserErrorCodes = {
  // Not found errors
  NOT_FOUND: 'USER_NOT_FOUND',
  PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  PREFERENCE_NOT_FOUND: 'USER_PREFERENCE_NOT_FOUND',
  
  // Validation errors
  VALIDATION: 'USER_VALIDATION',
  VALIDATION_EMAIL: 'USER_VALIDATION_EMAIL',
  VALIDATION_PASSWORD: 'USER_VALIDATION_PASSWORD',
  VALIDATION_PROFILE: 'USER_VALIDATION_PROFILE',
  
  // State errors
  INVALID_STATE: 'USER_INVALID_STATE',
  
  // Security errors
  AUTH_FAILED: 'USER_AUTH_FAILED',
  ACCESS_DENIED: 'USER_ACCESS_DENIED',
  
  // Processing errors
  UPDATE_FAILED: 'USER_UPDATE_FAILED',
  CREATION_FAILED: 'USER_CREATION_FAILED'
};

/**
 * Challenge domain error codes (CHAL_*)
 */
export const ChallengeErrorCodes = {
  // Not found errors
  NOT_FOUND: 'CHAL_NOT_FOUND',
  TYPE_NOT_FOUND: 'CHAL_TYPE_NOT_FOUND',
  FORMAT_NOT_FOUND: 'CHAL_FORMAT_NOT_FOUND',
  
  // Validation errors
  VALIDATION: 'CHAL_VALIDATION',
  VALIDATION_FORMAT: 'CHAL_VALIDATION_FORMAT',
  VALIDATION_CONTENT: 'CHAL_VALIDATION_CONTENT',
  VALIDATION_TYPE: 'CHAL_VALIDATION_TYPE',
  
  // Processing errors
  PROCESSING: 'CHAL_PROCESSING',
  GENERATION_FAILED: 'CHAL_GENERATION_FAILED',
  
  // Repository errors
  REPOSITORY: 'CHAL_REPOSITORY',
  PERSISTENCE_FAILED: 'CHAL_PERSISTENCE_FAILED'
};

/**
 * Focus Area domain error codes (FOCUS_*)
 */
export const FocusAreaErrorCodes = {
  // Not found errors
  NOT_FOUND: 'FOCUS_NOT_FOUND',
  CONFIG_NOT_FOUND: 'FOCUS_CONFIG_NOT_FOUND',
  
  // Validation errors
  VALIDATION: 'FOCUS_VALIDATION',
  VALIDATION_FORMAT: 'FOCUS_VALIDATION_FORMAT',
  VALIDATION_CONTENT: 'FOCUS_VALIDATION_CONTENT',
  
  // Processing errors
  GENERATION_FAILED: 'FOCUS_GENERATION_FAILED',
  
  // Repository errors
  PERSISTENCE_FAILED: 'FOCUS_PERSISTENCE_FAILED',
  
  // Access errors
  ACCESS_DENIED: 'FOCUS_ACCESS_DENIED'
};

/**
 * Personality domain error codes (PERS_*)
 */
export const PersonalityErrorCodes = {
  // Not found errors
  NOT_FOUND: 'PERS_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PERS_PROFILE_NOT_FOUND',
  TRAITS_NOT_FOUND: 'PERS_TRAITS_NOT_FOUND',
  
  // Validation errors
  VALIDATION: 'PERS_VALIDATION',
  TRAITS_VALIDATION: 'PERS_TRAITS_VALIDATION',
  ATTITUDES_VALIDATION: 'PERS_ATTITUDES_VALIDATION',
  
  // Processing errors
  PROCESSING: 'PERS_PROCESSING',
  INSIGHT_GENERATION_FAILED: 'PERS_INSIGHT_GENERATION_FAILED',
  
  // Repository errors
  REPOSITORY: 'PERS_REPOSITORY',
  NO_DATA: 'PERS_NO_DATA'
};

/**
 * Evaluation domain error codes (EVAL_*)
 */
export const EvaluationErrorCodes = {
  // Not found errors
  NOT_FOUND: 'EVAL_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'EVAL_CATEGORY_NOT_FOUND',
  
  // Validation errors
  VALIDATION: 'EVAL_VALIDATION',
  VALIDATION_CRITERIA: 'EVAL_VALIDATION_CRITERIA',
  VALIDATION_RESPONSE: 'EVAL_VALIDATION_RESPONSE',
  
  // Processing errors
  PROCESSING: 'EVAL_PROCESSING',
  AI_PROCESSING_FAILED: 'EVAL_AI_PROCESSING_FAILED',
  
  // Repository errors
  REPOSITORY: 'EVAL_REPOSITORY'
};

/**
 * Progress domain error codes (PROG_*)
 */
export const ProgressErrorCodes = {
  // Not found errors
  NOT_FOUND: 'PROG_NOT_FOUND',
  
  // Validation errors
  VALIDATION: 'PROG_VALIDATION',
  
  // Processing errors
  PROCESSING: 'PROG_PROCESSING',
  
  // Repository errors
  REPOSITORY: 'PROG_REPOSITORY'
};

/**
 * Adaptive domain error codes (ADAP_*)
 */
export const AdaptiveErrorCodes = {
  // Not found errors
  NOT_FOUND: 'ADAP_NOT_FOUND',
  
  // Validation errors
  VALIDATION: 'ADAP_VALIDATION',
  
  // Processing errors
  PROCESSING: 'ADAP_PROCESSING',
  
  // Repository errors
  REPOSITORY: 'ADAP_REPOSITORY'
};

/**
 * Authentication domain error codes (AUTH_*)
 */
export const AuthErrorCodes = {
  // Authentication errors
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'AUTH_ACCESS_DENIED',
  
  // Registration errors
  REGISTRATION_FAILED: 'AUTH_REGISTRATION_FAILED',
  EMAIL_IN_USE: 'AUTH_EMAIL_IN_USE',
  
  // Repository errors
  REPOSITORY: 'AUTH_REPOSITORY'
};

/**
 * User Journey domain error codes (JOUR_*)
 */
export const UserJourneyErrorCodes = {
  // Not found errors
  NOT_FOUND: 'JOUR_NOT_FOUND',
  
  // Validation errors
  VALIDATION: 'JOUR_VALIDATION',
  
  // Processing errors
  PROCESSING: 'JOUR_PROCESSING'
};

/**
 * OpenAI domain error codes (AI_*)
 */
export const OpenAIErrorCodes = {
  // Request errors
  REQUEST_FAILED: 'AI_REQUEST_FAILED',
  RATE_LIMIT: 'AI_RATE_LIMIT',
  CONTEXT_LENGTH: 'AI_CONTEXT_LENGTH',
  INVALID_REQUEST: 'AI_INVALID_REQUEST',
  
  // Authentication errors
  AUTH_FAILED: 'AI_AUTH_FAILED',
  PERMISSION_DENIED: 'AI_PERMISSION_DENIED',
  
  // Service errors
  SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  
  // State management errors
  STATE_MANAGEMENT: 'AI_STATE_MANAGEMENT'
};

/**
 * Combined error codes from all domains for easy import
 */
export const DomainErrorCodes = {
  User: UserErrorCodes,
  Challenge: ChallengeErrorCodes,
  FocusArea: FocusAreaErrorCodes,
  Personality: PersonalityErrorCodes,
  Evaluation: EvaluationErrorCodes,
  Progress: ProgressErrorCodes,
  Adaptive: AdaptiveErrorCodes,
  Auth: AuthErrorCodes,
  UserJourney: UserJourneyErrorCodes,
  OpenAI: OpenAIErrorCodes
};

export default DomainErrorCodes; 