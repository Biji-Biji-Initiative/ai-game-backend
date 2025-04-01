'use strict';
/**
 * AI Attitude Mapping Configuration
 *
 * Contains configuration constants for mapping AI attitudes to user preferences.
 * Extracts magic numbers from mapping logic to improve maintainability and readability.
 * These values define thresholds used for determining user preferences based on attitude scores.
 */

/**
 * Tech savviness thresholds
 * These determine detail level preferences based on tech_savvy and early_adopter combined scores
 */
export const TECH_THRESHOLDS = {
    LOW: 100,  // Below this sum value of tech_savvy and early_adopter, detail level is 'basic'
    HIGH: 150  // Above this sum value, detail level is 'comprehensive'
};

/**
 * Attitude score thresholds
 * Used to determine when an attitude score is significant enough to influence preferences
 */
export const ATTITUDE_THRESHOLD = {
    SIGNIFICANT: 70  // Above this value, an attitude is considered significant enough to influence preferences
};

/**
 * Default attitude values
 * Used when a specific attitude value is not provided
 */
export const DEFAULT_ATTITUDE_VALUE = 50;

/**
 * Detail level options
 * Possible values for detail level preference
 */
export const DETAIL_LEVEL = {
    BASIC: 'basic',
    DETAILED: 'detailed',
    COMPREHENSIVE: 'comprehensive'
};

/**
 * Communication style options
 * Possible values for communication style preference
 */
export const COMMUNICATION_STYLE = {
    CASUAL: 'casual',
    FORMAL: 'formal',
    TECHNICAL: 'technical'
};

/**
 * Response format options
 * Possible values for response format preference
 */
export const RESPONSE_FORMAT = {
    MIXED: 'mixed',
    STRUCTURED: 'structured',
    CONVERSATIONAL: 'conversational'
};

export default {
    TECH_THRESHOLDS,
    ATTITUDE_THRESHOLD,
    DEFAULT_ATTITUDE_VALUE,
    DETAIL_LEVEL,
    COMMUNICATION_STYLE,
    RESPONSE_FORMAT
}; 